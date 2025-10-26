import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SystemPulseTimeline } from "@/components/dashboard/SystemPulseTimeline";
import { AlertHistoryTable } from "@/components/dashboard/AlertHistoryTable";
import { AlertTrendChart } from "@/components/dashboard/AlertTrendChart";
import { masterRealtimeHub } from "@/lib/masterRealtimeHub";

export default function AlertHistory() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("[AlertHistory] Page mounted");

    // Subscribe to alerts_history realtime updates
    // Note: This will be activated once alerts_history table exists
    const unsubscribe = () => {
      console.log("[AlertHistory] Cleanup");
    };

    return unsubscribe;
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/master/dashboard")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              대시보드로
            </Button>
            <h1 className="text-[18px] font-semibold leading-[1.5] text-foreground">
              Alert History & System Pulse
            </h1>
          </div>
          <p className="text-[14px] leading-[1.5] text-muted-foreground mt-1">
            시스템 Alert 이력과 패턴을 시각화하여 분석합니다.
          </p>
        </div>
      </div>

      {/* System Pulse Timeline */}
      <section className="space-y-4">
        <h2 className="text-[18px] font-semibold text-foreground">📆 System Pulse (24시간)</h2>
        <SystemPulseTimeline />
      </section>

      {/* Alert History Table */}
      <section className="space-y-4">
        <h2 className="text-[18px] font-semibold text-foreground">📋 Alert History</h2>
        <AlertHistoryTable />
      </section>

      {/* Trend Chart */}
      <section className="space-y-4">
        <h2 className="text-[18px] font-semibold text-foreground">📈 Trend View</h2>
        <AlertTrendChart />
      </section>
    </div>
  );
}
