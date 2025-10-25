import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppData } from "@/contexts/AppDataContext";
import { BarChart3, Users, Activity, UsersRound, RefreshCcw, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/pd/Spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AgencyOverview = {
  agency_id: string;
  agency_name: string;
  agency_code: string | null;
  is_active: boolean;
  events_count: number;
  participants_count: number;
  activity_count: number;
  member_count: number;
  last_activity: string;
  status: 'active' | 'inactive' | 'idle' | 'disabled';
};

export default function MasterOverviewPanel() {
  const { setActiveAgency } = useAppData();
  const [data, setData] = useState<AgencyOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const load = async () => {
    try {
      setLoading(true);
      const { data: overview, error } = await supabase
        .from("master_agency_overview")
        .select("*")
        .order("last_activity", { ascending: false });

      if (error) {
        console.error("[MasterOverview] Load error:", error);
        toast.error("에이전시 현황을 불러올 수 없습니다");
        
        // Retry logic
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            load();
          }, 2000 * Math.pow(2, retryCount));
        }
      } else {
        setData((overview || []) as AgencyOverview[]);
        setRetryCount(0);
      }
    } catch (error) {
      console.error("[MasterOverview] Unexpected error:", error);
      toast.error("데이터를 불러오는 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // Realtime subscriptions for updates
    const channel = supabase
      .channel("master_overview_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => {
          console.log("[MasterOverview] Events changed");
          load();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants" },
        () => {
          console.log("[MasterOverview] Participants changed");
          load();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_logs" },
        () => {
          console.log("[MasterOverview] Activities changed");
          load();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[MasterOverview] Realtime connected");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAgencyClick = (agency: AgencyOverview) => {
    try {
      setActiveAgency({
        id: agency.agency_id,
        name: agency.agency_name,
        code: agency.agency_code
      });
      toast.success(`${agency.agency_name}로 전환되었습니다`);
    } catch (error) {
      console.error("[MasterOverview] Agency switch error:", error);
      toast.error("에이전시 전환에 실패했습니다");
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      active: { bg: "bg-success/10", text: "text-success", label: "활성" },
      inactive: { bg: "bg-muted", text: "text-muted-foreground", label: "비활성" },
      idle: { bg: "bg-warning/10", text: "text-warning", label: "대기" },
      disabled: { bg: "bg-destructive/10", text: "text-destructive", label: "중지" }
    };
    const config = configs[status as keyof typeof configs] || configs.inactive;
    return (
      <span className={cn("text-xs px-2 py-1 rounded-full font-medium", config.bg, config.text)}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p className="text-sm text-muted-foreground">에이전시 현황 로딩 중...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
          <h3 className="font-semibold text-lg mb-1">등록된 에이전시가 없습니다</h3>
          <p className="text-sm text-muted-foreground">
            에이전시를 생성하여 관리를 시작하세요
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            에이전시 통합 현황
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              총 {data.length}개 에이전시
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={load}
              className="gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              새로고침
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((agency) => (
            <div
              key={agency.agency_id}
              onClick={() => handleAgencyClick(agency)}
              className={cn(
                "border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                agency.status === "inactive" && "opacity-60",
                agency.status === "disabled" && "opacity-40 grayscale"
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate" title={agency.agency_name}>
                    {agency.agency_name}
                  </h3>
                  {agency.agency_code && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      코드: {agency.agency_code}
                    </p>
                  )}
                </div>
                {getStatusBadge(agency.status)}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <MetricItem
                  icon={<BarChart3 className="h-3.5 w-3.5" />}
                  value={agency.events_count}
                  label="행사"
                />
                <MetricItem
                  icon={<Users className="h-3.5 w-3.5" />}
                  value={agency.participants_count}
                  label="참가자"
                />
                <MetricItem
                  icon={<Activity className="h-3.5 w-3.5" />}
                  value={agency.activity_count}
                  label="활동"
                />
                <MetricItem
                  icon={<UsersRound className="h-3.5 w-3.5" />}
                  value={agency.member_count}
                  label="멤버"
                />
              </div>

              <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                최근 활동: {new Date(agency.last_activity).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "short",
                  day: "numeric"
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricItem({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-2 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-lg font-bold">{value.toLocaleString()}</div>
    </div>
  );
}
