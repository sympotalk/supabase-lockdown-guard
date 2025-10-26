// [LOCKED][71-H6.QA] Messages tab wrapper with validation
import Messages from "@/pages/admin/Messages";
import { useParams } from "react-router-dom";
import { useEffect } from "react";

export default function MessagesTab() {
  const { eventId } = useParams();
  
  // [71-H6.QA] Validate eventId propagation
  useEffect(() => {
    console.log('[71-H6.QA.Messages] Tab loaded', { eventId });
    if (!eventId) {
      console.warn('[71-H6.QA.Messages] ⚠ MISSING FIELD: eventId is undefined');
    }
  }, [eventId]);
  
  return <Messages />;
}
