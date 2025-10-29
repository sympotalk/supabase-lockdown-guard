// [71-J.2-FINAL] Participants data table with sticky columns
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useParticipantsPanel } from "@/state/participantsPanel";
import { cn } from "@/lib/utils";

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

// [72-RM.BADGE.PANEL] Display-only role badge cell - click to open panel
function RoleBadgeCell({ participant, onClick }: { participant: Participant; onClick: () => void }) {
  const { fixed_role, custom_role } = participant;

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case '좌장':
        return 'bg-[#6E59F6] text-white border-transparent';
      case '연자':
        return 'bg-[#3B82F6] text-white border-transparent';
      case '참석자':
        return 'bg-[#9CA3AF] text-white border-transparent';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div 
      className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Fixed role badge */}
      {fixed_role ? (
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs px-2.5 py-0.5 rounded-full",
            getRoleBadgeColor(fixed_role)
          )}
        >
          {fixed_role}
        </Badge>
      ) : (
        <Badge variant="outline" className="text-xs px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
          선택
        </Badge>
      )}

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
