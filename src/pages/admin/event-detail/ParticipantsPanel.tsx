// [LOCKED][71-I] Participants panel with event context enforcement
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { Plus, Search, Download, Upload, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ParticipantRightPanel } from "@/components/participants/ParticipantRightPanel";
import { UploadParticipantsModal } from "@/components/dashboard/UploadParticipantsModal";
import { exportParticipantsToExcel } from "@/utils/exportParticipants";
import { LoadingSkeleton } from "@/components/pd/LoadingSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import useSWR from "swr";

interface Participant {
  id: string;
  participant_name: string;
  company_name?: string;
  participant_contact?: string;
  email?: string;
  memo?: string;
  stay_plan?: string;
  manager_info?: any;
  sfe_agency_code?: string;
  sfe_customer_code?: string;
  status?: string;
  created_at: string;
}

export default function ParticipantsPanel() {
  const { eventId } = useParams();
  const { agencyScope } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  // [71-I] Enforce event context
  if (!eventId || !agencyScope) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <LoadingSkeleton type="card" count={1} />
          <p className="text-muted-foreground">행사 컨텍스트를 로드하는 중...</p>
        </div>
      </div>
    );
  }

  const swrKey = `participants_${agencyScope}_${eventId}`;

  const { data: participants, error, isLoading, mutate } = useSWR<Participant[]>(
    swrKey,
    async () => {
      console.log("[71-I.QA] Loading participants", { eventId, agencyScope });
      
      const { data, error } = await supabase
        .from("participants")
        .select("*")
        .eq("agency_id", agencyScope)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Map database fields to interface
      const mapped: Participant[] = (data || []).map((row: any) => ({
        id: row.id,
        participant_name: row.participant_name || row.name || "",
        company_name: row.company_name,
        participant_contact: row.participant_contact || row.phone,
        email: row.email,
        memo: row.memo,
        stay_plan: row.stay_plan,
        manager_info: row.manager_info,
        sfe_agency_code: row.sfe_agency_code,
        sfe_customer_code: row.sfe_customer_code,
        status: row.status,
        created_at: row.created_at,
      }));
      
      console.log("[71-I.QA] Loaded participants:", mapped.length);
      return mapped;
    },
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const handleRowClick = (participant: Participant) => {
    setSelectedParticipant(participant);
    setPanelOpen(true);
  };

  const handleExport = () => {
    if (!participants || participants.length === 0) {
      toast.error("내보낼 데이터가 없습니다");
      return;
    }
    exportParticipantsToExcel(participants, `participants_${eventId}.xlsx`);
    toast.success(`${participants.length}명의 데이터를 내보냈습니다`);
  };

  const filteredParticipants = participants?.filter(
    (p) =>
      !searchQuery ||
      p.participant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSkeleton type="table" count={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-destructive bg-destructive/10 rounded-xl shadow-sm">
        데이터 로드 중 오류가 발생했습니다: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="이름 또는 소속으로 검색..."
              className="pl-10 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Badge variant="secondary" className="text-sm">
            총 {participants?.length || 0}명
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </Button>
          <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            업로드
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            추가
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {!filteredParticipants || filteredParticipants.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              등록된 참가자가 없습니다. 업로드 또는 추가 버튼을 클릭하여 참가자를 등록하세요.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableHead className="font-semibold">성명</TableHead>
                    <TableHead className="font-semibold">소속</TableHead>
                    <TableHead className="font-semibold">연락처</TableHead>
                    <TableHead className="font-semibold">숙박예정</TableHead>
                    <TableHead className="font-semibold">담당자</TableHead>
                    <TableHead className="font-semibold">상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParticipants.map((participant) => (
                    <TableRow
                      key={participant.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleRowClick(participant)}
                    >
                      <TableCell className="font-semibold">
                        {participant.participant_name}
                      </TableCell>
                      <TableCell>{participant.company_name || "-"}</TableCell>
                      <TableCell>{participant.participant_contact || "-"}</TableCell>
                      <TableCell>
                        {participant.stay_plan ? (
                          <Badge variant="secondary" className="rounded-xl">
                            {participant.stay_plan}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {participant.manager_info?.name || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={participant.status === "VIP" ? "default" : "secondary"}
                          className="rounded-xl"
                        >
                          {participant.status || "일반"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right Panel */}
      <ParticipantRightPanel
        participant={selectedParticipant}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onUpdate={() => mutate()}
        onDelete={() => mutate()}
      />

      {/* Upload Modal */}
      <UploadParticipantsModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        events={[{ id: eventId, name: "Current Event" }]}
      />
    </div>
  );
}
