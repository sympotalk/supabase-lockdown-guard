import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "@/hooks/use-toast";

type AlertPriority = "critical" | "high" | "medium" | "low";
type SectionTag = "SYSTEM_HEALTH" | "AUTOMATION" | "ANOMALY" | "QA" | "GLOBAL";
type RefreshCallback = (tag: SectionTag) => void;

interface AlertConfig {
  title: string;
  description: string;
  priority: AlertPriority;
}

let masterChannel: RealtimeChannel | null = null;
let connectionFailures = 0;
let isStaticMode = false;
let debounceTimer: number | null = null;

const MAX_FAILURES = 5;
const DEBOUNCE_MS = 250;

export class MasterRealtimeHub {
  private unifiedCallback: RefreshCallback | null = null;
  private pendingTags: Set<SectionTag> = new Set();

  constructor() {
    console.log("[MasterRealtime] Initializing...");
  }

  registerUnifiedCallback(callback: RefreshCallback) {
    this.unifiedCallback = callback;
    console.log("[MasterRealtime] Unified callback registered");
  }

  private triggerRefresh(tag: SectionTag) {
    this.pendingTags.add(tag);

    // Debounce: clear existing timer and set new one
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = window.setTimeout(() => {
      if (this.unifiedCallback && this.pendingTags.size > 0) {
        console.log(`[MasterRealtime] EVENT ${Array.from(this.pendingTags).join(", ")}`);
        
        // Trigger global refresh with all pending tags
        this.pendingTags.forEach(t => {
          if (this.unifiedCallback) {
            this.unifiedCallback(t);
          }
        });
        
        this.pendingTags.clear();
      }
      debounceTimer = null;
    }, DEBOUNCE_MS);
  }

  private showAlert(config: AlertConfig) {
    const variant = config.priority === "critical" || config.priority === "high" 
      ? "destructive" 
      : "default";

    toast({
      title: config.title,
      description: config.description,
      variant,
      duration: 3000,
    });

    // Log to console for debugging
    console.log(`[AlertHub ${config.priority.toUpperCase()}]`, config.title, config.description);
  }

  private handleHealthEvent(payload: any) {
    if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
      const status = payload.new?.status;
      if (status === "fail" || status === "down") {
        this.showAlert({
          title: "⚠️ 시스템 함수 장애 발생",
          description: `${payload.new?.service || "알 수 없는 서비스"}에서 문제가 감지되었습니다.`,
          priority: "critical",
        });
      }
    }
    this.triggerRefresh("SYSTEM_HEALTH");
  }

  private handleAgencyEvent(payload: any) {
    if (payload.eventType === "INSERT") {
      this.showAlert({
        title: "🆕 신규 에이전시 등록",
        description: `${payload.new?.name || "새 에이전시"}가 등록되었습니다.`,
        priority: "medium",
      });
    }
    this.triggerRefresh("GLOBAL");
  }

  private handleErrorLogEvent(payload: any) {
    if (payload.eventType === "INSERT") {
      const module = payload.new?.module || "Unknown";
      const severity = payload.new?.severity || "error";
      if (severity === "critical" || severity === "error") {
        this.showAlert({
          title: `🚨 새 오류 발생: ${module}`,
          description: payload.new?.message || "오류가 발생했습니다.",
          priority: "critical",
        });
      }
    }
    this.triggerRefresh("ANOMALY");
  }

  private handleQAReportEvent(payload: any) {
    if (payload.eventType === "INSERT" && payload.new?.status === "FAIL") {
      this.showAlert({
        title: "❌ QA 실패",
        description: `${payload.new?.module_name || "모듈"} QA 검사에 실패했습니다.`,
        priority: "high",
      });
    }
    this.triggerRefresh("QA");
  }

  private handleAIInsightsEvent(payload: any) {
    if (payload.eventType === "INSERT") {
      const severity = payload.new?.severity || "info";
      if (severity === "critical") {
        this.showAlert({
          title: "🤖 AI 이상 감지",
          description: payload.new?.title || "새로운 이상 징후가 감지되었습니다.",
          priority: "critical",
        });
      }
    }
    this.triggerRefresh("ANOMALY");
  }

  private handleAutomationEvent() {
    this.triggerRefresh("AUTOMATION");
  }

  private handleConnectionError() {
    connectionFailures++;
    console.warn(`[MasterRealtime] Connection failure count: ${connectionFailures}`);
    
    if (connectionFailures >= MAX_FAILURES && !isStaticMode) {
      isStaticMode = true;
      this.showAlert({
        title: "⚠️ 정적 모드 전환",
        description: "실시간 연결이 불안정하여 정적 모드로 전환합니다.",
        priority: "high",
      });
      console.warn("[MasterRealtime] Switched to static mode due to connection failures");
    }
  }

  connect() {
    if (masterChannel) {
      console.log("[MasterRealtime] Already connected");
      return;
    }

    if (isStaticMode) {
      console.log("[MasterRealtime] In static mode, skipping connection");
      return;
    }

    console.log("[MasterRealtime] Connecting...");

    masterChannel = supabase
      .channel("master_realtime_hub")
      // SYSTEM_HEALTH: functions_health
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "functions_health" },
        (payload) => this.handleHealthEvent(payload)
      )
      // GLOBAL: agencies, events, participants
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agencies" },
        (payload) => this.handleAgencyEvent(payload)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        (payload) => this.triggerRefresh("GLOBAL")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants" },
        (payload) => this.triggerRefresh("GLOBAL")
      )
      // ANOMALY: ai_insights, error_logs
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ai_insights" },
        (payload) => this.handleAIInsightsEvent(payload)
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "error_logs" },
        (payload) => this.handleErrorLogEvent(payload)
      )
      // QA: qa_reports
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "qa_reports" },
        (payload) => this.handleQAReportEvent(payload)
      )
      // AUTOMATION: automation_jobs
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "automation_jobs" },
        (payload) => this.handleAutomationEvent()
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("[MasterRealtime] Connected");
          connectionFailures = 0;
          isStaticMode = false;
        } else if (status === "CHANNEL_ERROR") {
          console.error("[MasterRealtime] Channel error:", err);
          console.error("[MasterRealtime] Disconnected (retry scheduled)");
          this.handleConnectionError();
        } else if (status === "TIMED_OUT") {
          console.error("[MasterRealtime] Connection timed out");
          console.error("[MasterRealtime] Disconnected (retry scheduled)");
          this.handleConnectionError();
        } else {
          console.log(`[MasterRealtime] Status: ${status}`);
        }
      });
  }

  disconnect() {
    if (masterChannel) {
      console.log("[MasterRealtime] Disconnecting...");
      masterChannel.unsubscribe();
      masterChannel = null;
      this.unifiedCallback = null;
      this.pendingTags.clear();
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
    }
  }

  isConnected(): boolean {
    return masterChannel !== null && !isStaticMode;
  }

  isInStaticMode(): boolean {
    return isStaticMode;
  }

  resetStaticMode() {
    connectionFailures = 0;
    isStaticMode = false;
    console.log("[MasterRealtime] Static mode reset");
  }
}

// Singleton instance
export const masterRealtimeHub = new MasterRealtimeHub();
