import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertOctagon, AlertTriangle, Info, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { logSys, errorSys } from "@/lib/consoleLogger";

interface LatestQAReport {
  id: string;
  generated_at: string;
  total_anomalies: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  summary: string;
}

/**
 * Phase 3.10-C: QA Report Summary
 * Displays latest QA report summary on master dashboard
 */
export function QAReportSummary() {
  const navigate = useNavigate();
  const [latestReport, setLatestReport] = useState<LatestQAReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLatestReport();

    // Refresh every 5 minutes
    const interval = setInterval(loadLatestReport, 300000);
    return () => clearInterval(interval);
  }, []);

  const loadLatestReport = async () => {
    logSys("Loading latest QA report...");

    try {
      const { data, error } = await supabase
        .from("qa_reports" as any)
        .select("*")
        .order("generated_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      setLatestReport((data as unknown) as LatestQAReport | null);
    } catch (error) {
      errorSys("Error loading latest QA report:", error);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-32 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!latestReport) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-[14px]">QA 리포트</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">생성된 리포트가 없습니다.</p>
            <Button variant="outline" size="sm" onClick={() => navigate("/master/qa-reports")}>
              리포트 생성하기
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md rounded-2xl border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[14px]">최근 QA 리포트</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/master/qa-reports")}
            className="gap-1"
          >
            전체 보기
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <FileText className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground">총 건수</p>
            <p className="text-[18px] font-bold">{latestReport.total_anomalies}</p>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertOctagon className="h-4 w-4 mx-auto mb-1 text-red-600 dark:text-red-400" />
            <p className="text-[11px] text-muted-foreground">Critical</p>
            <p className="text-[18px] font-bold text-red-600 dark:text-red-400">
              {latestReport.critical_count}
            </p>
          </div>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-yellow-600 dark:text-yellow-400" />
            <p className="text-[11px] text-muted-foreground">Warning</p>
            <p className="text-[18px] font-bold text-yellow-600 dark:text-yellow-400">
              {latestReport.warning_count}
            </p>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Info className="h-4 w-4 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
            <p className="text-[11px] text-muted-foreground">Info</p>
            <p className="text-[18px] font-bold text-blue-600 dark:text-blue-400">
              {latestReport.info_count}
            </p>
          </div>
        </div>

        {/* Summary Text */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            {latestReport.summary}
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-[11px] text-muted-foreground">
            생성: {format(new Date(latestReport.generated_at), "yyyy-MM-dd HH:mm")}
          </p>
          <Badge variant={latestReport.critical_count > 0 ? "destructive" : "default"}>
            {latestReport.critical_count > 0 ? "조치 필요" : "정상"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
