// [LOCKED][71-G.FIX.ROUTING.R1] Master agencyScope fallback on event detail access
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Building2, Save, Plus, Trash2 } from "lucide-react";
import { useUser } from "@/context/UserContext";

type RoomRow = {
  id: string;
  room_type_id?: string;
  local_type_id?: string;
  room_name: string;
  credit: number;
  stock: number;
  isSelected: boolean;
  isStandard: boolean;
};

export default function EventOverview() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { role, agencyScope, setAgencyScope } = useUser();
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventAgencyId, setEventAgencyId] = useState<string | null>(null);
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [hotelName, setHotelName] = useState<string>("");
  
  // [71-HOTEL.CUSTOM.R2] New room addition state
  const [newRoomName, setNewRoomName] = useState("");
  const [addingRoom, setAddingRoom] = useState(false);

  // [71-HOTEL.REALTIME.R3] Load hotel base rooms + event selected rooms
  const load = async () => {
    if (!eventId) return;
    setLoading(true);
    
    try {
      // Get event details
      const { data: eventData } = await supabase
        .from("events")
        .select("agency_id, location")
        .eq("id", eventId)
        .single();
      
      if (eventData?.agency_id) {
        setEventAgencyId(eventData.agency_id);
      }

      // Get hotel_id from existing event_room_refs
      const { data: refData } = await supabase
        .from("event_room_refs")
        .select("hotel_id")
        .eq("event_id", eventId)
        .limit(1)
        .single();

      const currentHotelId = refData?.hotel_id;
      
      if (!currentHotelId) {
        setHotelName(eventData?.location || "호텔 미지정");
        setLoading(false);
        return;
      }

      setHotelId(currentHotelId);

      // Get hotel name
      const { data: hotelData } = await supabase
        .from("hotels")
        .select("name")
        .eq("id", currentHotelId)
        .single();

      setHotelName(hotelData?.name || "알 수 없음");

      // Get all base room types for this hotel
      const { data: standardRooms } = await supabase
        .from("room_types")
        .select("id, type_name, default_credit")
        .eq("hotel_id", currentHotelId)
        .eq("is_active", true);

      const { data: localRooms } = await supabase
        .from("agency_room_overrides")
        .select("id, room_type_name")
        .eq("event_id", eventId)
        .eq("agency_id", eventData?.agency_id)
        .eq("is_active", true);

      // Get selected rooms for this event
      const { data: eventRooms } = await supabase
        .from("event_room_refs")
        .select("*")
        .eq("event_id", eventId);

      // Merge base rooms with selected rooms
      const merged: RoomRow[] = [];

      // Add standard rooms
      standardRooms?.forEach((room) => {
        const selected = eventRooms?.find(r => r.room_type_id === room.id);
        merged.push({
          id: selected?.id || `unselected-${room.id}`,
          room_type_id: room.id,
          room_name: room.type_name,
          credit: selected?.credit || room.default_credit || 0,
          stock: selected?.stock || 0,
          isSelected: !!selected,
          isStandard: true,
        });
      });

      // Add local/custom rooms
      localRooms?.forEach((room) => {
        const selected = eventRooms?.find(r => r.local_type_id === room.id);
        merged.push({
          id: selected?.id || `unselected-local-${room.id}`,
          local_type_id: room.id,
          room_name: room.room_type_name,
          credit: selected?.credit || 0,
          stock: selected?.stock || 0,
          isSelected: !!selected,
          isStandard: false,
        });
      });

      setRooms(merged);
    } catch (error: any) {
      toast.error("데이터 로드 실패");
    }
    
    setLoading(false);
  };

  // [LOCKED][71-G.FIX.ROUTING.R1] Master fallback → setAgencyScope when accessing event directly
  useEffect(() => {
    if (role === "master" && !agencyScope && eventAgencyId) {
      console.log("[71-G.FIX.ROUTING.R1] Master fallback → setAgencyScope", eventAgencyId);
      setAgencyScope(eventAgencyId);
    }
  }, [role, agencyScope, eventAgencyId, setAgencyScope]);

  // [71-HOTEL.REALTIME.R3] Initial load + Realtime subscription
  useEffect(() => {
    load();
    
    const channel = supabase
      .channel(`event_rooms_${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_room_refs",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          console.log("[71-HOTEL.REALTIME.R3] Room data changed, reloading...");
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // [71-HOTEL.REALTIME.R3] Toggle room selection
  const toggleRoomSelection = async (room: RoomRow) => {
    if (!eventId || !hotelId || !eventAgencyId) return;

    if (room.isSelected) {
      // Remove from event
      const { error } = await supabase
        .from("event_room_refs")
        .delete()
        .eq("id", room.id);

      if (error) {
        toast.error("삭제 실패");
      } else {
        toast.info(`${room.room_name} 객실이 제외되었습니다`);
      }
    } else {
      // Add to event
      const insertData: any = {
        event_id: eventId,
        hotel_id: hotelId,
        agency_id: eventAgencyId,
        credit: room.credit,
        stock: room.stock,
      };

      if (room.isStandard) {
        insertData.room_type_id = room.room_type_id;
      } else {
        insertData.local_type_id = room.local_type_id;
      }

      const { error } = await supabase
        .from("event_room_refs")
        .insert([insertData]);

      if (error) {
        toast.error("추가 실패");
      } else {
        toast.success(`${room.room_name} 객실이 추가되었습니다`);
      }
    }
  };

  // [71-HOTEL.REALTIME.R3] Auto-save on change
  const handleChange = async (room: RoomRow, field: "credit" | "stock", value: string) => {
    if (!room.isSelected) return;

    const numValue = Math.max(0, Number(value) || 0);

    const { error } = await supabase
      .from("event_room_refs")
      .update({ [field]: numValue })
      .eq("id", room.id);

    if (!error) {
      toast.success("변경사항이 저장되었습니다");
    }
  };

  // [71-HOTEL.CUSTOM.R2] Add new custom room type
  const addCustomRoom = async () => {
    if (!newRoomName.trim()) {
      toast.error("객실명을 입력해주세요");
      return;
    }

    if (!eventId || !hotelId || !eventAgencyId) {
      toast.error("호텔 정보를 불러올 수 없습니다");
      return;
    }

    setAddingRoom(true);
    try {
      // Create custom room type first
      const { data: customRoom, error: customError } = await supabase
        .from("agency_room_overrides")
        .insert({
          agency_id: eventAgencyId,
          event_id: eventId,
          room_type_name: newRoomName,
        })
        .select()
        .single();

      if (customError) throw customError;

      // Auto-add to event
      const { error: refError } = await supabase
        .from("event_room_refs")
        .insert([{
          event_id: eventId,
          hotel_id: hotelId,
          local_type_id: customRoom.id,
          agency_id: eventAgencyId,
          credit: 0,
          stock: 0,
        }] as any);

      if (refError) throw refError;

      toast.success(`${newRoomName} 객실이 추가되었습니다`);
      setNewRoomName("");
    } catch (error: any) {
      toast.error(error.message || "객실 추가 실패");
    } finally {
      setAddingRoom(false);
    }
  };

  // [71-HOTEL.REALTIME.R3] Delete custom room permanently
  const deleteCustomRoom = async (room: RoomRow) => {
    if (room.isStandard) {
      toast.error("호텔 기본 객실은 삭제할 수 없습니다");
      return;
    }

    if (!confirm(`${room.room_name} 객실을 완전히 삭제하시겠습니까?`)) return;

    // Delete from event_room_refs first
    if (room.isSelected) {
      await supabase
        .from("event_room_refs")
        .delete()
        .eq("id", room.id);
    }

    // Delete from agency_room_overrides
    const { error } = await supabase
      .from("agency_room_overrides")
      .delete()
      .eq("id", room.local_type_id);

    if (error) {
      toast.error("삭제 실패");
    } else {
      toast.info(`${room.room_name} 객실이 삭제되었습니다`);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-muted-foreground">불러오는 중…</div>
    );
  }

  return (
    <div className="layout-full space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/events")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">행사 개요</h1>
            <p className="text-muted-foreground mt-1">
              호텔 및 객실 구성을 확인하고 수정하세요
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>지정 호텔: {hotelName}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* [71-HOTEL.REALTIME.R3] Room selection + auto-save */}
            {rooms.length > 0 ? (
              <div className="border rounded-xl overflow-hidden">
                <div className="grid grid-cols-5 text-sm font-semibold bg-muted">
                  <div className="p-3">객실타입</div>
                  <div className="p-3">룸크레딧</div>
                  <div className="p-3">객실수량</div>
                  <div className="p-3 text-center">상태</div>
                  <div className="p-3 text-right">작업</div>
                </div>

                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className={`grid grid-cols-5 text-sm border-b last:border-b-0 transition-colors ${
                      room.isSelected ? "bg-blue-50/30" : "bg-gray-50/30"
                    }`}
                  >
                    <div className="p-3 font-medium flex items-center gap-2">
                      {room.room_name}
                      {!room.isStandard && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          커스텀
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <Input
                        type="number"
                        className="w-32 h-9"
                        value={room.credit}
                        onChange={(e) => handleChange(room, "credit", e.target.value)}
                        disabled={!room.isSelected}
                        placeholder="지원 크레딧"
                        min="0"
                      />
                    </div>
                    <div className="p-3">
                      <Input
                        type="number"
                        className="w-24 h-9"
                        value={room.stock}
                        onChange={(e) => handleChange(room, "stock", e.target.value)}
                        disabled={!room.isSelected}
                        placeholder="객실 수량"
                        min="0"
                      />
                    </div>
                    <div className="p-3 text-center">
                      {room.isSelected ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          선택됨
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
                          미선택
                        </span>
                      )}
                    </div>
                    <div className="p-3 text-right flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant={room.isSelected ? "destructive" : "default"}
                        onClick={() => toggleRoomSelection(room)}
                      >
                        {room.isSelected ? "제외" : "선택"}
                      </Button>
                      {!room.isStandard && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteCustomRoom(room)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                호텔이 지정되지 않았습니다. 행사 수정에서 호텔을 지정해주세요.
              </div>
            )}

            {/* [71-HOTEL.CUSTOM.R2-FIX.1] Add new room section - simplified */}
            {hotelId && (
              <div className="border-t pt-4 mt-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label className="text-sm mb-2 block">커스텀 객실 타입 추가</Label>
                    <Input
                      placeholder="객실명 (예: 프리미엄 스위트)"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !addingRoom && newRoomName.trim()) {
                          addCustomRoom();
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={addCustomRoom}
                    disabled={addingRoom || !newRoomName.trim()}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {addingRoom ? "추가 중..." : "객실 추가"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  * 커스텀 객실은 자동으로 선택되며, 삭제 시 완전히 제거됩니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
