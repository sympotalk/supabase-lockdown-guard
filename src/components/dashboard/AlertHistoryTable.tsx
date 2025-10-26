import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, AlertCircle, AlertTriangle, Info, AlertOctagon } from "lucide-react";
import { format } from "date-fns";

type Severity = "critical" | "error" | "warn" | "info";
type FilterType = "all" | Severity;

interface AlertRecord {
  id: string;
  created_at: string;
  event_type: string;
  module_name: string;
  severity: Severity;
  message: string;
  user_id?: string;
}

export function AlertHistoryTable() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    console.log("[AlertHistory] Loading recent alerts...");

    try {
      // Mock data for now
      const mockAlerts: AlertRecord[] = Array.from({ length: 20 }, (_, i) => {
        const severities: Severity[] = ["critical", "error", "warn", "info"];
        const modules = ["functions_health", "participants_log", "error_logs", "qa_reports"];
        const types = ["INSERT", "UPDATE", "STATUS_CHANGE", "FAILURE"];
        
        return {
          id: `alert-${i}`,
          created_at: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          event_type: types[Math.floor(Math.random() * types.length)],
          module_name: modules[Math.floor(Math.random() * modules.length)],
          severity: severities[Math.floor(Math.random() * severities.length)],
          message: `Sample alert message ${i + 1}`,
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setAlerts(mockAlerts);
    } catch (error) {
      console.error("[AlertHistory] Error loading:", error);
    }

    setLoading(false);
  };

  const getSeverityIcon = (severity: Severity) => {
    switch (severity) {
      case "critical":
        return <AlertOctagon className="h-4 w-4 text-red-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case "warn":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: Severity) => {
    const config = {
      critical: { variant: "destructive" as const, label: "Critical" },
      error: { variant: "destructive" as const, label: "Error" },
      warn: { variant: "secondary" as const, label: "Warning" },
      info: { variant: "outline" as const, label: "Info" },
    }[severity];

    return (
      <Badge variant={config.variant} className="gap-1">
        {getSeverityIcon(severity)}
        {config.label}
      </Badge>
    );
  };

  const filteredAlerts = alerts.filter(
    (alert) => filter === "all" || alert.severity === filter
  );

  const handleExport = () => {
    const csv = [
      ["Time", "Module", "Type", "Severity", "Message"],
      ...filteredAlerts.map((alert) => [
        format(new Date(alert.created_at), "yyyy-MM-dd HH:mm:ss"),
        alert.module_name,
        alert.event_type,
        alert.severity,
        alert.message,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alerts_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className="shadow-md rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="text-[14px]">Alert History</CardTitle>
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
          <CardTitle className="text-[14px]">Alert History (최근 100건)</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList>
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="critical">Critical</TabsTrigger>
            <TabsTrigger value="error">Error</TabsTrigger>
            <TabsTrigger value="warn">Warning</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">시간</TableHead>
                <TableHead>모듈</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>심각도</TableHead>
                <TableHead>메시지</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    필터링된 Alert가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAlerts.map((alert) => (
                  <TableRow key={alert.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-[12px]">
                      {format(new Date(alert.created_at), "HH:mm:ss")}
                    </TableCell>
                    <TableCell className="text-[14px]">{alert.module_name}</TableCell>
                    <TableCell className="text-[14px]">{alert.event_type}</TableCell>
                    <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                    <TableCell className="text-[14px] max-w-md truncate">
                      {alert.message}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
