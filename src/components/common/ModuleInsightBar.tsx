import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type ModuleName = "participants" | "rooming" | "uploads" | "messages";
type InsightLevel = "info" | "warn" | "critical";

interface ModuleInsight {
  id: string;
  module: ModuleName;
  level: InsightLevel;
  title: string;
  detail: any;
  created_at: string;
  agency_id: string | null;
}

interface ModuleInsightBarProps {
  module: ModuleName;
}

const moduleDisplayNames: Record<ModuleName, string> = {
  participants: "참가자",
  rooming: "룸핑",
  uploads: "업로드",
  messages: "메시지",
};

const levelConfig = {
  info: {
    icon: Info,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    badge: "default",
  },
  warn: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    badge: "secondary",
  },
  critical: {
    icon: AlertCircle,
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/30",
    badge: "destructive",
  },
};

export function ModuleInsightBar({ module }: ModuleInsightBarProps) {
  const { agencyScope } = useUser();
  const [insights, setInsights] = useState<ModuleInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const loadInsights = async () => {
    try {
      setLoading(true);
      
      // Generate fresh insights
      const { error: rpcError } = await supabase.rpc("rpc_generate_module_insights", {
        p_module: module,
        p_agency_id: agencyScope,
      });

      if (rpcError) {
        console.error("[ModuleInsightBar] RPC error:", rpcError);
      }

      // Fetch insights
      let query = supabase
        .from("module_insights")
        .select("*")
        .eq("module", module)
        .order("created_at", { ascending: false })
        .limit(10);

      if (agencyScope) {
        query = query.eq("agency_id", agencyScope);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInsights((data || []) as ModuleInsight[]);
    } catch (error) {
      console.error("[ModuleInsightBar] Load error:", error);
      toast.error("인사이트 로드 중 오류 발생");
    } finally {
      setLoading(false);
    }
  };

  const regenerateInsights = async () => {
    setGenerating(true);
    await loadInsights();
    setGenerating(false);
    toast.success("인사이트가 갱신되었습니다");
  };

  useEffect(() => {
    loadInsights();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadInsights, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [module, agencyScope]);

  if (loading) {
    return <Skeleton className="h-12 w-full rounded-lg" />;
  }

  if (insights.length === 0) {
    return null;
  }

  const latestInsight = insights[0];
  const config = levelConfig[latestInsight.level];
  const Icon = config.icon;

  const criticalCount = insights.filter((i) => i.level === "critical").length;
  const warnCount = insights.filter((i) => i.level === "warn").length;
  const infoCount = insights.filter((i) => i.level === "info").length;

  return (
    <>
      <div
        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${config.bg}`}
        onClick={() => setModalOpen(true)}
      >
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${config.color}`} />
          <div>
            <p className="text-sm font-medium text-foreground">
              {moduleDisplayNames[module]} 모듈 인사이트
            </p>
            <p className="text-xs text-muted-foreground">{latestInsight.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              Critical: {criticalCount}
            </Badge>
          )}
          {warnCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              Warn: {warnCount}
            </Badge>
          )}
          {infoCount > 0 && (
            <Badge variant="default" className="text-xs">
              Info: {infoCount}
            </Badge>
          )}
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{moduleDisplayNames[module]} 모듈 인사이트</span>
              <Button
                variant="outline"
                size="sm"
                onClick={regenerateInsights}
                disabled={generating}
              >
                {generating ? "갱신 중..." : "갱신"}
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {insights.map((insight) => {
              const insightConfig = levelConfig[insight.level];
              const InsightIcon = insightConfig.icon;

              return (
                <Card key={insight.id} className={insightConfig.bg}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <InsightIcon className={`h-5 w-5 mt-0.5 ${insightConfig.color}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm">{insight.title}</h4>
                          <Badge variant={insightConfig.badge as any} className="text-xs">
                            {insight.level.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {new Date(insight.created_at).toLocaleString("ko-KR")}
                        </p>
                        {insight.detail && (
                          <div className="text-sm space-y-1">
                            {Object.entries(insight.detail).map(([key, value]) => (
                              <div key={key} className="flex gap-2">
                                <span className="font-medium">{key}:</span>
                                <span>{JSON.stringify(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
