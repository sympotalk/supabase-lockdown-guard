import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { masterRealtimeHub } from "@/lib/masterRealtimeHub";
import { toast } from "@/hooks/use-toast";
import { MasterMetricsUI, AIInsightUI, QAReportUI } from "@/types/masterUI";
import { useSystemMetrics, useAIInsights, useQAReports, preloadMasterData } from "@/hooks/useMasterData";

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
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  // Use SWR hooks for data fetching with automatic caching
  const { data: metrics = defaultMetrics, error: metricsError, mutate: mutateMetrics } = useSystemMetrics();
  const { data: aiInsights = [], error: aiError, mutate: mutateAI } = useAIInsights();
  const { data: qaReports = [], error: qaError, mutate: mutateQA } = useQAReports();

  // Aggregate loading and error states
  const loading = !metrics || metrics.isMock;
  const error = metricsError || aiError || qaError;

  // Refresh all data by invalidating SWR cache
  const refresh = useCallback(async () => {
    console.log("[MasterContext] Manual refresh triggered");
    setLastFetchedAt(new Date());
    await Promise.all([
      mutateMetrics(),
      mutateAI(),
      mutateQA(),
    ]);
  }, [mutateMetrics, mutateAI, mutateQA]);

  useEffect(() => {
    console.log("[MasterContext] Initializing with SWR-based data fetching");

    // Preload data immediately
    preloadMasterData();

    // Setup unified realtime callback
    masterRealtimeHub.registerUnifiedCallback((tag) => {
      console.log(`[MasterContext] Realtime update received: ${tag}`);
      refresh();
    });

    // Connect to realtime in background (non-blocking)
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        console.log("[MasterContext] Connecting realtime hub (idle callback)");
        masterRealtimeHub.connect();
        setIsRealtimeConnected(masterRealtimeHub.isConnected());
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        console.log("[MasterContext] Connecting realtime hub (setTimeout fallback)");
        masterRealtimeHub.connect();
        setIsRealtimeConnected(masterRealtimeHub.isConnected());
      }, 0);
    }

    // Check realtime status periodically
    const statusInterval = setInterval(() => {
      const connected = masterRealtimeHub.isConnected();
      setIsRealtimeConnected(connected);
    }, 5000);

    return () => {
      console.log("[MasterContext] Cleaning up");
      clearInterval(statusInterval);
      masterRealtimeHub.disconnect();
    };
  }, [refresh]);

  // Show error toast once if there's an error
  useEffect(() => {
    if (error) {
      console.error("[MasterContext] Data fetch error:", error);
      toast({
        title: "오류",
        description: "데이터를 불러오지 못했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    }
  }, [error]);

  return (
    <MasterContext.Provider
      value={{
        metrics,
        aiInsights,
        qaReports,
        isRealtimeConnected,
        lastFetchedAt,
        loading,
        error: error ? "데이터를 불러오지 못했습니다." : null,
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
