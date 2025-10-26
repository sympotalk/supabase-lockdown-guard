import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { NewAgencyModal } from "@/components/agency/NewAgencyModal";
import { format } from "date-fns";

interface Agency {
  id: string;
  name: string;
  contact_email: string;
  memo: string | null;
  is_active: boolean;
  created_at: string;
}

export default function MasterAgencies() {
  const navigate = useNavigate();
  const { role } = useUser();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const canCreate = role === 'master';

  useEffect(() => {
    loadAgencies();
  }, []);

  const loadAgencies = async () => {
    setLoading(true);
    console.log("[MasterAgencies] Loading agencies...");

    const { data, error } = await supabase
      .from("agencies")
      .select("id, name, contact_email, memo, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[MasterAgencies] Error fetching agencies:", error);
      toast({
        title: "로딩 실패",
        description: "에이전시 데이터를 불러오지 못했습니다.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    console.log("[MasterAgencies] Loaded agencies:", data?.length || 0);
    setAgencies(data || []);
    setLoading(false);
  };

  const editAgency = (agencyId: string) => {
    toast({
      title: "준비 중",
      description: "에이전시 수정 기능은 곧 제공됩니다.",
    });
    // TODO: Implement edit modal
  };

  const deleteAgency = (agencyId: string, name: string) => {
    toast({
      title: "준비 중",
      description: "에이전시 삭제 기능은 곧 제공됩니다.",
    });
    // TODO: Implement delete confirmation
  };

  const filteredAgencies = agencies.filter(agency =>
    agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (agency.contact_email && agency.contact_email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[28px] font-bold">에이전시 관리</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            전체 에이전시 현황을 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <Button onClick={() => setCreateModalOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              새 에이전시 등록
            </Button>
          )}
          <Button onClick={loadAgencies} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="에이전시명 또는 이메일로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-[13px] text-muted-foreground">
          총 {filteredAgencies.length}개 에이전시
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-xl bg-card shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            로딩 중...
          </div>
        ) : filteredAgencies.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground mb-2">
              {searchTerm ? "검색 결과가 없습니다." : "등록된 에이전시가 없습니다."}
            </p>
            {!searchTerm && canCreate && (
              <Button variant="outline" onClick={() => setCreateModalOpen(true)}>
                새 에이전시 등록
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>🏢 에이전시명</TableHead>
                <TableHead>👤 대표자 이메일</TableHead>
                <TableHead>🕓 등록일</TableHead>
                <TableHead>🗒 메모</TableHead>
                <TableHead className="text-right">⚙️ 관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgencies.map((agency) => (
                <TableRow key={agency.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[13px]">{agency.name}</span>
                      <Badge 
                        variant={agency.is_active ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {agency.is_active ? "활성" : "비활성"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px]">
                    {agency.contact_email || "-"}
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    {format(new Date(agency.created_at), "yyyy-MM-dd")}
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground max-w-[200px] truncate">
                    {agency.memo || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editAgency(agency.id)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        수정
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteAgency(agency.id, agency.name)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Agency Modal */}
      <NewAgencyModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={loadAgencies}
      />
    </div>
  );
}
