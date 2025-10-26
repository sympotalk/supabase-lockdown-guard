import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface ErrorLog {
  id: string;
  module: string;
  level: "critical" | "warning" | "info";
  message: string;
  created_at: string;
}

export function ErrorLogTable() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadErrorLogs();
  }, []);

  const loadErrorLogs = async () => {
    setLoading(true);
    console.log("[MasterDashboard] Loading error logs from error_logs_recent...");

    try {
      const { data, error } = await supabase
        .from("error_logs_recent")
        .select("*")
        .limit(10);

      if (error) throw error;
      setErrors((data || []) as ErrorLog[]);
    } catch (error) {
      console.error("[MasterDashboard] Error loading logs:", error);
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
                        {log.module}
                      </p>
                      <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "MM/dd HH:mm")}
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
