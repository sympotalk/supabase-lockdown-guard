import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Cell } from "recharts";

interface FeedbackAnalytics {
  total_changes: number;
  accuracy_percent: number;
  avg_score_delta: number;
  top_corrections: Array<{
    from_room: string;
    to_room: string;
    count: number;
    avg_delta: number;
  }>;
  analysis_period_days: number;
}

interface TimelineData {
  day: string;
  total_changes: number;
  avg_delta: number;
}

interface AIFeedbackAnalyticsProps {
  eventId: string;
}

export default function AIFeedbackAnalytics({ eventId }: AIFeedbackAnalyticsProps) {
  const [analytics, setAnalytics] = useState<FeedbackAnalytics | null>(null);
  const [timeline, setTimeline] = useState<TimelineData[]>([]);
  const [daysBack, setDaysBack] = useState(30);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadAnalytics();
    }
  }, [eventId, daysBack]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Load feedback analysis
      const { data: analyticsData, error: analyticsError } = await supabase.rpc(
        'ai_feedback_analyze',
        { p_event_id: eventId, p_days_back: daysBack }
      );

      if (analyticsError) throw analyticsError;
      setAnalytics(analyticsData as unknown as FeedbackAnalytics);

      // Load timeline
      const { data: timelineData, error: timelineError } = await supabase.rpc(
        'get_feedback_timeline',
        { p_event_id: eventId, p_days_back: daysBack }
      );

      if (timelineError) throw timelineError;
      setTimeline((timelineData as any[]) || []);
    } catch (error) {
      console.error('Error loading AI feedback analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return "text-green-600";
    if (accuracy >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getAccuracyIcon = (accuracy: number) => {
    if (accuracy >= 90) return <CheckCircle2 className="w-8 h-8 text-green-500" />;
    if (accuracy >= 70) return <TrendingUp className="w-8 h-8 text-yellow-500" />;
    return <AlertCircle className="w-8 h-8 text-red-500" />;
  };

  if (isLoading && !analytics) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">AI 학습 데이터를 분석 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            AI 학습 리포트
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            AI 배정 결과와 사용자 수정 패턴을 분석합니다
          </p>
        </div>
        <Select value={daysBack.toString()} onValueChange={(v) => setDaysBack(parseInt(v))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">최근 7일</SelectItem>
            <SelectItem value="30">최근 30일</SelectItem>
            <SelectItem value="90">최근 90일</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Accuracy Gauge */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">AI 적중률</CardTitle>
              <CardDescription>배정 결과가 유지된 비율</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-4">
                <div className="text-center">
                  {getAccuracyIcon(analytics.accuracy_percent)}
                  <div className={`text-4xl font-bold mt-2 ${getAccuracyColor(analytics.accuracy_percent)}`}>
                    {analytics.accuracy_percent.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics.total_changes}건 수정됨
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Changes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">총 변경 건수</CardTitle>
              <CardDescription>사용자가 수정한 배정</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="text-4xl font-bold">{analytics.total_changes}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  지난 {analytics.analysis_period_days}일
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Average Score Delta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">평균 점수 차이</CardTitle>
              <CardDescription>AI vs 사용자 판단</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className={`text-4xl font-bold ${analytics.avg_score_delta < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {analytics.avg_score_delta > 0 ? '+' : ''}
                  {analytics.avg_score_delta.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {analytics.avg_score_delta < 0 ? '개선 필요' : '양호'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Corrections */}
      {analytics && analytics.top_corrections && analytics.top_corrections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">주요 수정 패턴</CardTitle>
            <CardDescription>가장 자주 변경된 객실 타입</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.top_corrections}>
                <XAxis 
                  dataKey="from_room" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold text-sm mb-2">
                            {data.from_room} → {data.to_room}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            변경 횟수: {data.count}회
                          </p>
                          <p className="text-xs text-muted-foreground">
                            평균 점수 차이: {data.avg_delta?.toFixed(1)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {analytics.top_corrections.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Timeline Chart */}
      {timeline && timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">변경 추이</CardTitle>
            <CardDescription>일별 수정 건수 및 평균 점수 차이</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timeline}>
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold text-sm">{data.day}</p>
                          <p className="text-xs text-muted-foreground">
                            변경: {data.total_changes}건
                          </p>
                          <p className="text-xs text-muted-foreground">
                            평균 차이: {data.avg_delta?.toFixed(1)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="total_changes" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  dot={{ fill: '#6366f1', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {analytics && analytics.total_changes === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              아직 수정 기록이 없습니다. AI 배정 후 수정 사항이 발생하면 자동으로 학습됩니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
