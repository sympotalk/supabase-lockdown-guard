// [LOCKED][71-D.FIXFLOW.STABLE] Do not remove or inline this block without architect/QA approval.
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

export interface AgencyEventProgress {
  event_id: string;
  agency_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  participant_count: number;
  assigned_room_count: number;
  rooming_rate: number;
  participant_rate: number;
  progress_rate: number;
}

/**
 * Agency-scoped event progress hook
 * CRITICAL: Must include agencyScope in SWR key to prevent cache collision
 */
export function useAgencyEventProgress() {
  const { agencyScope } = useUser();

  const key = agencyScope ? `event_progress_view:${agencyScope}` : null;
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('[71-D.FIXFLOW] useAgencyEventProgress key:', key);
  }

  return useSWR<AgencyEventProgress[]>(
    key,
    async () => {
      if (!agencyScope) {
        throw new Error('agencyScope is required');
      }

      const { data, error } = await supabase
        .from('event_progress_view')
        .select('*')
        .eq('agency_id', agencyScope)
        .order('start_date', { ascending: false });

      if (error) throw error;
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[71-D.FIXFLOW] useAgencyEventProgress loaded:', data?.length, 'events');
      }
      
      return data ?? [];
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      keepPreviousData: true,
    }
  );
}
