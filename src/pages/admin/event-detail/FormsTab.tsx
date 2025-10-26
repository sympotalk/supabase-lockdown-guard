// [LOCKED][71-H4.FORM.INTEGRATION] Forms Responses Tab
import { supabase } from "@/integrations/supabase/client";
import useSWR from "swr";
import { useParams } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function FormsTab() {
  const { eventId } = useParams();

  const { data: formResponses, error, isLoading } = useSWR(
    eventId ? `forms_${eventId}` : null,
    async () => {
      const { data, error } = await supabase
        .from("form_responses")
        .select(`
          id,
          created_at,
          status,
          participant_id,
          participants (name),
          forms (title)
        `)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  // [71-H6.QA] Data flow validation
  console.log("[71-H6.QA.Forms] Loading:", isLoading, "Error:", error?.message, "Count:", formResponses?.length);

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">설문 응답을 불러오는 중...</div>;
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

  if (!formResponses || formResponses.length === 0) {
    return <div className="text-muted-foreground text-center py-16">응답 데이터가 없습니다.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>참가자명</TableHead>
              <TableHead>설문명</TableHead>
              <TableHead>응답일시</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {formResponses.map((f: any) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">
                  {f.participants?.name || "-"}
                </TableCell>
                <TableCell>{f.forms?.title || "-"}</TableCell>
                <TableCell>
                  {f.created_at ? format(new Date(f.created_at), "yyyy-MM-dd HH:mm") : "-"}
                </TableCell>
                <TableCell>
                  {f.status === "submitted" ? (
                    <span className="text-green-600">✅ 완료</span>
                  ) : (
                    <span className="text-amber-600">⏳ 미응답</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
