// [LOCKED][71-H.STABLE] Participants tab wrapper
import Participants from "@/pages/admin/Participants";
import { useParams } from "react-router-dom";

export default function ParticipantsTab() {
  const { eventId } = useParams();
  
  console.log('[71-H.STABLE] ParticipantsTab loaded', { eventId });
  
  return <Participants />;
}
