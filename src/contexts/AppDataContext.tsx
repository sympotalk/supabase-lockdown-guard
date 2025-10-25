import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";
import { RealtimeChannel } from "@supabase/supabase-js";

type AppData = {
  profile: { user_id: string; role: string; agency_id: string | null } | null;
  agency: { id: string; name: string; code: string | null } | null;
  metrics: { events: number; participants: number; activities: number };
  loading: boolean;
  refresh: () => Promise<void>;
};

const AppDataContext = createContext<AppData>({
  profile: null,
  agency: null,
  metrics: { events: 0, participants: 0, activities: 0 },
  loading: true,
  refresh: async () => {},
});

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const { userId, role, agencyScope, loading: authLoading } = useUser();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AppData["profile"]>(null);
  const [agency, setAgency] = useState<AppData["agency"]>(null);
  const [metrics, setMetrics] = useState<AppData["metrics"]>({ 
    events: 0, 
    participants: 0, 
    activities: 0 
  });
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const refresh = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // 1) Load profile from user_roles
      const { data: userRole, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id, role, agency_id")
        .eq("user_id", userId)
        .single();

      if (roleError) {
        console.error("[AppData] Profile load error:", roleError);
        toast.error("프로필 정보를 불러올 수 없습니다");
        setLoading(false);
        return;
      }

      setProfile(userRole ?? null);

      // 2) Load agency if agency_id exists
      if (userRole?.agency_id || agencyScope) {
        const targetAgencyId = agencyScope || userRole.agency_id;
        const { data: agencyData, error: agencyError } = await supabase
          .from("agencies")
          .select("id, name, code")
          .eq("id", targetAgencyId)
          .single();

        if (agencyError) {
          console.error("[AppData] Agency load error:", agencyError);
        }
        setAgency(agencyData ?? null);
      } else {
        setAgency(null);
      }

      // 3) Load dashboard metrics
      const targetAgencyId = agencyScope || userRole?.agency_id;
      
      if (targetAgencyId) {
        const [
          { count: eventCount },
          { count: participantCount },
          { count: activityCount }
        ] = await Promise.all([
          supabase
            .from("events")
            .select("*", { count: "exact", head: true })
            .eq("agency_id", targetAgencyId),
          supabase
            .from("participants")
            .select("*", { count: "exact", head: true })
            .eq("agency_id", targetAgencyId),
          supabase
            .from("activity_logs")
            .select("*", { count: "exact", head: true })
            .eq("agency_id", targetAgencyId)
        ]);

        setMetrics({
          events: eventCount ?? 0,
          participants: participantCount ?? 0,
          activities: activityCount ?? 0
        });
      } else {
        // Master without agency scope - show all
        const [
          { count: eventCount },
          { count: participantCount },
          { count: activityCount }
        ] = await Promise.all([
          supabase.from("events").select("*", { count: "exact", head: true }),
          supabase.from("participants").select("*", { count: "exact", head: true }),
          supabase.from("activity_logs").select("*", { count: "exact", head: true })
        ]);

        setMetrics({
          events: eventCount ?? 0,
          participants: participantCount ?? 0,
          activities: activityCount ?? 0
        });
      }

      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error("[AppData] Refresh error:", error);
      toast.error("데이터를 불러오는 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  // Initial load on auth change
  useEffect(() => {
    if (authLoading) return;
    
    if (!userId) {
      setProfile(null);
      setAgency(null);
      setMetrics({ events: 0, participants: 0, activities: 0 });
      setLoading(false);
      return;
    }

    refresh();
  }, [userId, agencyScope, authLoading]);

  // Realtime subscriptions with retry logic
  useEffect(() => {
    if (!userId || loading) return;

    const targetAgencyId = agencyScope || profile?.agency_id;
    if (!targetAgencyId) return;

    // Clean up existing channel
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
    }

    const channel = supabase
      .channel(`dashboard:${targetAgencyId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'events',
          filter: `agency_id=eq.${targetAgencyId}`
        },
        () => {
          console.log("[AppData] Events changed, refreshing...");
          refresh();
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'participants',
          filter: `agency_id=eq.${targetAgencyId}`
        },
        () => {
          console.log("[AppData] Participants changed, refreshing...");
          refresh();
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'activity_logs',
          filter: `agency_id=eq.${targetAgencyId}`
        },
        () => {
          console.log("[AppData] Activities changed, refreshing...");
          refresh();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[AppData] Realtime connected for agency ${targetAgencyId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[AppData] Realtime channel error');
          
          // Retry logic with exponential backoff
          if (retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
            setTimeout(() => {
              console.log(`[AppData] Retrying realtime connection (${retryCount + 1}/3)...`);
              setRetryCount(prev => prev + 1);
              refresh();
            }, delay);
          } else {
            toast.error("실시간 업데이트 연결 실패. 수동 새로고침을 사용하세요.");
          }
        }
      });

    setRealtimeChannel(channel);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId, profile?.agency_id, agencyScope, loading]);

  const value = useMemo(
    () => ({ profile, agency, metrics, loading, refresh }),
    [profile, agency, metrics, loading]
  );

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return context;
};
