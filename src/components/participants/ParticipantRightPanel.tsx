// [LOCKED][71-I.QA3-FIX.R10] Participant fixed right panel with SFE codes
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Trash2, Phone, Building2, User, Mail, Code } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SmartBadges } from "./SmartBadges";
import { useUser } from "@/context/UserContext";

// [Phase 73-L.7.31-G] Aligned participant interface with DB schema
interface Participant {
  id: string;
  name: string;
  organization?: string;
  phone?: string;
  email?: string;
  request_note?: string;
  team_name?: string;
  manager_name?: string;
  manager_phone?: string;
  manager_info?: {
    team_name?: string;
    manager_name?: string;
    phone?: string;
  };
  sfe_company_code?: string;
  sfe_customer_code?: string;
  status?: string;
  classification?: string;
  stay_status?: string;
  lodging_status?: string;
  companion?: string;
  companion_memo?: string;
  adult_count?: number;
  child_ages?: string[];
  recruitment_status?: string;
  message_sent?: string;
  survey_completed?: string;
  last_edited_by?: string;
  last_edited_at?: string;
  editor_email?: string;
  editor_display_name?: string;
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

  // [71-J.1] Save with logging
  const saveField = useCallback(
    debounce(async (patch: Record<string, any>) => {
      if (!localData?.id || !user?.id) return;
      
      // Add last_edited metadata
      const updateData = {
        ...patch,
        last_edited_by: user.id,
        last_edited_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("participants")
        .update(updateData)
        .eq("id", localData.id);

      if (error) {
        console.error("[71-J.1] Save error:", error);
        toast.error("수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        onUpdate?.();
      } else {
        // Log the change
        await supabase.from("participants_log").insert({
          participant_id: localData.id,
          action: "update",
          changed_fields: patch,
          edited_by: user.id,
          edited_at: new Date().toISOString()
        });

        console.log("[71-J.1] Field saved:", Object.keys(patch));
        
        // Show specific toast based on field
        const fieldKey = Object.keys(patch)[0];
        if (fieldKey === "stay_status" || fieldKey === "lodging_status") {
          toast.success("숙박 여부가 변경되었습니다.");
        } else if (fieldKey === "request_note") {
          toast.success("요청사항이 저장되었습니다.");
        } else if (fieldKey === "companion" || fieldKey === "companion_memo") {
          toast.success("동반자 정보가 반영되었습니다.");
        } else if (fieldKey === "manager_info") {
          toast.success("담당자 정보가 저장되었습니다.");
        } else if (fieldKey === "sfe_company_code" || fieldKey === "sfe_customer_code") {
          toast.success("SFE 코드가 업데이트되었습니다.");
        } else if (fieldKey === "adult_count" || fieldKey === "child_ages") {
          toast.success("참가자 동반 정보가 저장되었습니다.");
        } else {
          toast.success("저장되었습니다.");
        }
        
        onUpdate?.();
      }
    }, 500),
    [localData?.id, user?.id, onUpdate]
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
      <div className="h-full flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground text-center">
              참가자를 선택해주세요
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 bg-card">
      {/* Header */}
      <div className="p-4 border-b bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{localData.name}</h2>
            {localData.last_edited_by && localData.last_edited_at && (
              <Badge variant="outline" className="text-xs font-normal">
                <User className="h-3 w-3 mr-1" />
                {localData.editor_display_name || localData.editor_email || '수정됨'}
              </Badge>
            )}
          </div>
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
      <div className="flex-1 overflow-y-auto px-[14px] py-3">
        <div className="space-y-2">
          {/* Basic Info */}
          <Card className="mt-2">
            <CardHeader className="px-3 pt-3 pb-1">
              <CardTitle className="text-sm font-semibold mb-0">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pt-1 pb-3">
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

          {/* Request Note */}
          <Card className="mt-2">
            <CardHeader className="px-3 pt-3 pb-1">
              <CardTitle className="text-sm font-semibold mb-0">요청사항</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pt-1 pb-3">
              <Textarea
                placeholder="요청사항 입력..."
                value={localData?.request_note || ""}
                onChange={(e) => {
                  if (!localData) return;
                  setLocalData({ ...localData, request_note: e.target.value });
                }}
                onBlur={(e) => handleFieldChange("request_note", e.target.value)}
                className="min-h-[80px] resize-none text-sm"
              />
            </CardContent>
          </Card>

          {/* SmartBadges */}
          <SmartBadges
            currentMemo={localData?.request_note || ""}
            onMemoChange={(newMemo) => handleFieldChange("request_note", newMemo)}
          />

          {/* Lodging Status */}
          <Card className="mt-2">
            <CardHeader className="px-3 pt-3 pb-1">
              <CardTitle className="text-sm font-semibold mb-0">숙박 여부</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pt-1 pb-3">
              <select
                value={localData?.lodging_status || ""}
                onChange={(e) => {
                  if (!localData) return;
                  setLocalData({ ...localData, lodging_status: e.target.value });
                  handleFieldChange("lodging_status", e.target.value);
                }}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">숙박 상태 선택</option>
                <option value="미숙박">미숙박</option>
                <option value="1일차">1일차</option>
                <option value="2일차">2일차</option>
                <option value="직접입력">직접입력</option>
              </select>
              {localData?.lodging_status === "직접입력" && (
                <Input
                  value={localData?.stay_status || ""}
                  onChange={(e) => {
                    if (!localData) return;
                    setLocalData({ ...localData, stay_status: e.target.value });
                  }}
                  onBlur={(e) => handleFieldChange("stay_status", e.target.value)}
                  placeholder="예: 1박 2일"
                  className="h-8 text-sm"
                />
              )}
            </CardContent>
          </Card>

          {/* Companion Info */}
          <Card className="mt-2">
            <CardHeader className="px-3 pt-3 pb-1">
              <CardTitle className="text-sm font-semibold mb-0">동반자 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pt-1 pb-3">
              <Input
                value={localData?.companion || ""}
                onChange={(e) => {
                  if (!localData) return;
                  setLocalData({ ...localData, companion: e.target.value });
                }}
                onBlur={(e) => handleFieldChange("companion", e.target.value)}
                placeholder="예: 홍길동(배우자)"
                className="h-8 text-sm"
              />
              <Textarea
                value={localData?.companion_memo || ""}
                onChange={(e) => {
                  if (!localData) return;
                  setLocalData({ ...localData, companion_memo: e.target.value });
                }}
                onBlur={(e) => handleFieldChange("companion_memo", e.target.value)}
                placeholder="추가 메모를 입력하세요..."
                className="min-h-[60px] resize-none text-sm"
              />
            </CardContent>
          </Card>

          {/* Adult/Child Count */}
          <Card className="mt-2">
            <CardHeader className="px-3 pt-3 pb-1">
              <CardTitle className="text-sm font-semibold mb-0">참가자 동반 정보</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pt-1 pb-3">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">성인 인원</Label>
                  <Input
                    type="number"
                    min="0"
                    value={localData?.adult_count ?? 1}
                    onChange={(e) => {
                      if (!localData) return;
                      const value = parseInt(e.target.value) || 0;
                      setLocalData({ ...localData, adult_count: value });
                    }}
                    onBlur={(e) => handleFieldChange("adult_count", parseInt(e.target.value) || 0)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">소아 인원</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    value={localData?.child_ages?.length ?? 0}
                    onChange={(e) => {
                      if (!localData) return;
                      const count = parseInt(e.target.value) || 0;
                      const newAges = Array(count).fill('').map((_, i) => localData.child_ages?.[i] || '');
                      setLocalData({ ...localData, child_ages: newAges });
                    }}
                    onBlur={(e) => {
                      const count = parseInt(e.target.value) || 0;
                      const newAges = Array(count).fill('').map((_, i) => localData?.child_ages?.[i] || '');
                      handleFieldChange("child_ages", newAges);
                    }}
                    className="h-8 text-sm"
                  />
                </div>
                {(localData?.child_ages || []).map((age, index) => (
                  <div key={index} className="space-y-1">
                    <Label className="text-xs">{index + 1}번째 소아 나이</Label>
                    <Input
                      value={age}
                      onChange={(e) => {
                        if (!localData) return;
                        const updated = [...(localData.child_ages || [])];
                        updated[index] = e.target.value;
                        setLocalData({ ...localData, child_ages: updated });
                      }}
                      onBlur={(e) => {
                        const updated = [...(localData?.child_ages || [])];
                        updated[index] = e.target.value;
                        handleFieldChange("child_ages", updated);
                      }}
                      placeholder="예: 4세"
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Manager Info */}
          <Card className="mt-2">
            <CardHeader className="px-3 pt-3 pb-1">
              <CardTitle className="text-sm font-semibold mb-0">담당자 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pt-1 pb-3">
              <div className="space-y-1">
                <Label className="text-xs">팀명</Label>
                <Input
                  value={localData?.manager_info?.team_name || localData?.team_name || ""}
                  onChange={(e) => {
                    if (!localData) return;
                    const newInfo = { ...(localData.manager_info || {}), team_name: e.target.value };
                    setLocalData({ ...localData, manager_info: newInfo });
                  }}
                  onBlur={(e) => {
                    const newInfo = { ...(localData?.manager_info || {}), team_name: e.target.value };
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
                    const newInfo = { ...(localData.manager_info || {}), manager_name: e.target.value };
                    setLocalData({ ...localData, manager_info: newInfo });
                  }}
                  onBlur={(e) => {
                    const newInfo = { ...(localData?.manager_info || {}), manager_name: e.target.value };
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
                    const newInfo = { ...(localData.manager_info || {}), phone: e.target.value };
                    setLocalData({ ...localData, manager_info: newInfo });
                  }}
                  onBlur={(e) => {
                    const newInfo = { ...(localData?.manager_info || {}), phone: e.target.value };
                    handleFieldChange("manager_info", newInfo);
                  }}
                  placeholder="예: 010-1234-5678"
                  className="h-8 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* SFE Codes */}
          <Card className="mt-2">
            <CardHeader className="px-3 pt-3 pb-1">
              <CardTitle className="text-sm font-semibold mb-0 flex items-center gap-2">
                <Code className="h-4 w-4" />
                SFE 코드
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pt-1 pb-3">
              <div className="space-y-1">
                <Label className="text-xs">Company Code (거래처코드)</Label>
                <Input
                  value={localData?.sfe_company_code || ""}
                  onChange={(e) => {
                    if (!localData) return;
                    setLocalData({ ...localData, sfe_company_code: e.target.value });
                  }}
                  onBlur={(e) => handleFieldChange("sfe_company_code", e.target.value)}
                  placeholder={!localData?.sfe_company_code ? "없음" : ""}
                  className={`h-8 text-sm font-mono ${!localData?.sfe_company_code ? 'italic text-muted-foreground' : ''}`}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Customer Code (고객코드)</Label>
                <Input
                  value={localData?.sfe_customer_code || ""}
                  onChange={(e) => {
                    if (!localData) return;
                    setLocalData({ ...localData, sfe_customer_code: e.target.value });
                  }}
                  onBlur={(e) => handleFieldChange("sfe_customer_code", e.target.value)}
                  placeholder={!localData?.sfe_customer_code ? "없음" : ""}
                  className={`h-8 text-sm font-mono ${!localData?.sfe_customer_code ? 'italic text-muted-foreground' : ''}`}
                />
              </div>
            </CardContent>
          </Card>

          {/* Last Modified */}
          {localData.last_edited_at && (
            <Card className="mt-2">
              <CardHeader className="px-3 pt-3 pb-1">
                <CardTitle className="text-sm font-semibold mb-0">최종 수정 정보</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pt-1 pb-3">
                <p className="text-xs text-muted-foreground">
                  {new Date(localData.last_edited_at).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
