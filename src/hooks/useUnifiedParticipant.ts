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

export function useUnifiedParticipant(eventId: string | null | undefined) {
  const [data, setData] = useState<UnifiedParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!eventId) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Direct query from participants table with related data
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventId)
        .order('name', { ascending: true });
      
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

    if (!eventId) return;

    // Real-time subscriptions for all related tables
    const channel = supabase
      .channel(`unified_bridge_${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `event_id=eq.${eventId}` },
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
  }, [eventId]);

  return { data, loading, refresh: load };
}
