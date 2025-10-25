import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type UnifiedParticipant = {
  participant_id: string;
  participant_name: string;
  participant_phone: string | null;
  company_name: string | null;
  role_badge: string | null;
  agency_id: string | null;
  event_id: string | null;
  email: string | null;
  status: string | null;
  hotel_name: string | null;
  room_number: string | null;
  checkin_date: string | null;
  checkout_date: string | null;
  room_type: string | null;
  rooming_id: string | null;
  message_count: number;
  message_status: string | null;
  last_message_sent: string | null;
  last_success_sent: string | null;
};

export function useUnifiedParticipant(eventId: string | null | undefined, agencyId: string | null | undefined) {
  const [data, setData] = useState<UnifiedParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!eventId && !agencyId) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Direct query from participants table with related data
      let query = supabase
        .from('participants')
        .select('*')
        .order('name', { ascending: true });

      // Filter by event if provided
      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      // Filter by agency if provided
      if (agencyId) {
        query = query.eq('agency_id', agencyId);
      }
      
      const { data: fallbackData, error: fallbackError } = await query;
      
      if (fallbackError) throw fallbackError;
      
      // Map to UnifiedParticipant format
      const mappedData: UnifiedParticipant[] = (fallbackData || []).map((p: any) => ({
        participant_id: p.id,
        participant_name: p.name,
        participant_phone: p.phone,
        company_name: p.company_name,
        role_badge: p.role_badge,
        agency_id: p.agency_id,
        event_id: p.event_id,
        email: p.email,
        status: p.status,
        hotel_name: p.hotel_name,
        room_number: p.room_number,
        checkin_date: p.checkin_date,
        checkout_date: p.checkout_date,
        room_type: null,
        rooming_id: p.rooming_id,
        message_count: 0,
        message_status: p.message_status,
        last_message_sent: null,
        last_success_sent: null,
      }));
      
      setData(mappedData);
    } catch (error: any) {
      console.error("Failed to load unified participants:", error);
      toast.error("참가자 데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    if (!eventId && !agencyId) return;

    // Real-time subscriptions for all related tables
    const channelName = eventId ? `unified_bridge_${eventId}` : `unified_bridge_agency_${agencyId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "participants",
          ...(eventId && { filter: `event_id=eq.${eventId}` }),
          ...(agencyId && !eventId && { filter: `agency_id=eq.${agencyId}` })
        },
        () => {
          console.log("[Realtime] Participants changed, refreshing...");
          load();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooming" },
        () => {
          console.log("[Realtime] Rooming changed, refreshing...");
          load();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          console.log("[Realtime] Messages changed, refreshing...");
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, agencyId]);

  return { data, loading, refresh: load };
}
