// [LOCKED][71-D.FIXFLOW.STABLE] Do not remove or inline this block without architect/QA approval.
import { useMemo, useState } from "react";
import { Calendar, Users, Upload, Hotel, Activity, CheckCircle2, Clock, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/pd/Spinner";
import { useAgencyData } from "@/context/AgencyDataContext";
import { UploadParticipantsModal } from "@/components/dashboard/UploadParticipantsModal";
import CreateEventModal from "@/components/events/CreateEventModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function Dashboard() {
  const navigate = useNavigate();
  
  // [LOCKED][71-D.FIXFLOW.STABLE] Use agency-scoped hooks via context
  const { eventProgress, counts } = useAgencyData();
  const { data: eventProgressData, isLoading: progressLoading } = eventProgress;
  const { data: countsData, isLoading: countsLoading } = counts;
  
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  if (import.meta.env.DEV) {
    console.log('[71-D.FIXFLOW] Dashboard render - events:', eventProgressData?.length, 'counts:', countsData);
  }

  // [LOCKED][71-D.FIXFLOW.STABLE] Sort events: active → upcoming → completed
  const sortedEvents = useMemo(() => {
    if (!eventProgressData) return [];
    
    const statusOrder = { 
      '진행중': 0, 
      'active': 0, 
      '예정': 1, 
      'upcoming': 1, 
      '완료': 2, 
      'completed': 2 
    };
    
    return [...eventProgressData].sort((a, b) => {
      const orderA = statusOrder[a.status?.toLowerCase() as keyof typeof statusOrder] ?? 3;
      const orderB = statusOrder[b.status?.toLowerCase() as keyof typeof statusOrder] ?? 3;
      
      if (orderA !== orderB) return orderA - orderB;
      
      // Within same status, sort by start_date descending
      return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
    });
  }, [eventProgressData]);

  const loading = progressLoading || countsLoading;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">대시보드 로딩 중...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const normalized = status?.toLowerCase();
    
    if (normalized === '진행중' || normalized === 'active') {
      return <Badge className="bg-blue-500 text-white">진행중</Badge>;
    }
    if (normalized === '예정' || normalized === 'upcoming') {
      return <Badge className="bg-orange-500 text-white">예정</Badge>;
    }
    if (normalized === '완료' || normalized === 'completed') {
      return <Badge variant="secondary">완료</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    try {
      const start = format(new Date(startDate), 'M/d', { locale: ko });
      const end = format(new Date(endDate), 'M/d', { locale: ko });
      return `${start} - ${end}`;
    } catch {
      return '-';
    }
  };

  // Prepare events list for upload modal
  const eventsForUpload = sortedEvents.map(e => ({ id: e.event_id, name: e.name }));

  return (
    <div className="layout-full space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">에이전시 대시보드</h1>
        <p className="mt-2 text-muted-foreground">
          진행 중인 행사와 진행률을 한눈에 확인하세요
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard
          title="진행 중"
          value={String(countsData?.active || 0)}
          description="현재 진행 중인 행사"
          icon={Activity}
        />
        <StatCard
          title="예정"
          value={String(countsData?.upcoming || 0)}
          description="앞으로 진행될 행사"
          icon={Clock}
        />
        <StatCard
          title="완료"
          value={String(countsData?.completed || 0)}
          description="종료된 행사"
          icon={CheckCircle2}
        />
      </div>

      {/* Events Progress Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            행사 진행률
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">등록된 행사가 없습니다.</p>
              <Button 
                className="mt-4"
                onClick={() => setCreateModalOpen(true)}
              >
                첫 행사 등록하기
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableHead className="font-semibold">행사명</TableHead>
                    <TableHead className="font-semibold">일정</TableHead>
                    <TableHead className="font-semibold text-center">참가자</TableHead>
                    <TableHead className="font-semibold text-center">배정률</TableHead>
                    <TableHead className="font-semibold text-center">진행률</TableHead>
                    <TableHead className="font-semibold text-center">상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEvents.map((event) => (
                    <TableRow 
                      key={event.event_id}
                      className="hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/admin/events/${event.event_id}`)}
                    >
                      <TableCell className="font-medium">
                        {event.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateRange(event.start_date, event.end_date)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{event.participant_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Progress value={event.rooming_rate} className="w-20" />
                          <span className="text-sm font-medium min-w-[3ch]">
                            {Math.round(event.rooming_rate)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Progress value={event.progress_rate} className="w-20" />
                          <span className="text-sm font-medium min-w-[3ch]">
                            {Math.round(event.progress_rate)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(event.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <UploadParticipantsModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        events={eventsForUpload}
      />
      
      <CreateEventModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  );
}
