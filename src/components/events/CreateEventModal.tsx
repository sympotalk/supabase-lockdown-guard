import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Plus, Trash2 } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateEventModal({ open, onOpenChange }: CreateEventModalProps) {
  const { refresh } = useAppData();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    location: "",
  });
  const [hotelSearch, setHotelSearch] = useState("");
  const [hotels, setHotels] = useState<any[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [customRooms, setCustomRooms] = useState<any[]>([]);
  const [roomConfig, setRoomConfig] = useState<Record<string, { credit: number; stock: number }>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hotelSearch.length > 1) {
      searchHotels(hotelSearch);
    } else {
      setHotels([]);
    }
  }, [hotelSearch]);

  const searchHotels = async (query: string) => {
    const { data, error } = await supabase
      .from("hotels")
      .select("id, name, city, brand")
      .ilike("name", `%${query}%`)
      .eq("is_active", true)
      .limit(10);
    
    if (!error && data) setHotels(data);
  };

  const selectHotel = async (hotel: any) => {
    setSelectedHotel(hotel);
    const { data } = await supabase
      .from("room_types")
      .select("id, type_name, description, default_credit")
      .eq("hotel_id", hotel.id)
      .eq("is_active", true);
    
    setRoomTypes(data || []);
    setHotels([]);
    setHotelSearch(hotel.name);
    toast.success(`${hotel.name} 선택됨`);
  };

  const addCustomRoom = () => {
    setCustomRooms((prev) => [
      ...prev,
      { id: `custom-${Date.now()}`, type_name: "", capacity: 2, isNew: true },
    ]);
  };

  const removeCustomRoom = (id: string) => {
    setCustomRooms((prev) => prev.filter((r) => r.id !== id));
  };

  const updateCustomRoom = (id: string, field: string, value: any) => {
    setCustomRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleConfigChange = (roomId: string, field: "credit" | "stock", value: string) => {
    setRoomConfig((prev) => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [field]: parseInt(value) || 0,
      },
    }));
  };

  const handleCreate = async () => {
    if (!form.name || !form.start_date || !form.end_date) {
      return toast.error("행사명, 시작일, 종료일을 입력해주세요");
    }

    if (!selectedHotel) {
      return toast.error("호텔을 선택해주세요");
    }

    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      
      // Get agency_id from agency_members
      const { data: memberData } = await supabase
        .from("agency_members")
        .select("agency_id")
        .eq("user_id", userId)
        .single();

      const agencyId = memberData?.agency_id;

      if (!agencyId) {
        toast.error("에이전시 정보를 찾을 수 없습니다");
        return;
      }

      // Create event
      const { data: newEvent, error: eventError } = await supabase
        .from("events")
        .insert({
          name: form.name,
          start_date: form.start_date,
          end_date: form.end_date,
          location: form.location,
          agency_id: agencyId,
          created_by: userId,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Save custom rooms to room_types_local
      const customRoomIds: Record<string, string> = {};
      for (const cr of customRooms) {
        if (cr.type_name) {
          const { data: localRoom, error: localError } = await supabase
            .from("room_types_local")
            .insert({
              agency_id: agencyId,
              hotel_id: selectedHotel.id,
              type_name: cr.type_name,
              capacity: cr.capacity,
            })
            .select()
            .single();

          if (!localError && localRoom) {
            customRoomIds[cr.id] = localRoom.id;
          }
        }
      }

      // Create event_room_refs for standard room types
      for (const rt of roomTypes) {
        const config = roomConfig[rt.id] || { credit: 0, stock: 0 };
        await supabase.from("event_room_refs").insert({
          event_id: newEvent.id,
          room_type_id: rt.id,
          room_credit: String(config.credit),
        } as any);
      }

      // Create event_room_refs for custom room types
      for (const cr of customRooms) {
        if (cr.type_name && customRoomIds[cr.id]) {
          const config = roomConfig[cr.id] || { credit: 0, stock: 0 };
          await supabase.from("event_room_refs").insert({
            event_id: newEvent.id,
            room_type_id: customRoomIds[cr.id],
            room_credit: String(config.credit),
          } as any);
        }
      }

      toast.success("행사 및 호텔 구성이 저장되었습니다");
      await refresh();
      onOpenChange(false);
      
      // Navigate to event overview
      navigate(`/admin/events/${newEvent.id}/overview`);
      
      // Reset form
      setForm({ name: "", start_date: "", end_date: "", location: "" });
      setSelectedHotel(null);
      setRoomTypes([]);
      setCustomRooms([]);
      setRoomConfig({});
      setHotelSearch("");
    } catch (error: any) {
      toast.error(error.message || "행사 생성 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>새 행사 생성</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Event Info */}
          <div className="space-y-4">
            <div>
              <Label>행사명</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="행사명을 입력하세요"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>시작일</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>종료일</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>장소</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="행사 장소를 입력하세요"
              />
            </div>
          </div>

          {/* Hotel Selection */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-base font-semibold">호텔 선택</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={hotelSearch}
                onChange={(e) => setHotelSearch(e.target.value)}
                placeholder="호텔명으로 검색..."
                className="pl-10"
              />
              {hotels.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {hotels.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => selectHotel(h)}
                      className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                    >
                      <div className="font-medium">{h.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {h.brand && `${h.brand} • `}{h.city}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedHotel && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <div className="font-medium">{selectedHotel.name}</div>

                {/* Standard Room Types */}
                {roomTypes.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">표준 객실 타입</Label>
                    {roomTypes.map((rt) => (
                      <div key={rt.id} className="flex items-center gap-3 p-2 bg-background rounded">
                        <div className="flex-1 text-sm">{rt.type_name}</div>
                        <Input
                          type="number"
                          placeholder="크레딧"
                          className="w-24 h-8"
                          value={roomConfig[rt.id]?.credit || ""}
                          onChange={(e) => handleConfigChange(rt.id, "credit", e.target.value)}
                        />
                        <Input
                          type="number"
                          placeholder="객실수"
                          className="w-24 h-8"
                          value={roomConfig[rt.id]?.stock || ""}
                          onChange={(e) => handleConfigChange(rt.id, "stock", e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom Room Types */}
                {customRooms.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">커스텀 객실 타입</Label>
                    {customRooms.map((cr) => (
                      <div key={cr.id} className="flex items-center gap-3 p-2 bg-background rounded">
                        <Input
                          placeholder="객실명"
                          className="flex-1 h-8"
                          value={cr.type_name}
                          onChange={(e) => updateCustomRoom(cr.id, "type_name", e.target.value)}
                        />
                        <Input
                          type="number"
                          placeholder="크레딧"
                          className="w-24 h-8"
                          value={roomConfig[cr.id]?.credit || ""}
                          onChange={(e) => handleConfigChange(cr.id, "credit", e.target.value)}
                        />
                        <Input
                          type="number"
                          placeholder="객실수"
                          className="w-24 h-8"
                          value={roomConfig[cr.id]?.stock || ""}
                          onChange={(e) => handleConfigChange(cr.id, "stock", e.target.value)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCustomRoom(cr.id)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCustomRoom}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  커스텀 객실 추가
                </Button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? "생성 중..." : "행사 생성"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
