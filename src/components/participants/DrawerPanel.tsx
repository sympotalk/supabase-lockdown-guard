// [71-J.2-FINAL] Participant detail drawer panel
import { useEffect, useState, useCallback } from "react";
import { X, Save, User, Building2, Phone, Mail, Code, Bed, Award, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useParticipantsPanel } from "@/state/participantsPanel";
import { DrawerSection } from "./DrawerSection";
import { SmartBadges } from "./SmartBadges";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import "@/styles/participants.css";

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
  manager_info?: any;
  sfe_agency_code?: string;
  sfe_customer_code?: string;
  fixed_role?: string;
  custom_role?: string;
  participant_no?: number;
  agency_id?: string;
  event_id?: string;
  lodging_status?: string;
  stay_status?: string;
  companion?: string;
  companion_memo?: string;
  adult_count?: number;
  child_ages?: string[];
}

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

interface DrawerPanelProps {
  participants: Participant[];
  onUpdate: () => void;
}

export function DrawerPanel({ participants, onUpdate }: DrawerPanelProps) {
  const { selectedRowId, isOpen, close } = useParticipantsPanel();
  const { user } = useUser();
  const [localData, setLocalData] = useState<Participant | null>(null);

  const participant = participants.find((p) => p.id === selectedRowId) || null;

  useEffect(() => {
    setLocalData(participant);
  }, [participant]);

  // ESC to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, close]);

  const saveField = useCallback(
    debounce(async (patch: Record<string, any>) => {
      if (!localData?.id || !user?.id) return;
      
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
        console.error("[DrawerPanel] Save error:", error);
        toast.error("저장 중 오류가 발생했습니다.");
        onUpdate();
      } else {
        await supabase.from("participants_log").insert({
          participant_id: localData.id,
          action: "update",
          changed_fields: patch,
          edited_by: user.id,
          edited_at: new Date().toISOString()
        });

        toast.success("저장되었습니다");
        onUpdate();
      }
    }, 500),
    [localData?.id, user?.id, onUpdate]
  );

  const handleFieldChange = (field: string, value: any) => {
    if (!localData) return;
    setLocalData({ ...localData, [field]: value });
    saveField({ [field]: value });
  };

  if (!localData) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className={cn("drawer-overlay", isOpen && "visible")}
        onClick={close}
      />

      {/* Drawer */}
      <div className={cn("drawer-panel", isOpen && "open")}>
        <div className="drawer-header px-4 py-3 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary">{localData.name}</h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={close}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-3">
          {/* Badge Section */}
          <div id="badge-section">
            <DrawerSection title="구분 (Badge)" icon={<Award className="h-4 w-4" />} defaultOpen>
              <div className="space-y-3">
                {/* Fixed role badges */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">고정 뱃지 (단일 선택)</Label>
                  <div className="flex gap-2 flex-wrap">
                    {['좌장', '연자', '참석자'].map((role) => (
                      <Badge
                        key={role}
                        variant={localData.fixed_role === role ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                          localData.fixed_role === role && role === '좌장' && "bg-[#6E59F6] text-white hover:bg-[#6E59F6]/90",
                          localData.fixed_role === role && role === '연자' && "bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90",
                          localData.fixed_role === role && role === '참석자' && "bg-[#9CA3AF] text-white hover:bg-[#9CA3AF]/90",
                          localData.fixed_role !== role && "hover:bg-muted"
                        )}
                        onClick={async () => {
                          const newRole = localData.fixed_role === role ? null : role;
                          setLocalData({ ...localData, fixed_role: newRole || undefined });
                          
                          const { error } = await supabase
                            .from("participants")
                            .update({ 
                              fixed_role: newRole,
                              last_edited_by: user?.id,
                              last_edited_at: new Date().toISOString()
                            })
                            .eq("id", localData.id);

                          if (error) {
                            console.error("[72-RM.BADGE.PANEL] Error updating fixed_role:", error);
                            toast.error("저장에 실패했습니다. 다시 시도해주세요.");
                          } else {
                            // Log activity
                            await supabase.from("activity_logs").insert({
                              title: "구분 변경",
                              description: newRole ? `구분이 '${newRole}'(으)로 변경되었습니다.` : "구분 선택이 해제되었습니다.",
                              type: "role.update_fixed",
                              created_by: user?.id,
                              agency_id: localData.agency_id,
                              event_id: localData.event_id
                            });

                            toast.success(
                              newRole ? `구분이 '${newRole}'(으)로 변경되었습니다.` : "구분 선택이 해제되었습니다.",
                              { duration: 1200 }
                            );
                            onUpdate();
                          }
                        }}
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Custom role input */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">추가 뱃지 (직접입력)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={localData?.custom_role || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 12) {
                          setLocalData({ ...localData, custom_role: value });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      onBlur={async (e) => {
                        const trimmed = e.target.value.trim();
                        if (trimmed === localData?.custom_role?.trim()) return;

                        const { error } = await supabase
                          .from("participants")
                          .update({ 
                            custom_role: trimmed || null,
                            last_edited_by: user?.id,
                            last_edited_at: new Date().toISOString()
                          })
                          .eq("id", localData.id);

                        if (error) {
                          console.error("[72-RM.BADGE.PANEL] Error updating custom_role:", error);
                          toast.error("저장에 실패했습니다. 다시 시도해주세요.");
                        } else {
                          // Log activity
                          await supabase.from("activity_logs").insert({
                            title: "추가 뱃지 변경",
                            description: trimmed ? `추가 뱃지 '${trimmed}'가 저장되었습니다.` : "추가 뱃지가 삭제되었습니다.",
                            type: "role.update_custom",
                            created_by: user?.id,
                            agency_id: localData.agency_id,
                            event_id: localData.event_id
                          });

                          toast.success(
                            trimmed ? `추가 뱃지 '${trimmed}'가 저장되었습니다.` : "추가 뱃지가 삭제되었습니다.",
                            { duration: 1200 }
                          );
                          onUpdate();
                        }
                      }}
                      placeholder="최대 12자"
                      maxLength={12}
                      className="h-8 text-sm flex-1"
                    />
                    {localData?.custom_role && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={async () => {
                          setLocalData({ ...localData, custom_role: undefined });
                          
                          const { error } = await supabase
                            .from("participants")
                            .update({ 
                              custom_role: null,
                              last_edited_by: user?.id,
                              last_edited_at: new Date().toISOString()
                            })
                            .eq("id", localData.id);

                          if (error) {
                            console.error("[72-RM.BADGE.PANEL] Error clearing custom_role:", error);
                            toast.error("저장에 실패했습니다. 다시 시도해주세요.");
                          } else {
                            toast.success("추가 뱃지가 삭제되었습니다.", { duration: 1200 });
                            onUpdate();
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    좌장/연자/참석자는 상호배타(1개). 추가 뱃지는 1개만 입력 가능합니다.
                  </p>
                </div>
              </div>
            </DrawerSection>
          </div>

          {/* Basic Info */}
          <DrawerSection title="기본 정보" icon={<User className="h-4 w-4" />} defaultOpen>
            <div className="space-y-2">
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
            </div>
          </DrawerSection>

          {/* Manager Info */}
          <DrawerSection title="담당자 정보" icon={<Building2 className="h-4 w-4" />}>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">팀명</Label>
                <Input
                  value={localData?.manager_info?.team_name || localData?.team_name || ""}
                  onChange={(e) => {
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
            </div>
          </DrawerSection>

          {/* Lodging */}
          <DrawerSection title="숙박 및 룸핑" icon={<Bed className="h-4 w-4" />}>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">숙박 여부</Label>
                <select
                  value={localData?.lodging_status || ""}
                  onChange={(e) => {
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
              </div>
              {localData?.lodging_status === "직접입력" && (
                <Input
                  value={localData?.stay_status || ""}
                  onChange={(e) => setLocalData({ ...localData, stay_status: e.target.value })}
                  onBlur={(e) => handleFieldChange("stay_status", e.target.value)}
                  placeholder="예: 1박 2일"
                  className="h-8 text-sm"
                />
              )}
              <div className="space-y-1">
                <Label className="text-xs">동반인</Label>
                <Input
                  value={localData?.companion || ""}
                  onChange={(e) => setLocalData({ ...localData, companion: e.target.value })}
                  onBlur={(e) => handleFieldChange("companion", e.target.value)}
                  placeholder="예: 홍길동(배우자)"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">동반인 메모</Label>
                <Textarea
                  value={localData?.companion_memo || ""}
                  onChange={(e) => setLocalData({ ...localData, companion_memo: e.target.value })}
                  onBlur={(e) => handleFieldChange("companion_memo", e.target.value)}
                  placeholder="추가 메모..."
                  className="min-h-[60px] resize-none text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">성인 인원</Label>
                <Input
                  type="number"
                  min="0"
                  value={localData?.adult_count ?? 1}
                  onChange={(e) => {
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
          </DrawerSection>

          {/* Requests (SmartBadges) - Already has Card wrapper */}
          <SmartBadges
            currentMemo={localData?.memo || ""}
            onMemoChange={(newMemo) => handleFieldChange("memo", newMemo)}
          />

          {/* SFE Codes */}
          <DrawerSection title="SFE 코드" icon={<Code className="h-4 w-4" />} defaultOpen={false}>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Agency Code</Label>
                <Input
                  value={localData?.sfe_agency_code || ""}
                  onChange={(e) => setLocalData({ ...localData, sfe_agency_code: e.target.value })}
                  onBlur={(e) => handleFieldChange("sfe_agency_code", e.target.value)}
                  placeholder="예: AG001"
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Customer Code</Label>
                <Input
                  value={localData?.sfe_customer_code || ""}
                  onChange={(e) => setLocalData({ ...localData, sfe_customer_code: e.target.value })}
                  onBlur={(e) => handleFieldChange("sfe_customer_code", e.target.value)}
                  placeholder="예: CU001"
                  className="h-8 text-sm font-mono"
                />
              </div>
            </div>
          </DrawerSection>
        </div>
      </div>
    </>
  );
}
