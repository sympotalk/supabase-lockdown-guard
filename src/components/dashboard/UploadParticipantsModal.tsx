import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { mutate } from "swr";
import * as XLSX from "xlsx";

// [LOCKED][71-D.FIXFLOW.R2] Select guard added to prevent null/empty ID issues
interface UploadParticipantsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: Array<{ id: string; name: string }>;
}

export function UploadParticipantsModal({ open, onOpenChange, events }: UploadParticipantsModalProps) {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    // Parse Excel file
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        // Transform to expected format
        const rows = json.map((row: any) => ({
          name: row['이름'] || row['name'] || row['Name'] || '',
          phone: row['전화번호'] || row['phone'] || row['Phone'] || '',
          email: row['이메일'] || row['email'] || row['Email'] || '',
        })).filter(row => row.name); // Only keep rows with names

        setParsedRows(rows);
        toast({
          title: "파일 분석 완료",
          description: `${rows.length}명의 참가자 데이터를 확인했습니다.`,
        });
      } catch (error) {
        toast({
          title: "파일 분석 실패",
          description: "Excel 파일을 읽을 수 없습니다.",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleUpload = async () => {
    if (!selectedEventId || !parsedRows.length) {
      toast({
        title: "업로드 불가",
        description: "행사를 선택하고 파일을 업로드해주세요.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data, error } = await supabase.rpc('fn_bulk_upload_participants', {
        p_event_id: selectedEventId,
        p_rows: parsedRows,
      });

      if (error) throw error;

      const eventName = events.find(e => e.id === selectedEventId)?.name || '선택한 행사';
      const result = data as { inserted: number };
      
      toast({
        title: "업로드 완료",
        description: `${eventName}에 ${result.inserted}명의 참가자를 등록했습니다.`,
      });

      // Refresh dashboard data
      mutate('event_progress_view');
      
      // Reset state
      setSelectedEventId("");
      setFile(null);
      setParsedRows([]);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>참가자 엑셀 업로드</DialogTitle>
          <DialogDescription>
            Excel 파일을 업로드하여 참가자를 일괄 등록합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Event Selection */}
          <div className="space-y-2">
            <Label htmlFor="event-select">행사 선택 *</Label>
            <Select value={selectedEventId || undefined} onValueChange={setSelectedEventId}>
              <SelectTrigger id="event-select">
                <SelectValue placeholder="행사를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {events
                  .filter((event) => event.id && event.id !== "")
                  .map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Excel 파일 *</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {file ? file.name : '파일 선택'}
              </Button>
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            {parsedRows.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {parsedRows.length}명의 참가자 데이터가 준비되었습니다.
              </p>
            )}
          </div>

          {/* Info */}
          <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">Excel 파일 형식 안내</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>필수 컬럼: 이름(name)</li>
                <li>선택 컬럼: 전화번호(phone), 이메일(email)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            취소
          </Button>
          <Button
            className="flex-1"
            onClick={handleUpload}
            disabled={uploading || !selectedEventId || !parsedRows.length}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "업로드 중..." : "업로드"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
