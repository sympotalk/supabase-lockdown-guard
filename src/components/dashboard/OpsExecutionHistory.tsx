import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { CheckCircle2, XCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { logSys, errorSys } from "@/lib/consoleLogger";

interface Execution {
  id: string;
  playbook_key: string;
  trigger_source: string;
  status: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  result: any;
}

export function OpsExecutionHistory() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExecutions();

    // Subscribe to execution updates
    const channel = supabase
      .channel('ops-executions-changes')
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'ops_executions'
      }, () => {
        logSys("Ops execution updated");
        loadExecutions();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadExecutions = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('ops_executions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setExecutions((data as any) || []);
    } catch (error) {
      errorSys("Failed to load executions", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'running':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPlaybookName = (key: string) => {
    const names: Record<string, string> = {
      'rt_reconnect': 'Realtime 재연결',
      'fn_rollback': '함수 롤백',
      'queue_quarantine': '큐 격리'
    };
    return names[key] || key;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>운영 작업 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>운영 작업 내역</CardTitle>
      </CardHeader>
      <CardContent>
        {executions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            최근 작업 내역이 없습니다
          </p>
        ) : (
          <div className="space-y-4">
            {executions.map((execution) => (
              <div
                key={execution.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <div className="mt-0.5">
                  {getStatusIcon(execution.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-medium text-sm">
                      {getPlaybookName(execution.playbook_key)}
                    </h4>
                    <Badge variant={getStatusBadge(execution.status)}>
                      {execution.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    트리거: {execution.trigger_source}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(execution.created_at), {
                      addSuffix: true,
                      locale: ko
                    })}
                  </p>
                  {execution.result?.error && (
                    <p className="text-xs text-destructive mt-1">
                      오류: {execution.result.error}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
