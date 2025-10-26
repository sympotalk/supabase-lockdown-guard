import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HourBucket {
  hour: number;
  count: number;
  severity: { [key: string]: number };
}

export function SystemPulseTimeline() {
  const [buckets, setBuckets] = useState<HourBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimelineData();
  }, []);

  const loadTimelineData = async () => {
    setLoading(true);
    console.log("[SystemPulse] Loading 24h timeline...");

    try {
      // Mock data for now since alerts_history table doesn't exist yet
      const mockBuckets: HourBucket[] = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: Math.floor(Math.random() * 15),
        severity: {
          critical: Math.floor(Math.random() * 3),
          error: Math.floor(Math.random() * 5),
          warn: Math.floor(Math.random() * 4),
          info: Math.floor(Math.random() * 3),
        },
      }));

      setBuckets(mockBuckets);
    } catch (error) {
      console.error("[SystemPulse] Error loading:", error);
    }

    setLoading(false);
  };

  const getBarColor = (count: number) => {
    if (count === 0) return "bg-gray-200 dark:bg-gray-700";
    if (count <= 2) return "bg-green-400 dark:bg-green-600";
    if (count <= 5) return "bg-yellow-400 dark:bg-yellow-600";
    if (count <= 9) return "bg-orange-400 dark:bg-orange-600";
    return "bg-red-500 dark:bg-red-700";
  };

  const getBarHeight = (count: number) => {
    const maxHeight = 80;
    const normalized = Math.min(count / 15, 1);
    return Math.max(normalized * maxHeight, 4);
  };

  if (loading) {
    return (
      <Card className="shadow-md rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="text-[14px]">시스템 펄스 (24시간)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md rounded-2xl border-border">
      <CardHeader>
        <CardTitle className="text-[14px]">시스템 펄스 (24시간)</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="flex items-end justify-between gap-1 h-24">
            {buckets.map((bucket) => (
              <Tooltip key={bucket.hour}>
                <TooltipTrigger asChild>
                  <div className="flex-1 flex flex-col items-center gap-1 cursor-pointer group">
                    <div
                      className={cn(
                        "w-full rounded-md transition-all duration-200",
                        getBarColor(bucket.count),
                        "group-hover:opacity-80"
                      )}
                      style={{ height: `${getBarHeight(bucket.count)}px` }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {bucket.hour.toString().padStart(2, "0")}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {bucket.hour.toString().padStart(2, "0")}:00
                    </p>
                    <p className="text-sm">총 {bucket.count}건</p>
                    <div className="text-xs space-y-0.5 pt-1 border-t">
                      <div className="flex justify-between gap-4">
                        <span className="text-red-500">Critical:</span>
                        <span>{bucket.severity.critical || 0}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-orange-500">Error:</span>
                        <span>{bucket.severity.error || 0}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-yellow-500">Warn:</span>
                        <span>{bucket.severity.warn || 0}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-blue-500">Info:</span>
                        <span>{bucket.severity.info || 0}</span>
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
        <div className="flex items-center justify-between mt-4 text-[12px] text-muted-foreground">
          <span>🟢 0-2</span>
          <span>🟡 3-5</span>
          <span>🟠 6-9</span>
          <span>🔴 10+</span>
        </div>
      </CardContent>
    </Card>
  );
}
