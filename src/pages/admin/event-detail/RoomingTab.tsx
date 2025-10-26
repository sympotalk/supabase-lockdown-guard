// [LOCKED][71-H4.FORM.INTEGRATION] Rooming Participants Tab
import { supabase } from "@/integrations/supabase/client";
import useSWR from "swr";
import { useParams } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function RoomingTab() {
  const { eventId } = useParams();

  const { data: roomingList, error, isLoading } = useSWR(
    eventId ? `rooming_${eventId}` : null,
    async () => {
      const { data, error } = await supabase
        .from("rooming_participants")
        .select(`
          id,
          room_type,
          check_in,
          check_out,
          stay_days,
          participants (name)
        `)
        .eq("event_id", eventId)
        .order("check_in");
      if (error) throw error;
      return data || [];
    },
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  // [71-H6.QA] Data flow validation
  console.log("[71-H6.QA.Rooming] Loading:", isLoading, "Error:", error?.message, "Count:", roomingList?.length);

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">숙박 데이터를 불러오는 중...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-destructive bg-destructive/10 rounded-xl shadow-sm">
        <p className="font-semibold">데이터 로드 중 오류가 발생했습니다.</p>
        <p className="text-sm mt-1">{error.message}</p>
        <p className="text-xs mt-2 text-muted-foreground">잠시 후 다시 시도해주세요.</p>
      </div>
    );
  }

  if (!roomingList || roomingList.length === 0) {
    return <div className="text-muted-foreground text-center py-16">숙박 데이터가 없습니다.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>참가자명</TableHead>
              <TableHead>객실타입</TableHead>
              <TableHead>체크인</TableHead>
              <TableHead>체크아웃</TableHead>
              <TableHead>숙박일수</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roomingList.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  {r.participants?.name || "-"}
                </TableCell>
                <TableCell>{r.room_type || "-"}</TableCell>
                <TableCell>
                  {r.check_in ? format(new Date(r.check_in), "yyyy-MM-dd") : "-"}
                </TableCell>
                <TableCell>
                  {r.check_out ? format(new Date(r.check_out), "yyyy-MM-dd") : "-"}
                </TableCell>
                <TableCell>
                  {r.stay_days ? `${r.stay_days}박` : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
