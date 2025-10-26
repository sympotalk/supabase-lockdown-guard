import { AIInsightsPanel } from "./AIInsightsPanel";
import { ErrorLogTable } from "./ErrorLogTable";
import { SystemHealthMonitor } from "./SystemHealthMonitor";

export function AnomalyTab() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-[18px] font-semibold text-foreground">🤖 AI Anomaly Detection</h2>
        <AIInsightsPanel />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-[18px] font-semibold text-foreground">오류 로그 요약</h2>
          <ErrorLogTable />
        </div>
        <div className="space-y-4">
          <h2 className="text-[18px] font-semibold text-foreground">시스템 상태</h2>
          <SystemHealthMonitor />
        </div>
      </div>
    </div>
  );
}
