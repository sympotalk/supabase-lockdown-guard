import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface QAReport {
  id: string;
  title: string | null;
  status: string;
  category: string | null;
  generated_at: string;
  total_anomalies: number;
}

export function QAReportTable() {
  const [reports, setReports] = useState<QAReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQAReports();
  }, []);

  const loadQAReports = async () => {
    setLoading(true);
    console.log("[MasterDashboard] Loading QA reports from qa_reports...");

    try {
      const { data, error } = await supabase
        .from("qa_reports")
        .select("id, title, status, category, generated_at, total_anomalies")
        .order("generated_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("[MasterDashboard] Error loading QA reports:", error);
    }

    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    const isPass = statusLower === 'pass' || statusLower === 'ok' || statusLower === 'success';
    const isWarn = statusLower === 'warn' || statusLower === 'warning';
    
    const config = isPass 
      ? { variant: "default" as const, label: "PASS", icon: CheckCircle2, color: "text-green-600" }
      : isWarn
      ? { variant: "secondary" as const, label: "WARN", icon: AlertTriangle, color: "text-yellow-600" }
      : { variant: "destructive" as const, label: "FAIL", icon: AlertTriangle, color: "text-red-600" };

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  const getScoreColor = (anomalies: number) => {
    if (anomalies === 0) return "text-green-600 dark:text-green-400";
    if (anomalies <= 3) return "text-yellow-600 dark:text-yellow-400";
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
    <Card className="shadow-md rounded-2xl border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-[14px] font-semibold">품질 검증 기록</h3>
        </div>

        {reports.length === 0 ? (
          <p className="text-[14px] text-muted-foreground text-center py-8">
            QA 리포트가 없습니다.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>리포트 제목</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead>이상 건수</TableHead>
                <TableHead>결과</TableHead>
                <TableHead>생성 일시</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium text-[14px]">
                    {report.title || `리포트 #${report.id.slice(0, 8)}`}
                  </TableCell>
                  <TableCell className="text-[14px]">{report.category || 'General'}</TableCell>
                  <TableCell>
                    <span className={`text-[14px] font-semibold ${getScoreColor(report.total_anomalies)}`}>
                      {report.total_anomalies}건
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell className="text-[14px] text-muted-foreground">
                    {format(new Date(report.generated_at), "yyyy-MM-dd HH:mm")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
