// [LOCKED][71-G.UNIFY.EVENTTABS.REBUILD.UI] Event list rebuilt with SympoHub Blue cards
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Plus, Users, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import CreateEventModal from "@/components/events/CreateEventModal";
import { useUser } from "@/context/UserContext";
import { LoadingSkeleton } from "@/components/pd/LoadingSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Event {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string | null;
  status: string | null;
  participants_count?: number;
  progress_rate?: number;
  manager_name?: string;
}

export default function Events() {
  const { role, agencyScope, setAgencyScope } = useUser();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  console.log('[71-G.UNIFY.EVENTTABS] Events page loaded', { agencyScope, role });

  // Sync URL agency parameter with UserContext
  useEffect(() => {
    const agencyParam = searchParams.get("agency");
    if (agencyParam && agencyParam !== agencyScope) {
      console.log("[RLS] Syncing agency scope from URL:", agencyParam);
      setAgencyScope(agencyParam);
    }
  }, [searchParams, agencyScope, setAgencyScope]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      // Build query with agency scope filter
      let query = supabase
        .from("events")
        .select("id, name, start_date, end_date, location, status, agency_id")
        .eq("is_active", true);

      // Apply agency scope filter (non-masters or masters with specific agency scope)
      if (role !== "master" || agencyScope) {
        if (agencyScope) {
          query = query.eq("agency_id", agencyScope);
        }
      }

      const { data: eventsData, error: eventsError } = await query.order("start_date", { ascending: true });

      if (eventsError) throw eventsError;

      // Aggregate participants count and calculate progress for each event
      const eventsWithCounts = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { count } = await supabase
            .from("participants")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id);

          // Calculate progress based on participant count (example: max 100 participants = 100%)
          const progress_rate = count ? Math.min((count / 100) * 100, 100) : 0;

          return {
            ...event,
            participants_count: count || 0,
            progress_rate,
            manager_name: "담당자", // TODO: Fetch actual manager name from user_roles
          };
        })
      );

      setEvents(eventsWithCounts);
    } catch (error: any) {
      toast({
        title: "행사 목록을 불러오지 못했습니다.",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [agencyScope]);

  // Date formatting function
  const formatDateRange = (start: string, end: string) => {
    const format = (d: Date) => {
      return d.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).replace(/\. /g, ".").replace(/\.$/, "");
    };

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (start === end) {
      return format(startDate);
    }
    return `${format(startDate)} ~ ${format(endDate)}`;
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string | null) => {
    if (!status) return "outline";
    const s = status.toLowerCase();
    if (s === "진행중" || s === "active") return "default";
    if (s === "예정" || s === "pending" || s === "upcoming") return "outline";
    if (s === "완료" || s === "completed") return "secondary";
    return "outline";
  };

  // Get status label
  const getStatusLabel = (status: string | null) => {
    if (!status) return "예정";
    const s = status.toLowerCase();
    if (s === "active") return "진행중";
    if (s === "pending") return "예정";
    if (s === "completed") return "완료";
    if (s === "cancelled") return "취소";
    return status;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">행사 관리</h1>
          <p className="mt-2 text-muted-foreground">
            모든 행사를 관리하고 새로운 행사를 등록하세요
          </p>
        </div>
        <Button
          size="lg"
          className="gap-2"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus className="h-5 w-5" />
          새 행사 등록
        </Button>
      </div>

      <CreateEventModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) {
            // [LOCKED][71-G.FIX.ROUTING.R1] Ensure dashboard refresh after creation
            loadEvents();
          }
        }}
      />

      {/* Event Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="rounded-2xl">
              <CardContent className="p-6">
                <LoadingSkeleton type="card" count={1} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card className="rounded-2xl shadow-card">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground text-lg">등록된 행사가 없습니다.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              첫 행사 등록하기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((event) => (
            <Card
              key={event.id}
              className="rounded-2xl border border-border shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer group hover:scale-[1.02]"
              onClick={() => navigate(`/admin/events/${event.id}/overview`)}
            >
              <CardHeader className="flex flex-row justify-between items-start pb-3 space-y-0">
                <h3 className="text-lg font-semibold text-primary line-clamp-2 flex-1">
                  {event.name}
                </h3>
                <Badge
                  variant={getStatusBadgeVariant(event.status)}
                  className="ml-2 shrink-0"
                >
                  {getStatusLabel(event.status)}
                </Badge>
              </CardHeader>
              
              <CardContent className="space-y-3 text-sm pb-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    일정
                  </span>
                  <span className="font-medium text-foreground">
                    {formatDateRange(event.start_date, event.end_date)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    참가자
                  </span>
                  <span className="font-medium text-foreground">
                    {event.participants_count || 0}명
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    담당자
                  </span>
                  <span className="font-medium text-foreground">
                    {event.manager_name || "미지정"}
                  </span>
                </div>

                <div className="pt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">진행률</span>
                    <span className="font-medium text-primary">
                      {Math.round(event.progress_rate || 0)}%
                    </span>
                  </div>
                  <Progress
                    value={event.progress_rate || 0}
                    className="h-2 bg-muted"
                  />
                </div>
              </CardContent>

              <CardFooter className="pt-0 pb-4">
                <Button
                  variant="default"
                  className="w-full group-hover:bg-primary-hover"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/events/${event.id}/overview`);
                  }}
                >
                  관리하기
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
