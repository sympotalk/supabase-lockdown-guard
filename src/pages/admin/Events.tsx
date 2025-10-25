// Phase 3.7.X-FULL — Event List Dynamic Integration
// Phase 3.7.X-FULL.POLICY-FIX — Agency Data Scope Enforcement
// Phase 3.8-MASTER.UI — Master Dashboard View as Agency Mode
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, Filter, MoreHorizontal } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import CreateEventModal from "@/components/events/CreateEventModal";
import { useUser } from "@/context/UserContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
}

export default function Events() {
  const { role, agencyScope, setAgencyScope } = useUser();
  const [searchParams] = useSearchParams();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

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

      // Aggregate participants count for each event (parallel processing)
      const eventsWithCounts = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { count } = await supabase
            .from("participants")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id);

          return {
            ...event,
            participants_count: count || 0,
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
  }, []);

  // Search and filter logic
  const filteredEvents = events.filter((event) => {
    // Search filter
    const matchesSearch =
      searchQuery === "" ||
      event.name.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === null || event.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Date formatting function
  const formatDateRange = (start: string, end: string) => {
    const format = (d: Date) => {
      return d
        .toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .replace(/\. /g, "-")
        .replace(".", "");
    };

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (start === end) {
      return format(startDate);
    }
    return `${format(startDate)} ~ ${format(endDate)}`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">행사 관리</h1>
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
              // Auto-refresh on modal close
              loadEvents();
            }
          }}
        />

        <Card className="shadow-md transition-shadow hover:shadow-lg rounded-xl">
          <CardContent className="p-4">
            <div className="mb-6 flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="행사명을 검색하세요…"
                  className="pl-10 h-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(null)}
                >
                  전체
                </Button>
                <Button
                  variant={statusFilter === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("active")}
                >
                  진행중
                </Button>
                <Button
                  variant={statusFilter === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("pending")}
                >
                  대기
                </Button>
                <Button
                  variant={statusFilter === "completed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("completed")}
                >
                  완료
                </Button>
                <Button
                  variant={statusFilter === "cancelled" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("cancelled")}
                >
                  취소
                </Button>
              </div>
            </div>

            {loading ? (
              <LoadingSkeleton type="table" count={4} />
            ) : filteredEvents.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-gray-500 text-lg">등록된 행사가 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-100">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted hover:bg-muted">
                      <TableHead className="font-semibold">No</TableHead>
                      <TableHead className="font-semibold">행사명</TableHead>
                      <TableHead className="font-semibold">일자</TableHead>
                      <TableHead className="font-semibold">장소</TableHead>
                      <TableHead className="font-semibold">참가자</TableHead>
                      <TableHead className="font-semibold">상태</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event, index) => (
                      <TableRow
                        key={event.id}
                        className="hover:bg-gray-50 transition-all"
                      >
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-semibold">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help truncate max-w-xs block">
                                  {event.name}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-blue-50 text-blue-700">
                                {event.name}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          {formatDateRange(event.start_date, event.end_date)}
                        </TableCell>
                        <TableCell>{event.location || "-"}</TableCell>
                        <TableCell>{event.participants_count}명</TableCell>
                        <TableCell>
                          <StatusBadge
                            status={(event.status as any) || "pending"}
                          />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem>상세 보기</DropdownMenuItem>
                              <DropdownMenuItem>수정</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
