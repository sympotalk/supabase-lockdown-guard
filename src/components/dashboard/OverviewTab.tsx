import { SystemInsightBoard } from "./SystemInsightBoard";
import { QuickActionsPanel } from "./QuickActionsPanel";
import { OpsExecutionHistory } from "./OpsExecutionHistory";
import { SystemHealthCards } from "./SystemHealthCards";
import { AgencyActivityCards } from "./AgencyActivityCards";

export function OverviewTab() {
  return (
    <div className="space-y-6">
      <SystemInsightBoard />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <QuickActionsPanel />
        </div>
        <div className="lg:col-span-2">
          <OpsExecutionHistory />
        </div>
      </div>

      <SystemHealthCards />
      <AgencyActivityCards />
    </div>
  );
}
