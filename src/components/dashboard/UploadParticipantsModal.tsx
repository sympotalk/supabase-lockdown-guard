// [Phase 78-B.3] 3-Step Excel Upload: Staging → Validation → Commit
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, ArrowRight, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { mutate } from "swr";
import * as XLSX from "xlsx";
import { useUser } from "@/context/UserContext";
import { nanoid } from "nanoid";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StagingTable } from "./StagingTable";
import { ValidationSummaryCard } from "./ValidationSummaryCard";

interface UploadParticipantsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: Array<{
    id: string;
    name: string;
  }>;
}

interface StagedParticipant {
  id: string;
  name: string;
  organization: string;
  phone: string;
  request_memo: string;
  validation_status: 'pending' | 'valid' | 'error' | 'warning';
  validation_message: string | null;
}

export function UploadParticipantsModal({
  open,
  onOpenChange,
  events
}: UploadParticipantsModalProps) {
  const { toast } = useToast();
  const { eventId } = useParams<{ eventId: string }>();
  const { agencyScope } = useUser();
  const navigate = useNavigate();
  
  // Step management: 1=Upload, 2=Validation, 3=Commit
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  
  // Staging data
  const [stagedData, setStagedData] = useState<StagedParticipant[]>([]);
  const [validCount, setValidCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [warnCount, setWarnCount] = useState(0);
  
  // Selection for skip
  const [selectedSkipIds, setSelectedSkipIds] = useState<string[]>([]);
  
  // Confirm modal state
  const [showCommitConfirm, setShowCommitConfirm] = useState(false);
  
  // Results
  const [commitResult, setCommitResult] = useState<{ inserted: number; updated: number; skipped: number } | null>(null);
  
  const activeEventId = eventId ?? "";

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setFile(null);
      setParsedRows([]);
      setStagedData([]);
      setSessionId('');
      setSelectedSkipIds([]);
      setCommitResult(null);
      setShowCommitConfirm(false);
    }
  }, [open]);

  // Validate event context
  useEffect(() => {
    if (!open) return;
    
    if (!activeEventId) {
      console.error("[78-B.3] eventId not found in route");
      toast({
        title: "행사 ID 누락",
        description: "행사 페이지에서만 업로드 가능합니다.",
        variant: "destructive"
      });
      onOpenChange(false);
    }
  }, [open, activeEventId, onOpenChange, toast]);

  // [Phase 78-B.3] Parse Excel and map to staging format
  const normalizeColumns = (record: any): any => {
    const result: any = {};
    
    // 필수: 이름, 소속
    result['이름'] = record['고객 성명'] || record['고객성명'] || record['성명'] || 
                   record['이름'] || record.name || '';
    result['소속'] = record['거래처명'] || record['소속'] || record['회사'] || 
                   record.organization || record.company || '';
    
    // 선택: 연락처, 요청사항
    result['고객 연락처'] = record['고객 연락처'] || record['고객연락처'] || record['연락처'] || 
                        record['전화번호'] || record.phone || '';
    result['요청사항'] = record['요청사항'] || record['메모'] || record.request_note || record.memo || '';
    
    // Manager info
    result['팀명'] = record['팀명'] || record['담당자 팀명'] || record.manager_team || '';
    result['담당자 성명'] = record['담당자 성명'] || record['담당자성명'] || record['담당자'] || record.manager_name || '';
    result['담당자 연락처'] = record['담당자 연락처'] || record['담당자연락처'] || record.manager_phone || '';
    result['담당자 사번'] = record['담당자 사번'] || record['담당자사번'] || record.manager_emp_id || record.emp_id || '';
    
    // SFE codes
    result['SFE 거래처코드'] = record['SFE 거래처코드'] || record['SFE거래처코드'] || record.sfe_hospital_code || '';
    result['SFE 고객코드'] = record['SFE 고객코드'] || record['SFE고객코드'] || record.sfe_customer_code || '';
    
    return result;
  };

  // Step 1: Parse Excel file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        
        if (!Array.isArray(json) || json.length === 0) {
          toast({
            title: "업로드 실패",
            description: "파일에 데이터가 없습니다.",
            variant: "destructive"
          });
          return;
        }
        
        const normalized = json.map((row: any) => normalizeColumns(row));
        setParsedRows(normalized);
        
        toast({
          title: "파일 분석 완료",
          description: `${normalized.length}개의 행을 확인했습니다.`
        });
      } catch (err) {
        console.error("[78-B.3] Parse error:", err);
        toast({
          title: "파일 분석 실패",
          description: "Excel 파일 형식을 확인해주세요.",
          variant: "destructive"
        });
      }
    };
    
    reader.readAsArrayBuffer(uploadedFile);
  };

  // Step 1: Upload to staging
  const handleUploadToStaging = async () => {
    if (!activeEventId || !parsedRows.length) {
      toast({
        title: "업로드 불가",
        description: "파일을 먼저 선택해주세요.",
        variant: "destructive"
      });
      return;
    }
    
    setUploading(true);
    
    try {
      const newSessionId = `excel_${Date.now()}_${nanoid(10)}`;
      
      const { data, error } = await supabase.rpc('import_participants_from_excel', {
        p_event_id: activeEventId,
        p_rows: parsedRows,
        p_session_id: newSessionId
      });
      
      if (error) throw error;
      
      const result = data as { status: string; event_id: string; count: number; upload_session_id: string };
      
      if (result.status === 'success') {
        setSessionId(result.upload_session_id);
        toast({
          title: "업로드 완료",
          description: `${result.count}개의 데이터를 업로드했습니다.`
        });
        
        // Move to validation step
        setStep(2);
        await handleValidation(result.upload_session_id);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err: any) {
      console.error("[78-B.3] Upload error:", err);
      toast({
        title: "업로드 실패",
        description: err.message || "알 수 없는 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };
  
  // Step 2: Validate staged data
  const handleValidation = async (sid?: string) => {
    const targetSessionId = sid || sessionId;
    if (!activeEventId || !targetSessionId) return;
    
    setUploading(true);
    
    try {
      // Call validation RPC
      const { data, error } = await supabase.rpc('validate_staged_participants', {
        p_event_id: activeEventId,
        p_session_id: targetSessionId
      });
      
      if (error) throw error;
      
      const result = data as { status: string; summary: { valid: number; error: number; warn: number } };
      
      if (result.status === 'ok') {
        setValidCount(result.summary.valid);
        setErrorCount(result.summary.error);
        setWarnCount(result.summary.warn);
        
        // Fetch staged data
        const { data: staged, error: fetchError } = await supabase
          .from('participants_staging')
          .select('*')
          .eq('event_id', activeEventId)
          .eq('upload_session_id', targetSessionId)
          .order('validation_status', { ascending: false });
        
        if (fetchError) throw fetchError;
        
        setStagedData((staged || []) as StagedParticipant[]);
        
        const totalRows = result.summary.valid + result.summary.error + result.summary.warn;
        
        toast({
          title: "검증 완료",
          description: `검증이 완료되었습니다.\n총 ${totalRows}행 중 ${result.summary.error}행 오류가 있습니다.\n오류행을 수정하거나 제외 후 반영하세요.`
        });
      }
    } catch (err: any) {
      console.error("[78-B.3] Validation error:", err);
      toast({
        title: "검증 실패",
        description: err.message || "알 수 없는 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };
  
  // Open commit confirmation modal
  const handleCommitClick = () => {
    setShowCommitConfirm(true);
  };
  
  // Step 3: Commit valid data (excluding selected skip IDs)
  const handleCommit = async () => {
    if (!activeEventId || !sessionId) return;
    
    setShowCommitConfirm(false);
    setUploading(true);
    
    try {
      const { data, error } = await supabase.rpc('commit_staged_participants', {
        p_event_id: activeEventId,
        p_session_id: sessionId,
        p_skip_ids: selectedSkipIds
      });
      
      if (error) throw error;
      
      const result = data as { status: string; inserted: number; updated: number; skipped: number };
      
      if (result.status === 'ok') {
        setCommitResult({
          inserted: result.inserted,
          updated: result.updated,
          skipped: result.skipped
        });
        
        // Invalidate cache
        if (agencyScope) {
          await mutate(`participants_${agencyScope}_${activeEventId}`);
        }
        
        // Show different toast messages based on results
        const totalSuccess = result.inserted + result.updated;
        
        if (totalSuccess === 0) {
          // Pattern 3: All failed
          toast({
            title: "반영 실패",
            description: "반영할 수 있는 데이터가 없습니다.\n엑셀 컬럼명과 필수 항목을 다시 확인하세요.",
            variant: "destructive"
          });
        } else if (result.skipped > 0) {
          // Pattern 2: Partial success
          toast({
            title: "참가자 반영 완료",
            description: `${totalSuccess}명 반영 완료 (신규 ${result.inserted}, 수정 ${result.updated})\n오류 ${result.skipped}건 제외됨 (사유 확인 가능)`
          });
        } else {
          // Pattern 1: All successful
          toast({
            title: "참가자 반영 완료",
            description: `총 ${totalSuccess}명 반영 완료 (신규 ${result.inserted}, 수정 ${result.updated}, 오류 0)`
          });
        }
        
        setStep(3);
      }
    } catch (err: any) {
      console.error("[78-B.3] Commit error:", err);
      toast({
        title: "반영 실패",
        description: err.message || "알 수 없는 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };
  

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5" />
            참가자 엑셀 업로드
          </DialogTitle>
          <DialogDescription>
            단계별로 진행됩니다: 업로드 → 검증 → 반영
          </DialogDescription>
        </DialogHeader>
        
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          <Badge variant={step === 1 ? "default" : "secondary"}>1. 업로드</Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={step === 2 ? "default" : "secondary"}>2. 검증</Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={step === 3 ? "default" : "secondary"}>3. 반영</Badge>
        </div>
        
        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  엑셀 컬럼명을 아래와 같이 맞춰주세요: <span className="font-medium text-foreground">이름(필수), 소속(필수), 고객 연락처(선택), 요청사항(선택)</span> 담당자/팀/SFE 코드는 그대로 올려도 됩니다.
                </p>
              </CardContent>
            </Card>
            
            <div>
              <Label>Excel 파일 선택</Label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="mt-2"
              />
            </div>
            
            {parsedRows.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm font-medium mb-2">미리보기 (최대 50행)</p>
                  <div className="max-h-[300px] overflow-auto border rounded">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>No</TableHead>
                          <TableHead>이름</TableHead>
                          <TableHead>소속</TableHead>
                          <TableHead>연락처</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedRows.slice(0, 50).map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>{row['이름']}</TableCell>
                            <TableCell>{row['소속']}</TableCell>
                            <TableCell>{row['고객 연락처']}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    총 {parsedRows.length}개의 행이 확인되었습니다.
                  </p>
                </CardContent>
              </Card>
            )}
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button 
                onClick={handleUploadToStaging} 
                disabled={uploading || parsedRows.length === 0}
              >
                {uploading ? "업로드 중..." : "업로드 실행"}
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 2: Validation */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Summary Card */}
            <ValidationSummaryCard
              validCount={validCount}
              errorCount={errorCount}
              warnCount={warnCount}
            />
            
            <p className="text-sm text-muted-foreground">
              유효: 반영 가능 / 오류: 사유 확인 후 수정하거나 제외하세요.
            </p>
            
            {/* Staging Table */}
            <StagingTable
              data={stagedData}
              selectedIds={selectedSkipIds}
              onSelectionChange={setSelectedSkipIds}
            />
            
            {/* Action buttons */}
            <div className="flex items-center justify-between">
              <div>
                {selectedSkipIds.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedSkipIds.length}개 행이 제외됩니다.
                  </p>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  뒤로
                </Button>
                <Button 
                  onClick={handleCommitClick} 
                  disabled={uploading || (validCount + warnCount) === 0}
                >
                  {uploading ? "반영 중..." : `반영하기 (${validCount + warnCount - selectedSkipIds.length}명)`}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Step 3: Complete */}
        {step === 3 && commitResult && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <div className="text-center">
                <p className="text-lg font-semibold">완료되었습니다</p>
                <p className="text-sm text-muted-foreground mt-2">
                  총 {commitResult.inserted + commitResult.updated + commitResult.skipped}명 반영됨 (신규 {commitResult.inserted}, 수정 {commitResult.updated}, 제외 {commitResult.skipped})
                </p>
              </div>
              
              <Card className="w-full max-w-md">
                <CardContent className="pt-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>신규 등록:</span>
                    <span className="font-semibold">{commitResult.inserted}명</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>정보 갱신:</span>
                    <span className="font-semibold">{commitResult.updated}명</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>건너뜀:</span>
                    <span className="font-semibold">{commitResult.skipped}명</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                닫기
              </Button>
              <Button onClick={() => {
                onOpenChange(false);
                navigate(`/admin/events/${activeEventId}/participants`);
              }}>
                참가자 관리로 이동
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
      
      {/* Commit Confirmation Dialog */}
      <AlertDialog open={showCommitConfirm} onOpenChange={setShowCommitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>반영을 진행할까요?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>유효한 데이터만 반영됩니다.</p>
              <p>오류가 있는 행은 제외되며, 중복된 참가자는 기존 데이터가 업데이트됩니다.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={uploading}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleCommit} disabled={uploading}>
              {uploading ? "반영 중..." : "반영하기"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
