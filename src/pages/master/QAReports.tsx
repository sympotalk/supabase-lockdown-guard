import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertOctagon, AlertTriangle, Info, FileText, RefreshCw, Download } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { logSys, errorSys } from "@/lib/consoleLogger";

interface QAReport {
  id: string;
  generated_at: string;
  total_anomalies: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  summary: string;
  ai_recommendations: string | null;
  report_json: any;
  period_start: string;
  period_end: string;
}

interface QAReportSummary {
  total_reports: number;
  latest_critical: number;
  latest_warning: number;
  latest_info: number;
  last_generated: string | null;
}

export default function QAReports() {
  const [reports, setReports] = useState<QAReport[]>([]);
  const [summary, setSummary] = useState<QAReportSummary | null>(null);
  const [selectedReport, setSelectedReport] = useState<QAReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    logSys("Loading QA reports...");

    try {
      // Load all reports
      const { data: reportsData, error: reportsError } = await supabase
        .from("qa_reports" as any)
        .select("*")
        .order("generated_at", { ascending: false })
        .limit(50);

      if (reportsError) throw reportsError;

      setReports(((reportsData as unknown) as QAReport[]) || []);

      // Calculate summary
      if (reportsData && reportsData.length > 0) {
        const latest = (reportsData[0] as unknown) as QAReport;
        setSummary({
          total_reports: reportsData.length,
          latest_critical: latest.critical_count,
          latest_warning: latest.warning_count,
          latest_info: latest.info_count,
          last_generated: latest.generated_at,
        });
      }
    } catch (error) {
      errorSys("Error loading QA reports:", error);
      toast({
        title: "오류",
        description: "QA 리포트를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const generateReport = async () => {
    setGenerating(true);
    logSys("Generating new QA report...");

    try {
      const { data, error } = await supabase.rpc("fn_generate_qa_report" as any);

      if (error) throw error;

      toast({
        title: "리포트 생성 완료",
        description: "새로운 QA 리포트가 생성되었습니다.",
      });

      // Reload reports
      await loadReports();
    } catch (error) {
      errorSys("Error generating QA report:", error);
      toast({
        title: "리포트 생성 실패",
        description: "QA 리포트 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }

    setGenerating(false);
  };

  const getSeverityIcon = (severity: string, count: number) => {
    if (count === 0) return null;
    
    switch (severity) {
      case "critical":
        return <AlertOctagon className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold">QA 리포트 및 이상 감지</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            시스템 자동 진단 리포트 및 이상 징후 추적
          </p>
        </div>
        <Button onClick={generateReport} disabled={generating}>
          <RefreshCw className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`} />
          {generating ? "생성 중..." : "새 리포트 생성"}
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground">총 리포트</p>
                  <p className="text-[24px] font-bold">{summary.total_reports}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertOctagon className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground">최근 Critical</p>
                  <p className="text-[24px] font-bold">{summary.latest_critical}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground">최근 Warning</p>
                  <p className="text-[24px] font-bold">{summary.latest_warning}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground">최근 Info</p>
                  <p className="text-[24px] font-bold">{summary.latest_info}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[16px]">리포트 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-[14px] text-muted-foreground">
                생성된 리포트가 없습니다. 새 리포트를 생성해주세요.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>생성 시각</TableHead>
                    <TableHead>분석 기간</TableHead>
                    <TableHead>총 이상 건수</TableHead>
                    <TableHead>Critical</TableHead>
                    <TableHead>Warning</TableHead>
                    <TableHead>Info</TableHead>
                    <TableHead className="w-[120px]">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="text-[13px]">
                        {format(new Date(report.generated_at), "yyyy-MM-dd HH:mm")}
                      </TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">
                        {format(new Date(report.period_start), "MM/dd HH:mm")} ~{" "}
                        {format(new Date(report.period_end), "MM/dd HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.total_anomalies}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSeverityIcon("critical", report.critical_count)}
                          <span className="text-[13px]">{report.critical_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSeverityIcon("warning", report.warning_count)}
                          <span className="text-[13px]">{report.warning_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSeverityIcon("info", report.info_count)}
                          <span className="text-[13px]">{report.info_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedReport(report)}
                        >
                          상세
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

      {/* Selected Report Detail */}
      {selectedReport && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[16px]">리포트 상세</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                다운로드
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-[14px] font-semibold mb-2">요약</h3>
              <p className="text-[13px] text-muted-foreground">{selectedReport.summary}</p>
            </div>

            {selectedReport.ai_recommendations && (
              <div>
                <h3 className="text-[14px] font-semibold mb-2">AI 권장 조치</h3>
                <div className="p-4 bg-muted rounded-lg">
                  <pre className="text-[12px] whitespace-pre-wrap font-mono">
                    {selectedReport.ai_recommendations}
                  </pre>
                </div>
              </div>
            )}

            {selectedReport.report_json?.anomalies && (
              <div>
                <h3 className="text-[14px] font-semibold mb-2">이상 징후 목록</h3>
                <div className="space-y-2">
                  {selectedReport.report_json.anomalies.slice(0, 10).map((anomaly: any) => (
                    <div
                      key={anomaly.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-[13px] font-medium">{anomaly.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {anomaly.category} •{" "}
                          {format(new Date(anomaly.detected_at), "yyyy-MM-dd HH:mm")}
                        </p>
                      </div>
                      <Badge
                        variant={
                          anomaly.severity === "Critical"
                            ? "destructive"
                            : anomaly.severity === "Warning"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {anomaly.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
