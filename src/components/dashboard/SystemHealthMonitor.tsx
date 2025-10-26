import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Radio, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { logSys, errorSys } from "@/lib/consoleLogger";

interface HealthCheckData {
  functions: Array<{
    function_name: string;
    status: "healthy" | "degraded" | "error";
    latency_ms: number;
    last_checked: string;
    error_message?: string;
  }>;
  realtime: Array<{
    channel_name: string;
    is_connected: boolean;
    last_event: string;
    message_count: number;
    error_message?: string;
  }>;
  checked_at: string;
}

/**
 * Phase 3.10-B: System Health Monitor
 * Displays real-time system health status from functions_health and realtime_health tables
 */
export function SystemHealthMonitor() {
  const [healthData, setHealthData] = useState<HealthCheckData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHealthData();

    // Refresh every minute
    const interval = setInterval(loadHealthData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadHealthData = async () => {
    logSys("Loading system health check data...");

    try {
      const { data, error } = await supabase.rpc("fn_healthcheck_all" as any);

      if (error) throw error;

      setHealthData(data);
    } catch (error) {
      errorSys("Error loading health data:", error);
    }

    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      healthy: { variant: "default" as const, icon: CheckCircle2, label: "정상" },
      degraded: { variant: "secondary" as const, icon: AlertCircle, label: "저하" },
      error: { variant: "destructive" as const, icon: AlertCircle, label: "오류" },
    }[status] || { variant: "outline" as const, icon: Activity, label: status };

    return (
      <Badge variant={config.variant} className="gap-1">
        <config.icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-32 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!healthData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">데이터를 불러올 수 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Function Health */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[14px]">함수 상태</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {healthData.functions.length === 0 ? (
            <p className="text-sm text-muted-foreground">모니터링 중인 함수가 없습니다.</p>
          ) : (
            healthData.functions.slice(0, 5).map((func) => (
              <div key={func.function_name} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex-1">
                  <p className="text-[13px] font-medium">{func.function_name}</p>
                  {func.latency_ms && (
                    <p className="text-[11px] text-muted-foreground">{func.latency_ms}ms</p>
                  )}
                </div>
                {getStatusBadge(func.status)}
              </div>
            ))
          )}
          {healthData.checked_at && (
            <p className="text-[11px] text-muted-foreground mt-3">
              최근 확인: {format(new Date(healthData.checked_at), "yyyy-MM-dd HH:mm")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Realtime Health */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[14px]">실시간 채널</CardTitle>
            <Radio className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {healthData.realtime.length === 0 ? (
            <p className="text-sm text-muted-foreground">활성 채널이 없습니다.</p>
          ) : (
            healthData.realtime.slice(0, 5).map((channel) => (
              <div key={channel.channel_name} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex-1">
                  <p className="text-[13px] font-medium">{channel.channel_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {channel.message_count}개 메시지
                  </p>
                </div>
                <Badge variant={channel.is_connected ? "default" : "secondary"}>
                  {channel.is_connected ? "연결됨" : "끊김"}
                </Badge>
              </div>
            ))
          )}
          {healthData.checked_at && (
            <p className="text-[11px] text-muted-foreground mt-3">
              최근 확인: {format(new Date(healthData.checked_at), "yyyy-MM-dd HH:mm")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
