// [Phase 77-D] 룸핑 시각화 탭 - Visual Room Map
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import useSWR from "swr";

interface RoomingVisualTabProps {
  eventId: string;
}

export default function RoomingVisualTab({ eventId }: RoomingVisualTabProps) {
  const { data: visualData, error, isLoading, mutate } = useSWR(
    eventId ? `rooming_visual_${eventId}` : null,
    async () => {
      if (!eventId) return [];
      
      const { data, error } = await supabase
        .from("v_rooming_visual_map" as any)
        .select("*")
        .eq("event_id", eventId);

      if (error) throw error;
      return data || [];
    },
    { revalidateOnFocus: false }
  );

  // Realtime subscription
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`rooming_visual_${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooming_participants", filter: `event_id=eq.${eventId}` },
        () => {
          console.log("[Phase 77-D] Rooming data updated, refreshing visual map");
          mutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, mutate]);

  if (isLoading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
        <p>시각화 맵을 로드하는 중입니다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center bg-destructive/10">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
        <p className="font-medium text-destructive">시각화 데이터를 불러올 수 없습니다</p>
        <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
      </Card>
    );
  }

  if (!visualData || visualData.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-muted-foreground">
          <p className="text-lg font-medium mb-2">아직 배정된 참가자가 없습니다</p>
          <p className="text-sm">AI 자동 배정을 실행하거나 수동으로 참가자를 배정해보세요</p>
        </div>
      </Card>
    );
  }

  const getStatusColor = (remaining: number) => {
    if (remaining < 0) return 'bg-red-100 text-red-700 border-red-300';
    if (remaining === 0) return 'bg-orange-100 text-orange-700 border-orange-300';
    return 'bg-green-100 text-green-700 border-green-300';
  };

  const getRoomStatusColor = (status: string, manualAssigned: boolean) => {
    if (status === '동반배정' || status === '동반자자동배정') return 'border-blue-300 bg-blue-50';
    if (status === 'AI가중배정') return 'border-indigo-300 bg-indigo-50';
    if (manualAssigned) return 'border-green-300 bg-green-50';
    if (status === '자동배정') return 'border-purple-200 bg-purple-50';
    return 'border-gray-200 bg-white';
  };

  return (
    <div className="space-y-4">
      {/* 새로고침 버튼 */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">객실 배정 현황</h3>
          <p className="text-sm text-muted-foreground">
            총 {visualData.length}개 객실 타입
          </p>
        </div>
        <Button
          onClick={() => mutate()}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </Button>
      </div>

      {/* 객실타입별 카드 */}
      <div className="space-y-4">
        {visualData.map((roomType: any, idx: number) => (
          <Card key={idx} className="p-5 shadow-sm rounded-2xl">
            {/* 카드 헤더 */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {roomType.room_type_name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  배정: {roomType.assigned_count || 0} / 재고: {roomType.stock || 0}
                  {roomType.room_credit && (
                    <span className="ml-2">• {Number(roomType.room_credit).toLocaleString()}원</span>
                  )}
                </p>
              </div>
              <div className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium border",
                getStatusColor(roomType.remaining_count || 0)
              )}>
                잔여: {roomType.remaining_count || 0}
              </div>
            </div>

            {/* 참가자 그리드 */}
            {roomType.participants && roomType.participants.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {roomType.participants
                  .filter((p: any) => p.participant_id) // null 제거
                  .map((p: any, i: number) => (
                  <TooltipProvider key={i}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "p-3 border rounded-xl flex flex-col gap-1.5 cursor-pointer transition-all hover:shadow-md",
                            getRoomStatusColor(p.room_status, p.manual_assigned)
                          )}
                        >
                          {/* 참가자 이름 & 번호 */}
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm">
                              {p.participant_name}
                            </span>
                            {p.participant_no && (
                              <span className="text-xs text-muted-foreground">
                                #{p.participant_no}
                              </span>
                            )}
                          </div>

                          {/* 역할 */}
                          {p.role && (
                            <Badge variant="outline" className="text-xs w-fit">
                              {p.role}
                            </Badge>
                          )}

                          {/* 동반자 표시 */}
                          {p.companions && Array.isArray(p.companions) && p.companions.length > 0 && (
                            <div className="flex items-center text-blue-600 text-xs mt-1">
                              <Users className="w-3 h-3 mr-1" />
                              동반자 {p.companions.length}명
                            </div>
                          )}

                          {/* 요청사항 */}
                          {p.requests && Array.isArray(p.requests) && p.requests.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {p.requests.slice(0, 3).map((r: any, ri: number) => (
                                <span
                                  key={ri}
                                  className={cn(
                                    "text-xs px-1.5 py-0.5 rounded-md border",
                                    r.priority === 1 && "bg-red-50 text-red-700 border-red-200",
                                    r.priority === 2 && "bg-blue-50 text-blue-700 border-blue-200",
                                    r.priority >= 3 && "bg-gray-50 text-gray-700 border-gray-200"
                                  )}
                                >
                                  {r.request_type}
                                  {r.is_fulfilled && ' ✓'}
                                </span>
                              ))}
                              {p.requests.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{p.requests.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* 배정 상태 */}
                          <div className="mt-1 text-xs text-muted-foreground">
                            {p.room_status === 'AI가중배정' ? 'AI 요청사항 반영 배정' :
                             p.room_status === '동반배정' || p.room_status === '동반자자동배정' ? '동반배정' :
                             p.manual_assigned ? '수동배정' :
                             p.room_status === '자동배정' ? 'AI 자동배정' :
                             p.room_status || '대기'}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p className="font-semibold">{p.participant_name}</p>
                          {p.role && <p className="text-xs">역할: {p.role}</p>}
                          {p.room_status === 'AI가중배정' && (
                            <p className="text-xs text-indigo-600">
                              요청사항 기반 자동 배정
                            </p>
                          )}
                          {p.companions && Array.isArray(p.companions) && p.companions.length > 0 && (
                            <p className="text-xs text-blue-600">
                              동반자 {p.companions.length}명과 같은 객실
                            </p>
                          )}
                          {p.assigned_at && (
                            <p className="text-xs text-muted-foreground">
                              배정일시: {new Date(p.assigned_at).toLocaleString('ko-KR')}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">이 객실 타입에 배정된 참가자가 없습니다</p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
