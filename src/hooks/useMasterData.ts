import useSWR from "swr";
import { supabase } from "@/integrations/supabase/client";
import { validateSystemInsights } from "@/lib/masterDashboardValidation";
import { MasterMetricsUI, AIInsightUI, QAReportUI } from "@/types/masterUI";

// [3.14-MD.OPTIMIZE.R2] SWR configuration optimized for master dashboard
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60000, // 60s deduplication
  keepPreviousData: true,
  focusThrottleInterval: 120000, // 120s focus throttle
  // refreshInterval removed - no background polling
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
 * [3.14-MD.OPTIMIZE.R2] Preload all master dashboard data in parallel
 * Call this early to start fetching before components mount
 */
export async function preloadMasterData() {
  console.time("[3.14-MD.OPTIMIZE] preloadMasterData");
  console.log("[useMasterData] Preloading master data (parallel)");
  
  try {
    // Execute all tasks in parallel for faster loading
    await Promise.all([
      validateSystemInsights(),
      supabase.from("ai_insights").select("*").eq("status", "active").limit(10),
      supabase.from("qa_reports").select("*").limit(20),
    ]);
    console.timeEnd("[3.14-MD.OPTIMIZE] preloadMasterData");
  } catch (err) {
    console.error("[useMasterData] Preload failed:", err);
    console.timeEnd("[3.14-MD.OPTIMIZE] preloadMasterData");
  }
}
