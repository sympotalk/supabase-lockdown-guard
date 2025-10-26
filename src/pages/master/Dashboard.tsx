import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RefreshCw, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MasterProvider, useMaster } from "@/contexts/MasterContext";
import { Skeleton } from "@/components/ui/skeleton";
import { masterRealtimeHub } from "@/lib/masterRealtimeHub";

// Lazy load tab components with preloading
const OverviewTab = lazy(() => 
  import("@/components/dashboard/OverviewTab").then(m => ({ default: m.OverviewTab }))
);
const AnomalyTab = lazy(() => 
  import("@/components/dashboard/AnomalyTab").then(m => ({ default: m.AnomalyTab }))
);
const AutomationTab = lazy(() => 
  import("@/components/dashboard/AutomationTab").then(m => ({ default: m.AutomationTab }))
);
const QATab = lazy(() => 
  import("@/components/dashboard/QATab").then(m => ({ default: m.QATab }))
);

function TabSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}

function DashboardContent() {
  const navigate = useNavigate();
  const { isRealtimeConnected, refresh } = useMaster();
  const isStaticMode = masterRealtimeHub.isInStaticMode();

  // [3.14-MD.OPTIMIZE.R2] Preload removed - handled by MasterContext once

  const handleRefresh = () => {
    console.log("[MasterDashboard] Manual refresh triggered");
    refresh();
  };

  const handleReconnect = () => {
    console.log("[MasterDashboard] Reconnecting Realtime Hub");
    masterRealtimeHub.resetStaticMode();
    masterRealtimeHub.disconnect();
    masterRealtimeHub.connect();
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
        <TabsContent value="overview">
          <Suspense fallback={<TabSkeleton />}>
            <OverviewTab />
          </Suspense>
        </TabsContent>

        {/* Anomaly Detection Tab */}
        <TabsContent value="anomaly">
          <Suspense fallback={<TabSkeleton />}>
            <AnomalyTab />
          </Suspense>
        </TabsContent>

        {/* Automation Status Tab */}
        <TabsContent value="automation">
          <Suspense fallback={<TabSkeleton />}>
            <AutomationTab />
          </Suspense>
        </TabsContent>

        {/* QA Reports Tab */}
        <TabsContent value="qa">
          <Suspense fallback={<TabSkeleton />}>
            <QATab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MasterDashboard() {
  return (
    <MasterProvider>
      <DashboardContent />
    </MasterProvider>
  );
}
