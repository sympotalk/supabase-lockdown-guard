// [72-RULE.R2] Rooming Management with Rules and Manual Assignment
// [Phase 77-A] AI Auto-Match Core Ruleset
import { supabase } from "@/integrations/supabase/client";
import useSWR from "swr";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import RulesPanel from "@/components/rooming/RulesPanel";
import ManualAssignPanel from "@/components/rooming/ManualAssignPanel";
import RoomingReportTab from "@/components/rooming/RoomingReportTab";
import RoomingVisualTab from "@/components/rooming/RoomingVisualTab";
import StockStatusCards from "@/components/rooming/StockStatusCards";
import RoomingVisualMapCards from "@/components/rooming/RoomingVisualMapCards";
import RebalancePreviewModal from "@/components/rooming/RebalancePreviewModal";
import AIFeedbackAnalytics from "@/components/rooming/AIFeedbackAnalytics";
import UserBiasProfile from "@/components/rooming/UserBiasProfile";

export default function RoomingTab() {
  const { eventId } = useParams();
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [isRunningAI, setIsRunningAI] = useState(false);
  const [isRunningWeighted, setIsRunningWeighted] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  // [Phase 77-H] Stock guard & rebalance states
  const [stockStatus, setStockStatus] = useState<any>(null);
  const [stockAlerts, setStockAlerts] = useState<any[]>([]);
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [rebalancePreview, setRebalancePreview] = useState<any>(null);
  const [showRebalanceModal, setShowRebalanceModal] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isApplyingRebalance, setIsApplyingRebalance] = useState(false);

  // [Phase 76-H.Fix] Load room types with proper join and sorting
  const { data: roomTypesData, mutate: mutateRoomTypes } = useSWR(
    eventId ? `room_types_real_${eventId}` : null,
    async () => {
      if (!eventId) return [];
      
      const { data, error } = await supabase
        .from("event_room_refs" as any)
        .select(`
          id,
          room_type_id,
          credit,
          room_types!inner(type_name)
        `)
        .eq("event_id", eventId)
        .eq("is_active", true)
        .order("credit", { ascending: true });

      if (error) {
        console.error('[Phase 76-H.Fix] Room types query error:', error);
        return [];
      }

      // Map to expected format with real names from joined room_types
      return (data || []).map((r: any) => ({
        id: r.id,
        name: r.room_types?.type_name || '미지정',
        credit: r.credit || 0
      }));
    },
    { revalidateOnFocus: false }
  );

  // [Phase 77-A.1] Load rooming statistics
  const loadRoomingStats = async () => {
    if (!eventId) return;
    try {
      const { data, error } = await supabase.rpc('ai_rooming_stats', { p_event_id: eventId });
      if (error) throw error;
      setStats(data);
    } catch (err) {
      console.error('[Phase 77-A.1] 통계 로드 실패:', err);
    }
  };

  // [Phase 77-H] Load stock status
  const loadStockStatus = async () => {
    if (!eventId) return;
    try {
      const { data, error } = await supabase
        .from('v_room_stock_status' as any)
        .select('*')
        .eq('event_id', eventId);
      
      if (error) throw error;

      const shortage = data?.filter((r: any) => r.remaining < 0).length || 0;
      const surplus = data?.filter((r: any) => r.remaining > 0).length || 0;
      const normal = data?.filter((r: any) => r.remaining === 0).length || 0;

      setStockStatus({ shortage, surplus, normal });
    } catch (err) {
      console.error('[Phase 77-H] 재고 현황 로드 실패:', err);
    }
  };

  // [Phase 77-H] Run stock guard
  const handleStockGuard = async () => {
    if (!eventId) return;
    
    setIsCheckingStock(true);
    try {
      const { data, error } = await supabase.rpc('ai_stock_guard', {
        p_event_id: eventId
      });

      if (error) throw error;

      const result = data as any;
      setStockAlerts(result.alerts || []);

      if (result.alerts && result.alerts.length > 0) {
        toast.warning('객실 재고 부족 감지', {
          description: `${result.alerts.length}개 객실타입에서 재고가 부족합니다.`
        });
      } else {
        toast.success('재고 점검 완료', {
          description: '모든 객실 재고가 정상입니다.'
        });
      }

      loadStockStatus();
    } catch (error: any) {
      console.error('[Phase 77-H] 재고 점검 실패:', error);
      toast.error('재고 점검 실패', {
        description: error.message
      });
    } finally {
      setIsCheckingStock(false);
    }
  };

  // [Phase 77-H] Load rebalance preview
  const handleRebalancePreview = async () => {
    if (!eventId || !currentUserId) return;
    
    setIsLoadingPreview(true);
    try {
      // Try bias-enabled preview first if user has learned preferences
      const { data, error } = await supabase.rpc('ai_rebalance_preview_with_bias', {
        p_event_id: eventId,
        p_user_id: currentUserId
      });

      if (error) throw error;

      const result = data as any;
      setRebalancePreview(result.preview || []);
      setShowRebalanceModal(true);

      if (!result.preview || result.preview.length === 0) {
        toast.info('리밸런스 불필요', {
          description: '재배정이 필요한 참가자가 없습니다.'
        });
      } else if (result.bias_enabled) {
        toast.success('개인화된 리밸런스 미리보기', {
          description: `사용자 성향이 반영되어 ${result.count}건의 재배정안이 생성되었습니다.`
        });
      }
    } catch (error: any) {
      console.error('[Phase 77-H] 리밸런스 미리보기 실패:', error);
      toast.error('미리보기 실패', {
        description: error.message
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // [Phase 77-H] Apply rebalance
  const handleApplyRebalance = async () => {
    if (!eventId || !rebalancePreview || rebalancePreview.length === 0) return;
    
    setIsApplyingRebalance(true);
    try {
      const { data, error } = await supabase.rpc('ai_rebalance_apply', {
        p_event_id: eventId,
        p_changes: rebalancePreview
      });

      if (error) throw error;

      const result = data as any;
      
      toast.success('리밸런스 적용 완료', {
        description: `${result.count}건의 재배정이 적용되었습니다.`
      });

      // [Phase 77-L] Update user bias after successful rebalance
      if (currentUserId) {
        supabase.rpc('ai_update_user_bias', {
          p_user_id: currentUserId,
          p_event_id: eventId
        }).then(({ data: biasData, error: biasError }) => {
          if (!biasError && biasData) {
            const biasResult = biasData as any;
            if (biasResult.updated_types > 0) {
              toast.info('학습 완료', {
                description: `${biasResult.updated_types}개 객실 타입 성향이 업데이트되었습니다.`
              });
            }
          }
        });
      }

      setShowRebalanceModal(false);
      setRebalancePreview(null);
      mutate();
      loadRoomingStats();
      loadStockStatus();
      setStockAlerts([]);
    } catch (error: any) {
      console.error('[Phase 77-H] 리밸런스 적용 실패:', error);
      toast.error('적용 실패', {
        description: error.message
      });
    } finally {
      setIsApplyingRebalance(false);
    }
  };

  useEffect(() => {
    if (!eventId) return;
    loadRoomingStats();
    loadStockStatus();
    
    // Get current user ID
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id);
      }
    });
  }, [eventId]);

  // [Phase 76-Pre.C] Realtime subscription for room types
  useEffect(() => {
    if (!eventId) return;

    const roomTypesChannel = supabase
      .channel(`event_room_refs_${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_room_refs", filter: `event_id=eq.${eventId}` },
        (payload) => {
          console.log("[Phase 76-Pre.C] Room types updated:", payload);
          mutateRoomTypes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomTypesChannel);
    };
  }, [eventId, mutateRoomTypes]);

  // [Phase 76-Pre.E] Fetch ALL participants with rooming and room type data
  const { data: roomingList, error, isLoading, mutate } = useSWR(
    eventId ? `rooming_${eventId}` : null,
    async () => {
      if (!eventId) return [];
      
      console.log('[Phase 76-H.Fix] Fetching rooming data from v_rooming_with_names view for event:', eventId);
      
      // [Phase 76-H.Fix] Use unified view with proper sorting by participant_no
      const { data: viewData, error: viewError } = await supabase
        .from("v_rooming_with_names" as any)
        .select("*")
        .eq("event_id", eventId)
        .order("participant_no", { ascending: true });
      
      if (viewError) {
        console.error('[Phase 76-H.Fix] View query error:', viewError);
        throw viewError;
      }
      
      // Map view data to expected format and ensure sort order is maintained
      const merged = (viewData || [])
        .map((item: any) => ({
          // Participant data
          participant_id: item.participant_id,
          participant_no: item.participant_no,
          name: item.participant_name,
          organization: item.organization,
          phone: item.phone,
          fixed_role: item.fixed_role,
          custom_role: item.custom_role,
          // Rooming data with room type names from view
          id: item.rooming_id,
          room_type: item.room_type_name || '미지정',
          room_type_id: item.room_type_id,
          room_credit: item.event_room_credit || item.room_credit || null,
          check_in: item.check_in,
          check_out: item.check_out,
          stay_days: item.stay_days,
          status: item.status || '대기',
          manual_assigned: item.manual_assigned || false,
          assigned_at: item.assigned_at,
          adults: 0,
          children: 0,
          infants: 0,
        }))
        .sort((a, b) => a.participant_no - b.participant_no);
      
      console.log('[Phase 76-H.Fix] Fetched', merged.length, 'participants with rooming data from view');
      
      return merged;
    },
    { 
      revalidateOnFocus: false, 
      dedupingInterval: 60000,
      onError: (err) => {
        console.error('[72-RULE.UI.BIND] SWR error:', err);
      }
    }
  );

  // [72-RULE.R2] Realtime subscription
  // [Phase 72–RM.BADGE.SYNC.RENUM] Also listen to participants table for role/number changes
  useEffect(() => {
    if (!eventId) return;

    console.log('[72-RULE.UI.BIND] Setting up realtime channel for event:', eventId);

    const roomingChannel = supabase
      .channel(`rooming_${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooming_participants", filter: `event_id=eq.${eventId}` },
        (payload) => {
          console.log("[72-RULE.UI.BIND] Rooming update detected:", payload);
          mutate();
        }
      )
      .subscribe((status) => {
        console.log('[72-RULE.UI.BIND] Realtime status:', status);
      });

    // Also subscribe to participants table for role changes that affect rooming
    const participantsChannel = supabase
      .channel(`participants_rooming_${eventId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "participants", filter: `event_id=eq.${eventId}` },
        (payload) => {
          console.log("[Phase 72] Participant role/number updated, refreshing rooming:", payload);
          mutate();
          loadRoomingStats(); // Refresh stats on participant update
        }
      )
      .subscribe();

    return () => {
      console.log('[72-RULE.UI.BIND] Cleaning up realtime channels');
      supabase.removeChannel(roomingChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [eventId, mutate]);

  // Data flow validation
  console.log("[72-RULE.UI.BIND] State - Loading:", isLoading, "Error:", error?.message, "Count:", roomingList?.length);

  if (isLoading) {
    return (
      <div className="p-6 text-muted-foreground">
        <p>참가자 룸핑 정보를 불러오는 중입니다...</p>
        <p className="text-xs mt-2">Event ID: {eventId}</p>
      </div>
    );
  }

  if (error) {
    console.error("[72-RULE.R2.FIX] Render error:", error);
    return (
      <div className="p-8 text-destructive bg-destructive/10 rounded-xl shadow-sm">
        <p className="font-medium">룸핑 데이터를 불러올 수 없습니다.</p>
        <p className="text-sm mt-1">{error.message}</p>
        <p className="text-xs mt-2 text-muted-foreground">
          페이지를 새로고침하거나, RLS 정책을 확인해주세요.
        </p>
      </div>
    );
  }

  // [Phase 77-A] AI 자동 배정 실행
  const handleRunAIMatching = async () => {
    if (!eventId) return;
    
    setIsRunningAI(true);
    try {
      const { data, error } = await supabase.rpc('ai_auto_assign_rooms', {
        p_event_id: eventId,
        p_dry_run: false
      });

      if (error) throw error;

      console.log('[Phase 77-A] AI 매칭 결과:', data);

      const result = data as any; // RPC 결과를 any로 캐스팅

      // 경고사항 표시
      if (result?.warnings && result.warnings.length > 0) {
        result.warnings.forEach((warning: any) => {
          if (warning.type === 'stock_shortage') {
            toast.warning('객실 재고 부족', {
              description: `일부 객실 타입의 재고가 부족합니다. 담당자 확인이 필요합니다.`,
              duration: 5000
            });
          } else if (warning.participant) {
            toast.warning(`${warning.participant}: ${warning.message}`, { duration: 4000 });
          }
        });
      }

      // 에러 표시
      if (result?.errors && result.errors.length > 0) {
        result.errors.forEach((error: any) => {
          toast.error(`${error.participant}: ${error.message}`, { duration: 4000 });
        });
      }

      if (result?.assigned > 0) {
        toast.success(`AI 자동 배정 완료`, {
          description: `${result.assigned}명의 참가자가 자동 배정되었습니다.`
        });
        mutate(); // 데이터 갱신
        loadRoomingStats(); // 통계 갱신
      } else {
        toast.info('배정 가능한 참가자가 없습니다', {
          description: '모든 참가자가 이미 수동 배정되었거나 조건을 충족하지 못했습니다.'
        });
      }
    } catch (error: any) {
      console.error('[Phase 77-A] AI 매칭 실패:', error);
      toast.error('AI 자동 배정 실패', {
        description: error.message
      });
    } finally {
      setIsRunningAI(false);
    }
  };

  // [Phase 77-G] AI 재배정 (요청사항 반영)
  const handleRunAIMatchingWeighted = async () => {
    if (!eventId) return;
    
    setIsRunningWeighted(true);
    try {
      const { data, error } = await supabase.rpc('ai_auto_assign_rooms_v2', {
        p_event_id: eventId,
        p_dry_run: false
      });

      if (error) throw error;

      console.log('[Phase 77-G] AI 가중 배정 결과:', data);

      const result = data as any;

      if (result?.assigned > 0) {
        toast.success('AI 요청사항 반영 재배정 완료', {
          description: `${result.assigned}명의 참가자가 요청사항 기반으로 재배정되었습니다.`
        });
        mutate();
        loadRoomingStats();
      } else {
        toast.info('재배정 가능한 참가자가 없습니다');
      }
    } catch (error: any) {
      console.error('[Phase 77-G] AI 가중 배정 실패:', error);
      toast.error('AI 재배정 실패', {
        description: error.message
      });
    } finally {
      setIsRunningWeighted(false);
    }
  };

  const getStatusBadge = (manualAssigned: boolean, roomType: string, roomStatus?: string) => {
    if (roomType === "대기" || roomType === "미지정") {
      return <Badge variant="secondary">대기중</Badge>;
    }
    if (roomStatus === 'AI가중배정') {
      return <Badge variant="default" className="bg-indigo-500">AI가중배정</Badge>;
    }
    if (manualAssigned) {
      return <Badge variant="default" className="bg-purple-500">수동배정</Badge>;
    }
    return <Badge variant="default" className="bg-blue-500">자동배정</Badge>;
  };

  return (
    <Tabs defaultValue="participants" className="space-y-4">
      <TabsList>
        <TabsTrigger value="participants">참가자 배정 현황</TabsTrigger>
        <TabsTrigger value="visual">시각화 보기</TabsTrigger>
        <TabsTrigger value="rules">룰셋 관리</TabsTrigger>
        <TabsTrigger value="report">AI 리포트</TabsTrigger>
        <TabsTrigger value="analytics">AI 학습 분석</TabsTrigger>
      </TabsList>

      <TabsContent value="participants" className="space-y-4">
        {/* [Phase 77-H] Stock Status Cards */}
        <StockStatusCards stockStatus={stockStatus} />
        
        {/* [Phase 77-STATS-CARD] Rooming Visual Map Cards */}
        {eventId && <RoomingVisualMapCards eventId={eventId} />}

        {/* [Phase 77-H] Stock Alert Bar */}
        {stockAlerts.length > 0 && (
          <Alert className="bg-red-50 border-red-200 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-red-800">
                  ⚠️ 일부 객실타입 재고 부족. 리밸런스가 필요합니다.
                </p>
                <div className="text-sm text-red-700 mt-1">
                  {stockAlerts.map((alert: any, idx: number) => (
                    <span key={idx} className="mr-3">
                      {alert.room_type_name}: {alert.shortage}개 부족
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleRebalancePreview}
                  disabled={isLoadingPreview}
                >
                  {isLoadingPreview ? '분석 중...' : '리밸런스 미리보기'}
                </Button>
              </div>
            </div>
          </Alert>
        )}

        {/* [Phase 77-B] Floating Summary Bar - 고정형 통계 카드 */}
        <div className="sticky top-[64px] z-40 bg-background border-b pb-3 mb-4">
          {stats && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Card className="p-3 shadow-sm rounded-xl bg-blue-50">
                  <div className="text-xs text-gray-600 mb-0.5">배정 완료</div>
                  <div className="text-xl font-bold text-blue-600">{stats.assigned}</div>
                </Card>
                <Card className="p-3 shadow-sm rounded-xl bg-orange-50">
                  <div className="text-xs text-gray-600 mb-0.5">배정 대기</div>
                  <div className="text-xl font-bold text-orange-600">{stats.pending}</div>
                </Card>
                <Card className="p-3 shadow-sm rounded-xl bg-gray-50">
                  <div className="text-xs text-gray-600 mb-0.5">총 객실</div>
                  <div className="text-xl font-bold text-gray-700">{stats.totalRooms}</div>
                </Card>
                <Card className="p-3 shadow-sm rounded-xl">
                  <div className="text-xs text-gray-600 mb-0.5">남은 객실</div>
                  <div className={cn(
                    "text-xl font-bold",
                    stats.remaining < 0 ? "text-red-500" : "text-green-600"
                  )}>
                    {stats.remaining}
                  </div>
                </Card>
              </div>
              
              {/* [Phase 77-B] 부족 객실 고정 경고 영역 */}
              {stats.shortage && stats.shortage.length > 0 && (
                <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <span className="font-semibold">⚠️ 객실 부족:</span>
                  {stats.shortage.map((s: any, idx: number) => (
                    <span key={idx} className="ml-2">
                      {s.room_type} ({s.shortage}개)
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* [Phase 77-H] Stock Guard & Rebalance Controls */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-200">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              객실 재고 현황
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              재고 부족을 자동 감지하고 AI가 안전하게 재배정합니다
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleStockGuard}
              disabled={isCheckingStock}
              variant="outline"
              className="gap-2"
            >
              {isCheckingStock ? '점검 중...' : '재고 점검'}
            </Button>
            <Button 
              onClick={handleRebalancePreview}
              disabled={isLoadingPreview || stockAlerts.length === 0}
              className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              {isLoadingPreview ? '분석 중...' : '리밸런스'}
            </Button>
          </div>
        </div>

        {/* AI Auto-Match Buttons */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI 자동 룸핑 매칭
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                인원 구성, 소아 연령, 역할을 기반으로 최적의 객실을 자동 배정합니다
              </p>
            </div>
            <Button 
              onClick={handleRunAIMatching} 
              disabled={isRunningAI || !roomingList || roomingList.length === 0}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isRunningAI ? '배정 중...' : 'AI 자동 배정 실행'}
            </Button>
          </div>

          {/* [Phase 77-G] AI 재배정 (요청사항 반영) */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500/10 to-sky-500/10 rounded-lg border border-indigo-200">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                AI 재배정 (요청사항 반영)
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                장비·뷰·층·흡연 등 요청사항을 가중치로 반영하여 정확도를 향상시킵니다
              </p>
            </div>
            <Button 
              onClick={handleRunAIMatchingWeighted} 
              disabled={isRunningWeighted || !roomingList || roomingList.length === 0}
              className="gap-2 bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white"
            >
              <Sparkles className="w-4 h-4" />
              {isRunningWeighted ? '재배정 중...' : 'AI 재배정 실행'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Participants List */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="p-6 text-muted-foreground">참가자 정보를 불러오는 중입니다...</div>
            ) : error ? (
              <div className="p-8 text-muted-foreground bg-muted/10 rounded-xl shadow-sm">
                <p className="font-medium">숙박 데이터를 불러올 수 없습니다.</p>
                <p className="text-xs mt-2">참가자 정보를 확인해주세요.</p>
              </div>
            ) : !roomingList || roomingList.length === 0 ? (
              <div className="p-12 text-center border rounded-lg bg-muted/20">
                <p className="text-lg font-medium text-muted-foreground">
                  아직 배정된 참가자가 없습니다
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  참가자를 추가하거나, "룰셋 관리" 탭에서 자동 배정 규칙을 설정하세요
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Event ID: {eventId}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border bg-card">
                  <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead className="w-12 text-left">No.</TableHead>
                       <TableHead className="text-left">구분</TableHead>
                       <TableHead className="text-left">참가자명</TableHead>
                       <TableHead className="text-left">객실타입</TableHead>
                       <TableHead className="text-center">룸크레딧</TableHead>
                       <TableHead className="text-center">인원구성</TableHead>
                       <TableHead className="text-right">상태</TableHead>
                     </TableRow>
                   </TableHeader>
                  <TableBody>
                    {roomingList.map((r: any, index: number) => (
                      <TableRow
                        key={r.participant_id || index}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedParticipant(r)}
                      >
                         <TableCell className="text-left text-muted-foreground text-sm font-medium">
                          {r.participant_no || index + 1}
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center gap-1">
                            {r.fixed_role && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs px-2.5 py-0.5 rounded-full",
                                  r.fixed_role === "좌장" && "bg-gray-100 text-gray-800 border-gray-300",
                                  r.fixed_role === "연자" && "bg-purple-100 text-purple-800 border-purple-300",
                                  r.fixed_role === "참석자" && "bg-blue-100 text-blue-800 border-blue-300"
                                )}
                              >
                                {r.fixed_role}
                              </Badge>
                            )}
                            {r.custom_role && (
                              <Badge
                                variant="outline"
                                className="text-xs px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1] border-transparent"
                              >
                                {r.custom_role}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                         <TableCell className="text-left">
                           {/* [Phase 77-B] 동반의료인 시각화 개선 */}
                           <div className="flex items-center gap-2">
                             <span className="font-medium">{r.name || "-"}</span>
                             {r.companions && r.companions.length > 0 && (
                               <TooltipProvider>
                                 <Tooltip>
                                   <TooltipTrigger asChild>
                                     <button className="text-blue-500 hover:text-blue-700 transition-colors">
                                       <Users className="w-4 h-4" />
                                     </button>
                                   </TooltipTrigger>
                                   <TooltipContent>
                                     <p className="text-xs">
                                       {r.companions.length === 1
                                         ? `동반의료인과 같은 객실입니다`
                                         : `동반의료인 ${r.companions.length}명과 같은 객실입니다`}
                                     </p>
                                   </TooltipContent>
                                 </Tooltip>
                               </TooltipProvider>
                             )}
                           </div>
                         </TableCell>
                         <TableCell className="text-left text-sm">
                           {r.room_type !== '미지정' ? (
                             <span className="font-medium text-foreground">{r.room_type}</span>
                           ) : (
                             <span className="text-muted-foreground">-</span>
                           )}
                         </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {r.room_credit ? `${Number(r.room_credit).toLocaleString()}원` : "-"}
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {r.adults || r.children || r.infants 
                            ? `성인 ${r.adults || 0} / 소아 ${r.children || 0} / 유아 ${r.infants || 0}`
                            : "-"
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          {getStatusBadge(r.manual_assigned, r.room_type || r.status, r.room_status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Manual Assignment Panel */}
          <div className="lg:col-span-1">
            {selectedParticipant ? (
              <ManualAssignPanel
                eventId={eventId!}
                participantId={selectedParticipant.participant_id}
                participantName={selectedParticipant.name || "참가자"}
                roomTypes={roomTypesData || []}
                currentAssignment={{
                  room_type: selectedParticipant.room_type,
                  room_type_id: selectedParticipant.room_type_id,
                  room_credit: selectedParticipant.room_credit,
                  manual_assigned: selectedParticipant.manual_assigned,
                }}
                onUpdate={() => {
                  mutate();
                  loadRoomingStats();
                  setSelectedParticipant(null);
                }}
              />
            ) : (
              <div className="p-6 border rounded-lg bg-muted/20 text-center text-muted-foreground">
                참가자를 선택하면 수동 배정이 가능합니다
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="rules">
        <RulesPanel eventId={eventId!} roomTypes={(roomTypesData || []).map(r => r.name)} />
      </TabsContent>

      <TabsContent value="visual">
        <RoomingVisualTab eventId={eventId!} />
      </TabsContent>

      <TabsContent value="report">
        <RoomingReportTab eventId={eventId!} />
      </TabsContent>

      <TabsContent value="analytics">
        <div className="space-y-6">
          <AIFeedbackAnalytics eventId={eventId!} />
          {currentUserId && (
            <UserBiasProfile userId={currentUserId} eventId={eventId!} />
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
