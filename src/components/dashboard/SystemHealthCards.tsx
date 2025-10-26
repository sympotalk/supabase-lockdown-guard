import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Database, Shield, TrendingUp } from "lucide-react";
import { SystemHealthUI } from "@/types/masterUI";

const defaultHealth: SystemHealthUI = {
  totalReports: 0,
  successRate: 0,
  avgProcessingTime: 0,
  warningCount: 0,
};

export function SystemHealthCards() {
  const [health, setHealth] = useState<SystemHealthUI>(defaultHealth);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemHealth();
  }, []);

  const loadSystemHealth = async () => {
    setLoading(true);
    console.log("[MasterDashboard] Loading system health from master_system_insights...");

    try {
      const { data, error } = await supabase
        .from("master_system_insights")
        .select("*")
        .single();

      if (error) throw error;
      // Narrow cast from Supabase to UI type
      const healthUI: SystemHealthUI = {
        totalReports: data?.total_reports ?? 0,
        successRate: data?.success_rate ?? 0,
        avgProcessingTime: data?.avg_processing_time ?? 0,
        warningCount: data?.warning_count ?? 0,
      };
      setHealth(healthUI);
    } catch (error) {
      console.error("[MasterDashboard] Error loading system health:", error);
    }

    setLoading(false);
  };

  const cards = [
    {
      icon: Database,
      title: "총 리포트",
      value: health.totalReports.toString(),
      subtitle: "누적 QA 리포트",
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      icon: TrendingUp,
      title: "성공률",
      value: `${health.successRate.toFixed(1)}%`,
      subtitle: "PASS 비율",
      color: "text-green-600 dark:text-green-400",
    },
    {
      icon: Activity,
      title: "평균 처리시간",
      value: `${health.avgProcessingTime.toFixed(0)}ms`,
      subtitle: "리포트 생성 시간",
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      icon: Shield,
      title: "경고 수",
      value: health.warningCount.toString(),
      subtitle: "시스템 경고",
      color: "text-orange-600 dark:text-orange-400",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((_, idx) => (
          <Card key={idx} className="shadow-md rounded-2xl animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card key={idx} className="shadow-md rounded-2xl border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-[12px] text-muted-foreground">{card.title}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[24px] font-bold">{card.value}</p>
                <p className="text-[12px] text-muted-foreground">{card.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
