import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "@/hooks/use-toast";

type AlertPriority = "critical" | "high" | "medium" | "low";
type RefreshCallback = () => void;

interface AlertConfig {
  title: string;
  description: string;
  priority: AlertPriority;
}

let masterChannel: RealtimeChannel | null = null;
let connectionFailures = 0;
let isStaticMode = false;

const MAX_FAILURES = 5;

export class MasterRealtimeHub {
  private refreshCallbacks: Map<string, RefreshCallback> = new Map();

  constructor() {
    console.log("[MasterRealtimeHub] Initializing...");
  }

  registerRefreshCallback(section: string, callback: RefreshCallback) {
    this.refreshCallbacks.set(section, callback);
    console.log(`[MasterRealtimeHub] Registered refresh for section: ${section}`);
  }

  private triggerRefresh(section: string) {
    const callback = this.refreshCallbacks.get(section);
    if (callback) {
      console.log(`[MasterRealtimeHub] Triggering refresh for: ${section}`);
      callback();
    }
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
    console.log("[MasterRealtimeHub] functions_health event:", payload);
    
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
    
    this.triggerRefresh("A");
  }

  private handleRealtimeChannelEvent(payload: any) {
    console.log("[MasterRealtimeHub] realtime_channels event:", payload);
    
    if (payload.eventType === "DELETE") {
      this.showAlert({
        title: "❌ Realtime 연결 끊김",
        description: "실시간 채널 연결이 해제되었습니다.",
        priority: "high",
      });
    }
    
    this.triggerRefresh("A");
  }

  private handleAgencyEvent(payload: any) {
    console.log("[MasterRealtimeHub] agencies event:", payload);
    
    if (payload.eventType === "INSERT") {
      this.showAlert({
        title: "🆕 신규 에이전시 등록",
        description: `${payload.new?.name || "새 에이전시"}가 등록되었습니다.`,
        priority: "medium",
      });
    }
    
    this.triggerRefresh("B");
  }

  private handleEventEvent(payload: any) {
    console.log("[MasterRealtimeHub] events event:", payload);
    
    if (payload.eventType === "INSERT") {
      this.showAlert({
        title: "🆕 신규 행사 등록",
        description: `${payload.new?.title || payload.new?.name || "새 행사"}가 생성되었습니다.`,
        priority: "medium",
      });
    }
    
    this.triggerRefresh("B");
  }

  private handleParticipantLogEvent(payload: any) {
    console.log("[MasterRealtimeHub] participants_log event:", payload);
    
    if (payload.eventType === "INSERT" && payload.new?.action === "ai_mapping_failed") {
      this.showAlert({
        title: "⚠️ AI 매핑 오류 감지",
        description: "참가자 AI 매핑에 실패했습니다.",
        priority: "medium",
      });
    }
    
    this.triggerRefresh("C");
  }

  private handleFunctionLogEvent(payload: any) {
    console.log("[MasterRealtimeHub] functions_logs event:", payload);
    this.triggerRefresh("D");
  }

  private handleErrorLogEvent(payload: any) {
    console.log("[MasterRealtimeHub] error_logs event:", payload);
    
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
    
    this.triggerRefresh("E");
  }

  private handleQAReportEvent(payload: any) {
    console.log("[MasterRealtimeHub] qa_reports event:", payload);
    
    if (payload.eventType === "INSERT" && payload.new?.status === "FAIL") {
      this.showAlert({
        title: "❌ QA 실패",
        description: `${payload.new?.module_name || "모듈"} QA 검사에 실패했습니다.`,
        priority: "high",
      });
    }
    
    this.triggerRefresh("F");
  }

  private handleConnectionError() {
    connectionFailures++;
    console.warn(`[MasterRealtimeHub] Connection failure count: ${connectionFailures}`);
    
    if (connectionFailures >= MAX_FAILURES && !isStaticMode) {
      isStaticMode = true;
      this.showAlert({
        title: "⚠️ 정적 모드 전환",
        description: "실시간 연결이 불안정하여 정적 모드로 전환합니다.",
        priority: "high",
      });
      console.warn("[MasterRealtimeHub] Switched to static mode due to connection failures");
    }
  }

  connect() {
    if (masterChannel) {
      console.log("[MasterRealtimeHub] Already connected");
      return;
    }

    if (isStaticMode) {
      console.log("[MasterRealtimeHub] In static mode, skipping connection");
      return;
    }

    console.log("[MasterRealtimeHub] Connecting to master_realtime_hub...");

    masterChannel = supabase
      .channel("master_realtime_hub")
      // A1: functions_health
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "functions_health" },
        (payload) => this.handleHealthEvent(payload)
      )
      // A2: realtime_channels (if exists)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "realtime_channels" },
        (payload) => this.handleRealtimeChannelEvent(payload)
      )
      // B1: agencies
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agencies" },
        (payload) => this.handleAgencyEvent(payload)
      )
      // B2: events
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        (payload) => this.handleEventEvent(payload)
      )
      // B3: participants
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants" },
        (payload) => {
          console.log("[MasterRealtimeHub] participants event:", payload);
          this.triggerRefresh("B");
        }
      )
      // C1: participants_log
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants_log" },
        (payload) => this.handleParticipantLogEvent(payload)
      )
      // D1: functions_logs (if exists)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "functions_logs" },
        (payload) => this.handleFunctionLogEvent(payload)
      )
      // E1: error_logs (if exists)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "error_logs" },
        (payload) => this.handleErrorLogEvent(payload)
      )
      // F1: qa_reports (if exists)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "qa_reports" },
        (payload) => this.handleQAReportEvent(payload)
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("[MasterRealtimeHub] ✅ Connected successfully");
          connectionFailures = 0;
          isStaticMode = false;
        } else if (status === "CHANNEL_ERROR") {
          console.error("[MasterRealtimeHub] ❌ Channel error:", err);
          this.handleConnectionError();
        } else if (status === "TIMED_OUT") {
          console.error("[MasterRealtimeHub] ⏱️ Connection timed out");
          this.handleConnectionError();
        } else {
          console.log(`[MasterRealtimeHub] Status: ${status}`);
        }
      });
  }

  disconnect() {
    if (masterChannel) {
      console.log("[MasterRealtimeHub] Disconnecting...");
      masterChannel.unsubscribe();
      masterChannel = null;
      this.refreshCallbacks.clear();
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
    console.log("[MasterRealtimeHub] Static mode reset");
  }
}

// Singleton instance
export const masterRealtimeHub = new MasterRealtimeHub();
