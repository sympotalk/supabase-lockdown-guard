import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppData } from "@/contexts/AppDataContext";
import { Clock, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ActivityLog = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
};

export default function AgencyActivityLog() {
  const { agency } = useAppData();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    if (!agency?.id) {
      setLogs([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase
      .from("activity_logs")
      .select("id, type, title, description, created_at, created_by")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();

    if (!agency?.id) return;

    // Real-time updates
    const channel = supabase
      .channel(`agency_logs_${agency.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
          filter: `agency_id=eq.${agency.id}`,
        },
        () => {
          loadLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agency?.id]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">로그 불러오는 중...</p>
        </CardContent>
      </Card>
    );
  }

  if (!logs.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            최근 활동 내역
            <Button
              variant="ghost"
              size="sm"
              onClick={loadLogs}
              className="gap-1 h-8"
            >
              <RefreshCcw className="h-3 w-3" />
              새로고침
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">최근 활동 내역이 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          최근 활동 내역
          <Button
            variant="ghost"
            size="sm"
            onClick={loadLogs}
            className="gap-1 h-8"
          >
            <RefreshCcw className="h-3 w-3" />
            새로고침
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex justify-between items-start border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <div className="flex-1">
                <div className="text-sm font-medium">{log.title}</div>
                {log.description && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {log.description}
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 ml-4">
                <Clock className="h-3 w-3" />
                {new Date(log.created_at).toLocaleString("ko-KR", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
