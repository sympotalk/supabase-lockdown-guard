// [72-RULE.R2] Rooming Management with Rules and Manual Assignment
import { supabase } from "@/integrations/supabase/client";
import useSWR from "swr";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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

  // [Phase 76-Pre.A] Fetch ALL participants with left-join to rooming_participants
  const { data: roomingList, error, isLoading, mutate } = useSWR(
    eventId ? `rooming_${eventId}` : null,
    async () => {
      if (!eventId) return [];
      
      console.log('[Phase 76-Pre.A] Fetching all participants with rooming data for event:', eventId);
      
      // Fetch all participants first
      const { data: allParticipants, error: participantsError } = await supabase
        .from("participants")
        .select("id, name, organization, phone, fixed_role, custom_role, participant_no")
        .eq("event_id", eventId)
        .eq("is_active", true)
        .order("participant_no", { ascending: true });
      
      if (participantsError) {
        console.error('[Phase 76-Pre.A] Participants query error:', participantsError);
        throw participantsError;
      }
      
      // Fetch rooming data
      const { data: roomingData, error: roomingError } = await supabase
        .from("rooming_participants")
        .select("*")
        .eq("event_id", eventId)
        .eq("is_active", true);
      
      if (roomingError) {
        console.error('[Phase 76-Pre.A] Rooming query error:', roomingError);
        // Don't throw, just use empty array
      }
      
      // Create a map of participant_id -> rooming data
      const roomingMap = new Map(
        (roomingData || []).map(r => [r.participant_id, r])
      );
      
      // Merge participants with rooming data
      const merged = (allParticipants || []).map((p: any) => {
        const rooming = roomingMap.get(p.id);
        return {
          // Participant data
          participant_id: p.id,
          participant_no: p.participant_no,
          name: p.name,
          organization: p.organization,
          phone: p.phone,
          fixed_role: p.fixed_role,
          custom_role: p.custom_role,
          // Rooming data (may be null) - [Phase 76-Pre.B] Safe fallbacks
          id: rooming?.id || null,
          room_type: rooming?.room_type || '미지정',
          room_credit: rooming?.room_credit || null,
          check_in: rooming?.check_in || null,
          check_out: rooming?.check_out || null,
          stay_days: rooming?.stay_days || null,
          status: rooming?.status || '배정대기',
          manual_assigned: rooming?.manual_assigned || false,
          assigned_at: rooming?.assigned_at || null,
          adults: rooming?.adults || 0,
          children: rooming?.children || 0,
          infants: rooming?.infants || 0,
        };
      });
      
      console.log('[Phase 76-Pre.A] Merged', merged.length, 'participants with rooming data');
      
      // Seed rooming if needed
      if (!roomingData || roomingData.length === 0) {
        console.log('[Phase 76-Pre.A] No rooming data, triggering seed RPC');
        const { error: seedError } = await supabase.rpc(
          'seed_rooming_from_participants',
          { p_event: eventId }
        );
        
        if (seedError) {
          console.error('[Phase 76-Pre.A] Seed RPC error:', seedError);
        }
      }
      
      return merged;
    },
    { 
      revalidateOnFocus: false, 
      dedupingInterval: 60000,
      onError: (err) => {
        console.error('[72-RULE.UI.BIND] SWR error:', err);
      }
    }
  );

  // [72-RULE.R2] Realtime subscription
  // [Phase 72–RM.BADGE.SYNC.RENUM] Also listen to participants table for role/number changes
  useEffect(() => {
    if (!eventId) return;

    console.log('[72-RULE.UI.BIND] Setting up realtime channel for event:', eventId);

    const roomingChannel = supabase
      .channel(`rooming_${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooming_participants", filter: `event_id=eq.${eventId}` },
        (payload) => {
          console.log("[72-RULE.UI.BIND] Rooming update detected:", payload);
          mutate();
        }
      )
      .subscribe((status) => {
        console.log('[72-RULE.UI.BIND] Realtime status:', status);
      });

    // Also subscribe to participants table for role changes that affect rooming
    const participantsChannel = supabase
      .channel(`participants_rooming_${eventId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "participants", filter: `event_id=eq.${eventId}` },
        (payload) => {
          console.log("[Phase 72] Participant role/number updated, refreshing rooming:", payload);
          mutate();
        }
      )
      .subscribe();

    return () => {
      console.log('[72-RULE.UI.BIND] Cleaning up realtime channels');
      supabase.removeChannel(roomingChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [eventId, mutate]);

  // Data flow validation
  console.log("[72-RULE.UI.BIND] State - Loading:", isLoading, "Error:", error?.message, "Count:", roomingList?.length);

  if (isLoading) {
    return (
      <div className="p-6 text-muted-foreground">
        <p>참가자 룸핑 정보를 불러오는 중입니다...</p>
        <p className="text-xs mt-2">Event ID: {eventId}</p>
      </div>
    );
  }

  if (error) {
    console.error("[72-RULE.R2.FIX] Render error:", error);
    return (
      <div className="p-8 text-destructive bg-destructive/10 rounded-xl shadow-sm">
        <p className="font-medium">룸핑 데이터를 불러올 수 없습니다.</p>
        <p className="text-sm mt-1">{error.message}</p>
        <p className="text-xs mt-2 text-muted-foreground">
          페이지를 새로고침하거나, RLS 정책을 확인해주세요.
        </p>
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
              <div className="p-12 text-center border rounded-lg bg-muted/20">
                <p className="text-lg font-medium text-muted-foreground">
                  아직 배정된 참가자가 없습니다
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  참가자를 추가하거나, "룰셋 관리" 탭에서 자동 배정 규칙을 설정하세요
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Event ID: {eventId}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-left">No.</TableHead>
                      <TableHead className="text-left">구분</TableHead>
                      <TableHead className="text-left">참가자명</TableHead>
                      <TableHead className="text-left">직책/직위</TableHead>
                      <TableHead className="text-center">룸크레딧</TableHead>
                      <TableHead className="text-center">구성</TableHead>
                      <TableHead className="text-right">상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roomingList.map((r: any, index: number) => (
                      <TableRow
                        key={r.participant_id || index}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedParticipant(r)}
                      >
                        <TableCell className="text-left text-muted-foreground text-sm font-medium">
                          {r.participant_no || index + 1}
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center gap-1">
                            {r.fixed_role && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs px-2.5 py-0.5 rounded-full",
                                  r.fixed_role === "좌장" && "bg-gray-100 text-gray-800 border-gray-300",
                                  r.fixed_role === "연자" && "bg-purple-100 text-purple-800 border-purple-300",
                                  r.fixed_role === "참석자" && "bg-blue-100 text-blue-800 border-blue-300"
                                )}
                              >
                                {r.fixed_role}
                              </Badge>
                            )}
                            {r.custom_role && (
                              <Badge
                                variant="outline"
                                className="text-xs px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1] border-transparent"
                              >
                                {r.custom_role}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-left">
                          <span className="font-medium">{r.name || "-"}</span>
                        </TableCell>
                        <TableCell className="text-left text-sm text-muted-foreground">
                          {r.organization || "-"}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {r.room_credit ? `${r.room_credit?.toLocaleString?.() || '미지정'}원` : "-"}
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {r.adults || r.children || r.infants 
                            ? `성인 ${r.adults || 0} / 소아 ${r.children || 0} / 유아 ${r.infants || 0}`
                            : "-"
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          {getStatusBadge(r.manual_assigned, r.room_type || r.status)}
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
                participantName={selectedParticipant.name || "참가자"}
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
