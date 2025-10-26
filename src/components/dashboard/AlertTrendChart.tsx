import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";

interface DayData {
  date: string;
  critical: number;
  error: number;
  warn: number;
  info: number;
}

export function AlertTrendChart() {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrendData();
  }, []);

  const loadTrendData = async () => {
    setLoading(true);
    console.log("[AlertTrend] Loading 7-day trend...");

    try {
      // Mock data for last 7 days
      const mockData: DayData[] = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return {
          date: format(date, "MM/dd"),
          critical: Math.floor(Math.random() * 8),
          error: Math.floor(Math.random() * 15),
          warn: Math.floor(Math.random() * 20),
          info: Math.floor(Math.random() * 25),
        };
      });

      setData(mockData);
    } catch (error) {
      console.error("[AlertTrend] Error loading:", error);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="shadow-md rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="text-[14px]">Alert 트렌드 (7일)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md rounded-2xl border-border">
      <CardHeader>
        <CardTitle className="text-[14px]">Alert 트렌드 (최근 7일)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend 
              wrapperStyle={{
                fontSize: "12px",
              }}
            />
            <Bar dataKey="critical" stackId="a" fill="#dc2626" name="Critical" />
            <Bar dataKey="error" stackId="a" fill="#f87171" name="Error" />
            <Bar dataKey="warn" stackId="a" fill="#fbbf24" name="Warning" />
            <Bar dataKey="info" stackId="a" fill="#60a5fa" name="Info" />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-6 mt-4 text-[12px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-600" />
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-400" />
            <span>Error</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-400" />
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-400" />
            <span>Info</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
