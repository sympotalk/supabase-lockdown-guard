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
    <div className="participants-table-wrapper h-full">
      <Table>
        <TableHeader className="bg-muted/80 backdrop-blur-sm sticky top-0 z-10">
          <TableRow className="hover:bg-muted">
            <TableHead className="w-12">
              <Checkbox
                checked={selectedIds.length === participants.length && participants.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead className="font-semibold w-12 text-center">No.</TableHead>
            <TableHead className="font-semibold w-20">구분</TableHead>
            <TableHead className="sticky-col-name font-semibold w-24">성명</TableHead>
            <TableHead className="sticky-col-org font-semibold w-32">소속</TableHead>
            <TableHead className="font-semibold w-28">연락처</TableHead>
            <TableHead className="font-semibold w-36">요청사항</TableHead>
            <TableHead className="font-semibold w-24">숙박현황</TableHead>
            <TableHead className="font-semibold w-16 text-center">성인</TableHead>
            <TableHead className="font-semibold w-32 text-center">소아</TableHead>
            <TableHead className="font-semibold w-24">동반인</TableHead>
            <TableHead className="font-semibold w-20 text-center">모객</TableHead>
            <TableHead className="font-semibold w-20 text-center">문자</TableHead>
            <TableHead className="font-semibold w-20 text-center">설문</TableHead>
            <TableHead className="font-semibold w-20 text-center">상태</TableHead>
            <TableHead className="font-semibold w-24 text-right">등록일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.map((participant, index) => (
            <TableRow
              key={participant.id}
              className="participant-row"
              onClick={() => handleRowClick(participant.id)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
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
              <TableCell className="text-center text-sm text-muted-foreground">
                {index + 1}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {participant.classification || "일반"}
                </Badge>
              </TableCell>
              <TableCell className="sticky-col-name font-semibold">
                {participant.name}
              </TableCell>
              <TableCell className="sticky-col-org text-sm" title={participant.organization || "-"}>
                {participant.organization || "-"}
              </TableCell>
              <TableCell className="text-center text-sm">
                {participant.phone || "-"}
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {parseBadges(participant.memo).map((badge, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  {participant.lodging_status || "미정"}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {participant.adult_count ? (
                  <Badge variant="outline" className="text-xs">{participant.adult_count}</Badge>
                ) : "-"}
              </TableCell>
              <TableCell className="text-center text-sm">
                {participant.child_ages && participant.child_ages.length > 0
                  ? participant.child_ages.join(' / ')
                  : "-"}
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
  );
}
