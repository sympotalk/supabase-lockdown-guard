import { QAReportSummary } from "./QAReportSummary";
import { QAReportTable } from "./QAReportTable";

export function QATab() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-[18px] font-semibold text-foreground">📊 QA 리포트 및 이상 감지</h2>
        <QAReportSummary />
      </div>

      <div className="space-y-4">
        <h2 className="text-[18px] font-semibold text-foreground">최근 QA 리포트</h2>
        <QAReportTable />
      </div>
    </div>
  );
}
