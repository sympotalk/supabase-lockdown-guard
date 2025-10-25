import { useEffect, useState } from "react";
import { Plus, Search, Filter, Phone, MessageSquare } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToTable } from "@/lib/realtimeBridge";
import { ParticipantModal } from "@/components/modals/ParticipantModal";
import { toast } from "@/hooks/use-toast";

interface Participant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  organization?: string;
  status?: string;
  last_modified_by?: string;
  last_modified_at?: string;
}

export default function Participants() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParticipants();

    // Subscribe to realtime updates
    const unsubscribeParticipants = subscribeToTable("participants", (payload) => {
      console.log("[Realtime] Participants change:", payload);
      
      setParticipants((prev) => {
        let updated = [...prev];
        
        if (payload.eventType === "INSERT") {
          updated = [payload.new as Participant, ...updated];
          console.log("[UI] Participant added:", payload.new);
        } else if (payload.eventType === "UPDATE") {
          const idx = updated.findIndex((p) => p.id === payload.new.id);
          if (idx !== -1) {
            updated[idx] = payload.new as Participant;
            console.log("[UI] Participant updated:", payload.new);
          }
        } else if (payload.eventType === "DELETE") {
          updated = updated.filter((p) => p.id !== payload.old.id);
          console.log("[UI] Participant removed:", payload.old);
        }
        
        return updated;
      });
    });

    // Subscribe to participants_log for status change tracking
    const unsubscribeLog = subscribeToTable("participants_log", (payload) => {
      console.log("[Realtime] Log entry:", payload.new);
      if (payload.new) {
        const log = payload.new as any;
        console.log(
          `[UI] Status changed: ${log.old_status} → ${log.new_status} by ${log.changed_by || "system"}`
        );
      }
    });

    return () => {
      unsubscribeParticipants();
      unsubscribeLog();
    };
  }, []);

  useEffect(() => {
    // Filter participants based on search query
    if (!searchQuery.trim()) {
      setFilteredParticipants(participants);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = participants.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.organization?.toLowerCase().includes(query) ||
          p.email?.toLowerCase().includes(query) ||
          p.phone?.includes(query)
      );
      setFilteredParticipants(filtered);
    }
  }, [searchQuery, participants]);

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("participants")
        .select("id, name, email, phone, organization, status, last_modified_by, last_modified_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log("[Data] Participants:", data?.length || 0, "rows fetched");
      setParticipants(data || []);
    } catch (error) {
      console.error("[Error] Failed to fetch participants:", error);
      toast({
        title: "오류",
        description: "참가자 목록을 불러올 수 없습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (participantId: string) => {
    setSelectedParticipantId(participantId);
    setModalOpen(true);
  };

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case "registered":
      case "참석":
        return "default";
      case "cancelled":
      case "취소":
        return "destructive";
      case "pending":
      case "대기":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">참가자 관리</h1>
            <p className="mt-2 text-muted-foreground">
              행사 참가자 정보를 실시간으로 관리하세요
            </p>
          </div>
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            참가자 추가
          </Button>
        </div>

        <Card className="transition-shadow hover:shadow-lg">
          <CardContent className="p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="이름, 소속, 연락처로 검색..."
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

            <div className="overflow-hidden rounded-lg border border-border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted hover:bg-muted">
                      <TableHead className="font-semibold">성명</TableHead>
                      <TableHead className="font-semibold">소속</TableHead>
                      <TableHead className="font-semibold">연락처</TableHead>
                      <TableHead className="font-semibold">상태</TableHead>
                      <TableHead className="font-semibold">최근 수정자</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <span className="text-muted-foreground">불러오는 중...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredParticipants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {searchQuery
                            ? "검색 결과가 없습니다"
                            : "등록된 참가자가 없습니다"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredParticipants.map((participant) => (
                        <TableRow
                          key={participant.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleRowClick(participant.id)}
                        >
                          <TableCell className="font-semibold">
                            {participant.name}
                          </TableCell>
                          <TableCell>{participant.organization || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {participant.phone || "-"}
                              {participant.phone && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.location.href = `tel:${participant.phone}`;
                                    }}
                                    className="rounded p-1 hover:bg-muted"
                                  >
                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.location.href = `sms:${participant.phone}`;
                                    }}
                                    className="rounded p-1 hover:bg-muted"
                                  >
                                    <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getStatusBadgeVariant(participant.status)}
                              className="rounded-xl"
                            >
                              {participant.status || "미정"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {participant.last_modified_by || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>총 {filteredParticipants.length}명의 참가자</span>
              {searchQuery && (
                <span>
                  전체 {participants.length}명 중 {filteredParticipants.length}명 표시
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <ParticipantModal
        participantId={selectedParticipantId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </AdminLayout>
  );
}
