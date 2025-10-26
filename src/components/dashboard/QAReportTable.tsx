import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, CheckCircle2, AlertTriangle } from "lucide-react";

interface QAReport {
  module: string;
  status: "pass" | "warn" | "fail";
  score: number;
  timestamp: string;
}

export function QAReportTable() {
  const [reports, setReports] = useState<QAReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQAReports();
  }, []);

  const loadQAReports = async () => {
    setLoading(true);
    console.log("[QAReports] Loading QA reports...");

    try {
      // F: QA Report History
      // TODO: Query qa_reports table
      const mockReports: QAReport[] = [
        { module: "참가자 업로드", status: "pass", score: 98, timestamp: "2025-10-25" },
        { module: "룸핑 Export", status: "warn", score: 84, timestamp: "2025-10-25" },
        { module: "메시지 발송", status: "pass", score: 92, timestamp: "2025-10-24" },
        { module: "폼 응답 처리", status: "pass", score: 95, timestamp: "2025-10-24" },
        { module: "AI 매핑 검증", status: "warn", score: 78, timestamp: "2025-10-23" }
      ];

      setReports(mockReports);
    } catch (error) {
      console.error("[QAReports] Error loading:", error);
    }

    setLoading(false);
  };

  const getStatusBadge = (status: "pass" | "warn" | "fail") => {
    const config = {
      pass: { variant: "default" as const, label: "PASS", icon: CheckCircle2, color: "text-green-600" },
      warn: { variant: "secondary" as const, label: "WARN", icon: AlertTriangle, color: "text-yellow-600" },
      fail: { variant: "destructive" as const, label: "FAIL", icon: AlertTriangle, color: "text-red-600" }
    }[status];

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 75) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  if (loading) {
    return (
      <Card className="shadow-md rounded-[16px] animate-pulse">
        <CardContent className="p-6">
          <div className="h-48 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md rounded-[16px]">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-[18px] font-semibold">QA 리포트 히스토리</h3>
        </div>

        {reports.length === 0 ? (
          <p className="text-[14px] text-muted-foreground text-center py-8">
            QA 리포트가 없습니다.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>모듈명</TableHead>
                <TableHead>점수</TableHead>
                <TableHead>결과</TableHead>
                <TableHead>실행 일시</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report, idx) => (
                <TableRow key={idx} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium text-[14px]">{report.module}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Progress value={report.score} className="h-1.5 w-24" />
                      <span className={`text-[14px] font-semibold ${getScoreColor(report.score)}`}>
                        {report.score}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell className="text-[14px] text-muted-foreground">{report.timestamp}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
