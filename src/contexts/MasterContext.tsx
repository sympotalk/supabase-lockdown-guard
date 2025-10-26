import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { validateSystemInsights } from "@/lib/masterDashboardValidation";
import { masterRealtimeHub } from "@/lib/masterRealtimeHub";
import { toast } from "@/hooks/use-toast";

interface SystemInsights {
  healthRate: number;
  activeChannels: number;
  aiMappingRate: number;
  duplicateRate: number;
  qaPassRate: number;
  errorRate: number;
  isMock: boolean;
}

interface AIInsight {
  id: string;
  detected_at: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
}

interface QAReport {
  id: string;
  generated_at: string;
  period_start: string;
  period_end: string;
  summary: string;
  total_anomalies: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  ai_recommendations: string;
}

interface MasterContextValue {
  metrics: SystemInsights | null;
  aiInsights: AIInsight[];
  qaReports: QAReport[];
  isRealtimeConnected: boolean;
  lastFetchedAt: Date | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const MasterContext = createContext<MasterContextValue | null>(null);

const STALE_TIME = 60000; // 60s

export function MasterProvider({ children }: { children: ReactNode }) {
  const [metrics, setMetrics] = useState<SystemInsights | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [qaReports, setQaReports] = useState<QAReport[]>([]);
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
      setAiInsights((aiResult.data || []) as AIInsight[]);

      if (qaResult.error) throw qaResult.error;
      setQaReports(qaResult.data || []);

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

    // Setup realtime hub
    masterRealtimeHub.registerRefreshCallback("global", () => {
      console.log("[MasterDashboard] Realtime update received, refreshing data");
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
      setIsRealtimeConnected(masterRealtimeHub.isConnected());
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
