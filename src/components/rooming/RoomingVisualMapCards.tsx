// [Phase 80-PURGE-FULL] Query rooming_participants directly without view
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import useSWR from "swr";
import { Building2, CheckCircle2, Clock, XCircle, Hash } from "lucide-react";

interface RoomingVisualMapCardsProps {
  eventId: string;
}

interface RoomingStats {
  event_id: string;
  room_type: string;
  room_type_id: string | null;
  total_rooms: number;
  assigned_rooms: number;
  pending_rooms: number;
  canceled_rooms: number;
  confirmed_rooms: number;
  manual_assigned_rooms: number;
}

export default function RoomingVisualMapCards({ eventId }: RoomingVisualMapCardsProps) {
  const { data: roomingStats, error, isLoading, mutate } = useSWR<RoomingStats[]>(
    eventId ? `rooming_visual_map_${eventId}` : null,
    async () => {
      // Query rooming_participants with room type information
      const { data, error } = await supabase
        .from('rooming_participants')
        .select(`
          status,
          room_type_id,
          manual_assigned,
          room_types:room_type_id(type_name)
        `)
        .eq('event_id', eventId)
        .eq('is_active', true);
      
      if (error) throw error;

      // Group by room_type and aggregate counts
      const statsMap = new Map<string, RoomingStats>();
      
      data?.forEach((row: any) => {
        const roomType = row.room_types?.type_name || '미지정';
        
        if (!statsMap.has(roomType)) {
          statsMap.set(roomType, {
            event_id: eventId,
            room_type: roomType,
            room_type_id: row.room_type_id,
            total_rooms: 0,
            assigned_rooms: 0,
            pending_rooms: 0,
            canceled_rooms: 0,
            confirmed_rooms: 0,
            manual_assigned_rooms: 0,
          });
        }
        
        const stats = statsMap.get(roomType)!;
        stats.total_rooms++;
        
        if (row.status === '배정완료') {
          stats.assigned_rooms++;
          if (row.manual_assigned) {
            stats.manual_assigned_rooms++;
          }
        } else if (row.status === '대기') {
          stats.pending_rooms++;
        } else if (row.status === '취소') {
          stats.canceled_rooms++;
        }
      });
      
      // Convert map to array and sort by room_type
      return Array.from(statsMap.values()).sort((a, b) => 
        a.room_type.localeCompare(b.room_type, 'ko-KR')
      );
    },
    { revalidateOnFocus: false }
  );

  // Realtime subscription
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`rooming_visual_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooming_participants',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          console.log('[RoomingVisualMapCards] Data changed, refreshing...');
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
        <p className="text-sm text-destructive">데이터 불러오기 실패: {error.message}</p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    );
  }

  if (!roomingStats || roomingStats.length === 0) {
    return (
      <Card className="p-6 text-center bg-muted/30">
        <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">객실 배정 정보가 없습니다.</p>
      </Card>
    );
  }

  // Calculate totals
  const totals = roomingStats.reduce(
    (acc, curr) => ({
      total_rooms: acc.total_rooms + curr.total_rooms,
      assigned_rooms: acc.assigned_rooms + curr.assigned_rooms,
      pending_rooms: acc.pending_rooms + curr.pending_rooms,
      canceled_rooms: acc.canceled_rooms + curr.canceled_rooms,
    }),
    { total_rooms: 0, assigned_rooms: 0, pending_rooms: 0, canceled_rooms: 0 }
  );

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">객실 현황</h3>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">객실타입</TableHead>
              <TableHead className="text-center font-semibold">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>배정완료</span>
                </div>
              </TableHead>
              <TableHead className="text-center font-semibold">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>대기중</span>
                </div>
              </TableHead>
              <TableHead className="text-center font-semibold">
                <div className="flex items-center justify-center gap-1">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span>취소</span>
                </div>
              </TableHead>
              <TableHead className="text-center font-semibold">
                <div className="flex items-center justify-center gap-1">
                  <Hash className="w-4 h-4" />
                  <span>총 객실</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roomingStats.map((stat, idx) => (
              <TableRow key={idx} className="hover:bg-muted/30">
                <TableCell className="font-medium">{stat.room_type}</TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-primary/10 text-primary font-semibold">
                    {stat.assigned_rooms}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 font-semibold">
                    {stat.pending_rooms}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-destructive/10 text-destructive font-semibold">
                    {stat.canceled_rooms}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-muted text-foreground font-semibold">
                    {stat.total_rooms}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {/* Totals Row */}
            <TableRow className="bg-muted/50 font-bold border-t-2">
              <TableCell className="font-bold">전체 합계</TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-primary/20 text-primary font-bold">
                  {totals.assigned_rooms}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-amber-500/20 text-amber-700 font-bold">
                  {totals.pending_rooms}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-destructive/20 text-destructive font-bold">
                  {totals.canceled_rooms}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-muted/50 text-foreground font-bold">
                  {totals.total_rooms}
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
