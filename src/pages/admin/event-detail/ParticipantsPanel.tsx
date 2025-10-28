// [71-J.2-FINAL] Participants panel with grid + drawer layout
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { Plus, Search, Download, Upload, CheckSquare } from "lucide-react";
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
import { DataTable } from "@/components/participants/DataTable";
import { DrawerPanel } from "@/components/participants/DrawerPanel";
import { UploadParticipantsModal } from "@/components/dashboard/UploadParticipantsModal";
import { exportParticipantsToExcel, type ExportMode } from "@/utils/exportParticipants";
import { LoadingSkeleton } from "@/components/pd/LoadingSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useParticipantsPanel } from "@/state/participantsPanel";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import "@/styles/participants.css";

// [71-J.7] Extended participant interface with child_ages array
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
  lodging_status?: string;
  companion?: string;
  companion_memo?: string;
  adult_count?: number;
  child_ages?: string[];
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

interface ParticipantsPanelProps {
  selectedParticipant: Participant | null;
  onSelectParticipant: (participant: Participant | null) => void;
  onMutate?: () => void;
}

export default function ParticipantsPanel({ onMutate }: ParticipantsPanelProps) {
  const { eventId } = useParams();
  const { agencyScope, user } = useUser();
  const { isOpen } = useParticipantsPanel();
  const [searchQuery, setSearchQuery] = useState("");
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
      onMutate?.();
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
    <div className="w-full h-full overflow-hidden">
      <div className="h-full flex flex-col w-full">
        {/* Header */}
      <div className="tabs-header flex items-center justify-between w-full px-2 py-3 border-b">
        <div className="flex items-center gap-4">
          <div className="relative min-w-[300px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="이름 또는 소속으로 검색..."
              className="pl-10 h-10 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Badge variant="secondary" className="text-sm">
            총 {participants?.length || 0}명
          </Badge>
        </div>
        
        <div className="flex gap-2 action-buttons">
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
          <Button 
            size="sm"
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-xl transition-all duration-150 ease-in-out shadow-sm hover:shadow-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            추가
          </Button>
        </div>
      </div>

        {/* Main Content: Table */}
        <div className="flex-1 overflow-hidden px-2 py-4">
          <Card>
            <CardContent className="p-0 h-[calc(100vh-280px)] overflow-x-auto">
              {!filteredParticipants || filteredParticipants.length === 0 ? (
                <div className="text-center text-muted-foreground py-16">
                  등록된 참가자가 없습니다. 업로드 또는 추가 버튼을 클릭하여 참가자를 등록하세요.
                </div>
              ) : (
                <DataTable
                  participants={filteredParticipants}
                  selectedIds={selectedIds}
                  onSelectChange={setSelectedIds}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upload Modal */}
        <UploadParticipantsModal
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          events={[{ id: eventId, name: "Current Event" }]}
        />
      </div>

      {/* Drawer Panel */}
      {filteredParticipants && filteredParticipants.length > 0 && (
        <DrawerPanel
          participants={filteredParticipants}
          onUpdate={() => {
            mutate();
            onMutate?.();
          }}
        />
      )}
    </div>
  );
}
