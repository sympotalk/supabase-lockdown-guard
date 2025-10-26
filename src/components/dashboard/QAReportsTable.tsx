import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Eye, FileText } from "lucide-react";
import { format } from "date-fns";

interface QAReport {
  id: string;
  title: string;
  status: string;
  category: string;
  generated_at: string;
  processing_time_ms?: number;
  log_excerpt?: string;
}

interface QAReportsTableProps {
  reports: QAReport[];
  loading?: boolean;
}

export function QAReportsTable({ reports, loading }: QAReportsTableProps) {
  const [selectedReport, setSelectedReport] = useState<QAReport | null>(null);

  if (loading) {
    return (
      <Card className="shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle className="text-[14px]">QA 리포트 상세</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle className="text-[14px]">QA 리포트 상세</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-[12px]">생성된 리포트가 없습니다</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">날짜</th>
                    <th className="p-3 text-left font-medium">모듈명</th>
                    <th className="p-3 text-center font-medium">카테고리</th>
                    <th className="p-3 text-center font-medium">상태</th>
                    <th className="p-3 text-center font-medium">처리시간</th>
                    <th className="p-3 text-center font-medium">로그</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr
                      key={report.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3 text-muted-foreground">
                        {format(new Date(report.generated_at), "yyyy-MM-dd HH:mm")}
                      </td>
                      <td className="p-3 font-medium">{report.title}</td>
                      <td className="p-3 text-center">
                        <span className="text-muted-foreground">{report.category}</span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={
                            report.status === "PASS" || report.status === "OK"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {report.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-center text-muted-foreground">
                        {report.processing_time_ms ? `${report.processing_time_ms}ms` : "-"}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedReport(report)}
                          className="h-7 px-2"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Detail Modal */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedReport?.title}</DialogTitle>
            <DialogDescription>
              생성일: {selectedReport && format(new Date(selectedReport.generated_at), "yyyy-MM-dd HH:mm:ss")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge
                variant={
                  selectedReport?.status === "PASS" || selectedReport?.status === "OK"
                    ? "default"
                    : "destructive"
                }
              >
                {selectedReport?.status}
              </Badge>
              <span className="text-[12px] text-muted-foreground">
                카테고리: {selectedReport?.category}
              </span>
              {selectedReport?.processing_time_ms && (
                <span className="text-[12px] text-muted-foreground">
                  처리시간: {selectedReport.processing_time_ms}ms
                </span>
              )}
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-[13px] font-medium mb-2">로그 내용</p>
              <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-mono">
                {selectedReport?.log_excerpt || "상세 로그 정보가 없습니다."}
              </pre>
            </div>

            <p className="text-[11px] text-muted-foreground italic">
              상세 로그는 자동으로 저장됩니다.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
