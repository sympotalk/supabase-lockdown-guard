// [LOCKED][71-H3.STATS.SYNC] Event list with unified statistics hook
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CreateEventModal from "@/components/events/CreateEventModal";
import { EditEventModal } from "@/components/events/EditEventModal";
import { useUser } from "@/context/UserContext";
import { LoadingSkeleton } from "@/components/pd/LoadingSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useEventStatistics } from "@/hooks/useEventStatistics";
import { mutate } from "swr";

interface Event {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string | null;
  status: string | null;
}

export default function Events() {
  const { role, agencyScope, setAgencyScope } = useUser();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // [LOCKED][71-H3.STATS.SYNC] Unified statistics hook
  const { data: statsData } = useEventStatistics(agencyScope);

  console.log('[71-H3.STATS.SYNC] Events page loaded', { agencyScope, role, statsCount: statsData?.length });

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

      setEvents(eventsData || []);
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

  // Helper to get statistics for an event
  const getStat = (eventId: string) => {
    return statsData?.find((s) => s.event_id === eventId) || {
      participant_count: 0,
      rooming_rate: 0,
      form_rate: 0,
    };
  };

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
    <div className="layout-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">행사 관리</h1>
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

      {editingEvent && (
        <EditEventModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          event={editingEvent}
          onUpdated={() => loadEvents()}
        />
      )}

      {/* Event Line Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4">
              <LoadingSkeleton type="card" count={1} />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <p className="text-muted-foreground text-lg">등록된 행사가 없습니다.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            첫 행사 등록하기
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const stat = getStat(event.id);
            return (
              <div
                key={event.id}
                onClick={() => navigate(`/admin/events/${event.id}`)}
                className="flex items-center justify-between bg-card hover:bg-accent/50 border border-border rounded-xl shadow-sm p-4 transition-all cursor-pointer"
              >
                {/* 왼쪽: 행사정보 */}
                <div className="flex flex-col w-1/3">
                  <div className="text-base font-semibold text-primary">{event.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDateRange(event.start_date, event.end_date)}
                  </div>
                </div>

                {/* 중앙: 통계 정보 */}
                <div className="flex items-center justify-between w-1/3 text-sm text-muted-foreground gap-4">
                  <div>
                    <span className="font-semibold text-foreground">{stat.participant_count || 0}</span> 명 참가
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">{Math.round(stat.rooming_rate || 0)}%</span> 객실 배정
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">{Math.round(stat.form_rate || 0)}%</span> 설문 완료
                  </div>
                </div>

                {/* 오른쪽: 상태 및 수정 */}
                <div className="flex items-center gap-3">
                  <Badge
                    variant={getStatusBadgeVariant(event.status)}
                  >
                    {getStatusLabel(event.status)}
                  </Badge>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingEvent(event);
                      setEditModalOpen(true);
                    }}
                  >
                    수정
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
