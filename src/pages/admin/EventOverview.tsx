// [LOCKED][71-G.FIX.ROUTING.R1] Master agencyScope fallback on event detail access
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Building2, Save } from "lucide-react";
import { useUser } from "@/context/UserContext";

type RoomSummaryRow = {
  event_id: string;
  hotel_id: string;
  hotel_name: string;
  type_id: string;
  room_type: string;
  credit: number;
  stock: number;
  room_type_id: string | null;
  local_type_id: string | null;
};

export default function EventOverview() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { role, agencyScope, setAgencyScope } = useUser();
  const [rows, setRows] = useState<RoomSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, { credit: number; stock: number }>>({});
  const [eventAgencyId, setEventAgencyId] = useState<string | null>(null);
  
  // [71-HOTEL.CUSTOM.R2] New room addition state
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomCapacity, setNewRoomCapacity] = useState(2);
  const [addingRoom, setAddingRoom] = useState(false);

  const load = async () => {
    if (!eventId) return;
    setLoading(true);
    
    // [LOCKED][71-G.FIX.ROUTING.R1] Fetch event agency_id for master fallback
    const { data: eventData } = await supabase
      .from("events")
      .select("agency_id")
      .eq("id", eventId)
      .single();
    
    if (eventData?.agency_id) {
      setEventAgencyId(eventData.agency_id);
    }
    
    const { data, error } = await supabase
      .from("v_event_room_summary" as any)
      .select("*")
      .eq("event_id", eventId);
    
    if (!error && data) {
      setRows(data as unknown as RoomSummaryRow[]);
    } else if (error) {
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

  useEffect(() => {
    load();
    
    const channel = supabase
      .channel(`event_overview_${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_room_refs",
          filter: `event_id=eq.${eventId}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const patch = (typeId: string, field: "credit" | "stock", val: number) => {
    setEditing((prev) => ({
      ...prev,
      [typeId]: {
        ...prev[typeId],
        credit: field === "credit" ? val : prev[typeId]?.credit || 0,
        stock: field === "stock" ? val : prev[typeId]?.stock || 0,
      },
    }));
  };

  const save = async (r: RoomSummaryRow) => {
    const target = editing[r.type_id];
    if (!target) return;

    const updateData = {
      credit: Math.max(0, Number(target.credit) || 0),
      stock: Math.max(0, Number(target.stock) || 0),
    };

    const { error } = await supabase
      .from("event_room_refs")
      .update(updateData)
      .eq("event_id", r.event_id)
      .eq("hotel_id", r.hotel_id)
      .or(`room_type_id.eq.${r.room_type_id},local_type_id.eq.${r.local_type_id}`);

    if (error) {
      toast.error("저장 실패");
    } else {
      toast.success("저장되었습니다");
      setEditing((prev) => {
        const newState = { ...prev };
        delete newState[r.type_id];
        return newState;
      });
      load();
    }
  };

  // [71-HOTEL.CUSTOM.R2] Add new custom room type
  const addCustomRoom = async () => {
    if (!newRoomName.trim()) {
      toast.error("객실명을 입력해주세요");
      return;
    }

    if (!eventId || !rows[0]?.hotel_id || !eventAgencyId) {
      toast.error("호텔 정보를 불러올 수 없습니다");
      return;
    }

    setAddingRoom(true);
    try {
      // Create local room type first
      const { data: localRoom, error: localError } = await supabase
        .from("room_types_local")
        .insert({
          agency_id: eventAgencyId,
          hotel_id: rows[0].hotel_id,
          type_name: newRoomName,
          capacity: newRoomCapacity,
        })
        .select()
        .single();

      if (localError) throw localError;

      // Create event room reference
      const { error: refError } = await supabase
        .from("event_room_refs")
        .insert([{
          event_id: eventId,
          hotel_id: rows[0].hotel_id,
          local_type_id: localRoom.id,
          agency_id: eventAgencyId,
          credit: 0,
          stock: 0,
        }] as any);

      if (refError) throw refError;

      toast.success(`${newRoomName} 객실이 추가되었습니다`);
      setNewRoomName("");
      setNewRoomCapacity(2);
      load();
    } catch (error: any) {
      toast.error(error.message || "객실 추가 실패");
    } finally {
      setAddingRoom(false);
    }
  };

  // [71-HOTEL.CUSTOM.R2] Delete room type
  const deleteRoom = async (r: RoomSummaryRow) => {
    if (!confirm(`${r.room_type} 객실을 삭제하시겠습니까?`)) return;

    const { error } = await supabase
      .from("event_room_refs")
      .delete()
      .eq("event_id", r.event_id)
      .eq("hotel_id", r.hotel_id)
      .or(`room_type_id.eq.${r.room_type_id},local_type_id.eq.${r.local_type_id}`);

    if (error) {
      toast.error("삭제 실패");
    } else {
      toast.info(`${r.room_type} 객실이 삭제되었습니다`);
      load();
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-muted-foreground">불러오는 중…</div>
    );
  }

  const hotelName = rows[0]?.hotel_name ?? "호텔 미지정";

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
              <CardTitle>지정 호텔</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-lg font-semibold">{hotelName}</div>

            {rows.length > 0 ? (
              <div className="border rounded-xl overflow-hidden">
                <div className="grid grid-cols-5 text-sm font-semibold bg-muted">
                  <div className="p-3">객실타입</div>
                  <div className="p-3">룸크레딧 (지원금)</div>
                  <div className="p-3">객실수량</div>
                  <div className="p-3 text-right col-span-2">작업</div>
                </div>

                {rows.map((r) => {
                  const edit = editing[r.type_id] ?? {
                    credit: r.credit ?? 0,
                    stock: r.stock ?? 0,
                  };
                  const hasChanges = editing[r.type_id] !== undefined;

                  return (
                    <div
                      key={r.type_id}
                      className="grid grid-cols-5 text-sm border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <div className="p-3 font-medium">{r.room_type}</div>
                      <div className="p-3">
                        <Input
                          type="number"
                          className="w-32 h-9"
                          value={edit.credit}
                          onChange={(e) =>
                            patch(r.type_id, "credit", Number(e.target.value))
                          }
                          placeholder="지원 크레딧"
                          min="0"
                        />
                      </div>
                      <div className="p-3">
                        <Input
                          type="number"
                          className="w-24 h-9"
                          value={edit.stock}
                          onChange={(e) =>
                            patch(r.type_id, "stock", Number(e.target.value))
                          }
                          placeholder="객실 수량"
                          min="0"
                        />
                      </div>
                      <div className="p-3 text-right">
                        <Button
                          size="sm"
                          variant={hasChanges ? "default" : "outline"}
                          onClick={() => save(r)}
                          disabled={!hasChanges}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          저장
                        </Button>
                      </div>
                      <div className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteRoom(r)}
                          className="text-destructive hover:text-destructive"
                        >
                          삭제
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                객실 타입이 설정되지 않았습니다.
              </div>
            )}

            {/* [71-HOTEL.CUSTOM.R2] Add new room section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Label className="text-sm mb-2 block">새 객실 타입 추가</Label>
                  <Input
                    placeholder="객실명 (예: 프리미엄 스위트)"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addCustomRoom();
                    }}
                  />
                </div>
                <div className="w-32">
                  <Label className="text-sm mb-2 block">인원</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={newRoomCapacity}
                    onChange={(e) => setNewRoomCapacity(Number(e.target.value))}
                  />
                </div>
                <Button
                  onClick={addCustomRoom}
                  disabled={addingRoom || !newRoomName.trim()}
                >
                  {addingRoom ? "추가 중..." : "객실 추가"}
                </Button>
              </div>
            </div>

            <div className="h-4" />
          </CardContent>
        </Card>
      </div>
  );
}
