// [71-J.2-FINAL] Participants data table with sticky columns
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useParticipantsPanel } from "@/state/participantsPanel";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Participant {
  id: string;
  name: string;
  organization?: string;
  phone?: string;
  email?: string;
  memo?: string;
  classification?: string;
  fixed_role?: string;
  custom_role?: string;
  participant_no?: number;
  lodging_status?: string;
  adult_count?: number;
  child_ages?: string[];
  companion?: string;
  recruitment_status?: string;
  message_sent?: string;
  survey_completed?: string;
  status?: string;
  created_at: string;
}

interface DataTableProps {
  participants: Participant[];
  selectedIds: string[];
  onSelectChange: (ids: string[]) => void;
}

function parseBadges(memo: string | undefined): Array<{ label: string }> {
  if (!memo) return [];
  const items = memo.split(" / ").map((s) => s.trim()).filter(Boolean);
  return items.slice(0, 2).map((label) => ({ label }));
}

// [72-RM.BADGE.HYBRID] Role badge cell with select + input
function RoleBadgeCell({ participant }: { participant: Participant }) {
  const [fixedRole, setFixedRole] = useState(participant.fixed_role || "");
  const [customRole, setCustomRole] = useState(participant.custom_role || "");
  const roles = ["좌장", "연자", "참석자"];

  const handleFixedRoleChange = async (newRole: string) => {
    setFixedRole(newRole);
    const { error } = await supabase
      .from("participants")
      .update({ fixed_role: newRole })
      .eq("id", participant.id);
    
    if (error) {
      console.error("[72-RM.BADGE.HYBRID] Error updating fixed_role:", error);
      toast.error("구분 변경 실패");
    } else {
      toast.success("구분이 변경되었습니다");
    }
  };

  const handleCustomRoleSave = async (val: string) => {
    const trimmed = val.trim();
    setCustomRole(trimmed);
    const { error } = await supabase
      .from("participants")
      .update({ custom_role: trimmed || null })
      .eq("id", participant.id);
    
    if (error) {
      console.error("[72-RM.BADGE.HYBRID] Error updating custom_role:", error);
      toast.error("추가 구분 저장 실패");
    } else if (trimmed) {
      toast.success("추가 구분이 저장되었습니다");
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Fixed role select */}
      <select
        value={fixedRole}
        onChange={(e) => handleFixedRoleChange(e.target.value)}
        className="bg-muted border border-border rounded-md text-xs px-2 py-1 text-foreground focus:ring-2 focus:ring-primary focus:outline-none min-w-[70px]"
      >
        <option value="">선택</option>
        {roles.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      {/* Custom role input */}
      <input
        type="text"
        placeholder="추가입력"
        value={customRole}
        onChange={(e) => setCustomRole(e.target.value)}
        onBlur={(e) => handleCustomRoleSave(e.target.value)}
        className="border border-border bg-background rounded-md px-2 py-1 text-xs w-20 focus:ring-2 focus:ring-primary focus:outline-none"
      />
    </div>
  );
}

export function DataTable({ participants, selectedIds, onSelectChange }: DataTableProps) {
  const { open } = useParticipantsPanel();

  const toggleSelectAll = () => {
    if (selectedIds.length === participants.length) {
      onSelectChange([]);
    } else {
      onSelectChange(participants.map((p) => p.id));
    }
  };

  const handleRowClick = (id: string) => {
    open(id);
  };

  return (
    <div className="w-full h-full overflow-auto">
      <Table className="min-w-[1200px]">
        <TableHeader className="sticky top-0 z-10 bg-muted transition-colors duration-150">
          <TableRow className="hover:bg-transparent border-b border-border">
            <TableHead className="w-12 py-3 px-4">
              <Checkbox
                checked={selectedIds.length === participants.length && participants.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead className="w-12 py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">No.</TableHead>
            <TableHead className="w-20 py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">구분</TableHead>
            <TableHead className="sticky-col-name w-24 py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">성명</TableHead>
            <TableHead className="sticky-col-org w-32 py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">소속</TableHead>
            <TableHead className="w-28 py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">연락처</TableHead>
            <TableHead className="w-36 py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">요청사항</TableHead>
            <TableHead className="w-24 py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">숙박현황</TableHead>
            <TableHead className="w-16 py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">성인</TableHead>
            <TableHead className="w-32 py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">소아</TableHead>
            <TableHead className="w-24 py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">동반인</TableHead>
            <TableHead className="w-20 py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">모객</TableHead>
            <TableHead className="w-20 py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">문자</TableHead>
            <TableHead className="w-20 py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">설문</TableHead>
            <TableHead className="w-20 py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">상태</TableHead>
            <TableHead className="w-24 py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">등록일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="bg-card transition-colors duration-150">
          {participants.map((participant, index) => (
            <TableRow
              key={participant.id}
              className="participant-row transition-all duration-150 cursor-pointer last:rounded-b-2xl border-b border-border hover:bg-accent"
              onClick={() => handleRowClick(participant.id)}
            >
              <TableCell className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.includes(participant.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onSelectChange([...selectedIds, participant.id]);
                    } else {
                      onSelectChange(selectedIds.filter((id) => id !== participant.id));
                    }
                  }}
                />
              </TableCell>
              <TableCell className="py-2.5 px-4 text-center text-sm text-muted-foreground">
                {participant.participant_no || index + 1}
              </TableCell>
              <TableCell className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                <RoleBadgeCell participant={participant} />
              </TableCell>
              <TableCell className="sticky-col-name py-2.5 px-4 font-semibold text-sm text-card-foreground whitespace-nowrap truncate">
                {participant.name}
              </TableCell>
              <TableCell className="sticky-col-org py-2.5 px-4 text-sm text-card-foreground truncate max-w-[160px]" title={participant.organization || "-"}>
                {participant.organization || "-"}
              </TableCell>
              <TableCell className="py-2.5 px-4 truncate max-w-[160px] whitespace-nowrap overflow-hidden text-ellipsis text-center text-sm text-card-foreground">
                {participant.phone || "-"}
              </TableCell>
              <TableCell className="py-2.5 px-4">
                <div className="flex gap-1 flex-wrap">
                  {parseBadges(participant.memo).map((badge, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="py-2.5 px-4">
                <Badge variant="secondary" className="text-xs">
                  {participant.lodging_status || "미정"}
                </Badge>
              </TableCell>
              <TableCell className="py-2.5 px-4 text-center">
                {participant.adult_count ? (
                  <Badge variant="outline" className="text-xs">{participant.adult_count}</Badge>
                ) : "-"}
              </TableCell>
              <TableCell className="py-2.5 px-4 text-center text-sm text-card-foreground">
                {participant.child_ages && participant.child_ages.length > 0
                  ? participant.child_ages.join(' / ')
                  : "-"}
              </TableCell>
              <TableCell className="py-2.5 px-4 text-sm text-card-foreground truncate max-w-[120px]" title={participant.companion || "-"}>
                {participant.companion || "-"}
              </TableCell>
              <TableCell className="py-2.5 px-4 text-center">
                <Badge 
                  variant={participant.recruitment_status === "O" ? "default" : "outline"}
                  className="text-xs"
                >
                  {participant.recruitment_status || "X"}
                </Badge>
              </TableCell>
              <TableCell className="py-2.5 px-4 text-center">
                <Badge 
                  variant={participant.message_sent === "O" ? "default" : "outline"}
                  className="text-xs"
                >
                  {participant.message_sent || "X"}
                </Badge>
              </TableCell>
              <TableCell className="py-2.5 px-4 text-center">
                <Badge 
                  variant={participant.survey_completed === "O" ? "default" : "outline"}
                  className="text-xs"
                >
                  {participant.survey_completed || "X"}
                </Badge>
              </TableCell>
              <TableCell className="py-2.5 px-4 text-center">
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
              <TableCell className="py-2.5 px-4 text-right text-sm text-muted-foreground">
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
  );
}
