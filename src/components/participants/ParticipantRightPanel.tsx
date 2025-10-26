// [LOCKED][71-I.QA2] Participant right panel with inline save & optimistic updates
import { useEffect, useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Phone, Building2, User, Hash, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SmartBadges } from "./SmartBadges";
import { useUser } from "@/context/UserContext";

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
  status?: string;
}

// [LOCKED][QA2] Debounce utility
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

interface ParticipantRightPanelProps {
  participant: Participant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
  onDelete?: () => void;
}

export function ParticipantRightPanel({
  participant,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: ParticipantRightPanelProps) {
  const { user } = useUser();
  const [localData, setLocalData] = useState<Participant | null>(null);

  useEffect(() => {
    setLocalData(participant);
  }, [participant]);

  // [LOCKED][QA2] Optimistic + debounced inline save
  const saveField = useCallback(
    debounce(async (patch: Record<string, any>) => {
      if (!localData?.id) return;
      
      const { error } = await supabase
        .from("participants")
        .update(patch)
        .eq("id", localData.id);

      if (error) {
        console.error("[QA2] Save error:", error);
        toast.error("저장 실패");
        onUpdate?.(); // Revalidate on error
      } else {
        console.log("[QA2] Field saved:", Object.keys(patch));
        onUpdate?.();
      }
    }, 500),
    [localData?.id, onUpdate]
  );

  const handleFieldChange = (field: string, value: any) => {
    if (!localData) return;
    
    // Optimistic update
    setLocalData({ ...localData, [field]: value });
    
    // Debounced save
    saveField({ [field]: value });
  };

  const handleDelete = async () => {
    if (!localData?.id) return;
    if (!confirm("이 참가자를 삭제하시겠습니까?")) return;

    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("id", localData.id);

    if (error) {
      console.error("[QA2] Delete error:", error);
      toast.error("삭제 실패");
    } else {
      console.log("[QA2] Participant deleted:", localData.id);
      toast.success("삭제되었습니다");
      onDelete?.();
      onOpenChange(false);
    }
  };

  if (!localData) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>{localData.participant_name}</span>
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
                <span className="font-medium">{localData.participant_name}</span>
              </div>
              {localData.company_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{localData.company_name}</span>
                </div>
              )}
              {localData.participant_contact && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{localData.participant_contact}</span>
                </div>
              )}
              {localData.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{localData.email}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Memo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">메모</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="메모 입력..."
                value={localData?.memo || ""}
                onChange={(e) => {
                  if (!localData) return;
                  setLocalData({ ...localData, memo: e.target.value });
                }}
                onBlur={(e) => handleFieldChange("memo", e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </CardContent>
          </Card>

          {/* SmartBadges */}
          <SmartBadges
            currentMemo={localData?.memo || ""}
            onMemoChange={(newMemo) => handleFieldChange("memo", newMemo)}
          />

          {/* Stay Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">숙박 예정</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={localData?.stay_plan || "none"}
                onValueChange={(value) => handleFieldChange("stay_plan", value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">선택 안함</SelectItem>
                  <SelectItem value="미숙박">미숙박</SelectItem>
                  <SelectItem value="1일차">1일차</SelectItem>
                  <SelectItem value="2일차">2일차</SelectItem>
                  <SelectItem value="직접입력">직접입력</SelectItem>
                </SelectContent>
              </Select>
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
                  value={localData?.manager_info?.team || ""}
                  onChange={(e) => {
                    if (!localData) return;
                    setLocalData({
                      ...localData,
                      manager_info: { ...localData.manager_info, team: e.target.value },
                    });
                  }}
                  onBlur={(e) => {
                    const updatedInfo = { ...localData?.manager_info, team: e.target.value };
                    handleFieldChange("manager_info", updatedInfo);
                  }}
                  placeholder="예: 영업1팀"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">담당자 성명</Label>
                <Input
                  value={localData?.manager_info?.name || ""}
                  onChange={(e) => {
                    if (!localData) return;
                    setLocalData({
                      ...localData,
                      manager_info: { ...localData.manager_info, name: e.target.value },
                    });
                  }}
                  onBlur={(e) => {
                    const updatedInfo = { ...localData?.manager_info, name: e.target.value };
                    handleFieldChange("manager_info", updatedInfo);
                  }}
                  placeholder="예: 홍길동"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">담당자 연락처</Label>
                <Input
                  value={localData?.manager_info?.contact || ""}
                  onChange={(e) => {
                    if (!localData) return;
                    setLocalData({
                      ...localData,
                      manager_info: { ...localData.manager_info, contact: e.target.value },
                    });
                  }}
                  onBlur={(e) => {
                    const updatedInfo = { ...localData?.manager_info, contact: e.target.value };
                    handleFieldChange("manager_info", updatedInfo);
                  }}
                  placeholder="예: 010-1234-5678"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">사번</Label>
                <Input
                  value={localData?.manager_info?.emp_no || ""}
                  onChange={(e) => {
                    if (!localData) return;
                    setLocalData({
                      ...localData,
                      manager_info: { ...localData.manager_info, emp_no: e.target.value },
                    });
                  }}
                  onBlur={(e) => {
                    const updatedInfo = { ...localData?.manager_info, emp_no: e.target.value };
                    handleFieldChange("manager_info", updatedInfo);
                  }}
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
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">거래처 코드</Label>
                <Input
                  value={localData?.sfe_agency_code || ""}
                  onChange={(e) => {
                    if (!localData) return;
                    setLocalData({ ...localData, sfe_agency_code: e.target.value });
                  }}
                  onBlur={(e) => handleFieldChange("sfe_agency_code", e.target.value)}
                  placeholder="SFE 거래처 코드"
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">고객 코드</Label>
                <Input
                  value={localData?.sfe_customer_code || ""}
                  onChange={(e) => {
                    if (!localData) return;
                    setLocalData({ ...localData, sfe_customer_code: e.target.value });
                  }}
                  onBlur={(e) => handleFieldChange("sfe_customer_code", e.target.value)}
                  placeholder="SFE 고객 코드"
                  className="h-8 text-sm font-mono"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
