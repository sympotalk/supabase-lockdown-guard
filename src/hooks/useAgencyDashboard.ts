import useSWR from "swr";
import { supabase } from "@/integrations/supabase/client";

// [71-B.STABLE] Agency Dashboard data hooks

export interface EventProgress {
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

export interface EventCounts {
  active: number;
  upcoming: number;
  completed: number;
}

/**
 * Fetch event progress from event_progress_view
 */
export function useEventProgress() {
  return useSWR<EventProgress[]>(
    'event_progress_view',
    async () => {
      const { data, error } = await supabase
        .from('event_progress_view')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    { 
      revalidateOnFocus: false, 
      dedupingInterval: 60000, 
      keepPreviousData: true 
    }
  );
}

/**
 * Get event counts by status
 */
export function useEventCounts() {
  return useSWR<EventCounts>(
    'event_counts',
    async () => {
      const { data, error } = await supabase
        .from('events')
        .select('status')
        .eq('is_active', true);
      
      if (error) throw error;
      
      const counts = { active: 0, upcoming: 0, completed: 0 };
      (data || []).forEach((r: any) => {
        const status = r.status?.toLowerCase();
        if (status === '진행중' || status === 'active') counts.active++;
        else if (status === '예정' || status === 'upcoming') counts.upcoming++;
        else if (status === '완료' || status === 'completed') counts.completed++;
      });
      
      return counts;
    },
    { 
      revalidateOnFocus: false, 
      dedupingInterval: 60000 
    }
  );
}
