import useSWR from "swr";
import { supabase } from "@/integrations/supabase/client";
import { validateSystemInsights } from "@/lib/masterDashboardValidation";
import { MasterMetricsUI, AIInsightUI, QAReportUI } from "@/types/masterUI";

// SWR configuration for master dashboard
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 30000, // 30s deduplication
  refreshInterval: 60000, // 60s polling
};

/**
 * Hook for system metrics with SWR caching
 */
export function useSystemMetrics() {
  return useSWR<MasterMetricsUI>(
    "master:system-metrics",
    async () => {
      console.log("[useMasterData] Fetching system metrics");
      const result = await validateSystemInsights();
      return {
        healthRate: result.data.healthRate,
        activeChannels: result.data.activeChannels,
        aiMappingRate: result.data.aiMappingRate,
        duplicateRate: result.data.duplicateRate,
        qaPassRate: result.data.qaPassRate,
        errorRate: result.data.errorRate,
        isMock: result.isMock,
      };
    },
    swrConfig
  );
}

/**
 * Hook for AI insights with SWR caching
 */
export function useAIInsights() {
  return useSWR<AIInsightUI[]>(
    "master:ai-insights",
    async () => {
      console.log("[useMasterData] Fetching AI insights");
      const { data, error } = await supabase
        .from("ai_insights")
        .select("*")
        .eq("status", "active")
        .order("detected_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        detectedAt: item.detected_at,
        severity: item.severity,
        title: item.title,
        description: item.description,
      }));
    },
    swrConfig
  );
}

/**
 * Hook for QA reports with SWR caching
 */
export function useQAReports() {
  return useSWR<QAReportUI[]>(
    "master:qa-reports",
    async () => {
      console.log("[useMasterData] Fetching QA reports");
      const { data, error } = await supabase
        .from("qa_reports")
        .select("*")
        .order("generated_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      return (data || []).map((item: any) => ({
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
    },
    swrConfig
  );
}

/**
 * Preload all master dashboard data
 * Call this early to start fetching before components mount
 */
export function preloadMasterData() {
  console.log("[useMasterData] Preloading master data");
  
  // Queue preloads sequentially to avoid overwhelming Supabase
  const tasks = [
    () => validateSystemInsights(),
    () => supabase.from("ai_insights").select("*").eq("status", "active").limit(10),
    () => supabase.from("qa_reports").select("*").limit(20),
  ];

  // Execute sequentially with small delays
  const executeQueue = async () => {
    for (let i = 0; i < tasks.length; i++) {
      try {
        await new Promise((resolve) => {
          setTimeout(async () => {
            await tasks[i]();
            resolve(null);
          }, i * 100); // 100ms stagger
        });
      } catch (err) {
        console.error(`[useMasterData] Preload task ${i} failed:`, err);
      }
    }
  };

  return executeQueue();
}
