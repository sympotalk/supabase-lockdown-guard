// [LOCKED][71-D.FIXFLOW.STABLE] Do not remove or inline this block without architect/QA approval.
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

export interface EventCounts {
  active: number;
  upcoming: number;
  completed: number;
}

/**
 * Agency-scoped event counts hook
 * CRITICAL: Must include agencyScope in SWR key to prevent cache collision
 */
export function useAgencyEventCounts() {
  const { agencyScope } = useUser();
  const key = agencyScope ? `event_counts:${agencyScope}` : null;

  if (process.env.NODE_ENV !== 'production') {
    console.log('[71-D.FIXFLOW] useAgencyEventCounts key:', key);
  }

  return useSWR<EventCounts>(
    key,
    async () => {
      if (!agencyScope) {
        throw new Error('agencyScope is required');
      }

      const { data, error } = await supabase
        .from('events')
        .select('status')
        .eq('agency_id', agencyScope)
        .eq('is_active', true);

      if (error) throw error;

      const counts: EventCounts = { active: 0, upcoming: 0, completed: 0 };
      (data ?? []).forEach((r: any) => {
        const s = (r.status || '').toLowerCase();
        if (s === '진행중' || s === 'active') counts.active++;
        else if (s === '예정' || s === 'upcoming') counts.upcoming++;
        else if (s === '완료' || s === 'completed') counts.completed++;
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log('[71-D.FIXFLOW] useAgencyEventCounts:', counts);
      }

      return counts;
    },
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
}
