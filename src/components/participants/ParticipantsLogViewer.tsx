// [Phase 75-C.1] Recent participants_log viewer component
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Upload, Edit, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

type LogMetadata = {
  inserted?: number;
  updated?: number;
  skipped?: number;
  mode?: string;
  session_id?: string;
};

interface ParticipantLog {
  id: string;
  action: string;
  created_at: string;
  metadata: LogMetadata | null;
  upload_session_id: string | null;
}

interface ParticipantsLogViewerProps {
  eventId: string;
  limit?: number;
}

export function ParticipantsLogViewer({ eventId, limit = 3 }: ParticipantsLogViewerProps) {
  const [logs, setLogs] = useState<ParticipantLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        // @ts-ignore - Supabase type inference issue
        const result = await supabase
          .from("participants_log")
          .select("*")
          .eq("event_id", eventId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (result.error) {
          console.error("[75-C.1] Failed to fetch logs:", result.error);
          setLogs([]);
        } else if (result.data) {
          setLogs(result.data.map((item: any) => ({
            id: item.id,
            action: item.action,
            created_at: item.created_at,
            metadata: item.metadata as LogMetadata | null,
            upload_session_id: item.upload_session_id
          })));
        }
      } catch (err) {
        console.error("[75-C.1] Error fetching logs:", err);
        setLogs([]);
      }
      setLoading(false);
    };

    fetchLogs();

    // Subscribe to realtime updates for logs
    const channel = supabase
      .channel(`participants_log_${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants_log",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          console.log("[75-C.1] participants_log changed, refetching...");
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [eventId, limit]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "bulk_upload_summary":
      case "bulk_insert":
        return <Upload className="h-3 w-3" />;
      case "update":
      case "bulk_update":
        return <Edit className="h-3 w-3" />;
      case "delete":
        return <Trash2 className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "bulk_upload_summary":
        return "일괄 업로드";
      case "bulk_insert":
        return "신규 등록";
      case "bulk_update":
        return "업데이트";
      case "update":
        return "수정";
      case "delete":
        return "삭제";
      default:
        return action;
    }
  };

  const getActionVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (action) {
      case "bulk_upload_summary":
      case "bulk_insert":
        return "default";
      case "update":
      case "bulk_update":
        return "secondary";
      case "delete":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">최근 변경 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">로딩 중...</p>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">최근 변경 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">변경 이력이 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">최근 변경 이력</CardTitle>
        <CardDescription className="text-xs">
          최근 {limit}건의 참가자 데이터 변경 기록
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Badge variant={getActionVariant(log.action)} className="flex items-center gap-1 shrink-0">
                {getActionIcon(log.action)}
                <span className="text-xs">{getActionLabel(log.action)}</span>
              </Badge>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {formatDistanceToNow(new Date(log.created_at), { 
                      addSuffix: true, 
                      locale: ko 
                    })}
                  </span>
                </div>
                
                {log.upload_session_id && (
                  <div className="text-xs text-muted-foreground mt-1 font-mono truncate">
                    세션: {log.upload_session_id.substring(0, 16)}...
                  </div>
                )}
                
                {log.metadata && log.action === "bulk_upload_summary" && (
                  <div className="text-xs text-muted-foreground mt-1">
                    신규 {log.metadata.inserted || 0}명 / 업데이트 {log.metadata.updated || 0}명
                    {(log.metadata.skipped || 0) > 0 && ` / 실패 ${log.metadata.skipped}명`}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
