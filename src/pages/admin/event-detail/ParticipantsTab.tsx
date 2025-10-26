// [LOCKED][71-H6.QA] Participants tab wrapper with validation
import Participants from "@/pages/admin/Participants";
import { useParams } from "react-router-dom";
import { useEffect } from "react";

export default function ParticipantsTab() {
  const { eventId } = useParams();
  
  // [71-H6.QA] Validate eventId propagation
  useEffect(() => {
    console.log('[71-H6.QA.Participants] Tab loaded', { eventId });
    if (!eventId) {
      console.warn('[71-H6.QA.Participants] ⚠ MISSING FIELD: eventId is undefined');
    }
  }, [eventId]);
  
  return <Participants />;
}
