import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { validateSystemInsights } from "@/lib/masterDashboardValidation";
import { masterRealtimeHub } from "@/lib/masterRealtimeHub";
import { toast } from "@/hooks/use-toast";
import { MasterMetricsUI, AIInsightUI, QAReportUI } from "@/types/masterUI";

interface MasterContextValue {
  metrics: MasterMetricsUI;
  aiInsights: AIInsightUI[];
  qaReports: QAReportUI[];
  isRealtimeConnected: boolean;
  lastFetchedAt: Date | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const MasterContext = createContext<MasterContextValue | null>(null);

const STALE_TIME = 60000; // 60s

const defaultMetrics: MasterMetricsUI = {
  healthRate: 0,
  activeChannels: 0,
  aiMappingRate: 0,
  duplicateRate: 0,
  qaPassRate: 0,
  errorRate: 0,
  isMock: true,
};

export function MasterProvider({ children }: { children: ReactNode }) {
  const [metrics, setMetrics] = useState<MasterMetricsUI>(defaultMetrics);
  const [aiInsights, setAiInsights] = useState<AIInsightUI[]>([]);
  const [qaReports, setQaReports] = useState<QAReportUI[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    console.log("[MasterDashboard] Fetching all data...");
    setLoading(true);
    setError(null);

    try {
      const [metricsResult, aiResult, qaResult] = await Promise.all([
        validateSystemInsights(),
        supabase
          .from("ai_insights")
          .select("*")
          .eq("status", "active")
          .order("detected_at", { ascending: false })
          .limit(10),
        supabase
          .from("qa_reports")
          .select("*")
          .order("generated_at", { ascending: false })
          .limit(20),
      ]);

      setMetrics({
        healthRate: metricsResult.data.healthRate,
        activeChannels: metricsResult.data.activeChannels,
        aiMappingRate: metricsResult.data.aiMappingRate,
        duplicateRate: metricsResult.data.duplicateRate,
        qaPassRate: metricsResult.data.qaPassRate,
        errorRate: metricsResult.data.errorRate,
        isMock: metricsResult.isMock,
      });

      if (aiResult.error) throw aiResult.error;
      // Narrow cast from Supabase to UI type
      const aiInsightsUI: AIInsightUI[] = (aiResult.data || []).map((item: any) => ({
        id: item.id,
        detectedAt: item.detected_at,
        severity: item.severity,
        title: item.title,
        description: item.description,
      }));
      setAiInsights(aiInsightsUI);

      if (qaResult.error) throw qaResult.error;
      // Narrow cast from Supabase to UI type
      const qaReportsUI: QAReportUI[] = (qaResult.data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        category: item.category,
        generatedAt: item.generated_at,
        totalAnomalies: item.total_anomalies ?? 0,
        criticalCount: item.critical_count ?? 0,
        warningCount: item.warning_count ?? 0,
        infoCount: item.info_count ?? 0,
        summary: item.summary,
        aiRecommendations: item.ai_recommendations,
      }));
      setQaReports(qaReportsUI);

      setLastFetchedAt(new Date());
      console.log("[MasterDashboard] Data fetch complete");
    } catch (err) {
      console.error("[MasterDashboard] Fetch error:", err);
      setError("데이터를 불러오지 못했습니다. 다시 시도해주세요.");
      toast({
        title: "오류",
        description: "데이터를 불러오지 못했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    const now = new Date();
    if (lastFetchedAt && now.getTime() - lastFetchedAt.getTime() < STALE_TIME) {
      console.log("[MasterDashboard] Using cached data (within stale time)");
      return;
    }
    await fetchAllData();
  }, [lastFetchedAt, fetchAllData]);

  useEffect(() => {
    console.log("[MasterDashboard] Initializing MasterContext");
    
    // Initial fetch
    fetchAllData();

    // Setup unified realtime callback
    masterRealtimeHub.registerUnifiedCallback((tag) => {
      console.log(`[MasterDashboard] Realtime update received: ${tag}`);
      fetchAllData();
    });

    masterRealtimeHub.connect();
    setIsRealtimeConnected(masterRealtimeHub.isConnected());

    // Unified polling timer (60s)
    const pollInterval = setInterval(() => {
      console.log("[MasterDashboard] Polling refresh");
      fetchAllData();
    }, 60000);

    // Check realtime status
    const statusInterval = setInterval(() => {
      const connected = masterRealtimeHub.isConnected();
      setIsRealtimeConnected(connected);
    }, 5000);

    return () => {
      console.log("[MasterDashboard] Cleaning up MasterContext");
      clearInterval(pollInterval);
      clearInterval(statusInterval);
      masterRealtimeHub.disconnect();
    };
  }, [fetchAllData]);

  return (
    <MasterContext.Provider
      value={{
        metrics,
        aiInsights,
        qaReports,
        isRealtimeConnected,
        lastFetchedAt,
        loading,
        error,
        refresh,
      }}
    >
      {children}
    </MasterContext.Provider>
  );
}

export function useMaster() {
  const context = useContext(MasterContext);
  if (!context) {
    throw new Error("useMaster must be used within MasterProvider");
  }
  return context;
}
