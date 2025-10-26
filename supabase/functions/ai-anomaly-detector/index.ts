import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SystemMetrics {
  functions_health_fail_count: number;
  error_logs_count: number;
  ai_mapping_fail_rate: number;
  qa_fail_rate: number;
  active_channels: number;
  avg_upload_time: number;
}

interface AnomalyRule {
  key: string;
  condition: (current: SystemMetrics, previous: SystemMetrics) => boolean;
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  getDescription: (current: SystemMetrics, previous: SystemMetrics) => string;
}

const anomalyRules: AnomalyRule[] = [
  {
    key: "ai_mapping_fail",
    condition: (cur, prev) => cur.ai_mapping_fail_rate > prev.ai_mapping_fail_rate * 1.1 && cur.ai_mapping_fail_rate > 10,
    severity: "warning",
    category: "AI Performance",
    title: "AI 매핑 실패율 급증",
    getDescription: (cur, prev) => `AI 매핑 실패율이 ${prev.ai_mapping_fail_rate.toFixed(1)}%에서 ${cur.ai_mapping_fail_rate.toFixed(1)}%로 증가했습니다.`,
  },
  {
    key: "qa_fail_rate",
    condition: (cur, prev) => cur.qa_fail_rate > prev.qa_fail_rate + 20 && cur.qa_fail_rate > 20,
    severity: "warning",
    category: "Data Quality",
    title: "QA 통과율 급감 감지",
    getDescription: (cur, prev) => `QA 통과율이 ${(100 - prev.qa_fail_rate).toFixed(1)}%에서 ${(100 - cur.qa_fail_rate).toFixed(1)}%로 감소했습니다.`,
  },
  {
    key: "realtime_disconnect",
    condition: (cur, prev) => cur.active_channels < prev.active_channels * 0.5 && prev.active_channels > 0,
    severity: "critical",
    category: "Connectivity",
    title: "Realtime 연결 비정상 감소",
    getDescription: (cur, prev) => `활성 채널이 ${prev.active_channels}개에서 ${cur.active_channels}개로 감소했습니다.`,
  },
  {
    key: "function_failures",
    condition: (cur, prev) => cur.functions_health_fail_count >= 2,
    severity: "critical",
    category: "System Health",
    title: "시스템 함수 장애 발생",
    getDescription: (cur) => `최근 5분간 ${cur.functions_health_fail_count}건의 함수 장애가 발생했습니다.`,
  },
  {
    key: "error_spike",
    condition: (cur, prev) => cur.error_logs_count > prev.error_logs_count * 3 && cur.error_logs_count > 10,
    severity: "warning",
    category: "Error Logs",
    title: "오류 발생 급증",
    getDescription: (cur, prev) => `오류 발생이 ${prev.error_logs_count}건에서 ${cur.error_logs_count}건으로 3배 이상 증가했습니다.`,
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = "https://sigylynftjsczhuzvbax.supabase.co";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Collect current metrics
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Mock metrics for now (TODO: Replace with actual queries when tables exist)
    const currentMetrics: SystemMetrics = {
      functions_health_fail_count: Math.floor(Math.random() * 3),
      error_logs_count: Math.floor(Math.random() * 20),
      ai_mapping_fail_rate: Math.random() * 15,
      qa_fail_rate: Math.random() * 30,
      active_channels: Math.floor(Math.random() * 10),
      avg_upload_time: 1 + Math.random() * 4,
    };

    // Get previous metrics (stored or default)
    const { data: previousRun } = await supabase
      .from("ai_insights")
      .select("metadata")
      .order("detected_at", { ascending: false })
      .limit(1)
      .single();

    const previousMetrics: SystemMetrics = previousRun?.metadata?.metrics || {
      functions_health_fail_count: 0,
      error_logs_count: 5,
      ai_mapping_fail_rate: 5,
      qa_fail_rate: 10,
      active_channels: 8,
      avg_upload_time: 2,
    };

    console.log("Current metrics:", currentMetrics);
    console.log("Previous metrics:", previousMetrics);

    // Check for anomalies
    const detectedAnomalies = anomalyRules
      .filter((rule) => rule.condition(currentMetrics, previousMetrics))
      .map((rule) => ({
        detection_key: rule.key,
        category: rule.category,
        severity: rule.severity,
        title: rule.title,
        description: rule.getDescription(currentMetrics, previousMetrics),
      }));

    console.log("Detected anomalies:", detectedAnomalies);

    // If anomalies detected, use AI to analyze and provide recommendations
    const insights = [];
    
    for (const anomaly of detectedAnomalies) {
      // Check for duplicates within last 2 hours
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const { data: existingInsight } = await supabase
        .from("ai_insights")
        .select("id")
        .eq("detection_key", anomaly.detection_key)
        .eq("status", "active")
        .gte("detected_at", twoHoursAgo.toISOString())
        .single();

      if (existingInsight) {
        console.log(`Skipping duplicate insight for ${anomaly.detection_key}`);
        continue;
      }

      // Use Lovable AI to analyze the anomaly
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        console.warn("LOVABLE_API_KEY not configured, using basic analysis");
        
        // Fallback: basic analysis without AI
        const causeAnalysis = getCauseAnalysis(anomaly.detection_key);
        const recommendedAction = getRecommendedAction(anomaly.detection_key);
        
        const { data: newInsight, error } = await supabase
          .from("ai_insights")
          .insert({
            detection_key: anomaly.detection_key,
            category: anomaly.category,
            severity: anomaly.severity,
            title: anomaly.title,
            description: anomaly.description,
            cause_analysis: causeAnalysis,
            recommended_action: recommendedAction,
            metadata: { metrics: currentMetrics },
          })
          .select()
          .single();

        if (error) {
          console.error("Error inserting insight:", error);
        } else {
          insights.push(newInsight);
        }
        continue;
      }

      // AI-powered analysis
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are a system diagnostics AI expert. Analyze anomalies in a production system and provide concise, actionable insights. Focus on likely causes and specific remediation steps. Keep responses under 200 words total.",
            },
            {
              role: "user",
              content: `Anomaly detected:
Title: ${anomaly.title}
Category: ${anomaly.category}
Severity: ${anomaly.severity}
Description: ${anomaly.description}

System context:
- Current error logs: ${currentMetrics.error_logs_count}
- AI mapping fail rate: ${currentMetrics.ai_mapping_fail_rate.toFixed(1)}%
- QA fail rate: ${currentMetrics.qa_fail_rate.toFixed(1)}%
- Active realtime channels: ${currentMetrics.active_channels}

Provide:
1. Probable cause (1-2 sentences)
2. Recommended action (2-3 specific steps)`,
            },
          ],
        }),
      });

      if (!aiResponse.ok) {
        console.error("AI analysis failed:", await aiResponse.text());
        continue;
      }

      const aiData = await aiResponse.json();
      const aiAnalysis = aiData.choices[0]?.message?.content || "분석 실패";

      // Parse AI response (simple split for now)
      const parts = aiAnalysis.split(/\d\.\s+/);
      const causeAnalysis = parts[1]?.trim() || "원인 분석 중";
      const recommendedAction = parts[2]?.trim() || "조치 방안 검토 중";

      const { data: newInsight, error } = await supabase
        .from("ai_insights")
        .insert({
          detection_key: anomaly.detection_key,
          category: anomaly.category,
          severity: anomaly.severity,
          title: anomaly.title,
          description: anomaly.description,
          cause_analysis: causeAnalysis,
          recommended_action: recommendedAction,
          metadata: { 
            metrics: currentMetrics,
            ai_analysis: aiAnalysis,
          },
        })
        .select()
        .single();

      if (error) {
        console.error("Error inserting insight:", error);
      } else {
        insights.push(newInsight);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        detected: detectedAnomalies.length,
        inserted: insights.length,
        insights,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("AI Anomaly Detector error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function getCauseAnalysis(key: string): string {
  const analyses: Record<string, string> = {
    ai_mapping_fail: "업로드된 데이터의 품질이 저하되었거나 AI 매핑 로직에 지연이 발생했을 가능성이 있습니다.",
    qa_fail_rate: "최근 코드 수정으로 인한 검증 로직 변경 또는 입력 데이터의 형식 불일치가 원인일 수 있습니다.",
    realtime_disconnect: "Supabase Realtime 연결 토큰 만료 또는 클라이언트 세션 충돌이 의심됩니다.",
    function_failures: "시스템 함수 실행 중 예외 발생 또는 외부 API 응답 지연이 원인일 수 있습니다.",
    error_spike: "급격한 트래픽 증가 또는 특정 기능의 오류가 반복적으로 발생하고 있습니다.",
  };
  return analyses[key] || "원인 분석이 필요합니다.";
}

function getRecommendedAction(key: string): string {
  const actions: Record<string, string> = {
    ai_mapping_fail: "1. participants_log 테이블의 최근 실패 로그 확인\n2. 업로드 데이터 샘플 검토\n3. 필요시 AI 모델 재학습 요청",
    qa_fail_rate: "1. 최근 배포된 코드 변경사항 확인\n2. qa_reports 테이블에서 실패 패턴 분석\n3. 테스트 케이스 재실행 및 수정",
    realtime_disconnect: "1. Supabase 프로젝트의 Realtime 설정 확인\n2. 클라이언트 세션 로그 검토\n3. 필요시 연결 재설정 로직 추가",
    function_failures: "1. functions_logs에서 실패한 함수 식별\n2. 해당 함수의 에러 스택 확인\n3. 외부 API 연결 상태 점검",
    error_spike: "1. error_logs에서 가장 빈번한 오류 유형 확인\n2. 해당 오류의 발생 패턴 분석\n3. 급한 경우 해당 기능 일시 비활성화 검토",
  };
  return actions[key] || "조치 방안을 검토해주세요.";
}
