// [LOCKED][71-H3.STATS.SYNC] Unified Event Statistics Hook
import { supabase } from "@/integrations/supabase/client";
import useSWR from "swr";

interface EventStatistics {
  event_id: string;
  participant_count: number;
  rooming_rate: number;
  form_rate: number;
}

export function useEventStatistics(agencyId?: string | null) {
  return useSWR<EventStatistics[]>(
    agencyId ? `event_stats_${agencyId}` : null,
    async () => {
      const { data, error } = await supabase
        .rpc("fn_event_statistics", { p_agency_id: agencyId });

      if (error) throw error;
      return data || [];
    },
    { 
      revalidateOnFocus: false, 
      dedupingInterval: 60000,
      refreshInterval: 30000 // Auto-refresh every 30 seconds
    }
  );
}
