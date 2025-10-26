import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface ErrorLog {
  timestamp: string;
  level: "critical" | "warning" | "info";
  source: string;
  message: string;
}

export function ErrorLogTable() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadErrorLogs();
  }, []);

  const loadErrorLogs = async () => {
    setLoading(true);
    console.log("[ErrorLogs] Loading error logs...");

    try {
      // E: Error/Warning Log Monitor
      // TODO: Query error_logs table
      const mockErrors: ErrorLog[] = [
        { timestamp: "2025-10-26 13:12", level: "critical", source: "participants_ai_map", message: "TypeError (undefined 'event_id')" },
        { timestamp: "2025-10-26 13:09", level: "warning", source: "upload_batch", message: "Excel parser timeout" },
        { timestamp: "2025-10-26 12:45", level: "info", source: "form_sync", message: "Matched 45 responses to participants" },
        { timestamp: "2025-10-26 12:30", level: "warning", source: "rooming_validator", message: "Room capacity exceeded for event #123" },
        { timestamp: "2025-10-26 12:15", level: "info", source: "participant_export", message: "Successfully exported 120 participants" }
      ];

      setErrors(mockErrors);
    } catch (error) {
      console.error("[ErrorLogs] Error loading:", error);
    }

    setLoading(false);
  };

  const getLevelIndicator = (level: "critical" | "warning" | "info") => {
    const config = {
      critical: { color: "bg-red-500", textColor: "text-red-700 dark:text-red-400" },
      warning: { color: "bg-yellow-500", textColor: "text-yellow-700 dark:text-yellow-400" },
      info: { color: "bg-gray-400", textColor: "text-muted-foreground" }
    }[level];

    return config;
  };

  if (loading) {
    return (
      <Card className="shadow-md rounded-[16px] animate-pulse">
        <CardContent className="p-6">
          <div className="h-48 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md rounded-2xl border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <h3 className="text-[14px] font-semibold">최근 로그 (10건)</h3>
        </div>

        <div className="space-y-2">
          {errors.length === 0 ? (
            <p className="text-[14px] text-muted-foreground text-center py-8">
              최근 오류가 없습니다.
            </p>
          ) : (
            errors.map((log, idx) => {
              const indicator = getLevelIndicator(log.level);
              return (
                <div 
                  key={idx} 
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex-shrink-0 pt-1">
                    <div className={`h-2 w-2 rounded-full ${indicator.color}`} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[14px] font-medium ${indicator.textColor} truncate`}>
                        {log.source}
                      </p>
                      <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                        {log.timestamp}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground line-clamp-1">
                      {log.message}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
