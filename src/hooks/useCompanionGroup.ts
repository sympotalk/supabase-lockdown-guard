import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CompanionMember {
  id: string;
  name: string;
  role?: string;
  phone?: string;
}

export function useCompanionGroup(eventId: string | undefined, participantId: string | undefined) {
  const [companions, setCompanions] = useState<CompanionMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!eventId || !participantId) {
      setCompanions([]);
      return;
    }

    loadCompanions();

    // Subscribe to companion changes
    const channel = supabase
      .channel(`companions_${participantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participant_companions',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          loadCompanions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, participantId]);

  const loadCompanions = async () => {
    if (!eventId || !participantId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_companion_group', {
        p_event_id: eventId,
        p_participant_id: participantId
      });

      if (error) throw error;

      // Filter out self - use proper type casting through unknown
      const groupData = Array.isArray(data) ? data : [];
      const group = (groupData as unknown as CompanionMember[]).filter(c => c.id !== participantId);
      setCompanions(group);
    } catch (error) {
      console.error('Error loading companion group:', error);
      setCompanions([]);
    } finally {
      setIsLoading(false);
    }
  };

  return { companions, isLoading, reload: loadCompanions };
}
