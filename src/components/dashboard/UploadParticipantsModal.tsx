// [Phase 82-STABILIZE-UPLOAD-FLOW] Single RPC upload with append/replace modes
import { useState } from "react";
import { useParams } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface UploadParticipantsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: Array<{
    id: string;
    name: string;
  }>;
  mutateParticipants?: () => void;
  mutateEventStats?: () => void;
}

interface ProcessExcelUploadResponse {
  status: string;
  mode: string;
  total: number;
  processed: number;
  skipped: number;
}

// Phase 84: Column mapping dictionary
const FIELD_MAP: Record<string, string[]> = {
  name: ["이름", "성명", "고객 성명", "Name", "name"],
  organization: ["소속", "회사명", "기관명", "Organization", "organization"],
  phone: ["연락처", "전화번호", "핸드폰", "Phone", "phone"],
  request_note: ["요청사항", "메모", "비고", "Request", "request_note"],
};

// Normalize row columns to standard field names
function normalizeRow(row: any): any {
  const normalized: any = {};
  for (const key in FIELD_MAP) {
    const aliases = FIELD_MAP[key];
    const matched = Object.keys(row).find((k) =>
      aliases.some((alias) => k.trim().includes(alias))
    );
    if (matched) normalized[key] = row[matched];
  }
  return normalized;
}

// Validate required columns exist
function validateRequiredColumns(rows: any[]): void {
  if (!rows.length) throw new Error("엑셀에 데이터가 없습니다.");

  const firstRow = rows[0];
  const required = ["name", "organization"];
  const missing = required.filter((field) =>
    Object.keys(firstRow).every((k) => !FIELD_MAP[field].some((a) => k.includes(a)))
  );

  if (missing.length > 0) {
    throw new Error(`필수 컬럼 누락: ${missing.join(", ")}`);
  }
}

export function UploadParticipantsModal({
  open,
  onOpenChange,
  mutateParticipants,
  mutateEventStats,
}: UploadParticipantsModalProps) {
  const { toast } = useToast();
  const { eventId } = useParams<{ eventId: string }>();
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    success: boolean;
    mode: string;
    total: number;
    processed: number;
    skipped: number;
  } | null>(null);
  
  const activeEventId = eventId ?? "";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !activeEventId) {
      toast({
        title: "업로드 실패",
        description: "파일과 행사를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    
    try {
      // Read Excel file
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      let rows = XLSX.utils.sheet_to_json(sheet);

      setProgress(20);

      // ✅ Phase 84: Validate and normalize columns
      validateRequiredColumns(rows);
      rows = rows.map(normalizeRow);

      setProgress(40);

      // ✅ Phase 86: Backup before replace mode
      if (replaceMode) {
        const { error: backupError } = await supabase.rpc('backup_participants', {
          p_event_id: activeEventId,
          p_backup_type: 'pre_replace'
        });
        
        if (backupError) {
          console.error('[Backup] Failed:', backupError.message);
        }
      }

      setProgress(50);

      // Call single RPC with all rows
      const { data: rpcResult, error: rpcError } = await supabase.rpc('process_excel_upload', {
        p_event_id: activeEventId,
        p_rows: rows as any,
        p_mode: replaceMode ? 'replace' : 'append'
      });

      if (rpcError) throw rpcError;

      setProgress(90);

      const result = rpcResult as unknown as ProcessExcelUploadResponse;

      // ✅ Immediately refresh data
      mutateParticipants?.();
      mutateEventStats?.();

      setProgress(100);

      // ✅ Phase 85: Enhanced toast with status differentiation
      const hasSkipped = result.skipped > 0;
      const title = hasSkipped ? "⚠️ 일부 제외됨" : "✅ 업로드 완료";
      const description = hasSkipped
        ? `${result.processed}명 반영, ${result.skipped}건 제외`
        : `${result.processed}명 반영됨`;

      toast({
        title,
        description,
      });

      // Reset and close immediately
      setFile(null);
      setResult(null);
      setReplaceMode(false);
      setProgress(0);
      onOpenChange(false);

    } catch (error: any) {
      toast({
        title: "❌ 업로드 실패",
        description: error.message || "파일을 확인해주세요",
        variant: "destructive",
      });
      setResult({
        success: false,
        mode: replaceMode ? 'replace' : 'append',
        total: 0,
        processed: 0,
        skipped: 0
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setResult(null);
      setReplaceMode(false);
      setProgress(0);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>참가자 업로드</DialogTitle>
          <DialogDescription>
            엑셀 파일을 업로드하여 참가자를 일괄 등록합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!result && (
            <>
              {/* Mode toggle */}
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                <Switch
                  id="replace-mode"
                  checked={replaceMode}
                  onCheckedChange={setReplaceMode}
                  disabled={uploading}
                />
                <div className="flex-1">
                  <Label htmlFor="replace-mode" className="font-medium cursor-pointer text-sm">
                    전체 교체 모드
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    활성화시 기존 참가자를 모두 삭제하고 새로 등록합니다
                  </p>
                </div>
              </div>

              {/* File selection */}
              <div className="space-y-2">
                <Label htmlFor="file">엑셀 파일 선택</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                {file && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    {file.name}
                  </p>
                )}
              </div>

              {/* Required columns info */}
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                     <div className="text-sm space-y-1">
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        필수 컬럼: 이름, 소속
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        선택 컬럼: 연락처, 요청사항
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        ※ 자동 컬럼 감지: "성명", "회사명" 등 유사 컬럼도 인식
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        ※ 중복 방지: (이름 + 연락처) 조합이 같으면 업데이트됩니다
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Uploading progress */}
              {uploading && (
                <div className="space-y-3 py-4">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-muted-foreground mt-2">업로드 중...</p>
                  </div>
                  {progress > 0 && (
                    <div className="space-y-2">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300 ease-in-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-center text-muted-foreground">{progress}%</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Results */}
          {result && (
            <Card className={result.success ? "border-green-500" : "border-destructive"}>
              <CardContent className="pt-6 pb-4 text-center space-y-3">
                {result.success ? (
                  <>
                    <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto" />
                    <div>
                      <p className="font-semibold text-lg">업로드 완료</p>
                      <div className="text-sm text-muted-foreground space-y-1 mt-2">
                        <p>모드: {result.mode === 'replace' ? '전체 교체' : '추가'}</p>
                        <p>총 입력: {result.total}건</p>
                        <p>처리 완료: {result.processed}건</p>
                        <p>제외: {result.skipped}건</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-12 w-12 text-destructive mx-auto" />
                    <div>
                      <p className="font-semibold text-lg">업로드 실패</p>
                      <p className="text-sm text-muted-foreground">
                        오류가 발생했습니다. 파일을 확인해주세요.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        {!result && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              취소
            </Button>
            <Button onClick={handleUpload} disabled={!file || uploading}>
              <Upload className="h-4 w-4 mr-2" />
              {replaceMode ? '전체 교체' : '업로드'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
