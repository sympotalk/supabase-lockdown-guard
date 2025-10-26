import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface TrendData {
  date: string;
  success_rate: number;
  processing_time: number;
}

interface TrendChartProps {
  data: TrendData[];
  loading?: boolean;
}

export function TrendChart({ data, loading }: TrendChartProps) {
  if (loading) {
    return (
      <Card className="shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle className="text-[14px]">30일 트렌드</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md rounded-2xl">
      <CardHeader>
        <CardTitle className="text-[14px]">30일 트렌드</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(new Date(value), "MM/dd")}
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: "11px" }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: "11px" }}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => [
                name === "success_rate" ? `${value}%` : `${value}ms`,
                name === "success_rate" ? "성공률" : "처리시간",
              ]}
              labelFormatter={(label) => format(new Date(label), "yyyy-MM-dd")}
            />
            <Line
              type="monotone"
              dataKey="success_rate"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(var(--primary))" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
