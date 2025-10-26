import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { SystemHealthCards } from "@/components/dashboard/SystemHealthCards";
import { AgencyActivityCards } from "@/components/dashboard/AgencyActivityCards";
import { DataQualityCards } from "@/components/dashboard/DataQualityCards";
import { FunctionHealthTable } from "@/components/dashboard/FunctionHealthTable";
import { ErrorLogTable } from "@/components/dashboard/ErrorLogTable";
import { QAReportTable } from "@/components/dashboard/QAReportTable";

export default function MasterDashboard() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    console.log("[MasterDashboard] Manual refresh triggered");
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold leading-[1.5] text-foreground">
            SympoHub Master Dashboard
          </h1>
          <p className="text-[14px] leading-[1.5] text-muted-foreground mt-1">
            시스템 전체의 건강 상태를 관찰합니다 — 개입하지 않고, 진단만 수행합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </Button>
          <Button variant="outline" onClick={() => navigate("/master/agencies")}>
            에이전시 관리
          </Button>
        </div>
      </div>

      {/* Section A: System Health Overview */}
      <section className="space-y-4">
        <h2 className="text-[18px] font-semibold text-foreground">시스템 상태 요약</h2>
        <SystemHealthCards key={`health-${refreshKey}`} />
      </section>

      {/* Section B: Agency Activity Snapshot */}
      <section className="space-y-4">
        <h2 className="text-[18px] font-semibold text-foreground">에이전시 운영 현황</h2>
        <AgencyActivityCards key={`activity-${refreshKey}`} />
      </section>

      {/* Sections C & D: Data Quality & Function Health */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-[18px] font-semibold text-foreground">데이터 품질 검증</h2>
          <DataQualityCards key={`quality-${refreshKey}`} />
        </div>
        <div className="space-y-4">
          <h2 className="text-[18px] font-semibold text-foreground">자동화 모니터링</h2>
          <FunctionHealthTable key={`functions-${refreshKey}`} />
        </div>
      </section>

      {/* Sections E & F: Error Logs & QA Reports */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-[18px] font-semibold text-foreground">오류 로그 요약</h2>
          <ErrorLogTable key={`errors-${refreshKey}`} />
        </div>
        <div className="space-y-4">
          <h2 className="text-[18px] font-semibold text-foreground">QA 리포트</h2>
          <QAReportTable key={`qa-${refreshKey}`} />
        </div>
      </section>
    </div>
  );
}
