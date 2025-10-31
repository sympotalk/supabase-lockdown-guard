import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import useSWR from "swr";
import { CheckCircle2, Clock, XCircle, Home } from "lucide-react";

interface RoomingSummaryCardsProps {
  eventId: string;
}

interface SummaryData {
  assigned_total: number;
  pending_total: number;
  canceled_total: number;
  total_rooms: number;
}

export default function RoomingSummaryCards({ eventId }: RoomingSummaryCardsProps) {
  const { data: summary, error, isLoading, mutate } = useSWR<SummaryData>(
    eventId ? `rooming_summary_${eventId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('v_rooming_visual_map')
        .select('*')
        .eq('event_id', eventId);
      
      if (error) throw error;

      // Aggregate totals
      const assigned_total = data?.reduce((sum, row) => sum + (row.assigned_rooms || 0), 0) || 0;
      const pending_total = data?.reduce((sum, row) => sum + (row.pending_rooms || 0), 0) || 0;
      const canceled_total = data?.reduce((sum, row) => sum + (row.canceled_rooms || 0), 0) || 0;
      const total_rooms = data?.reduce((sum, row) => sum + (row.total_rooms || 0), 0) || 0;

      return {
        assigned_total,
        pending_total,
        canceled_total,
        total_rooms,
      };
    },
    { revalidateOnFocus: false }
  );

  // Realtime subscription
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`rooming_summary_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooming_participants',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          console.log('[RoomingSummaryCards] Data changed, refreshing...');
          mutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, mutate]);

  if (error) {
    return (
      <Card className="p-4 bg-destructive/10 border-destructive/30">
        <p className="text-sm text-destructive">요약 데이터 불러오기 실패</p>
      </Card>
    );
  }

  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="flex flex-col items-center justify-center py-4 shadow-sm rounded-2xl">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-8 w-12 mb-1" />
            <Skeleton className="h-3 w-20" />
          </Card>
        ))}
      </div>
    );
  }

  const available_total = summary.total_rooms - summary.assigned_total;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
      {/* 배정 완료 */}
      <Card className="flex flex-col items-center justify-center py-4 shadow-sm rounded-2xl bg-primary/5 border-primary/20">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <div className="text-xs text-muted-foreground">배정 완료</div>
        </div>
        <div className="text-2xl font-bold text-primary">{summary.assigned_total}</div>
        <div className="text-xs text-muted-foreground mt-0.5">총 {summary.total_rooms} 중</div>
      </Card>

      {/* 대기 중 */}
      <Card className="flex flex-col items-center justify-center py-4 shadow-sm rounded-2xl bg-amber-500/5 border-amber-500/20">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-amber-600" />
          <div className="text-xs text-muted-foreground">대기 중</div>
        </div>
        <div className="text-2xl font-bold text-amber-600">{summary.pending_total}</div>
        <div className="text-xs text-muted-foreground mt-0.5">배정 전 객실</div>
      </Card>

      {/* 취소 */}
      <Card className="flex flex-col items-center justify-center py-4 shadow-sm rounded-2xl bg-destructive/5 border-destructive/20">
        <div className="flex items-center gap-2 mb-1">
          <XCircle className="w-4 h-4 text-destructive" />
          <div className="text-xs text-muted-foreground">취소</div>
        </div>
        <div className="text-2xl font-bold text-destructive">{summary.canceled_total}</div>
        <div className="text-xs text-muted-foreground mt-0.5">취소된 배정</div>
      </Card>

      {/* 잔여 객실 */}
      <Card className="flex flex-col items-center justify-center py-4 shadow-sm rounded-2xl bg-muted/30 border-muted">
        <div className="flex items-center gap-2 mb-1">
          <Home className="w-4 h-4 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">잔여 객실</div>
        </div>
        <div className="text-2xl font-bold text-foreground">{available_total}</div>
        <div className="text-xs text-muted-foreground mt-0.5">미배정 객실</div>
      </Card>
    </div>
  );
}
