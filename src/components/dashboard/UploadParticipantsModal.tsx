import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { mutate } from "swr";
import * as XLSX from "xlsx";
import { useUser } from "@/context/UserContext";

// [LOCKED][71-I.QA3] Auto-detect event from route, no manual selection
interface UploadParticipantsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: Array<{
    id: string;
    name: string;
  }>;
}
export function UploadParticipantsModal({
  open,
  onOpenChange,
  events
}: UploadParticipantsModalProps) {
  const {
    toast
  } = useToast();
  const {
    eventId
  } = useParams<{
    eventId: string;
  }>();
  const {
    agencyScope
  } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const activeEventId = eventId ?? "";

  // [LOCKED][QA3.FIX.R3] Validate event context only when modal opens
  useEffect(() => {
    if (!open) return; // Only validate when modal is opened

    if (!activeEventId) {
      console.error("[71-I.QA3-FIX.R3] ⚠️ eventId not found in route");
      toast({
        title: "행사 ID 누락",
        description: "행사 페이지에서만 업로드 가능합니다.",
        variant: "destructive"
      });
      onOpenChange(false);
    }
  }, [open, activeEventId, onOpenChange, toast]);

  // [71-J.2.FIX.D] AI Column Mapping Layer with manager_info & SFE codes
  const normalizeColumns = (record: any): any => {
    const columnMap: Record<string, string> = {
      "고객 성명": "name",
      "성명": "name",
      "이름": "name",
      "name": "name",
      "Name": "name",
      "거래처명": "organization",
      "소속": "organization",
      "회사": "organization",
      "company": "organization",
      "organization": "organization",
      "고객 연락처": "phone",
      "연락처": "phone",
      "전화번호": "phone",
      "phone": "phone",
      "Phone": "phone",
      "이메일": "email",
      "email": "email",
      "Email": "email",
      "메모": "memo",
      "memo": "memo",
      "팀명": "team_name",
      "팀": "team_name",
      "team": "team_name",
      "담당자 팀명": "manager_team",
      "담당자팀": "manager_team",
      "담당자 성명": "manager_name",
      "담당자": "manager_name",
      "담당자명": "manager_name",
      "담당자 연락처": "manager_phone",
      "담당자전화": "manager_phone",
      "거래처 코드": "sfe_account_code",
      "거래처코드": "sfe_account_code",
      "고객 코드": "sfe_customer_code",
      "고객코드": "sfe_customer_code"
    };

    const normalized: any = {};
    
    Object.entries(record).forEach(([key, value]) => {
      const trimmedKey = key.trim();
      const mappedKey = columnMap[trimmedKey] || trimmedKey;
      normalized[mappedKey] = value;
    });

    return normalized;
  };

  // [LOCKED][71-I.QA3] Excel parsing with enhanced error guards
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, {
          type: "array"
        });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        if (!Array.isArray(json) || json.length === 0) {
          console.error("[71-I.QA3] Empty file or invalid format");
          toast({
            title: "업로드 실패",
            description: "파일에 참가자 데이터가 없습니다.",
            variant: "destructive"
          });
          return;
        }

        // [71-J.2.FIX.D] Apply AI column mapping + manager_info JSON construction
        const rows = json.map((row: any) => {
          const normalized = normalizeColumns(row);
          
          // [71-J.2.FIX.D] Construct manager_info as JSON object
          const managerInfo: any = {};
          if (normalized.manager_team) managerInfo.team = normalized.manager_team;
          if (normalized.manager_name) managerInfo.name = normalized.manager_name;
          if (normalized.manager_phone) managerInfo.phone = normalized.manager_phone;
          
          return {
            name: normalized.name || '',
            organization: normalized.organization || '',
            phone: normalized.phone || '',
            email: normalized.email || '',
            memo: normalized.memo || '',
            team_name: normalized.team_name || '',
            manager_info: Object.keys(managerInfo).length > 0 ? managerInfo : null,
            sfe_account_code: normalized.sfe_account_code || null,
            sfe_customer_code: normalized.sfe_customer_code || null,
            fixed_role: '참석자' // [Phase 72–RM.BADGE.SYNC.RENUM] Default role for Excel uploads
          };
        }).filter(row => row.name); // Only keep rows with names

        if (rows.length === 0) {
          console.warn("[71-I.QA3-FIX.R4] No valid participant rows detected.");
          toast({
            title: "업로드 불가",
            description: "'고객 성명' 또는 '이름' 컬럼이 비어 있습니다.",
            variant: "destructive"
          });
          return;
        }
        setParsedRows(rows);
        console.info(`[71-I.QA3-FIX.R4] AI Mapped ${rows.length} participants from Excel`);
        console.log("[71-I.QA3-FIX.R4] Sample mapped data:", rows[0]);
        toast({
          title: "파일 분석 완료",
          description: `${rows.length}명의 참가자 데이터 확인됨.`
        });
      } catch (err) {
        console.error("[71-I.QA3] XLSX parse error →", err);
        toast({
          title: "파일 분석 실패",
          description: "Excel 파일이 손상되었거나 형식이 잘못되었습니다.",
          variant: "destructive"
        });
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  // [LOCKED][71-I.QA3-FIX.R2] Upload with guards and realtime refresh
  const handleUpload = async () => {
    // [QA3.FIX.R2] Upload guard
    if (!agencyScope || !activeEventId) {
      console.warn("[QA3.FIX.R2] Missing scope →", {
        agencyScope,
        eventId: activeEventId
      });
      toast({
        title: "업로드 불가",
        description: "행사 페이지에서만 업로드 가능합니다.",
        variant: "destructive"
      });
      return;
    }
    if (!parsedRows.length) {
      toast({
        title: "업로드 불가",
        description: "분석된 참가자 데이터가 없습니다.",
        variant: "destructive"
      });
      return;
    }
    setUploading(true);
    console.info("[71-I.QA3-FIX.R7] Uploading rows:", parsedRows.length, "to event:", activeEventId);
    try {
      const {
        data,
        error
      } = await supabase.rpc('fn_bulk_upload_participants', {
        p_event_id: activeEventId,
        p_rows: parsedRows
      });
      if (error) {
        console.error("[71-I.QA3-FIX.R7] RPC upload error →", error);
        throw error;
      }
      console.log("[71-I.QA3-FIX.R7] RPC response →", data);
      const result = data as {
        inserted: number;
        new: number;
        updated: number;
        event_id?: string;
        agency_id?: string;
        status: string;
      };

      // [71-I.QA3-FIX.R7] Use event_id from response for precise cache invalidation
      // [Phase 72–RM.BADGE.SYNC.RENUM] Trigger will auto-reorder, just refresh cache
      if (result?.event_id && agencyScope) {
        const cacheKey = `participants_${agencyScope}_${result.event_id}`;
        await mutate(cacheKey);
        console.info("[71-I.QA3-FIX.R7] SWR cache invalidated & refetched:", cacheKey);
        
        toast({
          title: "업로드 완료",
          description: `신규 ${result.new ?? 0}명, 갱신 ${result.updated ?? 0}명 반영되었습니다. (좌장/연자 우선 정렬 완료)`
        });
      } else {
        console.warn("[71-I.QA3-FIX.R7] event_id missing in response, fallback to activeEventId");
        if (agencyScope) {
          mutate(`participants_${agencyScope}_${activeEventId}`);
        }
        toast({
          title: "업로드 완료",
          description: `데이터는 저장되었지만 화면 반영에 실패했습니다. 새로고침 후 확인해주세요.`
        });
      }
      
      mutate('event_progress_view');

      // Reset state
      setFile(null);
      setParsedRows([]);
      onOpenChange(false);
    } catch (error: any) {
      console.error("[71-I.QA3-FIX.R4] Upload failed →", error);
      toast({
        title: "업로드 실패",
        description: error.message ?? "알 수 없는 오류입니다.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>참가자 엑셀 업로드</DialogTitle>
          <DialogDescription>
            Excel 파일을 업로드하여 참가자를 일괄 등록합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* [LOCKED][71-I.QA3-FIX.R4] Event auto-detected from route - no manual selection */}
          <div className="space-y-2">
            
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Excel 파일 *</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById('file-upload')?.click()}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {file ? file.name : '파일 선택'}
              </Button>
              <input id="file-upload" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            </div>
            {parsedRows.length > 0 && <p className="text-sm text-muted-foreground">
                {parsedRows.length}명의 참가자 데이터가 준비되었습니다.
              </p>}
          </div>

          {/* Info */}
          <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">Excel 파일 형식 안내 (AI 자동 매핑)</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>필수: 고객 성명 / 이름 / name</li>
                <li>선택: 거래처명/소속, 연락처/전화번호, 이메일, 팀명, 담당자 성명/담당자, 담당자 연락처, 메모</li>
                <li>AI가 컬럼명을 자동으로 인식합니다</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={uploading}>
            취소
          </Button>
          <Button className="flex-1" onClick={handleUpload} disabled={uploading || !parsedRows.length}>
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "업로드 중..." : "업로드"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
}