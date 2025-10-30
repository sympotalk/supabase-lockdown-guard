// [71-J.2-FINAL] Participant detail drawer panel
import { useEffect, useState, useCallback } from "react";
import { X, Save, User, Building2, Phone, Mail, Code, Bed, Award, Trash2, Undo2, History, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  call_status?: string;
  call_updated_at?: string;
  call_actor?: string;
  call_memo?: string;
}

interface TMHistoryLog {
  id: string;
  action_type: string;
  before_value: string | null;
  after_value: string | null;
  created_at: string;
  actor_id: string;
  profiles?: { email: string };
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
  const [tmHistory, setTmHistory] = useState<TMHistoryLog[]>([]);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const participant = participants.find((p) => p.id === selectedRowId) || null;

  useEffect(() => {
    setLocalData(participant);
    if (participant?.id) {
      fetchTMHistory(participant.id);
    }
  }, [participant]);

  // [Phase 72–RM.TM.HISTORY.TRACE] Fetch TM history for selected participant
  const fetchTMHistory = async (participantId: string) => {
    try {
      const { data, error } = await supabase
        .from("tm_history_logs")
        .select(`
          id,
          action_type,
          before_value,
          after_value,
          created_at,
          actor_id,
          profiles:actor_id (email)
        `)
        .eq("participant_id", participantId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("[Phase 72] TM history fetch error:", error);
        return;
      }
      
      setTmHistory(data || []);
    } catch (error) {
      console.error("[Phase 72] TM history fetch error:", error);
    }
  };

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

  // [Phase 72–RM.TM.STATUS.UNIFY] Handle call status change
  const handleCallStatusChange = async (newStatus: string) => {
    if (!localData) return;

    const oldStatus = localData.call_status || '대기중';

    const { error } = await supabase
      .from("participants")
      .update({ 
        call_status: newStatus,
        call_updated_at: new Date().toISOString(),
        call_actor: user?.id
      })
      .eq("id", localData.id);

    if (error) {
      console.error("[DrawerPanel] Call status update error:", error);
      toast.error("상태 변경에 실패했습니다");
      return;
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      agency_id: localData.agency_id,
      event_id: localData.event_id,
      type: "tm.status_update",
      title: "TM 상태 변경",
      description: `${localData.name}: ${oldStatus} → ${newStatus}`,
      created_by: user?.id
    });

    setLocalData({ 
      ...localData, 
      call_status: newStatus,
      call_updated_at: new Date().toISOString(),
      call_actor: user?.id
    });
    
    toast.success(`TM 상태가 '${newStatus}'(으)로 변경되었습니다`, { duration: 1200 });
    
    // Show rooming notification if applicable
    if (newStatus === '불참' || newStatus === 'TM완료(불참)') {
      toast.info("참석자 불참 처리로 객실 배정이 해제되었습니다", { duration: 2000 });
    } else if (newStatus === '응답(참석)' || newStatus === 'TM완료(참석)') {
      toast.info("참석자 확정으로 객실 배정이 활성화되었습니다", { duration: 2000 });
    }
    
    onUpdate();
  };

  // [Phase 72–RM.TM.STATUS.UNIFY] Handle call memo save
  const handleCallMemoSave = async (memo: string) => {
    if (!localData) return;

    const { error } = await supabase
      .from("participants")
      .update({ 
        call_memo: memo
      })
      .eq("id", localData.id);

    if (error) {
      console.error("[DrawerPanel] Call memo save error:", error);
      toast.error("메모 저장에 실패했습니다");
      return;
    }

    toast.success("콜 메모가 저장되었습니다", { duration: 1200 });
    fetchTMHistory(localData.id);
    onUpdate();
  };

  // [Phase 72–RM.TM.HISTORY.TRACE] Restore TM status/memo from history
  const handleRestoreTM = async () => {
    if (!selectedLogId || !localData) return;

    try {
      const { data, error } = await supabase.rpc("restore_tm_status", {
        p_log_id: selectedLogId,
      });

      if (error) throw error;

      const response = data as any;
      
      if (response?.status === "success") {
        const resultType = response.result?.type;
        const restoredValue = response.result?.restored_value;
        
        toast.success(
          resultType === "status"
            ? `이전 TM 상태로 복원되었습니다 (${restoredValue})`
            : "이전 메모로 복원되었습니다"
        );
        
        fetchTMHistory(localData.id);
        onUpdate();
      } else {
        throw new Error(response?.message || "복원 실패");
      }
    } catch (error: any) {
      console.error("[Phase 72] TM restore error:", error);
      toast.error(error.message || "복원 중 오류가 발생했습니다");
    } finally {
      setRestoreDialogOpen(false);
      setSelectedLogId(null);
    }
  };

  // [Phase 72–RM.TM.STATUS.UNIFY] Get call status color
  const getCallStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      '대기중': 'bg-slate-300 text-slate-700',
      '응답(참석)': 'bg-green-500 text-white',
      '응답(미정)': 'bg-yellow-500 text-white',
      '불참': 'bg-red-400 text-white',
      'TM예정': 'bg-blue-500 text-white',
      'TM완료(참석)': 'bg-purple-600 text-white',
      'TM완료(불참)': 'bg-slate-600 text-white'
    };
    return colorMap[status] || 'bg-slate-300 text-slate-700';
  };

  // [Phase 72–RM.TM.STATUS.UNIFY] Get call status icon
  const getCallStatusIcon = (status: string) => {
    const iconMap: Record<string, string> = {
      '대기중': '🔵',
      '응답(참석)': '🟢',
      '응답(미정)': '🟡',
      '불참': '🔴',
      'TM예정': '🔷',
      'TM완료(참석)': '🟣',
      'TM완료(불참)': '⚫'
    };
    return iconMap[status] || '🔵';
  };

  if (!localData) return null;

  const isQAOrMaster = user?.role === "master" || user?.role === "admin";

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

          {/* TM Status Section with History */}
          <DrawerSection title="TM 상태 / 모객 진행" icon={<Phone className="h-4 w-4" />}>
            <Tabs defaultValue="status" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="status">상태 관리</TabsTrigger>
                {isQAOrMaster && (
                  <TabsTrigger value="history">
                    <History className="h-3.5 w-3.5 mr-1" />
                    이력
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="status" className="space-y-4 mt-0">
                {/* Current Status Display */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">현재 상태</Label>
                  <Badge 
                    className={cn(
                      "text-sm font-semibold",
                      getCallStatusColor(localData.call_status || '대기중')
                    )}
                  >
                    {getCallStatusIcon(localData.call_status || '대기중')} {localData.call_status || '대기중'}
                  </Badge>
                </div>

                {/* Status Change Buttons */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">상태 변경</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      '대기중',
                      '응답(참석)',
                      '응답(미정)',
                      '불참',
                      'TM예정',
                      'TM완료(참석)',
                      'TM완료(불참)'
                    ].map((status) => (
                      <Button
                        key={status}
                        variant={localData.call_status === status ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleCallStatusChange(status)}
                        className={cn(
                          "justify-start text-xs h-8",
                          localData.call_status === status && getCallStatusColor(status)
                        )}
                      >
                        {getCallStatusIcon(status)} {status}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Call Memo */}
                <div>
                  <Label htmlFor="call_memo" className="text-sm font-medium">
                    콜 내용 메모
                  </Label>
                  <Textarea
                    id="call_memo"
                    value={localData.call_memo || ""}
                    onChange={(e) => setLocalData({ ...localData, call_memo: e.target.value })}
                    onBlur={(e) => {
                      if (e.target.value !== (localData.call_memo || "")) {
                        handleCallMemoSave(e.target.value);
                      }
                    }}
                    placeholder="TM 통화 내용을 입력하세요..."
                    className="mt-1 min-h-[80px]"
                  />
                </div>

                {/* Last Updated Info */}
                {localData.call_updated_at && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    최근 수정: {new Date(localData.call_updated_at).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}
              </TabsContent>

              {isQAOrMaster && (
                <TabsContent value="history" className="space-y-3 mt-0">
                  {tmHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      변경 이력이 없습니다
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {tmHistory.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <div className="text-sm font-medium">
                                {log.action_type === "상태변경" ? "🔄 상태 변경" : "📝 메모 수정"}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 break-words">
                                {log.before_value || "(없음)"} → {log.after_value || "(없음)"}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedLogId(log.id);
                                setRestoreDialogOpen(true);
                              }}
                              className="shrink-0"
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div>담당자: {log.profiles?.email || "알 수 없음"}</div>
                            <div>일시: {new Date(log.created_at).toLocaleString("ko-KR", {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              )}
            </Tabs>
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

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이전 상태로 복원</AlertDialogTitle>
            <AlertDialogDescription>
              이전 TM 상태로 복원하시겠습니까? 
              복원 시 현재 데이터가 변경되며, 숙박 배정도 자동으로 조정됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreTM}>복원하기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
