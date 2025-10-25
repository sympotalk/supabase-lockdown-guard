import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Building } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { useUser } from "@/context/UserContext";
import DateRangePicker from "@/components/common/DateRangePicker";
import type { DateRange } from "react-day-picker";

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateEventModal({ open, onOpenChange }: CreateEventModalProps) {
  const { refresh } = useAppData();
  const navigate = useNavigate();
  const { user } = useUser();
  const [eventName, setEventName] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(),
    to: new Date(Date.now() + 86400000 * 2),
  });
  const [agencies, setAgencies] = useState<any[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("");
  const [isMaster, setIsMaster] = useState(false);
  const [hotelSearch, setHotelSearch] = useState("");
  const [hotels, setHotels] = useState<any[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [checkedRooms, setCheckedRooms] = useState<Record<string, boolean>>({});
  const [customRooms, setCustomRooms] = useState<any[]>([]);
  const [roomConfig, setRoomConfig] = useState<Record<string, { credit: number; stock: number }>>({});
  const [loading, setLoading] = useState(false);

  // Load session and check role
  useEffect(() => {
    const loadUserRole = async () => {
      const { data: session } = await supabase.auth.getSession();
      const role = session?.session?.user?.user_metadata?.role;
      const isMasterUser = role === "master";
      setIsMaster(isMasterUser);

      if (isMasterUser) {
        // Load all agencies for Master
        const { data: agenciesList } = await supabase
          .from("agencies")
          .select("id, name")
          .eq("is_active", true)
          .order("name");
        setAgencies(agenciesList || []);
      } else {
        // Get agency_id from agency_members for non-master users
        const userId = session?.session?.user?.id;
        if (userId) {
          const { data: memberData } = await supabase
            .from("agency_members")
            .select("agency_id")
            .eq("user_id", userId)
            .single();
          if (memberData?.agency_id) {
            setSelectedAgencyId(memberData.agency_id);
          }
        }
      }
    };
    loadUserRole();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const search = async () => {
      if (hotelSearch.length > 1) {
        const { data, error } = await supabase
          .from("hotels")
          .select("id, name, city, brand")
          .ilike("name", `%${hotelSearch}%`)
          .eq("is_active", true)
          .limit(10);
        
        if (!cancelled && !error && data) {
          setHotels(data);
          setActiveIndex(0);
        }
      } else {
        setHotels([]);
      }
    };
    search();
    return () => { cancelled = true; };
  }, [hotelSearch]);

  const onHotelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!hotels.length) return;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.min(i + 1, hotels.length - 1);
        scrollIntoView(next);
        return next;
      });
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => {
        const prev = Math.max(i - 1, 0);
        scrollIntoView(prev);
        return prev;
      });
    }
    if (e.key === "Enter") {
      e.preventDefault();
      selectHotel(hotels[activeIndex]);
    }
  };

  const scrollIntoView = (idx: number) => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[idx] as HTMLElement;
    if (item) item.scrollIntoView({ block: "nearest" });
  };

  const selectHotel = async (hotel: any) => {
    // Toggle: if already selected, deselect
    if (selectedHotel?.id === hotel.id) {
      setSelectedHotel(null);
      setRoomTypes([]);
      setCheckedRooms({});
      setRoomConfig({});
      setHotels([]);
      setHotelSearch("");
      toast.message("호텔 선택 해제됨");
      return;
    }

    setSelectedHotel(hotel);
    setHotelSearch(hotel.name);
    setHotels([]);
    
    const { data } = await supabase
      .from("room_types")
      .select("id, type_name, description, default_credit")
      .eq("hotel_id", hotel.id)
      .eq("is_active", true);
    
    setRoomTypes(data || []);
    
    // Initialize all rooms as unchecked
    const init: Record<string, boolean> = {};
    (data || []).forEach((rt: any) => {
      init[rt.id] = false;
    });
    setCheckedRooms(init);
    
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

  const toggleRoom = (id: string, checked: boolean) => {
    setCheckedRooms((prev) => ({ ...prev, [id]: checked }));
  };

  const handleCreate = async () => {
    if (!eventName.trim()) {
      return toast.error("행사명을 입력해주세요");
    }

    if (!dateRange.from || !dateRange.to) {
      return toast.error("일정을 선택해주세요");
    }

    if (!selectedAgencyId) {
      return toast.error("에이전시를 선택해주세요");
    }

    if (!selectedHotel) {
      return toast.error("호텔을 선택해주세요");
    }

    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      // Create event
      const { data: newEvent, error: eventError } = await supabase
        .from("events")
        .insert({
          name: eventName,
          start_date: dateRange.from?.toISOString().split("T")[0] || "",
          end_date: dateRange.to?.toISOString().split("T")[0] || "",
          location: selectedHotel.name, // Hotel name as location
          agency_id: selectedAgencyId,
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
              agency_id: selectedAgencyId,
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

      // Create event_room_refs for checked standard room types only
      for (const rt of roomTypes) {
        if (!checkedRooms[rt.id]) continue; // Only save checked rooms
        
        const config = roomConfig[rt.id] || { credit: 0, stock: 0 };
        await supabase.from("event_room_refs").insert({
          event_id: newEvent.id,
          hotel_id: selectedHotel.id,
          room_type_id: rt.id,
          agency_id: selectedAgencyId,
          credit: config.credit,
          stock: config.stock,
        } as any);
      }

      // Create event_room_refs for custom room types
      for (const cr of customRooms) {
        if (cr.type_name && customRoomIds[cr.id]) {
          const config = roomConfig[cr.id] || { credit: 0, stock: 0 };
          await supabase.from("event_room_refs").insert({
            event_id: newEvent.id,
            hotel_id: selectedHotel.id,
            local_type_id: customRoomIds[cr.id],
            agency_id: selectedAgencyId,
            credit: config.credit,
            stock: config.stock,
          } as any);
        }
      }

      toast.success("행사 및 호텔 구성이 저장되었습니다");
      await refresh();
      onOpenChange(false);
      
      // Navigate to event overview
      navigate(`/admin/events/${newEvent.id}/overview`);
      
      // Reset form
      setEventName("");
      setDateRange({ from: new Date(), to: new Date(Date.now() + 86400000 * 2) });
      setSelectedAgencyId(isMaster ? "" : selectedAgencyId);
      setSelectedHotel(null);
      setRoomTypes([]);
      setCheckedRooms({});
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
          {/* Agency Selection - Master Only */}
          {isMaster && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" />
                <Label className="text-base font-semibold">에이전시 선택</Label>
              </div>
              <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
                <SelectTrigger>
                  <SelectValue placeholder="에이전시를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {agencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Basic Event Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>행사명</Label>
              <Input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="행사명을 입력하세요"
              />
            </div>
            <div>
              <Label>일정</Label>
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
          </div>

          {/* Hotel Selection */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-base font-semibold">호텔 선택</Label>
            <Input
              value={hotelSearch}
              onChange={(e) => setHotelSearch(e.target.value)}
              onKeyDown={onHotelKeyDown}
              placeholder="호텔명 검색 (Enter로 선택, ↑/↓ 이동)"
            />
            
            {hotels.length > 0 && (
              <div
                ref={listRef}
                className="border rounded-xl max-h-44 overflow-auto"
              >
                {hotels.map((h, i) => (
                  <div
                    key={h.id}
                    onClick={() => selectHotel(h)}
                    className={`p-3 cursor-pointer flex justify-between border-b last:border-b-0 ${
                      i === activeIndex ? "bg-accent" : ""
                    } ${selectedHotel?.id === h.id ? "bg-primary/10" : ""}`}
                  >
                    <span className="font-medium">{h.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {h.brand && `${h.brand} • `}{h.city}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {selectedHotel && (
              <div className="text-xs text-muted-foreground">
                {selectedHotel.name} 선택됨 — 다시 클릭하면 해제
              </div>
            )}

            {selectedHotel && (
              <div className="border rounded-2xl p-4 space-y-4">
                <div className="font-medium">{selectedHotel.name} — 표준 객실 타입</div>

                {/* Standard Room Types - Checkbox Selection */}
                {roomTypes.length > 0 && (
                  <div className="space-y-2">
                    {roomTypes.map((rt) => (
                      <div key={rt.id} className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checkedRooms[rt.id] || false}
                            onChange={(e) => toggleRoom(rt.id, e.target.checked)}
                            className="peer hidden"
                          />
                          <div className="w-5 h-5 rounded-md border-2 border-input flex items-center justify-center peer-checked:bg-primary peer-checked:border-primary transition-all">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-3.5 h-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="3"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-sm">{rt.type_name}</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="룸크레딧"
                            className="w-28 h-8"
                            disabled={!checkedRooms[rt.id]}
                            value={roomConfig[rt.id]?.credit || ""}
                            onChange={(e) => handleConfigChange(rt.id, "credit", e.target.value)}
                          />
                          <Input
                            type="number"
                            placeholder="객실 수량"
                            className="w-24 h-8"
                            disabled={!checkedRooms[rt.id]}
                            value={roomConfig[rt.id]?.stock || ""}
                            onChange={(e) => handleConfigChange(rt.id, "stock", e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom Room Types */}
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-sm font-semibold">커스텀 객실 타입</Label>
                  {customRooms.map((cr) => (
                    <div key={cr.id} className="flex items-center gap-3">
                      <Input
                        placeholder="객실명"
                        className="flex-1 h-8"
                        value={cr.type_name}
                        onChange={(e) => updateCustomRoom(cr.id, "type_name", e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="룸크레딧"
                        className="w-28 h-8"
                        value={roomConfig[cr.id]?.credit || ""}
                        onChange={(e) => handleConfigChange(cr.id, "credit", e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="객실 수량"
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
