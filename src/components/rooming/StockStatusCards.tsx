import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";

interface StockStatusCardsProps {
  stockStatus: {
    shortage: number;
    surplus: number;
    normal: number;
  } | null;
}

export default function StockStatusCards({ stockStatus }: StockStatusCardsProps) {
  if (!stockStatus) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      <Card className={cn(
        "p-3 shadow-sm rounded-xl",
        stockStatus.shortage > 0 ? "bg-red-50 border-red-200" : "bg-gray-50"
      )}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">재고 부족</div>
            <div className={cn(
              "text-xl font-bold",
              stockStatus.shortage > 0 ? "text-red-600" : "text-gray-500"
            )}>
              {stockStatus.shortage}건
            </div>
          </div>
          <AlertCircle className={cn(
            "w-8 h-8",
            stockStatus.shortage > 0 ? "text-red-400" : "text-gray-300"
          )} />
        </div>
      </Card>

      <Card className="p-3 shadow-sm rounded-xl bg-green-50 border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">여유 재고</div>
            <div className="text-xl font-bold text-green-600">
              {stockStatus.surplus}건
            </div>
          </div>
          <TrendingUp className="w-8 h-8 text-green-400" />
        </div>
      </Card>

      <Card className="p-3 shadow-sm rounded-xl bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">정상 배정</div>
            <div className="text-xl font-bold text-blue-600">
              {stockStatus.normal}건
            </div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-blue-400" />
        </div>
      </Card>
    </div>
  );
}
