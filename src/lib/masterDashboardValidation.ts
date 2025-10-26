import { supabase } from "@/integrations/supabase/client";
import { getCachedData, setCachedData, generateCacheKey } from "./cacheUtils";
import { logSys, warnSys, errorSys } from "./consoleLogger";

// Mock Fallback Data Structures
export const mockData = {
  functions_health: [
    { service: "system_check", status: "healthy", last_check: new Date().toISOString() },
    { service: "realtime_sync", status: "healthy", last_check: new Date().toISOString() }
  ],
  agencies: [
    { id: "mock-1", name: "테스트에이전시 A", is_active: true, created_at: new Date().toISOString() },
    { id: "mock-2", name: "테스트에이전시 B", is_active: true, created_at: new Date().toISOString() }
  ],
  events: [
    { id: "mock-1", name: "테스트행사", created_at: new Date().toISOString() }
  ],
  participants: [
    { id: "mock-1", name: "참가자1", event_id: "mock-1" },
    { id: "mock-2", name: "참가자2", event_id: "mock-1" }
  ],
  participants_log: [
    { ai_mapping_status: "success", participant_id: "mock-1" },
    { ai_mapping_status: "success", participant_id: "mock-2" }
  ],
  duplicate_detector: [
    { name: "홍길동", event_id: "mock-1", count: 2 },
    { name: "김철수", event_id: "mock-2", count: 3 }
  ],
  upload_logs: [
    { agency_id: "mock-1", created_at: new Date().toISOString() }
  ],
  error_logs: [
    { 
      module: "system_test", 
      message: "Mock error log entry", 
      severity: "info", 
      created_at: new Date().toISOString() 
    }
  ],
  qa_reports: [
    { module_name: "참가자 업로드", score: 98, status: "pass", created_at: new Date().toISOString() }
  ],
  functions_logs: [
    { function_name: "on_upload_trigger", status: "success", created_at: new Date().toISOString() }
  ],
  system_insights: {
    healthRate: 98.5,
    activeChannels: 7,
    aiMappingRate: 94.2,
    duplicateRate: 1.3,
    qaPassRate: 87.0,
    errorRate: 2.8,
  }
};

// Validation Result Type
export interface ValidationResult<T> {
  data: T;
  isMock: boolean;
  error?: string;
}

// A1: System Health Status
export async function validateSystemHealth(): Promise<ValidationResult<"healthy" | "degraded" | "down">> {
  try {
    const { error } = await supabase.from("agencies").select("id", { count: "exact", head: true });
    
    if (error) {
      warnSys("Supabase connection check failed:", error.message);
      return { data: "down", isMock: true, error: error.message };
    }
    
    logSys("Supabase connection successful");
    return { data: "healthy", isMock: false };
  } catch (err) {
    errorSys("System health check exception:", err);
    return { data: "down", isMock: true, error: String(err) };
  }
}

// A2: Realtime Channel Count
export async function validateRealtimeChannels(): Promise<ValidationResult<number>> {
  try {
    // TODO: Implement actual realtime channel monitoring when available
    logSys("Realtime monitoring skipped — channel data not yet available");
    return { data: 3, isMock: true };
  } catch (err) {
    errorSys("Realtime channels check failed:", err);
    return { data: 0, isMock: true, error: String(err) };
  }
}

// A3: Function/Trigger Count
export async function validateFunctionCount(): Promise<ValidationResult<number>> {
  try {
    // TODO: Query functions_health table when available
    logSys("functions_health table not available — fallback to mock data");
    return { data: 12, isMock: true };
  } catch (err) {
    errorSys("Function count check failed:", err);
    return { data: 0, isMock: true, error: String(err) };
  }
}

// B1: Active Agency Count
export async function validateActiveAgencies(): Promise<ValidationResult<number>> {
  try {
    const { count, error } = await supabase
      .from("agencies")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (error) {
      warnSys("Active agencies query failed:", error.message);
      return { data: mockData.agencies.length, isMock: true, error: error.message };
    }

    logSys(`Active agencies count = ${count}`);
    return { data: count ?? 0, isMock: false };
  } catch (err) {
    errorSys("Active agencies exception:", err);
    return { data: mockData.agencies.length, isMock: true, error: String(err) };
  }
}

// B2: Recent Events (7 days)
export async function validateRecentEvents(): Promise<ValidationResult<number>> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count, error } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());

    if (error) {
      warnSys("Recent events query failed:", error.message);
      return { data: mockData.events.length, isMock: true, error: error.message };
    }

    logSys(`Recent events (7 days) = ${count}`);
    return { data: count ?? 0, isMock: false };
  } catch (err) {
    errorSys("Recent events exception:", err);
    return { data: mockData.events.length, isMock: true, error: String(err) };
  }
}

// B3: Total Participants
export async function validateTotalParticipants(): Promise<ValidationResult<number>> {
  try {
    const { count, error } = await supabase
      .from("participants")
      .select("*", { count: "exact", head: true });

    if (error) {
      warnSys("Total participants query failed:", error.message);
      return { data: mockData.participants.length, isMock: true, error: error.message };
    }

    logSys(`Total participants = ${count}`);
    return { data: count ?? 0, isMock: false };
  } catch (err) {
    errorSys("Total participants exception:", err);
    return { data: mockData.participants.length, isMock: true, error: String(err) };
  }
}

// B4: Recent Uploads
export async function validateRecentUploads(): Promise<ValidationResult<number>> {
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data, error } = await supabase
      .from("activity_logs")
      .select("id")
      .eq("type", "upload")
      .gte("created_at", threeDaysAgo.toISOString());

    if (error) {
      warnSys("Recent uploads query failed:", error.message);
      return { data: mockData.upload_logs.length, isMock: true, error: error.message };
    }

    logSys(`Recent uploads (3 days) = ${data?.length ?? 0}`);
    return { data: data?.length ?? 0, isMock: false };
  } catch (err) {
    errorSys("Recent uploads exception:", err);
    return { data: mockData.upload_logs.length, isMock: true, error: String(err) };
  }
}

// C1: AI Mapping Stats
export async function validateAIMappingStats(): Promise<ValidationResult<{ success: number; fail: number; total: number }>> {
  try {
    // TODO: Query participants_log when table is available
    logSys("participants_log table not available — fallback to mock data");
    return { 
      data: { success: 94, fail: 6, total: 100 }, 
      isMock: true 
    };
  } catch (err) {
    errorSys("AI mapping stats exception:", err);
    return { 
      data: { success: 0, fail: 0, total: 0 }, 
      isMock: true, 
      error: String(err) 
    };
  }
}

// C2: Duplicate Detector RPC
export async function validateDuplicateDetector(): Promise<ValidationResult<Array<{ name: string; event_id: string; count: number }>>> {
  try {
    // TODO: RPC not yet available in Supabase types
    logSys("duplicate_detector RPC not available — fallback to mock data");
    return { data: mockData.duplicate_detector, isMock: true };
  } catch (err) {
    errorSys("Duplicate detector exception:", err);
    return { data: mockData.duplicate_detector, isMock: true, error: String(err) };
  }
}

// D1: Function Monitor
export async function validateFunctionMonitor(): Promise<ValidationResult<Array<any>>> {
  try {
    // TODO: Query functions_logs when table is available
    logSys("functions_logs table not available — fallback to mock data");
    return { 
      data: [
        { name: "on_upload_trigger", status: "healthy", lastRun: "10.26 13:20", failureRate: 0.0 },
        { name: "ai_mapping_batch", status: "slow", lastRun: "10.26 12:59", failureRate: 12.5 },
        { name: "export_zip_job", status: "healthy", lastRun: "10.26 10:12", failureRate: 0.0 }
      ], 
      isMock: true 
    };
  } catch (err) {
    errorSys("Function monitor exception:", err);
    return { data: [], isMock: true, error: String(err) };
  }
}

// E1: Error Logs Recent
export async function validateErrorLogs(): Promise<ValidationResult<Array<any>>> {
  try {
    // TODO: error_logs table not yet available in Supabase types
    logSys("error_logs table not available — fallback to mock data");
    return { data: mockData.error_logs, isMock: true };
  } catch (err) {
    errorSys("Error logs exception:", err);
    return { data: mockData.error_logs, isMock: true, error: String(err) };
  }
}

// F1: QA Reports Latest
export async function validateQAReports(): Promise<ValidationResult<Array<any>>> {
  try {
    // TODO: qa_reports table not yet available in Supabase types
    logSys("qa_reports table not available — fallback to mock data");
    return { data: mockData.qa_reports, isMock: true };
  } catch (err) {
    errorSys("QA reports exception:", err);
    return { data: mockData.qa_reports, isMock: true, error: String(err) };
  }
}

// System Insights Validation (Phase 3.9-L)
export async function validateSystemInsights(): Promise<ValidationResult<{
  healthRate: number;
  activeChannels: number;
  aiMappingRate: number;
  duplicateRate: number;
  qaPassRate: number;
  errorRate: number;
}>> {
  const cacheKey = generateCacheKey("system_insights");
  
  // Try cache first (60 second TTL)
  const cached = await getCachedData<any>(cacheKey, 60);
  if (cached) {
    logSys("Using cached system insights");
    return { data: cached, isMock: cached.isMock || false };
  }

  logSys("Calculating comprehensive system insights...");
  
  try {
    // Run all validations in parallel
    const [healthResult, channelsResult, participantsResult] = await Promise.all([
      validateSystemHealth(),
      validateRealtimeChannels(),
      validateTotalParticipants(),
    ]);

    const isMock = healthResult.isMock || channelsResult.isMock;

    // Calculate system health rate
    const healthRate = healthResult.data === "healthy" ? 98.5 : 
                       healthResult.data === "degraded" ? 75.0 : 25.0;
    
    // Get active channels
    const activeChannels = channelsResult.data;
    
    // AI mapping success rate (mock for now - TODO: calculate from participants_log)
    const aiMappingRate = 94.2;
    
    // Duplicate detection rate (mock for now - TODO: calculate from duplicate_detector())
    const duplicateRate = 1.3;
    
    // QA pass rate (mock for now - TODO: calculate from qa_reports)
    const qaPassRate = 87.0;
    
    // Error rate (mock for now - TODO: calculate from error_logs)
    const errorRate = 2.8;

    const data = {
      healthRate,
      activeChannels,
      aiMappingRate,
      duplicateRate,
      qaPassRate,
      errorRate,
    };

    logSys("System insights calculated:", data);
    
    // Cache the result
    await setCachedData(cacheKey, data);
    
    return { data, isMock };
  } catch (error) {
    errorSys("Error calculating insights, using mock:", error);
    return { data: mockData.system_insights, isMock: true, error: String(error) };
  }
}

// Master validation runner
export async function runMasterDashboardValidation(): Promise<{
  success: number;
  failed: number;
  mock: number;
  total: number;
}> {
  logSys("Starting Master Dashboard validation...");
  
  const results = await Promise.allSettled([
    validateSystemHealth(),
    validateRealtimeChannels(),
    validateFunctionCount(),
    validateActiveAgencies(),
    validateRecentEvents(),
    validateTotalParticipants(),
    validateRecentUploads(),
    validateAIMappingStats(),
    validateDuplicateDetector(),
    validateFunctionMonitor(),
    validateErrorLogs(),
    validateQAReports()
  ]);

  const stats = results.reduce((acc, result) => {
    if (result.status === "fulfilled") {
      const validation = result.value;
      if (validation.isMock) {
        acc.mock++;
      } else {
        acc.success++;
      }
    } else {
      acc.failed++;
    }
    return acc;
  }, { success: 0, failed: 0, mock: 0, total: results.length });

  logSys("Validation complete:", stats);
  
  return stats;
}
