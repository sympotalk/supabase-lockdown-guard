// [LOCKED][71-H.STABLE] Rooming tab wrapper
import Rooming from "@/pages/admin/Rooming";
import { useParams } from "react-router-dom";

export default function RoomingTab() {
  const { eventId } = useParams();
  
  console.log('[71-H.STABLE] RoomingTab loaded', { eventId });
  
  return <Rooming />;
}
