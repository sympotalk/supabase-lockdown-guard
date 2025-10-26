// [LOCKED][71-H.STABLE] Messages tab wrapper
import Messages from "@/pages/admin/Messages";
import { useParams } from "react-router-dom";

export default function MessagesTab() {
  const { eventId } = useParams();
  
  console.log('[71-H.STABLE] MessagesTab loaded', { eventId });
  
  return <Messages />;
}
