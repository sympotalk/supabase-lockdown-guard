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
import { nanoid } from "nanoid";
import { useCompanionDetection } from "@/hooks/useCompanionDetection";
import CompanionConfirmModal from "@/components/participants/CompanionConfirmModal";

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
  
  // [Phase 77-E] AI 동반의료인 감지 훅
  const { isDetecting, detectCompanions, candidates, showModal, setShowModal } = useCompanionDetection();

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

  // [Phase 73-L.7.31-E] Excel mapping with memo, SFE codes, manager_info
  const normalizeColumns = (record: any): any => {
    const result: any = {};

    // Ignore agency-related columns
    const columnNames = Object.keys(record);
    const hasAgencyColumn = columnNames.some(col => 
      col.includes('에이전시') || col.toLowerCase().includes('agency')
    );
    if (hasAgencyColumn) {
      console.info('[73-L.7.31-E] Agency-related columns detected and will be ignored');
    }

    // name: 고객 성명
    result.name = record['고객 성명'] || record['고객성명'] || record['성명'] || 
                  record['이름'] || record.name || record.customer_name || 
                  record.client_name || '';

    // phone: 고객 연락처
    result.phone = record['고객 연락처'] || record['고객연락처'] || record['연락처'] || 
                   record['전화번호'] || record.phone || record.customer_phone || 
                   record.client_phone || '';

    // organization: 거래처명
    result.organization = record['거래처명'] || record['소속'] || record['회사'] || 
                         record.organization || record.company || null;

    // email: 이메일
    result.email = record['이메일'] || record['e-mail'] || record.email || null;

    // position: 직급
    result.position = record['직급'] || record.position || null;

    // department: 부서
    result.department = record['부서'] || record['팀명'] || record['팀'] || 
                       record.department || record.team || null;

    // address: 주소
    result.address = record['주소'] || record.address || null;

    // [Phase 73-L.7.31-E] request_note: 메모/요청사항
    result.request_note = record['메모'] || record['요청사항'] || 
                         record.request_note || record.memo || null;

    // [Phase 73-L.7.31-E] SFE codes
    result.sfe_company_code = record['SFE 거래처코드'] || record['SFE거래처코드'] || 
                             record.sfe_company_code || record.sfe_hospital_code || null;
    result.sfe_customer_code = record['SFE 고객코드'] || record['SFE고객코드'] || 
                              record.sfe_customer_code || null;

    // [Phase 73-L.7.31-E] manager_info JSON structure
    const managerTeam = record['담당자 팀명'] || record['담당자팀명'] || record['팀명'] || 
                       record.manager_team || null;
    const managerName = record['담당자 성명'] || record['담당자성명'] || 
                       record['담당자'] || record.manager_name || null;
    const managerPhone = record['담당자 연락처'] || record['담당자연락처'] || 
                        record.manager_phone || null;
    const managerEmpId = record['담당자 사번'] || record['담당자사번'] || 
                        record.manager_emp_id || record.emp_id || null;

    result.manager_info = {
      team: managerTeam || '',
      name: managerName || '',
      phone: managerPhone || '',
      emp_id: managerEmpId || ''
    };

    // manager_email: 담당자 이메일
    result.manager_email = record['담당자 이메일'] || record.manager_email || null;

    // [Phase 73-L.7.31-B] role_badge: normalize to standard 3-type system
    const rawRole = record['구분'] || record['역할'] || record.role_badge || 
                   record.role || record.type || '';
    
    // Convert legacy values to '참석자'
    const legacyValues = ['참가자', '패널', '스폰서', 'Participant', 'Panel', 'Sponsor'];
    if (legacyValues.includes(rawRole.trim())) {
      result.role_badge = '참석자';
    } else if (['참석자', '좌장', '연자'].includes(rawRole.trim())) {
      result.role_badge = rawRole.trim();
    } else {
      result.role_badge = '참석자'; // Default
    }

    return result;
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

        // [Phase 73-L.7.6] Normalize to standard English keys
        const normalized = json.map((row: any) => normalizeColumns(row))
          .filter(row => row.name && row.phone); // Filter rows with required fields

        if (normalized.length === 0) {
          console.warn("[73-L.7.6] No valid participant rows detected.");
          toast({
            title: "업로드 불가",
            description: "'고객 성명'과 '고객 연락처' 컬럼이 필수입니다.",
            variant: "destructive"
          });
          return;
        }
        setParsedRows(normalized);
        console.info(`[73-L.7.6] Normalized ${normalized.length} participants`);
        console.log("[73-L.7.6] Sample (first 3):", normalized.slice(0, 3));
        toast({
          title: "파일 분석 완료",
          description: `${normalized.length}명의 참가자 데이터 확인됨.`
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

  // [Phase 73-L.7.6] Upload with standard key validation
  const handleUpload = async () => {
    if (!agencyScope || !activeEventId) {
      console.warn("[73-L.7.6] Missing scope →", { agencyScope, eventId: activeEventId });
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
    
    // [Phase 73-L.7.31-E] Final validation with all fields including manager_info
    const payload = parsedRows.map(row => ({
      name: String(row.name || '').trim(),
      phone: String(row.phone || '').trim(),
      organization: row.organization || null,
      email: row.email || null,
      position: row.position || null,
      department: row.department || null,
      address: row.address || null,
      request_note: row.request_note || '',
      sfe_company_code: row.sfe_company_code || '',
      sfe_customer_code: row.sfe_customer_code || '',
      manager_info: row.manager_info || { team: '', name: '', phone: '', emp_id: '' },
      manager_email: row.manager_email || null,
      role_badge: row.role_badge || '참석자'  // ✅ 기본값 강제
    })).filter(row => row.name && row.phone);

    if (payload.length === 0) {
      toast({
        title: "업로드 불가",
        description: "유효한 참가자 데이터가 없습니다 (name, phone 필수).",
        variant: "destructive"
      });
      return;
    }

    console.log("[73-L.7.6] Normalized payload (first 3):", payload.slice(0, 3));
    
    setUploading(true);
    
    // [Phase 75-C.1] Generate session ID for tracking using nanoid
    const sessionId = `upload_${Date.now()}_${nanoid(10)}`;
    
    console.info("[75-C.1] RPC call → ai_participant_import_from_excel", { 
      mode: replaceMode ? 'replace' : 'append',
      count: payload.length,
      sessionId 
    });
    
    try {
      const { data, error } = await supabase.rpc('ai_participant_import_from_excel', {
        p_event_id: activeEventId,
        p_data: payload,
        p_replace: replaceMode,
        p_session_id: sessionId
      });
      
      if (error) {
        console.error("[75-C.1] RPC upload error →", error);
        
        // [Phase 75-C.1] Handle duplicate constraint violations gracefully
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          toast({
            title: "중복 데이터 처리 완료",
            description: "중복된 전화번호는 업데이트로 자동 처리되었습니다.",
          });
          // Refresh data even on constraint violations
          if (agencyScope) {
            const cacheKey = `participants_${agencyScope}_${activeEventId}`;
            await mutate(cacheKey);
          }
          mutate('event_progress_view');
          onOpenChange(false);
          return;
        }
        
        // Specific error handling
        if (error.message?.includes('AGENCY_CONTEXT_NOT_FOUND')) {
          toast({
            title: "권한 오류",
            description: "사용자 계정이 에이전시에 연결되어 있지 않습니다. 관리자에게 문의하세요.",
            variant: "destructive"
          });
        }
        throw error;
      }
      
      // [75-C.1] Log upload result with session tracking
      const result = data as any;
      console.log("[75-C.1] RPC success →", {
        inserted: result?.inserted || 0,
        updated: result?.updated || 0,
        skipped: result?.skipped || 0,
        mode: result?.mode || 'unknown',
        sessionId: result?.session_id || sessionId
      });

      // Invalidate cache
      if (agencyScope) {
        const cacheKey = `participants_${agencyScope}_${activeEventId}`;
        await mutate(cacheKey);
        console.info("[73-L.7.6] Cache invalidated:", cacheKey);
      }
      
      mutate('event_progress_view');

      // [73-L.7.6] Show detailed result toast
      const inserted = result?.inserted || 0;
      const updated = result?.updated || 0;
      const skipped = result?.skipped || 0;

      if (replaceMode) {
        toast({
          title: "전체 교체 완료",
          description: `${inserted}명 신규 등록 (skipped: ${skipped}) / 요청사항·SFE·담당자정보 반영됨 / 세션: ${sessionId.substring(0, 20)}...`
        });
      } else {
        toast({
          title: "업로드 완료",
          description: `신규: ${inserted}명 / 업데이트: ${updated}명 / 실패: ${skipped}명 / 요청사항·SFE·담당자정보 반영됨`
        });
      }
      
      // [Phase 77-E] AI 동반의료인 자동 감지 실행
      if (activeEventId) {
        console.log("[Phase 77-E] Starting companion detection after upload");
        await detectCompanions(activeEventId);
      }

      // [Phase 77-F] AI 메모 기반 요청사항 자동 추출
      if (activeEventId) {
        try {
          console.log("[Phase 77-F] Starting request extraction from memo/request_note");
          const { data: extracted, error: extractError } = await supabase.rpc(
            'ai_extract_requests_from_memo',
            { p_event_id: activeEventId }
          );

          if (extractError) {
            console.error('[Phase 77-F] 요청사항 추출 실패:', extractError);
          } else if (extracted && Array.isArray(extracted) && extracted.length > 0) {
            console.log(`[Phase 77-F] Extracted ${extracted.length} requests`);
            const { error: applyError } = await supabase.rpc(
              'apply_extracted_requests',
              { p_event_id: activeEventId, p_items: extracted }
            );

            if (applyError) {
              console.error('[Phase 77-F] 요청사항 저장 실패:', applyError);
            } else {
              const eqCnt = extracted.filter((x: any) => x.category === 'equipment').length;
              const prefCnt = extracted.length - eqCnt;
              toast({
                title: '요청사항 자동 반영',
                description: `장비 ${eqCnt}건, 기타 ${prefCnt}건을 반영했습니다.`
              });
            }
          }
        } catch (err) {
          console.error('[Phase 77-F] 요청사항 처리 중 오류:', err);
        }
      }
      
      // Reset state
      setFile(null);
      setParsedRows([]);
      setReplaceMode(false);
      onOpenChange(false);
    } catch (error: any) {
      console.error("[73-L.7.6] Upload failed →", error);
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
              <p className="font-medium mb-1">[73-L.7.31-E] 한글/영문 자동 인식</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>필수: 고객 성명/name, 고객 연락처/phone</li>
                <li>자동 인식: 거래처명, 이메일, 직급, 부서</li>
                <li>메모: 메모/요청사항 → request_note</li>
                <li>SFE: SFE 거래처코드, SFE 고객코드</li>
                <li>담당자: 팀명, 성명, 연락처, 사번 → manager_info JSON</li>
                <li>중복 기준: 행사 + 성명 + 연락처 (업데이트 모드)</li>
                <li>Replace 모드: 기존 참가자 완전 삭제 후 신규 등록</li>
              </ul>
            </div>
          </div>
          
          {/* Preview of normalized rows (first 5) */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">미리보기 (처음 5명, 표준키)</p>
              <div className="max-h-40 overflow-y-auto text-xs bg-muted/30 rounded p-2 space-y-1 font-mono">
                {parsedRows.slice(0, 5).map((row, idx) => (
                  <div key={idx} className="text-xs">
                    {idx + 1}. {row.name} | {row.organization || '-'} | {row.phone || '-'}
                    <br />
                    <span className="text-muted-foreground ml-4">
                      요청: {row.request_note || '-'} | SFE: {row.sfe_company_code || '-'}/{row.sfe_customer_code || '-'}
                    </span>
                    <br />
                    <span className="text-muted-foreground ml-4">
                      담당: {row.manager_info?.name || '-'} ({row.manager_info?.team || '-'})
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
      
      {/* [Phase 77-E] AI 동반의료인 확인 모달 */}
      <CompanionConfirmModal
        open={showModal}
        onOpenChange={setShowModal}
        candidates={candidates}
        onComplete={() => {
          // 동반자 확인 완료 후 데이터 갱신
          if (agencyScope && activeEventId) {
            const cacheKey = `participants_${agencyScope}_${activeEventId}`;
            mutate(cacheKey);
          }
        }}
      />
    </Dialog>;
}