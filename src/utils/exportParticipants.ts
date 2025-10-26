// [71-I.QA3-FIX.R3] Export participants with actual DB schema (name, organization, phone)
import * as XLSX from "xlsx";

interface Participant {
  name: string;
  organization?: string;
  phone?: string;
  email?: string;
  memo?: string;
  team_name?: string;
  manager_name?: string;
  manager_phone?: string;
  call_completed?: boolean;
}

export type ExportMode = 'work' | 'archive';

export function exportParticipantsToExcel(
  rows: Participant[], 
  filename: string = "participants.xlsx",
  mode: ExportMode = 'work'
) {
  const baseMapping = rows.map((r) => ({
    "고객 성명": r.name || "",
    "거래처명": r.organization || "",
    "고객 연락처": r.phone || "",
    "이메일": r.email || "",
    "팀명": r.team_name || "",
    "담당자 성명": r.manager_name || "",
    "담당자 연락처": r.manager_phone || "",
    "메모": r.memo || "",
  }));

  // Archive mode: add call status
  const mapped = mode === 'archive' 
    ? baseMapping.map((r, idx) => ({ ...r, "통화완료": rows[idx].call_completed ? "Y" : "N" }))
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
