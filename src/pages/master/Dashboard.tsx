import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RefreshCw, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SystemHealthCards } from "@/components/dashboard/SystemHealthCards";
import { AgencyActivityCards } from "@/components/dashboard/AgencyActivityCards";
import { DataQualityCards } from "@/components/dashboard/DataQualityCards";
import { FunctionHealthTable } from "@/components/dashboard/FunctionHealthTable";
import { ErrorLogTable } from "@/components/dashboard/ErrorLogTable";
import { QAReportTable } from "@/components/dashboard/QAReportTable";
import { SystemInsightBoard } from "@/components/dashboard/SystemInsightBoard";
import { AIInsightsPanel } from "@/components/dashboard/AIInsightsPanel";
import { SystemHealthMonitor } from "@/components/dashboard/SystemHealthMonitor";
import { QAReportSummary } from "@/components/dashboard/QAReportSummary";
import { OpsExecutionHistory } from "@/components/dashboard/OpsExecutionHistory";
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel";
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
          <Button variant="outline" size="sm" onClick={() => navigate("/master/alert-history")}>
            Alert History
          </Button>
          <Button variant="outline" onClick={() => navigate("/master/agencies")}>
            에이전시 관리
          </Button>
        </div>
      </div>

      {/* Tabbed Dashboard */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 gap-4">
          <TabsTrigger value="overview" className="text-sm">시스템 요약</TabsTrigger>
          <TabsTrigger value="anomaly" className="text-sm">이상 감지</TabsTrigger>
          <TabsTrigger value="automation" className="text-sm">자동화 상태</TabsTrigger>
          <TabsTrigger value="qa" className="text-sm">QA 리포트</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <SystemInsightBoard key={`insights-${refreshKey}`} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <QuickActionsPanel key={`actions-${refreshKey}`} />
            </div>
            <div className="lg:col-span-2">
              <OpsExecutionHistory key={`ops-${refreshKey}`} />
            </div>
          </div>

          <SystemHealthCards key={`health-${refreshKey}`} />
          <AgencyActivityCards key={`activity-${refreshKey}`} />
        </TabsContent>

        {/* Anomaly Detection Tab */}
        <TabsContent value="anomaly" className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-[18px] font-semibold text-foreground">🤖 AI Anomaly Detection</h2>
            <AIInsightsPanel key={`ai-insights-${refreshKey}`} />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-[18px] font-semibold text-foreground">오류 로그 요약</h2>
              <ErrorLogTable key={`errors-${refreshKey}`} />
            </div>
            <div className="space-y-4">
              <h2 className="text-[18px] font-semibold text-foreground">시스템 상태</h2>
              <SystemHealthMonitor key={`health-monitor-${refreshKey}`} />
            </div>
          </div>
        </TabsContent>

        {/* Automation Status Tab */}
        <TabsContent value="automation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-[18px] font-semibold text-foreground">데이터 품질 검증</h2>
              <DataQualityCards key={`quality-${refreshKey}`} />
            </div>
            <div className="space-y-4">
              <h2 className="text-[18px] font-semibold text-foreground">자동화 모니터링</h2>
              <FunctionHealthTable key={`functions-${refreshKey}`} />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-[18px] font-semibold text-foreground">⚡ System Health Monitor</h2>
            <SystemHealthMonitor key={`health-monitor-2-${refreshKey}`} />
          </div>
        </TabsContent>

        {/* QA Reports Tab */}
        <TabsContent value="qa" className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-[18px] font-semibold text-foreground">📊 QA 리포트 및 이상 감지</h2>
            <QAReportSummary key={`qa-report-${refreshKey}`} />
          </div>

          <div className="space-y-4">
            <h2 className="text-[18px] font-semibold text-foreground">최근 QA 리포트</h2>
            <QAReportTable key={`qa-${refreshKey}`} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
