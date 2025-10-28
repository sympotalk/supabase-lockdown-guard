// [71-H.REBUILD-FINAL] Event Detail - Fixed scroll & alignment
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
  
  const [tab, setTab] = useState<string>(() => {
    return localStorage.getItem(`event_detail_tab_${eventId}`) || "participants";
  });
  
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);

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
        console.error("[EventDetailLayout] Failed to load event:", error);
        setLoading(false);
        return;
      }
      
      setEvent(data);
      setLoading(false);
    };
    
    loadEvent();
  }, [eventId, agencyScope]);

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
    <div className="w-full h-full">
      {/* Event Title Section */}
      <div className="flex items-center gap-4 px-6 py-4 bg-card border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/events")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold leading-tight text-card-foreground">
            {event.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(new Date(event.start_date), "yyyy.MM.dd")} ~ {format(new Date(event.end_date), "yyyy.MM.dd")}
          </p>
        </div>
      </div>

      {/* Card Container with Tabs */}
      <div className="p-6">
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="flex space-x-6 border-b border-border px-6 pt-4 pb-0 bg-transparent h-auto rounded-none">
              <TabsTrigger 
                value="participants"
                className="relative pb-3 text-sm font-medium rounded-none bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-colors"
              >
                참가자 관리
              </TabsTrigger>
              <TabsTrigger 
                value="rooming"
                className="relative pb-3 text-sm font-medium rounded-none bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-colors"
              >
                숙박 및 룸핑
              </TabsTrigger>
              <TabsTrigger 
                value="messages"
                className="relative pb-3 text-sm font-medium rounded-none bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-colors"
              >
                문자·알림 발송
              </TabsTrigger>
              <TabsTrigger 
                value="forms"
                className="relative pb-3 text-sm font-medium rounded-none bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-colors"
              >
                설문·초청장
              </TabsTrigger>
            </TabsList>

            {/* Content Section */}
            <div className="w-full h-[calc(100vh-280px)]">
              <TabsContent value="participants" className="mt-0 h-full">
                <ParticipantsTab 
                  selectedParticipant={selectedParticipant}
                  onSelectParticipant={setSelectedParticipant}
                />
              </TabsContent>
              <TabsContent value="rooming" className="mt-0 h-full">
                <RoomingTab />
              </TabsContent>
              <TabsContent value="messages" className="mt-0 h-full">
                <MessagesTab />
              </TabsContent>
              <TabsContent value="forms" className="mt-0 h-full">
                <FormsTab />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
