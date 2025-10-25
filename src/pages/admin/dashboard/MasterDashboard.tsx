import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Calendar, Users, FileText } from "lucide-react";

interface AgencySummary {
  agency_id: string;
  agency_name: string;
  agency_code: string | null;
  event_count: number;
  participant_count: number;
  form_count: number;
  last_activity: string | null;
  is_active: boolean;
}

export default function MasterDashboard() {
  const [agencies, setAgencies] = useState<AgencySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgencies = async () => {
      console.log("[UI] Fetching agency summary for MASTER dashboard");
      
      const { data, error } = await supabase
        .from("agency_summary")
        .select("*")
        .order("last_activity", { ascending: false, nullsFirst: false });

      if (error) {
        console.error("[RLS] Error fetching agency summary:", error);
      } else {
        console.log("[UI] Agency summary loaded:", data?.length, "agencies");
        setAgencies(data || []);
      }
      
      setLoading(false);
    };

    fetchAgencies();
  }, []);

  const handleAgencyClick = (agencyId: string, agencyName: string) => {
    console.log("[RLS] Master switching to agency context:", agencyId);
    window.location.href = `/admin/dashboard?asAgency=${agencyId}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">마스터 대시보드</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">마스터 대시보드</h1>
          <p className="text-muted-foreground mt-1">
            전체 에이전시 현황을 확인하고 관리하세요
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          총 {agencies.length}개 에이전시
        </div>
      </div>

      {agencies.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">등록된 에이전시가 없습니다</h3>
          <p className="text-sm text-muted-foreground">
            새로운 에이전시를 등록해주세요.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agencies.map((agency) => (
            <Card
              key={agency.agency_id}
              className="p-6 hover:bg-accent hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary"
              onClick={() => handleAgencyClick(agency.agency_id, agency.agency_name)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-1">
                    {agency.agency_name}
                  </h3>
                  {agency.agency_code && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {agency.agency_code}
                    </span>
                  )}
                </div>
                <div
                  className={`h-3 w-3 rounded-full ${
                    agency.is_active ? "bg-green-500" : "bg-gray-300"
                  }`}
                  title={agency.is_active ? "활성" : "비활성"}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">행사</span>
                  <span className="ml-auto font-semibold">{agency.event_count}건</span>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">참가자</span>
                  <span className="ml-auto font-semibold">{agency.participant_count}명</span>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">설문</span>
                  <span className="ml-auto font-semibold">{agency.form_count}개</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  최근 활동:{" "}
                  {agency.last_activity
                    ? new Date(agency.last_activity).toLocaleDateString("ko-KR")
                    : "활동 없음"}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
