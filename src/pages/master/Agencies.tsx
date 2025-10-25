import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

interface Agency {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
  created_at: string;
  event_count: number;
  participant_count: number;
  manager_name: string | null;
  last_activity: string | null;
}

export default function MasterAgencies() {
  const navigate = useNavigate();
  const { setAgencyScope } = useUser();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadAgencies();
  }, []);

  const loadAgencies = async () => {
    setLoading(true);
    console.log("[MasterAgencies] Loading agencies...");

    const { data, error } = await supabase
      .from("agencies")
      .select("id, name, code, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[MasterAgencies] Error fetching agencies:", error);
      toast.error("에이전시 데이터를 불러오지 못했습니다.");
      setLoading(false);
      return;
    }

    // Fetch counts for each agency
    const withCounts = await Promise.all(
      (data || []).map(async (agency) => {
        const [
          { count: event_count },
          { count: participant_count },
          activityData
        ] = await Promise.all([
          supabase
            .from("events")
            .select("*", { count: "exact", head: true })
            .eq("agency_id", agency.id),
          supabase
            .from("participants")
            .select("*", { count: "exact", head: true })
            .eq("agency_id", agency.id),
          supabase
            .from("activity_logs")
            .select("created_at")
            .eq("agency_id", agency.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        ]);

        return {
          ...agency,
          event_count: event_count || 0,
          participant_count: participant_count || 0,
          manager_name: null,
          last_activity: activityData?.data?.created_at || null
        };
      })
    );

    console.log("[MasterAgencies] Loaded agencies:", withCounts.length);
    setAgencies(withCounts);
    setLoading(false);
  };

  const handleViewAgency = (agencyId: string, name: string) => {
    console.log(`[MasterAgencies] Entering View Mode for: ${name}`);
    setAgencyScope(agencyId);
    toast.success(`${name} 에이전시 보기 모드로 전환되었습니다.`);
    navigate(`/admin/events?agency=${agencyId}`);
  };

  const generateInvite = async (agencyId: string) => {
    toast.info("초대 링크 생성 기능은 곧 제공됩니다.");
    // TODO: Implement invite link generation
  };

  const editAgency = (agencyId: string) => {
    toast.info("에이전시 수정 기능은 곧 제공됩니다.");
    // TODO: Implement edit modal
  };

  const deleteAgency = (agencyId: string) => {
    toast.info("에이전시 삭제 기능은 곧 제공됩니다.");
    // TODO: Implement delete confirmation
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  };

  const filteredAgencies = agencies.filter(agency =>
    agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (agency.code && agency.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">에이전시 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            전체 에이전시 현황을 관리하고 초대 및 접근 권한을 제어합니다.
          </p>
        </div>
        <Button onClick={() => toast.info("에이전시 생성 모달은 곧 제공됩니다.")} className="rounded-lg">
          <Plus className="h-4 w-4 mr-2" />
          새 에이전시 등록
        </Button>
      </div>

      {/* Search/Filter */}
      <div className="mb-4 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="에이전시명 또는 코드로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          총 {filteredAgencies.length}개 에이전시
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            로딩 중...
          </div>
        ) : filteredAgencies.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground mb-2">
              {searchTerm ? "검색 결과가 없습니다." : "등록된 에이전시가 없습니다."}
            </p>
            {!searchTerm && (
              <Button variant="outline" onClick={() => toast.info("에이전시 생성 모달은 곧 제공됩니다.")}>
                새 에이전시 등록
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>에이전시명</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">등록 행사</TableHead>
                <TableHead className="text-right">참가자</TableHead>
                <TableHead>담당자</TableHead>
                <TableHead>최근 활동일</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgencies.map((agency) => (
                <TableRow key={agency.id}>
                  <TableCell>
                    <button
                      onClick={() => handleViewAgency(agency.id, agency.name)}
                      className="text-primary hover:underline font-medium"
                    >
                      {agency.name}
                    </button>
                    {agency.code && (
                      <span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {agency.code}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={agency.is_active ? "default" : "secondary"}>
                      {agency.is_active ? "활성" : "비활성"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{agency.event_count}</TableCell>
                  <TableCell className="text-right">{agency.participant_count}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {agency.manager_name || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(agency.last_activity)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateInvite(agency.id);
                        }}
                      >
                        초대
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          editAgency(agency.id);
                        }}
                      >
                        수정
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAgency(agency.id);
                        }}
                      >
                        삭제
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
