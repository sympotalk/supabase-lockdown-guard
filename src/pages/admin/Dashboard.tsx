import { Calendar, Users, Hotel, TrendingUp } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToTable } from "@/lib/realtimeBridge";
import { useEffect, useState } from "react";
import { useRoleGuard } from "@/lib/useRoleGuard";
import MasterDashboard from "./dashboard/MasterDashboard";

type EventStatus = "active" | "pending" | "completed";

interface Event {
  id: string;
  name: string;
  start_date: string;
  status: string;
  participant_count?: number;
}

export default function Dashboard() {
  const { userRole, loading: roleLoading } = useRoleGuard();
  const [events, setEvents] = useState<Event[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalParticipants, setTotalParticipants] = useState(0);

  // If user is MASTER, show Master Dashboard
  if (roleLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-12 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (userRole === "master") {
    console.log("[UI] Dashboard loaded as: MASTER");
    return <MasterDashboard />;
  }

  console.log("[UI] Dashboard loaded as:", userRole || "AGENCY");

  useEffect(() => {
    // Fetch initial data
    const fetchData = async () => {
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("id, name, start_date, status")
        .order("start_date", { ascending: false })
        .limit(5);

      if (eventsError) {
        console.error("[Data] Events error:", eventsError);
      } else {
        console.log("[Data] Events:", eventsData?.length || 0, "rows fetched");
        setEvents(eventsData || []);
        setTotalEvents(eventsData?.length || 0);
      }

      const { count: participantsCount, error: participantsError } = await supabase
        .from("participants")
        .select("*", { count: "exact", head: true });

      if (participantsError) {
        console.error("[Data] Participants error:", participantsError);
      } else {
        console.log("[Data] Participants:", participantsCount || 0, "rows");
        setTotalParticipants(participantsCount || 0);
      }
    };

    fetchData();

    // Subscribe to realtime updates
    const unsubscribeEvents = subscribeToTable("events", (payload) => {
      console.log("[Realtime] Events updated:", payload);
      setEvents((prev) => {
        const updated = [...prev];
        if (payload.eventType === "INSERT") {
          updated.unshift(payload.new);
          setTotalEvents((count) => count + 1);
        } else if (payload.eventType === "UPDATE") {
          const idx = updated.findIndex((e) => e.id === payload.new.id);
          if (idx !== -1) updated[idx] = payload.new;
        } else if (payload.eventType === "DELETE") {
          setTotalEvents((count) => count - 1);
          return updated.filter((e) => e.id !== payload.old.id);
        }
        const result = updated.slice(0, 5);
        console.log("[UI] Events list refreshed:", result.length, "items");
        return result;
      });
    });

    const unsubscribeParticipants = subscribeToTable("participants", (payload) => {
      console.log("[Realtime] Participants updated:", payload);
      setTotalParticipants((count) => {
        const newCount =
          payload.eventType === "INSERT"
            ? count + 1
            : payload.eventType === "DELETE"
            ? count - 1
            : count;
        console.log("[UI] Participants count updated:", newCount);
        return newCount;
      });
    });

    const unsubscribeForms = subscribeToTable("forms", (payload) => {
      console.log("[Realtime] Forms updated:", payload);
    });

    return () => {
      unsubscribeEvents();
      unsubscribeParticipants();
      unsubscribeForms();
    };
  }, []);

  const mapStatus = (status: string): EventStatus => {
    const statusMap: Record<string, EventStatus> = {
      "예정": "pending",
      "진행중": "active",
      "완료": "completed",
    };
    return statusMap[status] || "pending";
  };
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">대시보드</h1>
            <p className="mt-2 text-muted-foreground">
              SympoHub 행사 관리 플랫폼에 오신 것을 환영합니다
            </p>
          </div>
          <Button size="lg" className="gap-2">
            <Calendar className="h-5 w-5" />
            새 행사 등록
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="전체 행사"
            value={totalEvents}
            description="등록된 행사"
            icon={Calendar}
          />
          <StatCard
            title="총 참가자"
            value={totalParticipants.toLocaleString()}
            description="전체 등록 인원"
            icon={Users}
          />
          <StatCard
            title="데이터 연동"
            value="활성"
            description="Supabase 실시간 연결"
            icon={Hotel}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
        <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                최근 행사
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted hover:bg-muted">
                      <TableHead className="font-semibold">행사명</TableHead>
                      <TableHead className="font-semibold">일자</TableHead>
                      <TableHead className="font-semibold">참가자</TableHead>
                      <TableHead className="font-semibold">상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          등록된 행사가 없습니다
                        </TableCell>
                      </TableRow>
                    ) : (
                      events.map((event) => (
                        <TableRow key={event.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{event.name}</TableCell>
                          <TableCell>{event.start_date}</TableCell>
                          <TableCell>{event.participant_count || 0}명</TableCell>
                          <TableCell>
                            <StatusBadge status={mapStatus(event.status)} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">빠른 작업</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-3" size="lg">
                <Calendar className="h-5 w-5 text-primary" />
                새 행사 등록
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3" size="lg">
                <Users className="h-5 w-5 text-primary" />
                참가자 추가
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3" size="lg">
                <Hotel className="h-5 w-5 text-primary" />
                객실 배정
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
