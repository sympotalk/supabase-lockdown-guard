// [LOCKED][71-H5.UNIFIED-DETAIL.LAYOUT] Unified Event Tabs with State-based Switching
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ParticipantsTab from "@/pages/admin/event-detail/ParticipantsTab";
import RoomingTab from "@/pages/admin/event-detail/RoomingTab";
import MessagesTab from "@/pages/admin/event-detail/MessagesTab";
import FormsTab from "@/pages/admin/event-detail/FormsTab";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function EventDetailLayout() {
  const { eventId } = useParams();
  const { agencyScope } = useUser();
  const navigate = useNavigate();
  
  // [71-H5] State-based tab switching with localStorage persistence
  const [tab, setTab] = useState<string>(() => {
    return localStorage.getItem(`event_detail_tab_${eventId}`) || "participants";
  });
  
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load event data
  useEffect(() => {
    const loadEvent = async () => {
      if (!eventId || !agencyScope) return;
      
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .eq("agency_id", agencyScope)
        .single();
      
      if (error) {
        console.error("[71-H5] Failed to load event:", error);
        setLoading(false);
        return;
      }
      
      setEvent(data);
      setLoading(false);
    };
    
    loadEvent();
  }, [eventId, agencyScope]);

  // Persist tab selection
  useEffect(() => {
    if (eventId) {
      localStorage.setItem(`event_detail_tab_${eventId}`, tab);
    }
  }, [tab, eventId]);

  if (!agencyScope) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        에이전시 컨텍스트를 불러오는 중입니다...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        행사 정보를 불러오는 중입니다...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        행사를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/events")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-primary">
              {event.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(event.start_date), "yyyy.MM.dd")} ~ {format(new Date(event.end_date), "yyyy.MM.dd")}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex space-x-3 border-b border-border pb-2 bg-transparent h-auto rounded-none">
          <TabsTrigger 
            value="participants"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
          >
            참가자 관리
          </TabsTrigger>
          <TabsTrigger 
            value="rooming"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
          >
            숙박 및 룸핑
          </TabsTrigger>
          <TabsTrigger 
            value="messages"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
          >
            문자·알림 발송
          </TabsTrigger>
          <TabsTrigger 
            value="forms"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
          >
            설문·초청장
          </TabsTrigger>
        </TabsList>

        <div className="rounded-2xl bg-card shadow-card p-6 mt-4">
          <TabsContent value="participants" className="mt-0">
            <ParticipantsTab />
          </TabsContent>
          <TabsContent value="rooming" className="mt-0">
            <RoomingTab />
          </TabsContent>
          <TabsContent value="messages" className="mt-0">
            <MessagesTab />
          </TabsContent>
          <TabsContent value="forms" className="mt-0">
            <FormsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
