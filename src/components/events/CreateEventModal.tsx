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
import DualDatePicker from "@/components/common/DualDatePicker";

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateEventModal({ open, onOpenChange }: CreateEventModalProps) {
  const { refresh } = useAppData();
  const navigate = useNavigate();
  const { user } = useUser();
  const [eventName, setEventName] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: undefined,
    to: undefined,
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

  // Reset all state when modal opens
  useEffect(() => {
    if (open) {
      setEventName("");
      setDateRange({ from: undefined, to: undefined });
      setHotelSearch("");
      setSelectedHotel(null);
      setRoomTypes([]);
      setCheckedRooms({});
      setCustomRooms([]);
      setRoomConfig({});
      setActiveIndex(0);
    }
  }, [open]);

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
    
    toast.success(`✓ ${hotel.name} 선택됨`, {
      duration: 2000,
    });
    
    // Smart focus: scroll to selected hotel
    setTimeout(() => {
      const el = document.querySelector(`[data-hotel-id="${hotel.id}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
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

      toast.success("행사 및 호텔 구성이 저장되었습니다", {
        duration: 2000,
      });
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <DialogHeader className="border-b pb-4 bg-blue-50/50 -mx-6 -mt-6 px-6 pt-6 mb-2 rounded-t-xl">
          <DialogTitle className="text-blue-700 text-xl">새 행사 생성</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 px-1">
          {/* Agency Selection - Master Only */}
          {isMaster && (
            <div className="p-4 bg-blue-50/50 rounded-xl space-y-3 border border-blue-100">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-blue-600" />
                <Label className="text-base font-semibold text-blue-700">에이전시 선택</Label>
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
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">행사명</Label>
              <Input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="행사명을 입력하세요"
                className="transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">일정</Label>
              <DualDatePicker
                value={{ start: dateRange.from, end: dateRange.to }}
                onChange={(v) => setDateRange({ from: v.from, to: v.to })}
              />
            </div>
          </div>

          {/* Hotel Selection */}
          <div className="space-y-3 pt-2">
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-4" />
            <Label className="text-base font-semibold text-blue-700">호텔 선택</Label>
            <Input
              value={hotelSearch}
              onChange={(e) => setHotelSearch(e.target.value)}
              onKeyDown={onHotelKeyDown}
              placeholder="호텔명 검색 (Enter로 선택, ↑/↓ 이동)"
            />
            
            {hotels.length > 0 && (
              <div
                ref={listRef}
                className="border border-blue-200 rounded-xl max-h-44 overflow-auto bg-white shadow-sm animate-fade-in"
              >
                {hotels.map((h, i) => (
                  <div
                    key={h.id}
                    data-hotel-id={h.id}
                    onClick={() => selectHotel(h)}
                    className={`p-3 cursor-pointer flex justify-between items-center transition-all duration-150 border-b last:border-b-0 ${
                      i === activeIndex ? "bg-blue-50" : "hover:bg-blue-50/50"
                    } ${selectedHotel?.id === h.id ? "bg-blue-100 ring-2 ring-blue-500/30 font-medium" : ""}`}
                  >
                    <span className={selectedHotel?.id === h.id ? "text-blue-700" : ""}>{h.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {h.brand && `${h.brand} • `}{h.city}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {selectedHotel && (
              <div className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                ✓ {selectedHotel.name} 선택됨 — 다시 클릭하면 해제
              </div>
            )}

            {selectedHotel && (
              <div className="border border-blue-200 rounded-2xl p-5 space-y-4 bg-gradient-to-br from-blue-50/30 to-white animate-fade-in shadow-sm">
                <div className="font-semibold text-blue-700 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  {selectedHotel.name} — 표준 객실 타입
                </div>

                {/* Standard Room Types - Checkbox Selection */}
                {roomTypes.length > 0 && (
                  <div className="space-y-2.5">
                    {roomTypes.map((rt) => (
                      <div key={rt.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-blue-50/50 transition-colors duration-150">
                        <label className="flex items-center gap-3 flex-1 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={checkedRooms[rt.id] || false}
                            onChange={(e) => toggleRoom(rt.id, e.target.checked)}
                            className="peer hidden"
                          />
                          <div className="w-5 h-5 border-2 border-gray-300 rounded flex items-center justify-center transition-all duration-150 ease-in-out peer-checked:border-blue-600 peer-checked:bg-blue-600 group-hover:border-blue-500 group-hover:shadow-sm">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="white"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="w-3.5 h-3.5 scale-0 peer-checked:scale-100 transition-transform duration-150"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                          <span className="text-[15px] select-none font-medium">{rt.type_name}</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="룸크레딧"
                            className="w-28 h-9 text-sm"
                            disabled={!checkedRooms[rt.id]}
                            value={roomConfig[rt.id]?.credit || ""}
                            onChange={(e) => handleConfigChange(rt.id, "credit", e.target.value)}
                          />
                          <Input
                            type="number"
                            placeholder="객실 수량"
                            className="w-24 h-9 text-sm"
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
                <div className="space-y-3 pt-4 border-t border-blue-100">
                  <Label className="text-sm font-semibold text-blue-700">커스텀 객실 타입</Label>
                  {customRooms.map((cr) => (
                    <div key={cr.id} className="flex items-center gap-3 p-2 rounded-lg bg-white border border-blue-100">
                      <Input
                        placeholder="객실명"
                        className="flex-1 h-9"
                        value={cr.type_name}
                        onChange={(e) => updateCustomRoom(cr.id, "type_name", e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="룸크레딧"
                        className="w-28 h-9"
                        value={roomConfig[cr.id]?.credit || ""}
                        onChange={(e) => handleConfigChange(cr.id, "credit", e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="객실 수량"
                        className="w-24 h-9"
                        value={roomConfig[cr.id]?.stock || ""}
                        onChange={(e) => handleConfigChange(cr.id, "stock", e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCustomRoom(cr.id)}
                        className="h-9 w-9 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addCustomRoom}
                    className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-500 transition-all duration-200"
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
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="px-6 hover:bg-gray-50"
            >
              취소
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={loading}
              className="px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? "생성 중..." : "행사 생성"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
