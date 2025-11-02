// [Phase 80-PURGE-FULL] Simplified direct upload without staging system
import { useState } from "react";
import { useParams } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { useUser } from "@/context/UserContext";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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
}: UploadParticipantsModalProps) {
  const { toast } = useToast();
  const { eventId } = useParams<{ eventId: string }>();
  const { agencyScope } = useUser();
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);
  
  const activeEventId = eventId ?? "";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !activeEventId || !agencyScope) {
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
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) {
        throw new Error("엑셀 파일에 데이터가 없습니다.");
      }

      setProgress(30);

      // Map Excel rows to participant records
      const participants = rows.map((row: any) => ({
        event_id: activeEventId,
        agency_id: agencyScope,
        name: row['성명'] || row['이름'] || row['name'] || '',
        organization: row['소속'] || row['organization'] || '',
        phone: row['연락처'] || row['전화번호'] || row['phone'] || '',
        email: row['이메일'] || row['email'] || '',
        request_note: row['요청사항'] || row['메모'] || row['request_note'] || '',
        fixed_role: '참석자', // Default role
        is_active: true,
      }));

      setProgress(60);

      // Insert participants directly into database
      const { data, error } = await supabase
        .from('participants')
        .insert(participants)
        .select();

      if (error) throw error;

      setProgress(100);
      setResult({ success: data?.length || 0, errors: 0 });

      // Log the upload
      await supabase
        .from('participants_log')
        .insert({
          event_id: activeEventId,
          agency_id: agencyScope,
          action: 'excel_upload_direct',
          metadata: {
            file_name: file.name,
            uploaded_count: data?.length || 0,
            timestamp: new Date().toISOString(),
          },
        });

      toast({
        title: "업로드 완료",
        description: `${data?.length || 0}명의 참가자가 등록되었습니다.`,
      });

      // Reset after 2 seconds
      setTimeout(() => {
        setFile(null);
        setResult(null);
        setProgress(0);
        onOpenChange(false);
      }, 2000);

    } catch (error: any) {
      console.error('[UploadModal] Upload error:', error);
      toast({
        title: "업로드 실패",
        description: error.message || "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
      setResult({ success: 0, errors: 1 });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setResult(null);
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
          {/* File selection */}
          {!result && (
            <>
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

              <Card className="bg-muted/30">
                <CardContent className="pt-4 pb-3 text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground mb-2">필수 컬럼:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>성명 (또는 이름, name)</li>
                    <li>소속 (또는 organization)</li>
                    <li>연락처 (또는 전화번호, phone)</li>
                  </ul>
                  <p className="mt-2 text-xs">※ 선택 컬럼: 이메일, 요청사항</p>
                </CardContent>
              </Card>

              {/* Progress */}
              {uploading && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    업로드 중... {progress}%
                  </p>
                </div>
              )}
            </>
          )}

          {/* Results */}
          {result && (
            <Card className={result.errors > 0 ? "border-destructive" : "border-primary"}>
              <CardContent className="pt-6 pb-4 text-center space-y-3">
                {result.errors === 0 ? (
                  <>
                    <CheckCircle className="h-12 w-12 text-primary mx-auto" />
                    <div>
                      <p className="font-semibold text-lg">업로드 완료</p>
                      <p className="text-sm text-muted-foreground">
                        총 {result.success}명의 참가자가 등록되었습니다
                      </p>
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
              업로드
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
