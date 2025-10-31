// [Phase 75-C.1] Recent participants_log viewer component
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Upload, Edit, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

type ContextJson = {
  inserted?: number;
  updated?: number;
  skipped?: number;
  deleted?: number;
  errors?: number;
  mode?: string;
  total_rows?: number;
  name?: string;
  phone?: string;
  reason?: string;
  error?: string;
  record?: any;
  source?: string;
  mapped?: boolean;
};

interface ParticipantLog {
  id: string;
  action: string;
  created_at: string;
  context_json: ContextJson | null;
  session_id: string | null;
  participant_id: string | null;
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
            context_json: item.context_json as ContextJson | null,
            session_id: item.session_id,
            participant_id: item.participant_id
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
      case "upload_start":
      case "upload_done":
      case "upload_failed":
      case "bulk_upload_summary":
      case "bulk_insert":
      case "insert":
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
      case "upload_start":
        return "업로드 시작";
      case "upload_done":
        return "업로드 완료";
      case "upload_failed":
        return "업로드 실패";
      case "bulk_upload_summary":
        return "일괄 업로드";
      case "bulk_insert":
      case "insert":
        return "신규 등록";
      case "bulk_update":
      case "update":
        return "수정";
      case "delete":
        return "삭제";
      case "skip":
        return "스킵";
      case "parse_error":
        return "파싱 에러";
      default:
        return action;
    }
  };

  const getActionVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (action) {
      case "upload_done":
      case "bulk_upload_summary":
      case "bulk_insert":
      case "insert":
        return "default";
      case "update":
      case "bulk_update":
        return "secondary";
      case "delete":
      case "upload_failed":
      case "parse_error":
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
                
                {log.session_id && (
                  <div className="text-xs text-muted-foreground mt-1 font-mono truncate">
                    세션: {log.session_id.substring(0, 16)}...
                  </div>
                )}
                
                {log.context_json && (log.action === "upload_done" || log.action === "bulk_upload_summary") && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {log.context_json.inserted && `신규 ${log.context_json.inserted}명`}
                    {log.context_json.updated && ` / 갱신 ${log.context_json.updated}명`}
                    {log.context_json.skipped && log.context_json.skipped > 0 && ` / 스킵 ${log.context_json.skipped}건`}
                    {log.context_json.deleted && log.context_json.deleted > 0 && ` / 삭제 ${log.context_json.deleted}명`}
                    {log.context_json.errors && log.context_json.errors > 0 && ` / 오류 ${log.context_json.errors}건`}
                  </div>
                )}
                
                {log.context_json?.error && (
                  <div className="text-xs text-destructive mt-1 truncate">
                    {log.context_json.error}
                  </div>
                )}
                
                {log.context_json?.reason && (log.action === "skip" || log.action === "delete") && (
                  <div className="text-xs text-muted-foreground mt-1">
                    사유: {log.context_json.reason}
                    {log.context_json.name && ` (${log.context_json.name})`}
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
