import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RefreshCw, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SystemHealthCards } from "@/components/dashboard/SystemHealthCards";
import { AgencyActivityCards } from "@/components/dashboard/AgencyActivityCards";
import { DataQualityCards } from "@/components/dashboard/DataQualityCards";
import { FunctionHealthTable } from "@/components/dashboard/FunctionHealthTable";
import { ErrorLogTable } from "@/components/dashboard/ErrorLogTable";
import { QAReportTable } from "@/components/dashboard/QAReportTable";
import { masterRealtimeHub } from "@/lib/masterRealtimeHub";

export default function MasterDashboard() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [isStaticMode, setIsStaticMode] = useState(false);

  useEffect(() => {
    console.log("[MasterDashboard] Initializing Realtime Hub");

    // Register refresh callbacks for each section
    masterRealtimeHub.registerRefreshCallback("A", () => {
      console.log("[MasterDashboard] Refreshing Section A");
      setRefreshKey(prev => prev + 1);
    });
    
    masterRealtimeHub.registerRefreshCallback("B", () => {
      console.log("[MasterDashboard] Refreshing Section B");
      setRefreshKey(prev => prev + 1);
    });
    
    masterRealtimeHub.registerRefreshCallback("C", () => {
      console.log("[MasterDashboard] Refreshing Section C");
      setRefreshKey(prev => prev + 1);
    });
    
    masterRealtimeHub.registerRefreshCallback("D", () => {
      console.log("[MasterDashboard] Refreshing Section D");
      setRefreshKey(prev => prev + 1);
    });
    
    masterRealtimeHub.registerRefreshCallback("E", () => {
      console.log("[MasterDashboard] Refreshing Section E");
      setRefreshKey(prev => prev + 1);
    });
    
    masterRealtimeHub.registerRefreshCallback("F", () => {
      console.log("[MasterDashboard] Refreshing Section F");
      setRefreshKey(prev => prev + 1);
    });

    // Connect to realtime
    masterRealtimeHub.connect();
    setIsRealtimeConnected(masterRealtimeHub.isConnected());

    // Check static mode status
    const checkStaticMode = setInterval(() => {
      setIsStaticMode(masterRealtimeHub.isInStaticMode());
    }, 1000);

    return () => {
      console.log("[MasterDashboard] Cleaning up Realtime Hub");
      clearInterval(checkStaticMode);
      masterRealtimeHub.disconnect();
    };
  }, []);

  const handleRefresh = () => {
    console.log("[MasterDashboard] Manual refresh triggered");
    setRefreshKey(prev => prev + 1);
  };

  const handleReconnect = () => {
    console.log("[MasterDashboard] Reconnecting Realtime Hub");
    masterRealtimeHub.resetStaticMode();
    masterRealtimeHub.disconnect();
    masterRealtimeHub.connect();
    setIsRealtimeConnected(masterRealtimeHub.isConnected());
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[18px] font-semibold leading-[1.5] text-foreground">
              SympoHub Master Dashboard
            </h1>
            {isStaticMode ? (
              <Badge variant="secondary" className="gap-1">
                <Radio className="h-3 w-3" />
                정적 모드
              </Badge>
            ) : isRealtimeConnected ? (
              <Badge variant="default" className="gap-1">
                <Radio className="h-3 w-3 animate-pulse" />
                실시간 연결
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Radio className="h-3 w-3" />
                연결 중...
              </Badge>
            )}
          </div>
          <p className="text-[14px] leading-[1.5] text-muted-foreground mt-1">
            시스템 전체의 건강 상태를 관찰합니다 — 개입하지 않고, 진단만 수행합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isStaticMode && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleReconnect}
              className="gap-2"
            >
              <Radio className="h-4 w-4" />
              재연결
            </Button>
          )}
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
