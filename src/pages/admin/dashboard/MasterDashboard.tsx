import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/context/UserContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Calendar, Users, FileText, Plus } from "lucide-react";
import { toast } from "sonner";

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
  const navigate = useNavigate();
  const { setAgencyScope } = useUser();
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

  const handleAgencyClick = async (agencyId: string, agencyName: string) => {
    console.log(`[RLS] Master viewing agency: ${agencyId} (${agencyName})`);
    setAgencyScope(agencyId);
    toast.success(`${agencyName} 에이전시 보기 모드로 전환되었습니다`);
    navigate(`/admin/events?agency=${agencyId}`);
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
          <h1 className="text-3xl font-bold">SympoHub Master Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            전체 에이전시 현황 및 진입 관리
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            총 {agencies.length}개 에이전시
          </div>
          <Button onClick={() => navigate("/admin/account")}>
            <Plus className="h-4 w-4 mr-2" />
            새 에이전시 등록
          </Button>
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
              className="rounded-xl shadow-md p-5 border border-gray-100 hover:ring-2 hover:ring-blue-300 transition cursor-pointer"
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
