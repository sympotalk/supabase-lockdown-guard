import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface FunctionHealth {
  name: string;
  status: "healthy" | "slow" | "failed";
  lastRun: string;
  failureRate: number;
}

type FilterType = "all" | "healthy" | "slow" | "failed";

export function FunctionHealthTable() {
  const [functions, setFunctions] = useState<FunctionHealth[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFunctionHealth();
  }, []);

  const loadFunctionHealth = async () => {
    setLoading(true);
    console.log("[FunctionHealth] Loading automation health...");

    try {
      // D: Function/Trigger Monitoring
      // TODO: Query functions_health and functions_logs tables
      const mockFunctions: FunctionHealth[] = [
        { name: "on_upload_trigger", status: "healthy", lastRun: "10.26 13:20", failureRate: 0.0 },
        { name: "ai_mapping_batch", status: "slow", lastRun: "10.26 12:59", failureRate: 12.5 },
        { name: "export_zip_job", status: "healthy", lastRun: "10.26 10:12", failureRate: 0.0 },
        { name: "realtime_sync", status: "healthy", lastRun: "10.26 13:18", failureRate: 0.5 },
        { name: "form_response_matcher", status: "healthy", lastRun: "10.26 13:15", failureRate: 2.1 },
        { name: "participant_validator", status: "failed", lastRun: "10.26 12:45", failureRate: 45.0 }
      ];

      setFunctions(mockFunctions);
    } catch (error) {
      console.error("[FunctionHealth] Error loading:", error);
    }

    setLoading(false);
  };

  const getStatusBadge = (status: "healthy" | "slow" | "failed") => {
    const config = {
      healthy: { variant: "default" as const, label: "정상", icon: CheckCircle2, color: "text-green-600" },
      slow: { variant: "secondary" as const, label: "느림", icon: Clock, color: "text-yellow-600" },
      failed: { variant: "destructive" as const, label: "실패", icon: AlertTriangle, color: "text-red-600" }
    }[status];

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  const filteredFunctions = functions.filter(func => 
    filter === "all" || func.status === filter
  );

  const statusCounts = {
    all: functions.length,
    healthy: functions.filter(f => f.status === "healthy").length,
    slow: functions.filter(f => f.status === "slow").length,
    failed: functions.filter(f => f.status === "failed").length
  };

  if (loading) {
    return (
      <Card className="shadow-md rounded-[16px] animate-pulse">
        <CardContent className="p-6">
          <div className="h-64 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md rounded-2xl border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="text-[14px] font-semibold">자동화 상태</h3>
          </div>
          
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <TabsList>
              <TabsTrigger value="all" className="text-[12px]">
                전체 ({statusCounts.all})
              </TabsTrigger>
              <TabsTrigger value="healthy" className="text-[12px]">
                정상 ({statusCounts.healthy})
              </TabsTrigger>
              <TabsTrigger value="slow" className="text-[12px]">
                느림 ({statusCounts.slow})
              </TabsTrigger>
              <TabsTrigger value="failed" className="text-[12px]">
                실패 ({statusCounts.failed})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {filteredFunctions.length === 0 ? (
          <p className="text-[14px] text-muted-foreground text-center py-8">
            {filter === "all" ? "등록된 자동화가 없습니다." : `${filter} 상태의 자동화가 없습니다.`}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>기능명</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>최근 실행</TableHead>
                <TableHead className="text-right">실패율</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFunctions.map((func, idx) => (
                <TableRow key={idx} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium text-[14px]">{func.name}</TableCell>
                  <TableCell>{getStatusBadge(func.status)}</TableCell>
                  <TableCell className="text-[14px] text-muted-foreground">{func.lastRun}</TableCell>
                  <TableCell className="text-right text-[14px]">
                    <span className={func.failureRate > 10 ? "text-destructive font-medium" : "text-muted-foreground"}>
                      {func.failureRate.toFixed(1)}%
                    </span>
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
