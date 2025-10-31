import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Shield, Users, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RebalanceChange {
  participant_id: string;
  participant_name: string;
  from_ref: string;
  from_name: string;
  to_ref: string;
  to_name: string;
  reason: string;
  role?: string;
  companion_count?: number;
  base_score?: number;
  bias_applied?: number;
  adjusted_score?: number;
}

interface RebalancePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: RebalanceChange[];
  onApply: () => void;
  isApplying: boolean;
}

export default function RebalancePreviewModal({
  open,
  onOpenChange,
  changes,
  onApply,
  isApplying
}: RebalancePreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            리밸런스 미리보기
            <Badge variant="secondary">{changes.length}건 이동 제안</Badge>
          </DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 text-sm mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800">
                수동배정·동반자·필수요청은 이동 대상에서 제외됩니다
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-2 pr-4">
            {changes.map((change, idx) => (
              <div 
                key={idx}
                className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-sm">
                      <div className="font-semibold flex items-center gap-2">
                        {change.participant_name}
                        {change.role && (
                          <Badge variant="outline" className="text-xs">
                            {change.role}
                          </Badge>
                        )}
                        {change.companion_count && change.companion_count > 0 && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            동반 {change.companion_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {change.from_name}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <Badge variant="default" className="text-xs bg-purple-500">
                    {change.to_name}
                  </Badge>
                  
                  {/* [Phase 77-L] Show bias indicator */}
                  {change.bias_applied && Math.abs(change.bias_applied) > 5 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge 
                            variant="secondary" 
                            className="text-xs flex items-center gap-1 bg-purple-100 text-purple-700 border-purple-300"
                          >
                            <Sparkles className="w-3 h-3" />
                            성향 반영
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs space-y-1">
                            <p>기본 점수: {change.base_score?.toFixed(1)}</p>
                            <p>성향 보정: {change.bias_applied > 0 ? '+' : ''}{change.bias_applied.toFixed(1)}</p>
                            <p className="font-semibold">최종 점수: {change.adjusted_score?.toFixed(1)}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isApplying}
          >
            취소
          </Button>
          <Button 
            onClick={onApply}
            disabled={isApplying || changes.length === 0}
            className="gap-2"
          >
            {isApplying ? '적용 중...' : `${changes.length}건 적용`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
