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
    <div className="w-full h-full overflow-auto">
      <Table className="min-w-[1200px]">
        <TableHeader className="sticky top-0 z-10 bg-gray-50 dark:bg-[#27314a]">
          <TableRow className="hover:bg-transparent border-b border-gray-100 dark:border-gray-700">
            <TableHead className="w-12 py-3 px-4">
              <Checkbox
                checked={selectedIds.length === participants.length && participants.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead className="w-12 py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center">No.</TableHead>
            <TableHead className="w-20 py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-left">구분</TableHead>
            <TableHead className="sticky-col-name w-24 py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-left">성명</TableHead>
            <TableHead className="sticky-col-org w-32 py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-left">소속</TableHead>
            <TableHead className="w-28 py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-left">연락처</TableHead>
            <TableHead className="w-36 py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-left">요청사항</TableHead>
            <TableHead className="w-24 py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-left">숙박현황</TableHead>
            <TableHead className="w-16 py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center">성인</TableHead>
            <TableHead className="w-32 py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center">소아</TableHead>
            <TableHead className="w-24 py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-left">동반인</TableHead>
            <TableHead className="w-20 py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center">모객</TableHead>
            <TableHead className="w-20 py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center">문자</TableHead>
            <TableHead className="w-20 py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center">설문</TableHead>
            <TableHead className="w-20 py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center">상태</TableHead>
            <TableHead className="w-24 py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">등록일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="bg-white dark:bg-[#1e293b]">
          {participants.map((participant, index) => (
            <TableRow
              key={participant.id}
              className="participant-row transition-colors cursor-pointer last:rounded-b-2xl border-b border-gray-100 dark:border-gray-700"
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
              <TableCell className="py-2.5 px-4 text-center text-sm text-gray-500 dark:text-gray-400">
                {index + 1}
              </TableCell>
              <TableCell className="py-2.5 px-4">
                <Badge variant="outline" className="text-xs">
                  {participant.classification || "일반"}
                </Badge>
              </TableCell>
              <TableCell className="sticky-col-name py-2.5 px-4 font-semibold text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap truncate">
                {participant.name}
              </TableCell>
              <TableCell className="sticky-col-org py-2.5 px-4 text-sm text-gray-700 dark:text-gray-200 truncate max-w-[160px]" title={participant.organization || "-"}>
                {participant.organization || "-"}
              </TableCell>
              <TableCell className="py-2.5 px-4 truncate max-w-[160px] whitespace-nowrap overflow-hidden text-ellipsis text-center text-sm text-gray-700 dark:text-gray-200">
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
              <TableCell className="py-2.5 px-4 text-center text-sm text-gray-700 dark:text-gray-200">
                {participant.child_ages && participant.child_ages.length > 0
                  ? participant.child_ages.join(' / ')
                  : "-"}
              </TableCell>
              <TableCell className="py-2.5 px-4 text-sm text-gray-700 dark:text-gray-200 truncate max-w-[120px]" title={participant.companion || "-"}>
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
              <TableCell className="py-2.5 px-4 text-right text-sm text-gray-500 dark:text-gray-400">
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
