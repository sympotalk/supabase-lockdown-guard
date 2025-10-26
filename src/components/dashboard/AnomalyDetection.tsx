import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertOctagon, Info } from "lucide-react";
import { format } from "date-fns";
import { logSys, errorSys } from "@/lib/consoleLogger";

interface Anomaly {
  id: string;
  severity: "critical" | "warning" | "info";
  module: string;
  message: string;
  detected_at: string;
  resolved: boolean;
}

export function AnomalyDetection() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnomalies();
    const interval = setInterval(loadAnomalies, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadAnomalies = async () => {
    logSys("[AnomalyDetection] Loading anomalies...");
    try {
      const { data, error } = await supabase
        .from("ai_anomalies" as any)
        .select("*")
        .eq("resolved", false)
        .order("detected_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setAnomalies((data as any) || []);
    } catch (error) {
      errorSys("[AnomalyDetection] Error loading anomalies:", error);
    }
    setLoading(false);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertOctagon className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      critical: "destructive",
      warning: "default",
      info: "secondary",
    };
    return variants[severity] || "secondary";
  };

  if (loading) {
    return (
      <Card className="shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle className="text-[14px]">이상 감지</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md rounded-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[14px]">이상 감지 (미해결)</CardTitle>
          <Badge variant={anomalies.length > 0 ? "destructive" : "secondary"}>
            {anomalies.length}건
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {anomalies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-[12px]">감지된 이상이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {anomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                {getSeverityIcon(anomaly.severity)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[13px] font-medium">{anomaly.module}</p>
                    <Badge variant={getSeverityBadge(anomaly.severity)} className="text-[10px]">
                      {anomaly.severity}
                    </Badge>
                  </div>
                  <p className="text-[12px] text-muted-foreground mb-1">{anomaly.message}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(anomaly.detected_at), "yyyy-MM-dd HH:mm")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
