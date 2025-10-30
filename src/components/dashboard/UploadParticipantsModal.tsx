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
  const [replaceMode, setReplaceMode] = useState(false);
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

  // [Phase 73-L.3] Enhanced column mapping for 13-column format
  const normalizeColumns = (record: any): any => {
    const columnMap: Record<string, string> = {
      // Customer fields
      "고객 성명": "고객 성명",
      "고객성명": "고객 성명",
      "성명": "고객 성명",
      "이름": "고객 성명",
      "거래처명": "거래처명",
      "소속": "거래처명",
      "회사": "거래처명",
      "고객 연락처": "고객 연락처",
      "고객연락처": "고객 연락처",
      "연락처": "고객 연락처",
      "전화번호": "고객 연락처",
      "메모": "메모",
      
      // Manager fields
      "팀명": "팀명",
      "팀": "팀명",
      "담당자 성명": "담당자 성명",
      "담당자성명": "담당자 성명",
      "담당자": "담당자 성명",
      "담당자 연락처": "담당자 연락처",
      "담당자연락처": "담당자 연락처",
      "담당자 사번": "담당자 사번",
      "담당자사번": "담당자 사번",
      "사번": "담당자 사번",
      
      // SFE codes
      "SFE 거래처코드": "SFE 거래처코드",
      "SFE거래처코드": "SFE 거래처코드",
      "거래처코드": "SFE 거래처코드",
      "SFE 고객코드": "SFE 고객코드",
      "SFE고객코드": "SFE 고객코드",
      "고객코드": "SFE 고객코드",
      
      // Optional metadata
      "행사명": "행사명",
      "등록 일시": "등록 일시",
      "등록일시": "등록 일시",
      "삭제유무": "삭제유무"
    };

    const normalized: any = {};
    
    Object.entries(record).forEach(([key, value]) => {
      const trimmedKey = key.trim();
      const mappedKey = columnMap[trimmedKey];
      if (mappedKey) {
        normalized[mappedKey] = value;
      }
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

        // [Phase 73-L.2] Simplified mapping - only keep what RPC expects
        const rows = json.map((row: any) => normalizeColumns(row))
          .filter(row => row['고객 성명'] && row['고객 연락처']); // Only keep rows with name and phone

        if (rows.length === 0) {
          console.warn("[Phase 73-L.2] No valid participant rows detected.");
          toast({
            title: "업로드 불가",
            description: "'고객 성명'과 '고객 연락처' 컬럼이 필수입니다.",
            variant: "destructive"
          });
          return;
        }
        setParsedRows(rows);
        console.info(`[Phase 73-L.2] Parsed ${rows.length} participants from Excel`);
        console.log("[Phase 73-L.2] Sample (first 3):", rows.slice(0, 3));
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

  // [Phase 73-L.3] Upload with Replace mode using new RPC
  const handleUpload = async () => {
    if (!agencyScope || !activeEventId) {
      console.warn("[Phase 73-L.3] Missing scope →", {
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
    console.info("[Phase 73-L.3] Uploading rows:", parsedRows.length, "to event:", activeEventId, "Mode:", replaceMode ? 'replace' : 'update');
    
    try {
      // [Phase 73-L.3.RPC.HOTFIX] Call new RPC with explicit typing
      const { data, error } = await (supabase.rpc as any)('upsert_participants_from_excel', {
        p_event: activeEventId,
        p_rows: parsedRows,
        p_mode: replaceMode ? 'replace' : 'update'
      });
      
      if (error) {
        console.error("[Phase 73-L.3] RPC upload error →", error);
        throw error;
      }
      
      console.log("[Phase 73-L.3] RPC response →", data);
      const result = {
        success: data?.success ?? true,
        inserted: data?.total ?? data?.inserted ?? 0,
        updated: data?.updated ?? 0,
        skipped: data?.skipped ?? 0,
        skipped_rows: data?.skipped_rows ?? []
      };

      // Invalidate cache
      if (agencyScope) {
        const cacheKey = `participants_${agencyScope}_${activeEventId}`;
        await mutate(cacheKey);
        console.info("[Phase 73-L.3] Cache invalidated:", cacheKey);
      }
      
      mutate('event_progress_view');

      // Show appropriate toast based on mode
      if (replaceMode) {
        toast({
          title: "전체 교체 완료",
          description: `기존 참가자를 삭제하고 ${result.inserted ?? 0}명을 새로 업로드했습니다.`
        });
      } else {
        toast({
          title: "업로드 완료",
          description: `${result.inserted ?? 0}명 추가, ${result.updated ?? 0}명 업데이트. 담당자정보·SFE코드 자동 매핑됨.`
        });
      }

      // Show skipped rows if any
      if (result.skipped > 0) {
        console.warn("[Phase 73-L.3] Skipped rows:", result.skipped_rows);
        toast({
          title: "일부 행 스킵됨",
          description: `${result.skipped}개 행을 처리하지 못했습니다. 콘솔을 확인하세요.`,
          variant: "destructive"
        });
      }
      
      // Reset state
      setFile(null);
      setParsedRows([]);
      setReplaceMode(false);
      onOpenChange(false);
    } catch (error: any) {
      console.error("[Phase 73-L.3] Upload failed →", error);
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

          {/* Mode Selection */}
          <div className="space-y-2">
            <Label>업로드 모드</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={!replaceMode ? "default" : "outline"}
                className="flex-1"
                onClick={() => setReplaceMode(false)}
              >
                기존 유지 (업데이트)
              </Button>
              <Button
                type="button"
                variant={replaceMode ? "default" : "outline"}
                className="flex-1"
                onClick={() => setReplaceMode(true)}
              >
                전체 교체 (Replace)
              </Button>
            </div>
            {replaceMode && (
              <p className="text-xs text-destructive">
                ⚠️ 기존 참가자가 모두 삭제되고 새 데이터로 교체됩니다.
              </p>
            )}
          </div>

          {/* Info */}
          <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">[Phase 73-L.3] 모객 원본 13컬럼 자동 인식</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>필수: 고객 성명, 고객 연락처</li>
                <li>자동 매핑: 팀명, 담당자 성명/연락처/사번, 거래처명, SFE 거래처코드, SFE 고객코드, 메모</li>
                <li>행사명/등록일시/삭제유무 컬럼은 선택적 (없어도 무방)</li>
                <li>중복 기준: 행사 + 성명 + 연락처</li>
                <li>담당자/SFE 정보는 manager_info JSON에 저장</li>
              </ul>
            </div>
          </div>
          
          {/* Preview of parsed rows (first 5) */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">미리보기 (처음 5명)</p>
              <div className="max-h-40 overflow-y-auto text-xs bg-muted/30 rounded p-2 space-y-1 font-mono">
                {parsedRows.slice(0, 5).map((row, idx) => (
                  <div key={idx} className="text-xs">
                    {idx + 1}. {row['고객 성명']} | {row['거래처명'] || '-'} | {row['고객 연락처'] || '-'}
                    <br />
                    <span className="text-muted-foreground ml-4">
                      담당: {row['담당자 성명'] || '-'} | SFE: {row['SFE 거래처코드'] || '-'}/{row['SFE 고객코드'] || '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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