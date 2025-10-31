import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface BiasProfile {
  room_type: string;
  bias_score: number;
  sample_count: number;
  preference_level: string;
  last_updated: string;
}

interface UserBiasProfileProps {
  userId: string;
  eventId: string;
}

export default function UserBiasProfile({ userId, eventId }: UserBiasProfileProps) {
  const [profile, setProfile] = useState<BiasProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_bias_profile', {
        p_user_id: userId
      });

      if (error) throw error;
      setProfile((data as BiasProfile[]) || []);
    } catch (error) {
      console.error('Error loading user bias profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBias = async () => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase.rpc('ai_update_user_bias', {
        p_user_id: userId,
        p_event_id: eventId
      });

      if (error) throw error;

      const result = data as any;
      toast.success('성향 업데이트 완료', {
        description: `${result.updated_types}개 객실 타입의 성향이 갱신되었습니다.`
      });

      loadProfile();
    } catch (error: any) {
      console.error('Error updating user bias:', error);
      toast.error('성향 업데이트 실패', {
        description: error.message
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getBiasIcon = (score: number) => {
    if (score > 10) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (score < -10) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getBiasColor = (score: number) => {
    if (score > 30) return "bg-green-100 text-green-800 border-green-300";
    if (score > 10) return "bg-green-50 text-green-700 border-green-200";
    if (score > -10) return "bg-gray-100 text-gray-700 border-gray-300";
    if (score > -30) return "bg-red-50 text-red-700 border-red-200";
    return "bg-red-100 text-red-800 border-red-300";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">사용자 배정 성향 프로필</CardTitle>
            <CardDescription>
              과거 수정 패턴을 학습하여 객실 선호도를 자동 파악합니다
            </CardDescription>
          </div>
          <Button 
            onClick={handleUpdateBias}
            disabled={isUpdating}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
            {isUpdating ? '분석 중...' : '성향 갱신'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            성향 데이터를 불러오는 중...
          </div>
        ) : profile.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-2">
              아직 학습된 성향이 없습니다
            </p>
            <p className="text-xs text-muted-foreground">
              객실 배정을 수정하면 자동으로 성향이 학습됩니다 (최소 3회 이상)
            </p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead className="font-semibold">객실 타입</TableHead>
                  <TableHead className="font-semibold">선호도</TableHead>
                  <TableHead className="font-semibold">점수</TableHead>
                  <TableHead className="font-semibold">학습 데이터</TableHead>
                  <TableHead className="font-semibold">최종 갱신</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profile.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.room_type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getBiasIcon(item.bias_score)}
                        <Badge 
                          variant="outline" 
                          className={getBiasColor(item.bias_score)}
                        >
                          {item.preference_level}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-semibold ${
                        item.bias_score > 0 ? 'text-green-600' : 
                        item.bias_score < 0 ? 'text-red-600' : 
                        'text-gray-500'
                      }`}>
                        {item.bias_score > 0 ? '+' : ''}{item.bias_score.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {item.sample_count}회
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(item.last_updated), 'yyyy-MM-dd HH:mm')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
