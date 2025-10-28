// [72-RULE.R2] Rooming Management with Rules and Manual Assignment
import { supabase } from "@/integrations/supabase/client";
import useSWR from "swr";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import RulesPanel from "@/components/rooming/RulesPanel";
import ManualAssignPanel from "@/components/rooming/ManualAssignPanel";

export default function RoomingTab() {
  const { eventId } = useParams();
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [roomTypes, setRoomTypes] = useState<Array<{ name: string; credit: number }>>([]);

  // Load room types from event_rooms
  useEffect(() => {
    const loadRoomTypes = async () => {
      if (!eventId) return;
      
      const { data, error } = await supabase
        .from("event_room_refs" as any)
        .select("room_type_id, room_credit")
        .eq("event_id", eventId)
        .eq("is_active", true);

      if (!error && data) {
        // Get unique room types with their credits
        const uniqueRooms = data.reduce((acc: any[], curr: any) => {
          const existing = acc.find(r => r.id === curr.room_type_id);
          if (!existing && curr.room_type_id) {
            acc.push({ id: curr.room_type_id, credit: curr.room_credit || 0 });
          }
          return acc;
        }, []);

        // For now, use placeholder names - in production, join with room_types table
        setRoomTypes(uniqueRooms.map((r: any, idx: number) => ({ 
          name: `Room Type ${idx + 1}`, 
          credit: r.credit 
        })));
      }
    };

    loadRoomTypes();
  }, [eventId]);

  const { data: roomingList, error, isLoading, mutate } = useSWR(
    eventId ? `rooming_${eventId}` : null,
    async () => {
      const { data, error } = await supabase
        .from("rooming_participants")
        .select(`
          id,
          room_type,
          room_credit,
          check_in,
          check_out,
          stay_days,
          manual_assigned,
          assigned_at,
          participant_id,
          participants:participant_id (name, composition)
        `)
        .eq("event_id", eventId)
        .eq("is_active", true)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  // [72-RULE.R2] Realtime subscription
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel("rooming_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooming_participants", filter: `event_id=eq.${eventId}` },
        () => {
          console.log("[72-RULE.R2] Rooming update detected");
          mutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, mutate]);

  // [72-RULE.R2] Data flow validation
  console.log("[72-RULE.R2.Rooming] Loading:", isLoading, "Error:", error?.message, "Count:", roomingList?.length);

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">참가자 정보를 불러오는 중입니다...</div>;
  }

  if (error) {
    console.error("[71-H6.QA.Rooming] Error:", error);
    return (
      <div className="p-8 text-muted-foreground bg-muted/10 rounded-xl shadow-sm">
        <p className="font-medium">숙박 데이터를 불러올 수 없습니다.</p>
        <p className="text-xs mt-2">참가자 정보를 확인해주세요.</p>
      </div>
    );
  }

  const getStatusBadge = (manualAssigned: boolean, roomType: string) => {
    if (roomType === "배정대기") {
      return <Badge variant="secondary">대기중</Badge>;
    }
    if (manualAssigned) {
      return <Badge variant="default" className="bg-purple-500">수동배정</Badge>;
    }
    return <Badge variant="default" className="bg-blue-500">자동배정</Badge>;
  };

  return (
    <Tabs defaultValue="participants" className="space-y-4">
      <TabsList>
        <TabsTrigger value="participants">참가자 배정 현황</TabsTrigger>
        <TabsTrigger value="rules">룰셋 관리</TabsTrigger>
      </TabsList>

      <TabsContent value="participants" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Participants List */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="p-6 text-muted-foreground">참가자 정보를 불러오는 중입니다...</div>
            ) : error ? (
              <div className="p-8 text-muted-foreground bg-muted/10 rounded-xl shadow-sm">
                <p className="font-medium">숙박 데이터를 불러올 수 없습니다.</p>
                <p className="text-xs mt-2">참가자 정보를 확인해주세요.</p>
              </div>
            ) : !roomingList || roomingList.length === 0 ? (
              <div className="text-muted-foreground text-center py-16">숙박 데이터가 없습니다.</div>
            ) : (
              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>참가자명</TableHead>
                      <TableHead>객실타입</TableHead>
                      <TableHead>룸크레딧</TableHead>
                      <TableHead>구성</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roomingList.map((r: any) => (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedParticipant(r)}
                      >
                        <TableCell className="font-medium">
                          {r.participants?.name || "-"}
                        </TableCell>
                        <TableCell>{r.room_type || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.room_credit?.toLocaleString()}원
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.participants?.composition && (
                            <>
                              성인 {r.participants.composition.adult || 0} /
                              소아 {r.participants.composition.child || 0}
                            </>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(r.manual_assigned, r.room_type)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Manual Assignment Panel */}
          <div className="lg:col-span-1">
            {selectedParticipant ? (
              <ManualAssignPanel
                eventId={eventId!}
                participantId={selectedParticipant.participant_id}
                participantName={selectedParticipant.participants?.name || "참가자"}
                roomTypes={roomTypes}
                currentAssignment={{
                  room_type: selectedParticipant.room_type,
                  room_credit: selectedParticipant.room_credit,
                  manual_assigned: selectedParticipant.manual_assigned,
                }}
                onUpdate={() => {
                  mutate();
                  setSelectedParticipant(null);
                }}
              />
            ) : (
              <div className="p-6 border rounded-lg bg-muted/20 text-center text-muted-foreground">
                참가자를 선택하면 수동 배정이 가능합니다
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="rules">
        <RulesPanel eventId={eventId!} roomTypes={roomTypes.map(r => r.name)} />
      </TabsContent>
    </Tabs>
  );
}
