// [LOCKED][71-H.STABLE] Unified Event Tabs Layout
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParams, useNavigate, useLocation, Outlet } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EventDetailLayout() {
  const { eventId } = useParams();
  const { agencyScope } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  // Extract current tab from URL
  const currentTab = location.pathname.split("/").pop() || "participants";

  useEffect(() => {
    // Default to participants tab if at base event route
    if (location.pathname === `/admin/events/${eventId}`) {
      navigate(`/admin/events/${eventId}/participants`, { replace: true });
    }
  }, [location.pathname, eventId, navigate]);

  if (!agencyScope) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        에이전시 컨텍스트를 불러오는 중입니다...
      </div>
    );
  }

  const handleTabChange = (value: string) => {
    navigate(`/admin/events/${eventId}/${value}`);
  };

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
          <h1 className="text-2xl font-semibold text-foreground">행사 상세 관리</h1>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
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
          {/* Outlet renders the selected tab component */}
          <Outlet />
        </div>
      </Tabs>
    </div>
  );
}
