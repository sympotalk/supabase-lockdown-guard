// [LOCKED][71-I] Right panel with slide-in and editable fields
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SmartBadges } from "./SmartBadges";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Phone, Mail, Building2, User, Trash2 } from "lucide-react";
// Debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

interface Participant {
  id: string;
  participant_name: string;
  company_name?: string;
  participant_contact?: string;
  email?: string;
  memo?: string;
  stay_plan?: string;
  manager_info?: {
    team?: string;
    name?: string;
    contact?: string;
    emp_no?: string;
  };
  sfe_agency_code?: string;
  sfe_customer_code?: string;
}

interface ParticipantRightPanelProps {
  participant: Participant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  onDelete?: (id: string) => void;
}

export function ParticipantRightPanel({
  participant,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: ParticipantRightPanelProps) {
  const [localMemo, setLocalMemo] = useState("");
  const [localStayPlan, setLocalStayPlan] = useState("");
  const [localManagerInfo, setLocalManagerInfo] = useState<any>({});

  useEffect(() => {
    if (participant) {
      setLocalMemo(participant.memo || "");
      setLocalStayPlan(participant.stay_plan || "");
      setLocalManagerInfo(participant.manager_info || {});
    }
  }, [participant]);

  const saveField = debounce(async (patch: any) => {
    if (!participant) return;

    const { error } = await supabase
      .from("participants")
      .update({ ...patch, updated_by: (await supabase.auth.getUser()).data.user?.id })
      .eq("id", participant.id);

    if (error) {
      toast.error("저장 실패: " + error.message);
    } else {
      toast.success("저장되었습니다");
      onUpdate();
    }
  }, 800);

  const handleMemoChange = (newMemo: string) => {
    setLocalMemo(newMemo);
    saveField({ memo: newMemo });
  };

  const handleManagerInfoChange = (field: string, value: string) => {
    const updated = { ...localManagerInfo, [field]: value };
    setLocalManagerInfo(updated);
    saveField({ manager_info: updated });
  };

  const handleDelete = async () => {
    if (!participant || !onDelete) return;
    if (!confirm(`"${participant.participant_name}"을(를) 삭제하시겠습니까?`)) return;

    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("id", participant.id);

    if (error) {
      toast.error("삭제 실패: " + error.message);
    } else {
      toast.success("삭제되었습니다");
      onDelete(participant.id);
      onOpenChange(false);
    }
  };

  if (!participant) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>{participant.participant_name}</span>
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{participant.participant_name}</span>
              </div>
              {participant.company_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{participant.company_name}</span>
                </div>
              )}
              {participant.participant_contact && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{participant.participant_contact}</span>
                </div>
              )}
              {participant.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{participant.email}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SmartBadges */}
          <SmartBadges currentMemo={localMemo} onMemoChange={handleMemoChange} />

          {/* Stay Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">숙박 예정</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {["미숙박", "1일차", "2일차", "전체"].map((plan) => (
                  <Button
                    key={plan}
                    size="sm"
                    variant={localStayPlan === plan ? "default" : "outline"}
                    onClick={() => {
                      setLocalStayPlan(plan);
                      saveField({ stay_plan: plan });
                    }}
                  >
                    {plan}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Manager Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">담당자 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">팀명</Label>
                <Input
                  value={localManagerInfo.team || ""}
                  onChange={(e) => handleManagerInfoChange("team", e.target.value)}
                  placeholder="예: 영업1팀"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">담당자 성명</Label>
                <Input
                  value={localManagerInfo.name || ""}
                  onChange={(e) => handleManagerInfoChange("name", e.target.value)}
                  placeholder="예: 홍길동"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">담당자 연락처</Label>
                <Input
                  value={localManagerInfo.contact || ""}
                  onChange={(e) => handleManagerInfoChange("contact", e.target.value)}
                  placeholder="예: 010-1234-5678"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">사번</Label>
                <Input
                  value={localManagerInfo.emp_no || ""}
                  onChange={(e) => handleManagerInfoChange("emp_no", e.target.value)}
                  placeholder="예: EMP001"
                  className="h-8 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* SFE Codes (bottom fixed) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">SFE 코드</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">거래처 코드</span>
                <span className="font-mono">{participant.sfe_agency_code || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">고객 코드</span>
                <span className="font-mono">{participant.sfe_customer_code || "-"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
