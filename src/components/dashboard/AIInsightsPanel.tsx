import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertOctagon, AlertTriangle, Info, CheckCircle2, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { logSys, errorSys } from "@/lib/consoleLogger";

type Severity = "critical" | "warning" | "info";

interface AIInsight {
  id: string;
  detected_at: string;
  detection_key: string;
  category: string;
  severity: Severity;
  title: string;
  description: string;
  cause_analysis: string | null;
  recommended_action: string | null;
  status: "active" | "resolved" | "ignored";
}

interface InsightsSummary {
  critical: number;
  warning: number;
  info: number;
}

export function AIInsightsPanel() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [summary, setSummary] = useState<InsightsSummary>({ critical: 0, warning: 0, info: 0 });
  const [loading, setLoading] = useState(true);
  const [runningDetection, setRunningDetection] = useState(false);

  useEffect(() => {
    loadInsights();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel("ai_insights_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ai_insights" },
        () => {
          logSys("AI Insights realtime update received");
          loadInsights();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadInsights = async () => {
    setLoading(true);
    logSys("Loading active AI insights...");

    try {
      // Get active insights from last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { data, error } = await supabase
        .from("ai_insights")
        .select("*")
        .eq("status", "active")
        .gte("detected_at", oneDayAgo.toISOString())
        .order("detected_at", { ascending: false });

      if (error) throw error;

      setInsights((data || []) as AIInsight[]);

      // Calculate summary
      const newSummary = (data || []).reduce(
        (acc, insight) => {
          acc[insight.severity]++;
          return acc;
        },
        { critical: 0, warning: 0, info: 0 }
      );
      setSummary(newSummary);
    } catch (error) {
      errorSys("Error loading AI insights:", error);
      toast({
        title: "오류",
        description: "AI Insights를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const runDetection = async () => {
    setRunningDetection(true);
    logSys("Running anomaly detection...");

    try {
      const { data, error } = await supabase.functions.invoke("ai-anomaly-detector");

      if (error) throw error;

      logSys("Detection result:", data);
      
      toast({
        title: "검사 완료",
        description: `${data.detected}개의 이상 징후를 감지했습니다.`,
      });

      // Reload insights
      await loadInsights();
    } catch (error) {
      errorSys("Detection error:", error);
      toast({
        title: "검사 실패",
        description: "이상 감지 실행 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }

    setRunningDetection(false);
  };

  const resolveInsight = async (id: string) => {
    try {
      const { error } = await supabase
        .from("ai_insights")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "완료",
        description: "문제가 해결됨으로 표시되었습니다.",
      });

      await loadInsights();
    } catch (error) {
      errorSys("Error resolving insight:", error);
      toast({
        title: "오류",
        description: "상태 업데이트에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const getSeverityIcon = (severity: Severity) => {
    switch (severity) {
      case "critical":
        return <AlertOctagon className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: Severity) => {
    const config = {
      critical: { variant: "destructive" as const, label: "Critical" },
      warning: { variant: "secondary" as const, label: "Warning" },
      info: { variant: "outline" as const, label: "Info" },
    }[severity];

    return (
      <Badge variant={config.variant} className="gap-1">
        {getSeverityIcon(severity)}
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="shadow-md rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="text-[14px]">AI Anomaly Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md rounded-2xl border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[14px]">AI Anomaly Insights (자동 감지)</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={runDetection}
            disabled={runningDetection}
          >
            {runningDetection ? "검사 중..." : "지금 검사"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium">{summary.critical} Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium">{summary.warning} Warnings</span>
          </div>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium">{summary.info} Info</span>
          </div>
        </div>

        {/* Insights Table */}
        {insights.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-[14px] text-muted-foreground">
              감지된 이상 징후가 없습니다. 시스템이 정상 작동 중입니다.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">감지 시각</TableHead>
                  <TableHead>항목</TableHead>
                  <TableHead>심각도</TableHead>
                  <TableHead>원인 분석</TableHead>
                  <TableHead>권장 조치</TableHead>
                  <TableHead className="w-[100px]">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insights.map((insight) => (
                  <TableRow key={insight.id}>
                    <TableCell className="font-mono text-[12px]">
                      {format(new Date(insight.detected_at), "MM/dd HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-[14px]">{insight.title}</p>
                        <p className="text-[12px] text-muted-foreground">{insight.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getSeverityBadge(insight.severity)}</TableCell>
                    <TableCell className="text-[12px] max-w-xs">
                      {insight.cause_analysis || "분석 중..."}
                    </TableCell>
                    <TableCell className="text-[12px] max-w-xs whitespace-pre-line">
                      {insight.recommended_action || "조치 방안 검토 중..."}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resolveInsight(insight.id)}
                        className="gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        해결
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
