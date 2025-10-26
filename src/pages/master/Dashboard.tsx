import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  FileText,
  Zap,
  Users,
  Calendar,
  Upload,
  MessageSquare,
  Shield
} from "lucide-react";

interface SystemHealth {
  supabase: "healthy" | "degraded" | "down";
  functions: number;
  triggers: number;
  realtimeChannels: number;
}

interface AgencyActivity {
  activeAgencies: number;
  recentEvents: number;
  avgParticipants: number;
  recentUploads: number;
  messageSuccessRate: number;
}

interface DataQuality {
  aiMappingSuccess: number;
  duplicatesDetected: number;
  roomingLinked: number;
  formResponseRate: number;
}

interface FunctionHealth {
  name: string;
  status: "healthy" | "slow" | "failed";
  lastRun: string;
  failureRate: number;
}

interface ErrorLog {
  timestamp: string;
  level: "critical" | "warning" | "info";
  source: string;
  message: string;
}

interface QAReport {
  module: string;
  status: "pass" | "warn" | "fail";
  score: number;
  timestamp: string;
}

export default function MasterDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    supabase: "healthy",
    functions: 0,
    triggers: 0,
    realtimeChannels: 0
  });
  const [agencyActivity, setAgencyActivity] = useState<AgencyActivity>({
    activeAgencies: 0,
    recentEvents: 0,
    avgParticipants: 0,
    recentUploads: 0,
    messageSuccessRate: 0
  });
  const [dataQuality, setDataQuality] = useState<DataQuality>({
    aiMappingSuccess: 0,
    duplicatesDetected: 0,
    roomingLinked: 0,
    formResponseRate: 0
  });
  const [functionHealth, setFunctionHealth] = useState<FunctionHealth[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [qaReports, setQAReports] = useState<QAReport[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    console.log("[MasterDashboard] Loading system diagnostics...");

    try {
      // Parallel data loading
      await Promise.all([
        loadSystemHealth(),
        loadAgencyActivity(),
        loadDataQuality(),
        loadFunctionHealth(),
        loadErrorLogs(),
        loadQAReports()
      ]);
    } catch (error) {
      console.error("[MasterDashboard] Error loading data:", error);
    }

    setLoading(false);
  };

  const loadSystemHealth = async () => {
    // Check Supabase connection
    const { error } = await supabase.from("agencies").select("id", { count: "exact", head: true });
    
    setSystemHealth({
      supabase: error ? "down" : "healthy",
      functions: 12, // TODO: Get from functions_health table
      triggers: 8,   // TODO: Get from pg_trigger count
      realtimeChannels: 3 // TODO: Get from realtime monitoring
    });
  };

  const loadAgencyActivity = async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      { count: activeAgencies },
      { count: recentEvents },
      { count: totalParticipants },
      { count: totalEvents },
      { data: activityLogs }
    ] = await Promise.all([
      supabase.from("agencies").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("events").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo.toISOString()),
      supabase.from("participants").select("*", { count: "exact", head: true }),
      supabase.from("events").select("*", { count: "exact", head: true }),
      supabase.from("activity_logs").select("type").eq("type", "upload").gte("created_at", sevenDaysAgo.toISOString())
    ]);

    setAgencyActivity({
      activeAgencies: activeAgencies ?? 0,
      recentEvents: recentEvents ?? 0,
      avgParticipants: totalEvents && totalEvents > 0 ? Math.round((totalParticipants ?? 0) / totalEvents) : 0,
      recentUploads: activityLogs?.length ?? 0,
      messageSuccessRate: 92.5 // TODO: Calculate from messages_logs
    });
  };

  const loadDataQuality = async () => {
    // TODO: Implement actual queries to participants_log, rooming_participants
    setDataQuality({
      aiMappingSuccess: 94.2,
      duplicatesDetected: 3,
      roomingLinked: 87.5,
      formResponseRate: 76.8
    });
  };

  const loadFunctionHealth = async () => {
    // TODO: Query functions_health and functions_logs
    setFunctionHealth([
      { name: "on_upload_trigger", status: "healthy", lastRun: "10.26 13:20", failureRate: 0.0 },
      { name: "ai_mapping_batch", status: "slow", lastRun: "10.26 12:59", failureRate: 12.5 },
      { name: "export_zip_job", status: "healthy", lastRun: "10.26 10:12", failureRate: 0.0 },
      { name: "realtime_sync", status: "healthy", lastRun: "10.26 13:18", failureRate: 0.5 }
    ]);
  };

  const loadErrorLogs = async () => {
    // TODO: Query error_logs table
    setErrorLogs([
      { timestamp: "2025-10-26 13:12", level: "critical", source: "participants_ai_map", message: "TypeError (undefined 'event_id')" },
      { timestamp: "2025-10-26 13:09", level: "warning", source: "upload_batch", message: "Excel parser timeout" },
      { timestamp: "2025-10-26 12:45", level: "info", source: "form_sync", message: "Matched 45 responses to participants" }
    ]);
  };

  const loadQAReports = async () => {
    // TODO: Query qa_reports table
    setQAReports([
      { module: "참가자 업로드", status: "pass", score: 98, timestamp: "2025-10-25" },
      { module: "룸핑 Export", status: "warn", score: 84, timestamp: "2025-10-25" },
      { module: "메시지 발송", status: "pass", score: 92, timestamp: "2025-10-24" }
    ]);
  };

  const getStatusBadge = (status: "healthy" | "slow" | "failed" | "pass" | "warn" | "fail") => {
    const variants = {
      healthy: { variant: "default" as const, label: "정상", icon: CheckCircle2 },
      slow: { variant: "secondary" as const, label: "느림", icon: Clock },
      failed: { variant: "destructive" as const, label: "실패", icon: AlertTriangle },
      pass: { variant: "default" as const, label: "PASS", icon: CheckCircle2 },
      warn: { variant: "secondary" as const, label: "WARN", icon: AlertTriangle },
      fail: { variant: "destructive" as const, label: "FAIL", icon: AlertTriangle }
    };
    
    const config = variants[status];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getErrorLevelColor = (level: "critical" | "warning" | "info") => {
    return {
      critical: "text-destructive",
      warning: "text-yellow-600 dark:text-yellow-500",
      info: "text-muted-foreground"
    }[level];
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <Activity className="h-8 w-8 animate-pulse mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">시스템 진단 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold leading-[1.5] text-foreground">SympoHub Master Dashboard</h1>
          <p className="text-[14px] leading-[1.5] text-muted-foreground mt-1">
            시스템 전체의 건강 상태를 관찰합니다 — 개입하지 않고, 진단만 수행합니다.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/master/agencies")}>
          에이전시 관리
        </Button>
      </div>

      {/* 1. System Health Overview */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-[18px] flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            시스템 상태 요약
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-[14px] text-muted-foreground">Supabase 연결</p>
              <div className="flex items-center gap-2">
                {getStatusBadge(systemHealth.supabase === "healthy" ? "healthy" : "failed")}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[14px] text-muted-foreground">등록된 함수</p>
              <p className="text-[18px] font-bold">{systemHealth.functions}개</p>
            </div>
            <div className="space-y-2">
              <p className="text-[14px] text-muted-foreground">활성 트리거</p>
              <p className="text-[18px] font-bold">{systemHealth.triggers}개</p>
            </div>
            <div className="space-y-2">
              <p className="text-[14px] text-muted-foreground">Realtime 채널</p>
              <p className="text-[18px] font-bold">{systemHealth.realtimeChannels}개</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Agency Activity Snapshot */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-[18px] flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            에이전시 운영 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                <Users className="h-4 w-4" />
                활성 에이전시
              </div>
              <p className="text-[24px] font-bold">{agencyActivity.activeAgencies}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                <Calendar className="h-4 w-4" />
                신규 행사 (7일)
              </div>
              <p className="text-[24px] font-bold">{agencyActivity.recentEvents}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                <Users className="h-4 w-4" />
                평균 참가자
              </div>
              <p className="text-[24px] font-bold">{agencyActivity.avgParticipants}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                <Upload className="h-4 w-4" />
                업로드 (7일)
              </div>
              <p className="text-[24px] font-bold">{agencyActivity.recentUploads}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                메시지 성공률
              </div>
              <p className="text-[24px] font-bold">{agencyActivity.messageSuccessRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 3. Data Quality */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-[18px] flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              데이터 품질 및 동기화
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[14px]">
                <span className="text-muted-foreground">AI 매핑 성공률</span>
                <span className="font-medium">{dataQuality.aiMappingSuccess}%</span>
              </div>
              <Progress value={dataQuality.aiMappingSuccess} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[14px]">
                <span className="text-muted-foreground">룸핑 연계율</span>
                <span className="font-medium">{dataQuality.roomingLinked}%</span>
              </div>
              <Progress value={dataQuality.roomingLinked} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[14px]">
                <span className="text-muted-foreground">폼 응답률</span>
                <span className="font-medium">{dataQuality.formResponseRate}%</span>
              </div>
              <Progress value={dataQuality.formResponseRate} className="h-2" />
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-muted-foreground">중복 참가자 감지</span>
                <Badge variant="secondary">{dataQuality.duplicatesDetected}건</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Function Health */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-[18px] flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              함수·트리거 모니터링
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {functionHealth.map((func, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="space-y-1">
                    <p className="text-[14px] font-medium">{func.name}</p>
                    <p className="text-[12px] text-muted-foreground">최근 실행: {func.lastRun}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-muted-foreground">{func.failureRate}%</span>
                    {getStatusBadge(func.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Error Monitor */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-[18px] flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            에러/경고 로그 요약
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {errorLogs.length === 0 ? (
              <p className="text-[14px] text-muted-foreground text-center py-4">최근 오류가 없습니다.</p>
            ) : (
              errorLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex-shrink-0 pt-0.5">
                    <div className={`h-2 w-2 rounded-full ${
                      log.level === "critical" ? "bg-destructive" :
                      log.level === "warning" ? "bg-yellow-500" :
                      "bg-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-[14px] font-medium ${getErrorLevelColor(log.level)}`}>
                        {log.source}
                      </p>
                      <span className="text-[12px] text-muted-foreground">{log.timestamp}</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground">{log.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 6. QA Report History */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-[18px] flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            QA 리포트 히스토리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {qaReports.map((report, idx) => (
              <div key={idx} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div className="space-y-1 flex-1">
                  <p className="text-[14px] font-medium">{report.module}</p>
                  <div className="flex items-center gap-3">
                    <Progress value={report.score} className="h-1.5 w-32" />
                    <span className="text-[12px] text-muted-foreground">{report.score}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-muted-foreground">{report.timestamp}</span>
                  {getStatusBadge(report.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
