import { useEffect, useState } from "react";
import { Phone, MessageSquare, Mail, Building, User, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Participant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  organization?: string;
  position?: string;
  status?: string;
  memo?: string;
  last_modified_by?: string;
  last_modified_at?: string;
}

interface ParticipantModalProps {
  participantId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ParticipantModal({ participantId, open, onOpenChange }: ParticipantModalProps) {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    if (participantId && open) {
      fetchParticipantDetails();
    }
  }, [participantId, open]);

  const fetchParticipantDetails = async () => {
    if (!participantId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("participants")
        .select("*")
        .eq("id", participantId)
        .single();

      if (error) throw error;

      console.log("[Data] Participant details fetched:", data);
      setParticipant(data);
    } catch (error) {
      console.error("[Error] Failed to fetch participant:", error);
      toast({
        title: "오류",
        description: "참가자 정보를 불러올 수 없습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!participantId) return;

    const oldStatus = participant?.status;
    setStatusUpdating(true);
    try {
      const { error } = await supabase
        .from("participants")
        .update({ 
          status: newStatus,
          last_modified_at: new Date().toISOString(),
        })
        .eq("id", participantId);

      if (error) throw error;

      console.log(`[Update] Participant status updated: ${oldStatus} → ${newStatus}`);
      console.log("[Update] Status change will be automatically logged by trigger");
      setParticipant(prev => prev ? { ...prev, status: newStatus } : null);
      
      toast({
        title: "상태 변경 완료",
        description: `참가자 상태가 "${oldStatus || '미정'}"에서 "${newStatus}"로 변경되었습니다.`,
      });
    } catch (error) {
      console.error("[Error] Failed to update status:", error);
      toast({
        title: "오류",
        description: "상태 변경에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleCall = () => {
    if (participant?.phone) {
      window.location.href = `tel:${participant.phone}`;
    }
  };

  const handleSMS = () => {
    if (participant?.phone) {
      window.location.href = `sms:${participant.phone}`;
    }
  };

  const handleEmail = () => {
    if (participant?.email) {
      window.location.href = `mailto:${participant.email}`;
    }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <User className="h-6 w-6 text-primary" />
            참가자 상세 정보
          </DialogTitle>
          <DialogDescription>
            참가자의 상세 정보를 확인하고 관리할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : participant ? (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold">{participant.name}</h3>
                  {participant.position && (
                    <p className="text-sm text-muted-foreground">{participant.position}</p>
                  )}
                </div>
                <Badge variant={getStatusBadgeVariant(participant.status)} className="text-sm">
                  {participant.status || "미정"}
                </Badge>
              </div>

              {participant.organization && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building className="h-4 w-4" />
                  <span>{participant.organization}</span>
                </div>
              )}
            </div>

            {/* Contact Information */}
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">연락처 정보</h4>
              <div className="grid gap-3">
                {participant.phone && (
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{participant.phone}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCall}
                        className="gap-2"
                      >
                        <Phone className="h-3 w-3" />
                        통화
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSMS}
                        className="gap-2"
                      >
                        <MessageSquare className="h-3 w-3" />
                        문자
                      </Button>
                    </div>
                  </div>
                )}

                {participant.email && (
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{participant.email}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEmail}
                      className="gap-2"
                    >
                      <Mail className="h-3 w-3" />
                      이메일
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Status Management */}
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">상태 관리</h4>
              <Select
                value={participant.status || ""}
                onValueChange={handleStatusChange}
                disabled={statusUpdating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="registered">참석</SelectItem>
                  <SelectItem value="cancelled">취소</SelectItem>
                  <SelectItem value="pending">대기</SelectItem>
                  <SelectItem value="inactive">비활성</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            {participant.memo && (
              <div className="space-y-3">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  비고
                </h4>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm whitespace-pre-wrap">{participant.memo}</p>
                </div>
              </div>
            )}

            {/* Metadata */}
            {participant.last_modified_at && (
              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  최근 수정: {new Date(participant.last_modified_at).toLocaleString("ko-KR")}
                  {participant.last_modified_by && ` (${participant.last_modified_by})`}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            참가자 정보를 찾을 수 없습니다.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
