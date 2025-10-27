// [LOCKED][71-I.QA3-FIX.R10] Participant fixed right panel with SFE codes
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Phone, Building2, User, Mail, Code } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SmartBadges } from "./SmartBadges";
import { useUser } from "@/context/UserContext";

// [71-I.QA3-FIX.R10] Use actual DB schema with SFE codes
interface Participant {
  id: string;
  name: string;
  organization?: string;
  phone?: string;
  email?: string;
  memo?: string;
  team_name?: string;
  manager_name?: string;
  manager_phone?: string;
  manager_info?: {
    team_name?: string;
    manager_name?: string;
    phone?: string;
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
  onUpdate?: () => void;
  onDelete?: () => void;
}

export function ParticipantRightPanel({
  participant,
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
    }
  };

  if (!localData) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/10">
        <p className="text-sm text-muted-foreground">참가자를 선택하세요</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header */}
      <div className="p-6 border-b bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{localData.name}</h2>
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
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{localData.name}</span>
              </div>
              {localData.organization && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{localData.organization}</span>
                </div>
              )}
              {localData.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{localData.phone}</span>
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

          {/* Manager Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">담당자 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">팀명</Label>
                <Input
                  value={localData?.manager_info?.team_name || localData?.team_name || ""}
                  onChange={(e) => {
                    if (!localData) return;
                    const newInfo = { ...localData.manager_info, team_name: e.target.value };
                    setLocalData({ ...localData, manager_info: newInfo });
                  }}
                  onBlur={(e) => {
                    const newInfo = { ...localData?.manager_info, team_name: e.target.value };
                    handleFieldChange("manager_info", newInfo);
                  }}
                  placeholder="예: 영업1팀"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">담당자 성명</Label>
                <Input
                  value={localData?.manager_info?.manager_name || localData?.manager_name || ""}
                  onChange={(e) => {
                    if (!localData) return;
                    const newInfo = { ...localData.manager_info, manager_name: e.target.value };
                    setLocalData({ ...localData, manager_info: newInfo });
                  }}
                  onBlur={(e) => {
                    const newInfo = { ...localData?.manager_info, manager_name: e.target.value };
                    handleFieldChange("manager_info", newInfo);
                  }}
                  placeholder="예: 홍길동"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">담당자 연락처</Label>
                <Input
                  value={localData?.manager_info?.phone || localData?.manager_phone || ""}
                  onChange={(e) => {
                    if (!localData) return;
                    const newInfo = { ...localData.manager_info, phone: e.target.value };
                    setLocalData({ ...localData, manager_info: newInfo });
                  }}
                  onBlur={(e) => {
                    const newInfo = { ...localData?.manager_info, phone: e.target.value };
                    handleFieldChange("manager_info", newInfo);
                  }}
                  placeholder="예: 010-1234-5678"
                  className="h-8 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* SFE Codes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Code className="h-4 w-4" />
                SFE 코드
              </CardTitle>
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
                  placeholder="예: AGN-001"
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
                  placeholder="예: CUS-001"
                  className="h-8 text-sm font-mono"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
