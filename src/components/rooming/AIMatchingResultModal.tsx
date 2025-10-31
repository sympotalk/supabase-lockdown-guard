// [Phase 77-A] AI 룸핑 매칭 결과 모달
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface AIMatchingResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: {
    success: boolean;
    match_run_id: string;
    assigned: number;
    warnings: any[];
    errors: any[];
    dry_run: boolean;
  } | null;
}

export default function AIMatchingResultModal({
  open,
  onOpenChange,
  result
}: AIMatchingResultModalProps) {
  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            AI 자동 배정 결과
          </DialogTitle>
          <DialogDescription>
            {result.dry_run ? '시뮬레이션 모드' : '실제 배정 완료'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 성공 요약 */}
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">배정 완료</span>
              <Badge variant="default" className="bg-green-500">
                {result.assigned}명
              </Badge>
            </div>
          </div>

          {/* 경고사항 */}
          {result.warnings && result.warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                경고사항
              </h4>
              {result.warnings.map((warning, index) => (
                <Alert key={index} variant="default" className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
                  <AlertDescription className="text-sm">
                    {warning.type === 'stock_shortage' ? (
                      <div className="space-y-2">
                        <p className="font-medium">객실 재고 부족</p>
                        {warning.details && warning.details.map((detail: any, idx: number) => (
                          <div key={idx} className="pl-4 text-xs">
                            • {detail.room_type}: 필요 {detail.needed}개, 보유 {detail.available}개 
                            (부족 {detail.shortage}개)
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>
                        <span className="font-medium">{warning.participant}:</span> {warning.message}
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* 에러 */}
          {result.errors && result.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                배정 실패
              </h4>
              {result.errors.map((error, index) => (
                <Alert key={index} variant="destructive">
                  <AlertDescription className="text-sm">
                    <span className="font-medium">{error.participant}:</span> {error.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* 매칭 ID */}
          <div className="text-xs text-muted-foreground pt-4 border-t">
            매칭 실행 ID: {result.match_run_id}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
