import { DataQualityCards } from "./DataQualityCards";
import { FunctionHealthTable } from "./FunctionHealthTable";
import { SystemHealthMonitor } from "./SystemHealthMonitor";

export function AutomationTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-[18px] font-semibold text-foreground">데이터 품질 검증</h2>
          <DataQualityCards />
        </div>
        <div className="space-y-4">
          <h2 className="text-[18px] font-semibold text-foreground">자동화 모니터링</h2>
          <FunctionHealthTable />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-[18px] font-semibold text-foreground">⚡ System Health Monitor</h2>
        <SystemHealthMonitor />
      </div>
    </div>
  );
}
