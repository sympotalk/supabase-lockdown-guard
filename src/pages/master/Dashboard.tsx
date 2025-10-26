import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { AutomationMonitor } from '@/components/dashboard/AutomationMonitor';
import { AnomalyDetection } from '@/components/dashboard/AnomalyDetection';
import { QAReportsTable } from '@/components/dashboard/QAReportsTable';
import { logSys, errorSys } from '@/lib/consoleLogger';
import { toast } from 'sonner';

interface SystemMetrics {
  total_reports: number;
  success_rate: number;
  warning_count: number;
  avg_processing_time: number;
}

interface TrendData {
  date: string;
  success_rate: number;
  processing_time: number;
}

export default function MasterDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    total_reports: 0,
    success_rate: 0,
    warning_count: 0,
    avg_processing_time: 0,
  });
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [qaReports, setQaReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Clear agency scope when entering master routes
  useEffect(() => {
    localStorage.removeItem('agency_scope');
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    logSys("[MasterDashboard] Loading dashboard data...");
    try {
      // Parallel fetch for performance
      const [metricsRes, trendRes, reportsRes] = await Promise.all([
        supabase.from('master_system_insights' as any).select('*').single(),
        supabase
          .from('qa_reports' as any)
          .select('generated_at, status')
          .order('generated_at', { ascending: false })
          .limit(30),
        supabase
          .from('qa_reports' as any)
          .select('id, title, status, category, generated_at, processing_time_ms, log_excerpt')
          .order('generated_at', { ascending: false })
          .limit(20),
      ]);

      // Process metrics
      if (metricsRes.data) {
        const data = metricsRes.data as any;
        setMetrics({
          total_reports: data.total_reports || 0,
          success_rate: data.success_rate || 0,
          warning_count: data.warning_count || 0,
          avg_processing_time: data.avg_processing_time || 0,
        });
      }

      // Process trend data
      if (trendRes.data) {
        const trend = trendRes.data.map((item: any) => ({
          date: item.generated_at,
          success_rate: item.status === 'PASS' || item.status === 'OK' ? 100 : 0,
          processing_time: item.processing_time_ms || 0,
        }));
        setTrendData(trend);
      }

      // Process QA reports
      if (reportsRes.data) {
        setQaReports(reportsRes.data);
      }
    } catch (error) {
      errorSys("[MasterDashboard] Error loading dashboard data:", error);
      toast.error("데이터를 불러오지 못했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SympoHub Master Dashboard</h1>
          <p className="text-muted-foreground">전체 시스템 현황 및 분석</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="shadow-md rounded-2xl">
              <CardContent className="p-6">
                <div className="h-24 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SympoHub Master Dashboard</h1>
        <p className="text-muted-foreground">전체 시스템 현황 및 분석</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <InsightCard
          title="총 리포트"
          value={metrics.total_reports}
          subtitle="전체 생성된 리포트"
          icon={FileText}
          variant="default"
        />
        <InsightCard
          title="성공률"
          value={`${metrics.success_rate}%`}
          subtitle="정상 처리 비율"
          icon={TrendingUp}
          variant={metrics.success_rate >= 80 ? "success" : "warning"}
          trend={{
            value: 5.2,
            isPositive: true,
          }}
        />
        <InsightCard
          title="경고 건수"
          value={metrics.warning_count}
          subtitle="조치 필요 항목"
          icon={AlertTriangle}
          variant={metrics.warning_count > 0 ? "warning" : "success"}
        />
        <InsightCard
          title="평균 처리시간"
          value={`${metrics.avg_processing_time}ms`}
          subtitle="시스템 응답속도"
          icon={Activity}
          variant="default"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">시스템 요약</TabsTrigger>
          <TabsTrigger value="automation">자동화 상태</TabsTrigger>
          <TabsTrigger value="anomaly">이상 감지</TabsTrigger>
          <TabsTrigger value="qa">QA 리포트</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <TrendChart data={trendData} loading={false} />
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <AutomationMonitor />
        </TabsContent>

        <TabsContent value="anomaly" className="space-y-4">
          <AnomalyDetection />
        </TabsContent>

        <TabsContent value="qa" className="space-y-4">
          <QAReportsTable reports={qaReports} loading={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

