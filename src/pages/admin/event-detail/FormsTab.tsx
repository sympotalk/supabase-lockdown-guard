// [LOCKED][71-H.STABLE] Forms tab wrapper
import Forms from "@/pages/admin/Forms";
import { useParams } from "react-router-dom";

export default function FormsTab() {
  const { eventId } = useParams();
  
  console.log('[71-H.STABLE] FormsTab loaded', { eventId });
  
  return <Forms />;
}
