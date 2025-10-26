import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Radio, Brain, BarChart3, AlertTriangle, Users2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateSystemInsights } from "@/lib/masterDashboardValidation";

interface SystemInsights {
  healthRate: number;
  activeChannels: number;
  aiMappingRate: number;
  duplicateRate: number;
  qaPassRate: number;
  errorRate: number;
  isMock: boolean;
}

export function SystemInsightBoard() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState<SystemInsights>({
    healthRate: 0,
    activeChannels: 0,
    aiMappingRate: 0,
    duplicateRate: 0,
    qaPassRate: 0,
    errorRate: 0,
    isMock: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
    
    // Refresh every minute
    const interval = setInterval(loadInsights, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadInsights = async () => {
    console.log("[SystemInsights] Loading comprehensive insights...");

    try {
      const result = await validateSystemInsights();
      
      setInsights({
        healthRate: result.data.healthRate,
        activeChannels: result.data.activeChannels,
        aiMappingRate: result.data.aiMappingRate,
        duplicateRate: result.data.duplicateRate,
        qaPassRate: result.data.qaPassRate,
        errorRate: result.data.errorRate,
        isMock: result.isMock,
      });
    } catch (error) {
      console.error("[SystemInsights] Error loading:", error);
    }

    setLoading(false);
  };

  const getPercentageColor = (value: number, inverse: boolean = false) => {
    // For error rates, inverse the logic (lower is better)
    const effectiveValue = inverse ? 100 - value : value;
    
    if (effectiveValue >= 90) return "text-blue-600 dark:text-blue-400";
    if (effectiveValue >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getPercentageBg = (value: number, inverse: boolean = false) => {
    const effectiveValue = inverse ? 100 - value : value;
    
    if (effectiveValue >= 90) return "bg-blue-100 dark:bg-blue-900/30";
    if (effectiveValue >= 70) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  if (loading) {
    return (
      <Card className="shadow-lg rounded-2xl border-border bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="p-6">
          <div className="h-32 bg-muted rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-2xl border-border bg-gradient-to-br from-primary/5 to-background">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-[16px] font-semibold">System Insight Board (24시간 운영 인사이트)</h3>
            {insights.isMock && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0">Mock</Badge>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate("/master/alert-history")}
          >
            세부 리포트 보기
          </Button>
        </div>

        <TooltipProvider>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* A1: System Health Rate */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={cn(
                    "p-4 rounded-xl transition-all duration-300 cursor-pointer hover:scale-105",
                    getPercentageBg(insights.healthRate)
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <p className="text-[12px] text-muted-foreground">시스템 정상률</p>
                  </div>
                  <p className={cn("text-[28px] font-bold", getPercentageColor(insights.healthRate))}>
                    {insights.healthRate.toFixed(1)}%
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>전체 함수 중 정상 상태 비율</p>
                <p className="text-xs text-muted-foreground">지난 24시간 기준 자동 집계</p>
              </TooltipContent>
            </Tooltip>

            {/* A2: Realtime Connection Uptime */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={cn(
                    "p-4 rounded-xl transition-all duration-300 cursor-pointer hover:scale-105",
                    insights.activeChannels > 0 
                      ? "bg-green-100 dark:bg-green-900/30" 
                      : "bg-gray-100 dark:bg-gray-900/30"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Radio className="h-4 w-4 text-primary" />
                    <p className="text-[12px] text-muted-foreground">실시간 연결</p>
                  </div>
                  <p className={cn(
                    "text-[28px] font-bold",
                    insights.activeChannels > 0 
                      ? "text-green-600 dark:text-green-400" 
                      : "text-gray-600 dark:text-gray-400"
                  )}>
                    {insights.activeChannels}채널
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>현재 활성화된 Realtime 채널 수</p>
                <p className="text-xs text-muted-foreground">실시간 업데이트</p>
              </TooltipContent>
            </Tooltip>

            {/* B1: AI Mapping Success Rate */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={cn(
                    "p-4 rounded-xl transition-all duration-300 cursor-pointer hover:scale-105",
                    getPercentageBg(insights.aiMappingRate)
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <p className="text-[12px] text-muted-foreground">AI 매핑 성공률</p>
                  </div>
                  <p className={cn("text-[28px] font-bold", getPercentageColor(insights.aiMappingRate))}>
                    {insights.aiMappingRate.toFixed(1)}%
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>AI 자동 매핑 성공 비율</p>
                <p className="text-xs text-muted-foreground">지난 24시간 기준 자동 집계</p>
              </TooltipContent>
            </Tooltip>

            {/* B2: Duplicate Detection Rate */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={cn(
                    "p-4 rounded-xl transition-all duration-300 cursor-pointer hover:scale-105",
                    getPercentageBg(insights.duplicateRate, true)
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Users2 className="h-4 w-4 text-primary" />
                    <p className="text-[12px] text-muted-foreground">중복 감지</p>
                  </div>
                  <p className={cn("text-[28px] font-bold", getPercentageColor(insights.duplicateRate, true))}>
                    {insights.duplicateRate.toFixed(1)}%
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>중복 참가자 감지 비율</p>
                <p className="text-xs text-muted-foreground">전체 참가자 대비</p>
              </TooltipContent>
            </Tooltip>

            {/* C1: QA Pass Rate */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={cn(
                    "p-4 rounded-xl transition-all duration-300 cursor-pointer hover:scale-105",
                    getPercentageBg(insights.qaPassRate)
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <p className="text-[12px] text-muted-foreground">QA 통과율</p>
                  </div>
                  <p className={cn("text-[28px] font-bold", getPercentageColor(insights.qaPassRate))}>
                    {insights.qaPassRate.toFixed(1)}%
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>품질 검사 통과 비율</p>
                <p className="text-xs text-muted-foreground">지난 24시간 기준 자동 집계</p>
              </TooltipContent>
            </Tooltip>

            {/* C2: Error Rate */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={cn(
                    "p-4 rounded-xl transition-all duration-300 cursor-pointer hover:scale-105",
                    getPercentageBg(insights.errorRate, true)
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                    <p className="text-[12px] text-muted-foreground">에러 발생률</p>
                  </div>
                  <p className={cn("text-[28px] font-bold", getPercentageColor(insights.errorRate, true))}>
                    {insights.errorRate.toFixed(1)}%
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>시스템 오류 발생 비율</p>
                <p className="text-xs text-muted-foreground">지난 24시간 기준 자동 집계</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
