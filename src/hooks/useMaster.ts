import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AgencySummary {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
  created_at: string;
  event_count: number;
  participant_count: number;
  last_activity: string | null;
}

export function useMaster() {
  const [agencies, setAgencies] = useState<AgencySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    
    const loadAgencies = async () => {
      try {
        const { data, error } = await supabase
          .from('agency_summary')
          .select('*')
          .order('created_at', { ascending: false });

        if (!alive) return;
        
        if (error) {
          console.error('[useMaster] Error loading agencies:', error);
          setError(error.message);
        } else {
          setAgencies(data || []);
        }
      } catch (err) {
        if (!alive) return;
        console.error('[useMaster] Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadAgencies();
    
    return () => { 
      alive = false; 
    };
  }, []);

  return { agencies, loading, error };
}
