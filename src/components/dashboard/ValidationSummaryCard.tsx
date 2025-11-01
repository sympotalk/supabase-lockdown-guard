// [Phase 78-B.8] Validation summary card component
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, ArrowRight } from "lucide-react";

interface ValidationSummaryCardProps {
  validCount: number;
  errorCount: number;
  warnCount: number;
}

export function ValidationSummaryCard({
  validCount,
  errorCount,
  warnCount
}: ValidationSummaryCardProps) {
  const totalCount = validCount + errorCount + warnCount;
  
  return (
    <Card className="bg-[#F9FAFB] rounded-[10px]">
      <CardContent className="p-3">
        <div className="space-y-4">
          {/* Status counts */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300">
                유효: {validCount}건
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <Badge variant="destructive">
                오류: {errorCount}건
              </Badge>
            </div>
            
            {warnCount > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                  경고: {warnCount}건
                </Badge>
              </div>
            )}
          </div>
          
          {/* Summary */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-sm font-medium">반영 가능:</span>
            <span className="text-lg font-bold text-primary">{validCount + warnCount}건</span>
            {errorCount > 0 && (
              <>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  ({errorCount}건 오류 제외)
                </span>
              </>
            )}
          </div>
          
          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="space-y-2">
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${((validCount + warnCount) / totalCount) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {(((validCount + warnCount) / totalCount) * 100).toFixed(1)}% 반영 가능
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
