import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Event {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  status: string;
  is_active: boolean;
}

export function useAgency(agencyId?: string | null) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    let alive = true;

    const loadEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, name, start_date, end_date, location, status, is_active')
          .eq('agency_id', agencyId)
          .eq('is_active', true)
          .order('start_date', { ascending: true });

        if (!alive) return;

        if (error) {
          console.error('[useAgency] Error loading events:', error);
          setError(error.message);
        } else {
          setEvents(data || []);
        }
      } catch (err) {
        if (!alive) return;
        console.error('[useAgency] Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadEvents();

    return () => {
      alive = false;
    };
  }, [agencyId]);

  return { events, loading, error };
}
