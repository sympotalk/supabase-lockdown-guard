import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

type RealtimeCallback = (payload: any) => void;

let activeChannels: Map<string, RealtimeChannel> = new Map();

export function subscribeToTable(
  tableName: string,
  callback: RealtimeCallback
): () => void {
  console.log(`[Realtime] Listening on table: ${tableName}`);

  const channel = supabase
    .channel(`${tableName}-changes`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: tableName,
      },
      (payload) => {
        console.log(`[Realtime] ${tableName} change:`, payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`[Realtime] Connected (sigylynftjsczhuzvbax) - ${tableName}`);
      }
    });

  activeChannels.set(tableName, channel);

  return () => {
    console.log(`[Realtime] Unsubscribing from ${tableName}`);
    channel.unsubscribe();
    activeChannels.delete(tableName);
  };
}

export function unsubscribeAll() {
  activeChannels.forEach((channel, tableName) => {
    console.log(`[Realtime] Disconnecting ${tableName}`);
    channel.unsubscribe();
  });
  activeChannels.clear();
}
