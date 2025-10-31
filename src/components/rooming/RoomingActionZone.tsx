import { Button } from "@/components/ui/button";
import { Sparkles, Shield, Shuffle } from "lucide-react";

interface RoomingActionZoneProps {
  onStockCheck: () => void;
  onAIAutoAssign: () => void;
  onAIRebalance: () => void;
  isCheckingStock: boolean;
  isRunningAI: boolean;
  isRunningRebalance: boolean;
  disabled?: boolean;
}

export default function RoomingActionZone({
  onStockCheck,
  onAIAutoAssign,
  onAIRebalance,
  isCheckingStock,
  isRunningAI,
  isRunningRebalance,
  disabled = false,
}: RoomingActionZoneProps) {
  return (
    <div className="bg-muted/30 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-3 mb-4">
      {/* Left: Stock Check Button */}
      <Button
        onClick={onStockCheck}
        disabled={isCheckingStock || disabled}
        variant="ghost"
        className="gap-2 w-full md:w-auto"
      >
        <Shield className="w-4 h-4" />
        {isCheckingStock ? '점검 중...' : '재고 점검'}
      </Button>

      {/* Right: AI Action Buttons */}
      <div className="flex gap-2 w-full md:w-auto">
        <Button
          onClick={onAIAutoAssign}
          disabled={isRunningAI || disabled}
          className="gap-2 bg-primary hover:bg-primary/90 flex-1 md:flex-initial"
        >
          <Sparkles className="w-4 h-4" />
          {isRunningAI ? '배정 중...' : 'AI 자동 배정 실행'}
        </Button>

        <Button
          onClick={onAIRebalance}
          disabled={isRunningRebalance || disabled}
          variant="secondary"
          className="gap-2 bg-violet-500 hover:bg-violet-600 text-white flex-1 md:flex-initial"
        >
          <Shuffle className="w-4 h-4" />
          {isRunningRebalance ? '재배정 중...' : 'AI 재배정 실행'}
        </Button>
      </div>
    </div>
  );
}
