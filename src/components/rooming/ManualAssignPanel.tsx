// [72-RULE.R2] Manual Room Assignment Panel
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, AlertCircle } from "lucide-react";

interface ManualAssignPanelProps {
  eventId: string;
  participantId: string;
  participantName: string;
  roomTypes: Array<{ name: string; credit: number }>;
  currentAssignment?: {
    room_type: string;
    room_credit: number;
    manual_assigned: boolean;
  };
  onUpdate: () => void;
}

export default function ManualAssignPanel({
  eventId,
  participantId,
  participantName,
  roomTypes,
  currentAssignment,
  onUpdate,
}: ManualAssignPanelProps) {
  const [selectedRoomType, setSelectedRoomType] = useState<string>("");
  const [selectedCredit, setSelectedCredit] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentAssignment) {
      setSelectedRoomType(currentAssignment.room_type);
      setSelectedCredit(currentAssignment.room_credit);
    }
  }, [currentAssignment]);

  const handleRoomTypeChange = (roomType: string) => {
    setSelectedRoomType(roomType);
    const room = roomTypes.find((r) => r.name === roomType);
    if (room) {
      setSelectedCredit(room.credit);
    }
  };

  const handleSave = async () => {
    if (!selectedRoomType) {
      toast.error("객실 타입을 선택해주세요");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("rooming_participants")
        .upsert({
          event_id: eventId,
          participant_id: participantId,
          room_type: selectedRoomType,
          room_credit: selectedCredit,
          manual_assigned: true,
          assigned_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success("수동 배정이 저장되었습니다", { duration: 1200 });
      onUpdate();
    } catch (error: any) {
      toast.error("저장 실패: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToAuto = async () => {
    setSaving(true);
    try {
      // Delete existing assignment
      const { error: deleteError } = await supabase
        .from("rooming_participants")
        .delete()
        .eq("event_id", eventId)
        .eq("participant_id", participantId);

      if (deleteError) throw deleteError;

      // Trigger auto-assignment by updating participant
      const { error: updateError } = await supabase
        .from("participants")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", participantId);

      if (updateError) throw updateError;

      toast.success("자동 배정으로 전환되었습니다", { duration: 1200 });
      onUpdate();
    } catch (error: any) {
      toast.error("전환 실패: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">수동 객실 배정</h3>
        <p className="text-sm text-muted-foreground">{participantName}</p>
      </div>

      {currentAssignment && (
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">현재 배정</span>
            <Badge variant={currentAssignment.manual_assigned ? "default" : "secondary"}>
              {currentAssignment.manual_assigned ? "수동배정" : "자동배정"}
            </Badge>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">객실:</span>{" "}
            <span className="font-medium">{currentAssignment.room_type}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">룸크레딧:</span>{" "}
            <span className="font-medium">{currentAssignment.room_credit.toLocaleString()}원</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label>객실 타입 선택</Label>
          <Select value={selectedRoomType} onValueChange={handleRoomTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="객실 선택" />
            </SelectTrigger>
            <SelectContent>
              {roomTypes.map((room) => (
                <SelectItem key={room.name} value={room.name}>
                  {room.name} ({room.credit.toLocaleString()}원)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedRoomType && (
          <div className="p-4 bg-primary/10 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">배정 정보</span>
            </div>
            <div className="text-sm space-y-1">
              <p>
                객실: <span className="font-medium">{selectedRoomType}</span>
              </p>
              <p>
                룸크레딧: <span className="font-medium">{selectedCredit.toLocaleString()}원</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                수동 배정 시 자동 배정 규칙이 적용되지 않습니다.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          저장
        </Button>
        {currentAssignment?.manual_assigned && (
          <Button
            onClick={handleResetToAuto}
            disabled={saving}
            variant="outline"
            className="flex-1"
          >
            자동 배정으로 전환
          </Button>
        )}
      </div>
    </Card>
  );
}
