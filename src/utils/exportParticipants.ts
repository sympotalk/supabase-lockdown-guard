// [LOCKED][71-I] Export participants with all 11 columns including manager info
import * as XLSX from "xlsx";

interface Participant {
  participant_name: string;
  company_name?: string;
  participant_contact?: string;
  memo?: string;
  manager_info?: {
    team?: string;
    name?: string;
    contact?: string;
    emp_no?: string;
  };
  sfe_agency_code?: string;
  sfe_customer_code?: string;
  stay_plan?: string;
}

export function exportParticipantsToExcel(rows: Participant[], filename: string = "participants.xlsx") {
  const mapped = rows.map((r) => ({
    "고객 성명": r.participant_name || "",
    "거래처명": r.company_name || "",
    "고객 연락처": r.participant_contact || "",
    "팀명": r.manager_info?.team || "",
    "담당자 성명": r.manager_info?.name || "",
    "담당자 연락처": r.manager_info?.contact || "",
    "담당자 사번": r.manager_info?.emp_no || "",
    "SFE 거래처코드": r.sfe_agency_code || "",
    "SFE 고객코드": r.sfe_customer_code || "",
    "숙박예정": r.stay_plan || "",
    "메모": r.memo || "",
  }));

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
