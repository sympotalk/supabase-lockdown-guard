// [LOCKED][71-D.FIXFLOW.STABLE] Do not remove or inline this block without architect/QA approval.
// [LOCKED][71-E.FIXSELECT.STABLE] Do not remove or inline this block without architect/QA approval.
import { Plus, Search, Filter, Phone, MessageSquare, User, BedDouble, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useUnifiedParticipant } from "@/hooks/useUnifiedParticipant";
import { useUser } from "@/context/UserContext";
import { LoadingSkeleton } from "@/components/pd/LoadingSkeleton";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModuleInsightBar } from "@/components/common/ModuleInsightBar";
import CompanionBadge from "@/components/participants/CompanionBadge";
import CompanionScanModal from "@/components/participants/CompanionScanModal";
import { useCompanionGroup } from "@/hooks/useCompanionGroup";

export default function Participants() {
  const navigate = useNavigate();
  const { role, agencyScope, setAgencyScope } = useUser();
  const [searchParams] = useSearchParams();
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState<Array<{id: string; name: string}>>([]);
  const [showCompanionScan, setShowCompanionScan] = useState(false);

  // [71-E.FIXSELECT] Debug log
  useEffect(() => {
    console.log('[71-E.FIXSELECT] Participants Select initialized', { value: selectedEventId });
  }, [selectedEventId]);

  // Sync URL agency parameter with UserContext
  useEffect(() => {
    const agencyParam = searchParams.get("agency");
    if (agencyParam && agencyParam !== agencyScope) {
      console.log("[RLS] Syncing participants view to agency:", agencyParam);
      setAgencyScope(agencyParam);
    }
  }, [searchParams, agencyScope, setAgencyScope]);

  // Load events filtered by agency scope
  useEffect(() => {
    const loadEvents = async () => {
      if (!agencyScope) {
        setEvents([]);
        return;
      }
      
      const { data } = await supabase
        .from("events")
        .select("id, name")
        .eq("is_active", true)
        .eq("agency_id", agencyScope)
        .order("created_at", { ascending: false });
      
      setEvents(data || []);
    };
    loadEvents();
  }, [agencyScope]);

  // [LOCKED][71-D.FIXFLOW.STABLE] Guard against missing scope - prevents freeze
  if (!agencyScope) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[71-D.FIXFLOW] agencyScope=null, route=/admin/participants, role=', role);
    }
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <LoadingSkeleton type="card" count={1} />
          <p className="mt-4 text-muted-foreground">데이터를 준비 중입니다...</p>
        </div>
      </div>
    );
  }

  // [LOCKED][71-D.FIXFLOW.STABLE] Only call hook after guard passes
  const { data: participants, loading, refresh } = useUnifiedParticipant(selectedEventId, agencyScope);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[71-D.FIXFLOW] Participants loaded:', participants?.length, 'loading:', loading);
  }

  return (
    <div className="space-y-6">
        <ModuleInsightBar module="participants" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">참가자 관리</h1>
            <p className="mt-2 text-muted-foreground">
              행사 참가자 정보를 관리하고 숙박 정보를 확인하세요
            </p>
          </div>
          <div className="flex gap-3">
            {selectedEventId && (
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2"
                onClick={() => setShowCompanionScan(true)}
              >
                <Search className="h-5 w-5" />
                동반자 스캔
              </Button>
            )}
            <Button variant="outline" size="lg" className="gap-2" onClick={refresh}>
              <RefreshCw className="h-5 w-5" />
              새로고침
            </Button>
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              참가자 추가
            </Button>
          </div>
        </div>

        {/* Event Selector */}
        <div className="flex items-center gap-3">
          <Select 
            value={selectedEventId || undefined} 
            onValueChange={(value) => setSelectedEventId(value === "all" ? undefined : value)}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="행사를 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 참가자</SelectItem>
              {events
                .filter((event) => 
                  typeof event.id === "string" && 
                  event.id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
                )
                .map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-6">
          <div className="flex-[65]">
            <Card className="transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      placeholder="이름 또는 소속으로 검색..." 
                      className="pl-10 h-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    필터
                  </Button>
                </div>

                {loading ? (
                  <LoadingSkeleton type="table" count={8} />
                ) : participants.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    등록된 참가자가 없습니다. 행사를 선택하고 참가자를 추가해주세요.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted hover:bg-muted">
                            <TableHead className="font-semibold">성명</TableHead>
                            <TableHead className="font-semibold">소속</TableHead>
                            <TableHead className="font-semibold">연락처</TableHead>
                            <TableHead className="font-semibold">동반자</TableHead>
                            <TableHead className="font-semibold">숙박정보</TableHead>
                            <TableHead className="font-semibold">객실타입</TableHead>
                            <TableHead className="font-semibold">메시지 상태</TableHead>
                            <TableHead className="font-semibold">상태</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {participants
                              .filter(p => 
                                !searchQuery || 
                                p.participant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                p.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
                              )
                              .map((participant, idx) => (
                                <TableRow key={participant.participant_id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                                  <TableCell className="font-semibold">{participant.participant_name}</TableCell>
                                  <TableCell>{participant.company_name || "-"}</TableCell>
                                  <TableCell>{participant.participant_phone || "-"}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1 text-sm">
                                      {participant.hotel_name ? (
                                        <>
                                          <BedDouble className="h-3 w-3 text-primary" />
                                          <span>{participant.hotel_name}</span>
                                          {participant.room_number && (
                                            <span className="text-muted-foreground">({participant.room_number})</span>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-muted-foreground">미배정</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {participant.room_type ? (
                                      <Badge variant="secondary" className="rounded-xl">
                                        {participant.room_type}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground text-sm">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1 text-sm">
                                      <MessageSquare className="h-3 w-3" />
                                      <Badge 
                                        variant={
                                          participant.message_status === 'sent' ? 'default' :
                                          participant.message_status === 'failed' ? 'destructive' :
                                          'outline'
                                        }
                                        className="rounded-xl text-xs"
                                      >
                                        {participant.message_status === 'sent' ? '발송완료' :
                                         participant.message_status === 'failed' ? '실패' :
                                         participant.message_status === 'pending' ? '대기중' :
                                         '미발송'}
                                      </Badge>
                                      {participant.message_count > 0 && (
                                        <span className="text-muted-foreground">({participant.message_count})</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={participant.role_badge === "VIP" ? "default" : "secondary"}
                                      className={
                                        participant.role_badge === "VIP"
                                          ? "rounded-xl bg-warning/10 text-warning border-0"
                                          : "rounded-xl border-0"
                                      }
                                    >
                                      {participant.status || "일반"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex-[35] space-y-6">
            <Card className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" />
                  담당자 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">성명</p>
                  <p className="mt-1 font-semibold">김철수</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">소속</p>
                  <p className="mt-1 font-semibold">테크기업 A</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">연락처</p>
                  <p className="mt-1 font-semibold">010-1234-5678</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-2">
                    <Phone className="h-4 w-4" />
                    통화
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-2">
                    <MessageSquare className="h-4 w-4" />
                    문자
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">숙박 상태</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start hover:bg-muted">
                  미숙박
                </Button>
                <Button variant="outline" className="w-full justify-start bg-primary/10 text-primary hover:bg-primary/20">
                  1일차 숙박
                </Button>
                <Button variant="outline" className="w-full justify-start hover:bg-muted">
                  2일차 숙박
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* [Phase 77-I] Companion Scan Modal */}
        {selectedEventId && (
          <CompanionScanModal
            open={showCompanionScan}
            onOpenChange={setShowCompanionScan}
            eventId={selectedEventId}
            onSuccess={refresh}
          />
        )}
      </div>
  );
}
