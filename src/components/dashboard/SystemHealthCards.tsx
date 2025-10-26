import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Radio, Zap, GitBranch, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

interface SystemHealth {
  supabaseStatus: "healthy" | "degraded" | "down";
  realtimeChannels: number;
  functionsCount: number;
  lastDeployment: { status: string; timestamp: string } | null;
}

export function SystemHealthCards() {
  const [health, setHealth] = useState<SystemHealth>({
    supabaseStatus: "healthy",
    realtimeChannels: 0,
    functionsCount: 0,
    lastDeployment: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemHealth();
  }, []);

  const loadSystemHealth = async () => {
    setLoading(true);
    console.log("[SystemHealth] Loading health status...");

    try {
      // A1: Supabase Connection Status
      const { error: connectionError } = await supabase.from("agencies").select("id", { count: "exact", head: true });
      
      // A2: Realtime Channels (mock for now - will implement in Phase 4.1)
      const realtimeChannels = 3; // TODO: Implement realtime channel monitoring

      // A3: Function/Trigger Count
      // TODO: Query functions_health table when available
      const functionsCount = 12;

      // A4: Deployment Status
      // TODO: Query deployment_logs when available
      const lastDeployment = {
        status: "success",
        timestamp: new Date().toISOString()
      };

      setHealth({
        supabaseStatus: connectionError ? "down" : "healthy",
        realtimeChannels,
        functionsCount,
        lastDeployment
      });
    } catch (error) {
      console.error("[SystemHealth] Error loading:", error);
      setHealth(prev => ({ ...prev, supabaseStatus: "down" }));
    }

    setLoading(false);
  };

  const getStatusBadge = (status: "healthy" | "degraded" | "down") => {
    const config = {
      healthy: { variant: "default" as const, label: "정상", icon: CheckCircle2, color: "text-green-600" },
      degraded: { variant: "secondary" as const, label: "지연", icon: Clock, color: "text-yellow-600" },
      down: { variant: "destructive" as const, label: "장애", icon: AlertTriangle, color: "text-red-600" }
    }[status];

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="shadow-md animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* A1: Supabase Connection */}
      <Card className="shadow-md rounded-2xl border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] text-muted-foreground">Supabase 연결</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[24px] font-bold">DB</span>
            {getStatusBadge(health.supabaseStatus)}
          </div>
        </CardContent>
      </Card>

      {/* A2: Realtime Channels */}
      <Card className="shadow-md rounded-2xl border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Radio className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] text-muted-foreground">Realtime 채널</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[24px] font-bold">{health.realtimeChannels}개</span>
            <Badge variant="default" className="gap-1">
              <Radio className="h-3 w-3" />
              활성
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* A3: Function/Trigger Count */}
      <Card className="shadow-md rounded-2xl border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] text-muted-foreground">등록된 자동화</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[24px] font-bold">{health.functionsCount}개</span>
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              정상
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* A4: Deployment Status */}
      <Card className="shadow-md rounded-2xl border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] text-muted-foreground">최근 배포</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium">
              {health.lastDeployment ? new Date(health.lastDeployment.timestamp).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "-"}
            </span>
            <Badge variant={health.lastDeployment?.status === "success" ? "default" : "destructive"} className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {health.lastDeployment?.status === "success" ? "성공" : "실패"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
