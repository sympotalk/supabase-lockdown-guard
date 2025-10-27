// [LOCKED][71-J.1] Participants panel with grid layout
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { Plus, Search, Download, Upload, RefreshCw, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { exportParticipantsToExcel, type ExportMode } from "@/utils/exportParticipants";
import { LoadingSkeleton } from "@/components/pd/LoadingSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import useSWR from "swr";

// [71-J.1] Extended participant interface with new fields
interface Participant {
  id: string;
  name: string;
  organization?: string;
  phone?: string;
  email?: string;
  memo?: string;
  team_name?: string;
  manager_name?: string;
  manager_phone?: string;
  manager_info?: any;
  sfe_agency_code?: string;
  sfe_customer_code?: string;
  status?: string;
  classification?: string;
  stay_status?: string;
  companion?: string;
  recruitment_status?: string;
  message_sent?: string;
  survey_completed?: string;
  last_edited_by?: string;
  last_edited_at?: string;
  created_at: string;
}

// [71-I.QA3-FIX.R10] Parse memo badges for display
function parseBadges(memo: string | undefined): Array<{ label: string; icon?: string }> {
  if (!memo) return [];
  const items = memo.split(",").map((s) => s.trim()).filter(Boolean);
  return items.slice(0, 2).map((label) => ({ label }));
}

export default function ParticipantsPanel() {
  const { eventId } = useParams();
  const { agencyScope, user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
      console.log("[71-I.QA3-FIX.R7] Loading participants", { eventId, agencyScope });
      
      const { data, error } = await supabase
        .from("participants")
        .select("*")
        .eq("agency_id", agencyScope)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // [71-I.QA3-FIX.R7] Direct mapping to DB schema
      console.log("[71-I.QA3-FIX.R7] Loaded participants:", (data || []).length);
      return data as Participant[];
    },
    { 
      revalidateOnFocus: false, 
      dedupingInterval: 60000,
      // [71-I.QA3-FIX.R7] Prevent cache lookup when eventId is missing
      shouldRetryOnError: false
    }
  );

  const handleRowClick = (participant: Participant) => {
    setSelectedParticipant(participant);
    setPanelOpen(true);
  };

  const handleExport = (mode: ExportMode = 'work') => {
    if (!participants || participants.length === 0) {
      toast.error("내보낼 데이터가 없습니다");
      return;
    }
    const modeLabel = mode === 'work' ? '업무용' : '보관용';
    exportParticipantsToExcel(participants, `participants_${eventId}_${mode}.xlsx`, mode);
    toast.success(`${participants.length}명의 데이터를 ${modeLabel} 템플릿으로 내보냈습니다`);
  };

  // [LOCKED][QA2] Bulk actions
  const handleBulkUpdate = async (patch: Record<string, any>) => {
    if (selectedIds.length === 0) {
      toast.error("선택된 참가자가 없습니다");
      return;
    }

    const { error } = await supabase
      .from("participants")
      .update({ ...patch })
      .in("id", selectedIds);

    if (error) {
      console.error("[QA2] Bulk update error:", error);
      toast.error("일괄 수정 실패");
    } else {
      console.log("[QA2] Bulk updated:", selectedIds.length, "participants");
      toast.success(`${selectedIds.length}명 일괄 수정 완료`);
      setSelectedIds([]);
      mutate();
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredParticipants?.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredParticipants?.map((p) => p.id) || []);
    }
  };

  const filteredParticipants = participants?.filter(
    (p) =>
      !searchQuery ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.organization?.toLowerCase().includes(searchQuery.toLowerCase())
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
    <div className="grid grid-cols-[7fr_3fr] gap-6 h-full px-8">
      {/* Left: Table */}
      <div className="space-y-6 overflow-y-auto pr-4">
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
          {selectedIds.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkUpdate({ call_checked: true })}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                통화완료 ({selectedIds.length})
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    일괄 숙박 변경
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkUpdate({ stay_plan: "미숙박" })}>
                    미숙박
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkUpdate({ stay_plan: "1일차" })}>
                    1일차
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkUpdate({ stay_plan: "2일차" })}>
                    2일차
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                내보내기
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('work')}>
                업무용 템플릿
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('archive')}>
                보관용 템플릿
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.length === filteredParticipants.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="font-semibold w-12 text-center">No.</TableHead>
                    <TableHead className="font-semibold w-20">구분</TableHead>
                    <TableHead className="font-semibold w-24">성명</TableHead>
                    <TableHead className="font-semibold w-32">소속</TableHead>
                    <TableHead className="font-semibold w-28">연락처</TableHead>
                    <TableHead className="font-semibold w-36">요청사항</TableHead>
                    <TableHead className="font-semibold w-24">숙박현황</TableHead>
                    <TableHead className="font-semibold w-24">동반인</TableHead>
                    <TableHead className="font-semibold w-20 text-center">모객</TableHead>
                    <TableHead className="font-semibold w-20 text-center">문자</TableHead>
                    <TableHead className="font-semibold w-20 text-center">설문</TableHead>
                    <TableHead className="font-semibold w-20 text-center">상태</TableHead>
                    <TableHead className="font-semibold w-24 text-right">등록일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParticipants.map((participant, index) => (
                    <TableRow
                      key={participant.id}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                      onClick={() => handleRowClick(participant)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(participant.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIds([...selectedIds, participant.id]);
                            } else {
                              setSelectedIds(selectedIds.filter((id) => id !== participant.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {participant.classification || "일반"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {participant.name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {participant.organization || "-"}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {participant.phone || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {parseBadges(participant.memo).slice(0, 3).map((badge, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {badge.label}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {participant.stay_status || "미정"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {participant.companion || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={participant.recruitment_status === "O" ? "default" : "outline"}
                          className="text-xs"
                        >
                          {participant.recruitment_status || "X"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={participant.message_sent === "O" ? "default" : "outline"}
                          className="text-xs"
                        >
                          {participant.message_sent || "X"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={participant.survey_completed === "O" ? "default" : "outline"}
                          className="text-xs"
                        >
                          {participant.survey_completed || "X"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            participant.status === "confirmed" ? "default" : 
                            participant.status === "cancelled" ? "destructive" : 
                            "secondary"
                          }
                          className="text-xs"
                        >
                          {participant.status === "pending" ? "대기중" :
                           participant.status === "confirmed" ? "확정" :
                           participant.status === "cancelled" ? "취소" :
                           participant.status || "일반"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {new Date(participant.created_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        }).replace(/\. /g, '.').replace(/\.$/, '')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <UploadParticipantsModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        events={[{ id: eventId, name: "Current Event" }]}
      />
      </div>

      {/* Right: Detail Panel */}
      <div className="overflow-y-auto pl-4 border-l">
        <ParticipantRightPanel
          participant={selectedParticipant}
          onUpdate={() => mutate()}
          onDelete={() => {
            setSelectedParticipant(null);
            mutate();
          }}
        />
      </div>
    </div>
  );
}
