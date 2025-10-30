// [Phase 72–RM.EXPORT.SORT.UNIFY] Export participants with role-based sorting
import * as XLSX from "xlsx";

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
  call_completed?: boolean;
  fixed_role?: string;
  custom_role?: string;
  participant_no?: number;
  status?: string;
  stay_status?: string;
  lodging_status?: string;
  adult_count?: number;
  child_ages?: string[];
  created_at: string;
  deleted?: boolean;
  attendance_status?: string;
  room_type?: string;
  call_status?: string;
  call_memo?: string;
}

export type ExportMode = 'work' | 'archive';

/**
 * [Phase 72–RM.EXPORT.SORT.UNIFY] Sort participants by role priority and name
 * Priority: 좌장(0) > 연자(1) > 참석자(2) > others(3), then by name (가나다순)
 */
export function sortParticipants(participants: Participant[]): Participant[] {
  const rolePriority: Record<string, number> = { "좌장": 0, "연자": 1, "참석자": 2 };
  
  return participants
    .filter(p => !p.deleted && p.attendance_status !== '불참')
    .sort((a, b) => {
      const rankA = a.fixed_role ? (rolePriority[a.fixed_role] ?? 3) : 3;
      const rankB = b.fixed_role ? (rolePriority[b.fixed_role] ?? 3) : 3;
      
      if (rankA !== rankB) return rankA - rankB;
      
      return (a.name || "").localeCompare(b.name || "", "ko");
    });
}

/**
 * [Phase 72–RM.TM.SYSTEM.FINAL] Export participants to Excel with standardized structure
 * Columns: No., 구분, 성명, 소속, 연락처, TM상태, TM메모, 객실타입, 숙박현황, 성인/소아, 요청사항, 상태, 등록일
 */
export function exportParticipantsToExcel(
  rows: Participant[], 
  filename: string = "participants.xlsx",
  mode: ExportMode = 'work'
) {
  // [Phase 72] Sort by role priority before export
  const sortedRows = sortParticipants(rows);
  
  const baseMapping = sortedRows.map((r) => {
    // Combine fixed_role and custom_role for display
    let roleDisplay = "";
    if (r.fixed_role) {
      roleDisplay = r.fixed_role;
      if (r.custom_role) {
        roleDisplay += ` (+${r.custom_role})`;
      }
    } else if (r.custom_role) {
      roleDisplay = r.custom_role;
    }
    
    // Format child ages
    const childInfo = r.child_ages && r.child_ages.length > 0 
      ? r.child_ages.join(", ") 
      : "";
    
    // Format adults/children display
    const guestComposition = `성인 ${r.adult_count || 0}${childInfo ? ` / 소아 ${childInfo}` : ""}`;
    
    // Format created_at date
    const createdDate = r.created_at 
      ? new Date(r.created_at).toLocaleDateString('ko-KR', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        }).replace(/\. /g, '.').replace(/\.$/, '')
      : "";
    
    return {
      "No.": r.participant_no || "",
      "구분": roleDisplay,
      "성명": r.name || "",
      "소속": r.organization || "",
      "연락처": r.phone || "",
      "TM상태": r.call_status || "대기중",
      "TM메모": r.call_memo || "",
      "객실타입": r.room_type || "",
      "숙박현황": r.stay_status || r.lodging_status || "",
      "성인/소아": guestComposition,
      "요청사항": r.memo || "",
      "상태": r.status || r.attendance_status || "",
      "등록일": createdDate,
    };
  });

  // Archive mode: add call status
  const mapped = mode === 'archive' 
    ? baseMapping.map((r, idx) => ({ 
        ...r, 
        "통화완료": sortedRows[idx].call_completed ? "Y" : "N" 
      }))
    : baseMapping;

  const worksheet = XLSX.utils.json_to_sheet(mapped);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "참가자");

  // Auto-size columns
  const maxWidths = Object.keys(mapped[0] || {}).map((key) => {
    const maxLength = Math.max(
      key.length,
      ...mapped.map((row) => String(row[key as keyof typeof row]).length)
    );
    return { wch: Math.min(maxLength + 2, 30) };
  });
  worksheet["!cols"] = maxWidths;

  XLSX.writeFile(workbook, filename);
}
