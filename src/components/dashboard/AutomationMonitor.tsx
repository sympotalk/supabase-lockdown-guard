import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { logSys, errorSys } from "@/lib/consoleLogger";

interface AutomationJob {
  id: string;
  job_name: string;
  status: "running" | "completed" | "failed" | "pending";
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}

export function AutomationMonitor() {
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAutomationJobs();
    const interval = setInterval(loadAutomationJobs, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAutomationJobs = async () => {
    logSys("[AutomationMonitor] Loading automation jobs...");
    try {
      const { data, error } = await supabase
        .from("automation_jobs" as any)
        .select("*")
        .order("started_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setJobs((data as any) || []);
    } catch (error) {
      errorSys("[AutomationMonitor] Error loading jobs:", error);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <PlayCircle className="h-4 w-4 text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      running: "default",
      completed: "default",
      failed: "destructive",
      pending: "secondary",
    };
    return variants[status] || "secondary";
  };

  if (loading) {
    return (
      <Card className="shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle className="text-[14px]">자동화 작업</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md rounded-2xl">
      <CardHeader>
        <CardTitle className="text-[14px]">자동화 작업 (최근 10건)</CardTitle>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <PlayCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-[12px]">실행된 작업이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(job.status)}
                  <div>
                    <p className="text-[13px] font-medium">{job.job_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(job.started_at), "yyyy-MM-dd HH:mm:ss")}
                      {job.duration_ms && ` · ${job.duration_ms}ms`}
                    </p>
                  </div>
                </div>
                <Badge variant={getStatusBadge(job.status)}>{job.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
