import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Database, Radio, Zap, TrendingUp, CheckCircle2, AlertTriangle } from "lucide-react";

interface SystemInsights {
  total_reports: number;
  success_rate: number;
  avg_processing_time: number;
  warning_count: number;
  total_functions: number;
  total_channels: number;
}

export function SystemHealthCards() {
  const [insights, setInsights] = useState<SystemInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemInsights();
  }, []);

  const loadSystemInsights = async () => {
    setLoading(true);
    console.log("[MasterDashboard] Loading system insights from master_system_insights...");

    try {
      const { data, error } = await supabase
        .from("master_system_insights")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      setInsights(data);
    } catch (error) {
      console.error("[MasterDashboard] Error loading system insights:", error);
    }

    setLoading(false);
  };

  const getStatusBadge = (value: number, isGood: boolean) => {
    const config = isGood
      ? { variant: "default" as const, label: "정상", icon: CheckCircle2, color: "text-green-600" }
      : { variant: "destructive" as const, label: "주의", icon: AlertTriangle, color: "text-yellow-600" };

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
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* QA Reports */}
        <Card className="shadow-md rounded-2xl border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] text-muted-foreground">QA 리포트</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[24px] font-bold">{insights?.total_reports || 0}개</span>
              {getStatusBadge(insights?.success_rate || 0, (insights?.success_rate || 0) >= 90)}
            </div>
          </CardContent>
        </Card>

        {/* Realtime Channels */}
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
              <span className="text-[24px] font-bold">{insights?.total_channels || 0}개</span>
              <Badge variant="default" className="gap-1">
                <Radio className="h-3 w-3" />
                활성
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Functions Count */}
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
              <span className="text-[24px] font-bold">{insights?.total_functions || 0}개</span>
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                정상
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Warning Count */}
        <Card className="shadow-md rounded-2xl border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] text-muted-foreground">경고 건수</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[24px] font-bold">{insights?.warning_count || 0}건</span>
              {getStatusBadge(insights?.warning_count || 0, (insights?.warning_count || 0) === 0)}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
