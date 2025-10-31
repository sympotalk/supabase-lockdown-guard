// [Phase 77-E] AI 동반의료인 감지 확인 모달
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CompanionCandidate {
  source_id: string;
  source_name: string;
  target_id: string;
  target_name: string;
  confidence: number;
  reason: string;
  text: string;
}

interface CompanionConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: CompanionCandidate[];
  onComplete?: () => void;
}

export default function CompanionConfirmModal({
  open,
  onOpenChange,
  candidates,
  onComplete,
}: CompanionConfirmModalProps) {
  const [processing, setProcessing] = useState(false);
  const [approved, setApproved] = useState<Set<number>>(new Set());
  const [rejected, setRejected] = useState<Set<number>>(new Set());

  const handleApprove = (index: number) => {
    setApproved((prev) => new Set(prev).add(index));
    setRejected((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleReject = (index: number) => {
    setRejected((prev) => new Set(prev).add(index));
    setApproved((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleConfirmAll = async () => {
    setProcessing(true);
    try {
      let successCount = 0;
      let failCount = 0;

      // 승인된 항목만 처리
      for (const index of Array.from(approved)) {
        const candidate = candidates[index];
        try {
          const { error } = await supabase.rpc("link_companions_pair", {
            p_source_id: candidate.source_id,
            p_target_id: candidate.target_id,
          });

          if (error) throw error;
          successCount++;
        } catch (error: any) {
          console.error(`[Phase 77-E] 동반자 연결 실패 (${candidate.source_name} ↔ ${candidate.target_name}):`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success("동반의료인 연결 완료", {
          description: `${successCount}건의 동반자 관계가 등록되었습니다.`,
        });
      }

      if (failCount > 0) {
        toast.error("일부 연결 실패", {
          description: `${failCount}건의 연결에 실패했습니다.`,
        });
      }

      onOpenChange(false);
      onComplete?.();
    } catch (error: any) {
      console.error("[Phase 77-E] 동반자 확인 처리 실패:", error);
      toast.error("처리 실패", {
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300">
          확신도 {Math.round(confidence * 100)}%
        </Badge>
      );
    }
    if (confidence >= 0.7) {
      return (
        <Badge className="bg-orange-100 text-orange-700 border-orange-300">
          확신도 {Math.round(confidence * 100)}%
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-700 border-red-300">
        확신도 {Math.round(confidence * 100)}%
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            AI 동반의료인 감지 확인
          </DialogTitle>
          <DialogDescription>
            메모 내용을 분석하여 {candidates.length}건의 동반의료인 관계를 발견했습니다.
            각 항목을 확인하고 승인 또는 거절해주세요.
          </DialogDescription>
        </DialogHeader>

        {/* 안내 메시지 */}
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-xs">
            승인된 항목만 동반자로 연결됩니다. 확신도가 낮은 항목은 신중히 검토해주세요.
          </AlertDescription>
        </Alert>

        {/* 후보 목록 */}
        <div className="space-y-3 mt-4">
          {candidates.map((candidate, index) => {
            const isApproved = approved.has(index);
            const isRejected = rejected.has(index);
            const isPending = !isApproved && !isRejected;

            return (
              <div
                key={index}
                className={cn(
                  "p-4 border rounded-lg transition-all",
                  isApproved && "border-green-300 bg-green-50",
                  isRejected && "border-red-300 bg-red-50 opacity-60",
                  isPending && "border-gray-200 bg-white"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {/* 참가자 이름 */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm">
                        {candidate.source_name}
                      </span>
                      <span className="text-muted-foreground">↔</span>
                      <span className="font-semibold text-sm">
                        {candidate.target_name}
                      </span>
                    </div>

                    {/* 감지 이유 & 확신도 */}
                    <div className="flex items-center gap-2 mb-2">
                      {getConfidenceBadge(candidate.confidence)}
                      <span className="text-xs text-muted-foreground">
                        {candidate.reason}
                      </span>
                    </div>

                    {/* 메모 내용 */}
                    <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded border">
                      "{candidate.text}"
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant={isApproved ? "default" : "outline"}
                      onClick={() => handleApprove(index)}
                      disabled={processing}
                      className="gap-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant={isRejected ? "destructive" : "outline"}
                      onClick={() => handleReject(index)}
                      disabled={processing}
                      className="gap-1"
                    >
                      <XCircle className="w-3 h-3" />
                      거절
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            승인: {approved.size}건 / 거절: {rejected.size}건
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={processing}
            >
              취소
            </Button>
            <Button
              onClick={handleConfirmAll}
              disabled={processing || approved.size === 0}
            >
              {processing ? "처리 중..." : `${approved.size}건 확인`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
