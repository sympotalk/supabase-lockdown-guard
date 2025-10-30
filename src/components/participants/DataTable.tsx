// [71-J.2-FINAL] Participants data table with sticky columns
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useParticipantsPanel } from "@/state/participantsPanel";
import { cn } from "@/lib/utils";
import { normalizeRoleBadge, getRoleBadgeColor } from "@/lib/participantUtils";
import { useState, useEffect, useRef } from "react";

interface Participant {
  id: string;
  name: string;
  organization?: string;
  phone?: string;
  email?: string;
  request_note?: string;
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
  call_status?: string;
  created_at: string;
  last_edited_by?: string;
  last_edited_at?: string;
  editor_email?: string;
  editor_display_name?: string;
}

interface DataTableProps {
  participants: Participant[];
  selectedIds: string[];
  onSelectChange: (ids: string[]) => void;
  highlightedId?: string | null; // [Phase 73-L.7.30] ID of newly added participant
}


// [Phase 73-L.7.26] Display-only role badge cell - click to open panel
function RoleBadgeCell({ participant, onClick }: { participant: Participant; onClick: () => void }) {
  // [Phase 73-L.7.26] Normalize fixed_role to prevent "선택" from showing
  const fixed_role = normalizeRoleBadge(participant.fixed_role);
  const { custom_role } = participant;

  return (
    <div 
      className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Fixed role badge - always shows normalized value */}
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs px-2.5 py-0.5 rounded-full",
          getRoleBadgeColor(fixed_role)
        )}
      >
        {fixed_role}
      </Badge>

      {/* Custom role badge */}
      {custom_role && (
        <Badge 
          variant="outline" 
          className="text-xs px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1] border-transparent"
        >
          {custom_role}
        </Badge>
      )}
    </div>
  );
}

export function DataTable({ participants, selectedIds, onSelectChange, highlightedId }: DataTableProps) {
  const { open } = useParticipantsPanel();
  const [displayData, setDisplayData] = useState<Participant[]>([]);
  // [Phase 73-L.7.30] Ref to track highlighted row for scroll
  const highlightedRowRef = useRef<HTMLTableRowElement>(null);

  // [Phase 73-L.7.15] Role priority sort + Korean name sort + auto numbering
  useEffect(() => {
    if (!participants || participants.length === 0) {
      setDisplayData([]);
      return;
    }

    // Role priority dictionary
    const rolePriority: Record<string, number> = {
      '좌장': 1,
      '연자': 2,
      '패널': 3,
      '참석자': 4,
    };

    const getPriority = (row: Participant) => {
      // fixed_role 우선, 없으면 폴백 5 (맨 뒤)
      const role = row.fixed_role ?? '참석자';
      return rolePriority[role] ?? 5;
    };

    const safeName = (name?: string) => (name ?? '').toString().trim();

    // 1) 역할 우선 → 2) 이름 가나다순 → 3) 전화번호 보조
    const sorted = [...participants].sort((a, b) => {
      const pa = getPriority(a);
      const pb = getPriority(b);
      if (pa !== pb) return pa - pb;

      const na = safeName(a.name);
      const nb = safeName(b.name);
      const nameDiff = na.localeCompare(nb, 'ko-KR');
      if (nameDiff !== 0) return nameDiff;

      // 이름 같을 때 휴대폰 보조 정렬(안정성)
      return (a.phone ?? '').localeCompare(b.phone ?? '', 'ko-KR');
    });

    setDisplayData(sorted);
  }, [participants]);

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

  // [Phase 73-L.7.30] Auto-scroll and highlight newly added participant
  useEffect(() => {
    if (highlightedId && highlightedRowRef.current) {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        highlightedRowRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [highlightedId]);

  // [Phase 72–RM.TM.STATUS.UNIFY] Get call status color
  const getCallStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      '대기중': 'bg-slate-300 text-slate-700',
      '응답(참석)': 'bg-green-500 text-white',
      '응답(미정)': 'bg-yellow-500 text-white',
      '불참': 'bg-red-400 text-white',
      'TM예정': 'bg-blue-500 text-white',
      'TM완료(참석)': 'bg-purple-600 text-white',
      'TM완료(불참)': 'bg-slate-600 text-white'
    };
    return colorMap[status] || 'bg-slate-300 text-slate-700';
  };

  // [Phase 72–RM.TM.STATUS.UNIFY] Get call status icon
  const getCallStatusIcon = (status: string) => {
    const iconMap: Record<string, string> = {
      '대기중': '🔵',
      '응답(참석)': '🟢',
      '응답(미정)': '🟡',
      '불참': '🔴',
      'TM예정': '🔷',
      'TM완료(참석)': '🟣',
      'TM완료(불참)': '⚫'
    };
    return iconMap[status] || '🔵';
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
            <TableHead className="w-28 py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">TM 상태</TableHead>
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
          {displayData.map((participant, index) => {
            // [Phase 73-L.7.30] Check if this is the highlighted row
            const isHighlighted = highlightedId === participant.id;
            
            return (
              <TableRow
                key={participant.id}
                ref={isHighlighted ? highlightedRowRef : null}
                className={cn(
                  "participant-row transition-all duration-500 cursor-pointer last:rounded-b-2xl border-b border-border hover:bg-accent",
                  isHighlighted && "bg-primary/10 animate-pulse"
                )}
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
                {index + 1}
              </TableCell>
              <TableCell className="py-2.5 px-4">
                <RoleBadgeCell 
                  participant={participant} 
                  onClick={() => {
                    handleRowClick(participant.id);
                    // Scroll to badge section after panel opens
                    setTimeout(() => {
                      const badgeSection = document.getElementById('badge-section');
                      badgeSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 300);
                  }}
                />
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
              <TableCell 
                className="py-2.5 px-4 text-sm text-muted-foreground truncate max-w-[200px]" 
                title={participant.request_note || ""}
              >
                {participant.request_note || "-"}
              </TableCell>
              {/* [Phase 72–RM.TM.STATUS.UNIFY] TM Status Badge */}
              <TableCell className="py-2.5 px-4">
                <Badge 
                  className={cn(
                    "text-xs font-semibold whitespace-nowrap",
                    getCallStatusColor(participant.call_status || '대기중')
                  )}
                >
                  {getCallStatusIcon(participant.call_status || '대기중')} {participant.call_status || '대기중'}
                </Badge>
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
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
