import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logSys, errorSys } from "@/lib/consoleLogger";
import { downloadCSV, downloadJSON } from "@/lib/exportUtils";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface OpsExecution {
  id: string;
  playbook_key: string;
  trigger_source: string;
  status: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  result: any;
}

export default function Logs() {
  const [executions, setExecutions] = useState<OpsExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadExecutions();
  }, []);

  const loadExecutions = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('ops_executions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setExecutions(data || []);
    } catch (error) {
      errorSys("Failed to load executions", error);
      toast({
        title: "로드 실패",
        description: "실행 로그를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      logSys(`Exporting ops executions as ${format}`);

      const { data, error } = await supabase
        .rpc('fn_export_ops_executions' as any);

      if (error) throw error;

      const filename = `ops-executions-${new Date().toISOString().split('T')[0]}`;

      if (format === 'csv') {
        // Convert to CSV-friendly format
        const csvData = (data as any[]).map(exec => ({
          id: exec.id,
          playbook: exec.playbook_key,
          trigger: exec.trigger_source,
          status: exec.status,
          created: exec.created_at,
          started: exec.started_at || '',
          finished: exec.finished_at || '',
          error: exec.result?.error || ''
        }));
        downloadCSV(csvData, `${filename}.csv`);
      } else {
        downloadJSON(data, `${filename}.json`);
      }

      toast({
        title: "내보내기 완료",
        description: `로그가 ${format.toUpperCase()} 형식으로 다운로드되었습니다.`,
      });
    } catch (error) {
      errorSys("Failed to export logs", error);
      toast({
        title: "내보내기 실패",
        description: error instanceof Error ? error.message : "로그 내보내기에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground">시스템 로그</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            운영 작업 실행 내역을 확인하고 다운로드할 수 있습니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadExecutions}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportLogs('csv')}
            disabled={exporting || executions.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportLogs('json')}
            disabled={exporting || executions.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            JSON
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>최근 실행 내역</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : executions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              실행 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {executions.map((execution) => (
                <div
                  key={execution.id}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{execution.playbook_key}</h4>
                      <p className="text-sm text-muted-foreground">
                        트리거: {execution.trigger_source}
                      </p>
                    </div>
                    <span className={`text-sm font-medium ${
                      execution.status === 'succeeded' ? 'text-success' :
                      execution.status === 'failed' ? 'text-destructive' :
                      'text-muted-foreground'
                    }`}>
                      {execution.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(execution.created_at), {
                      addSuffix: true,
                      locale: ko
                    })}
                  </p>
                  {execution.result?.error && (
                    <p className="text-xs text-destructive mt-2">
                      오류: {execution.result.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
