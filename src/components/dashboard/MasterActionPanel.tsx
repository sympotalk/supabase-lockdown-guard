import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "sonner";
import { Megaphone, Power, Shield, KeyRound, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MasterActionPanel() {
  const { agency, refresh } = useAppData();
  const [busy, setBusy] = useState(false);

  if (!agency) return null;

  const wrap = (fn: () => Promise<void>) => async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "작업 실패");
    } finally {
      setBusy(false);
    }
  };

  const postAnnouncement = wrap(async () => {
    const title = prompt("공지 제목을 입력하세요");
    if (!title) return;
    const body = prompt("공지 내용을 입력하세요") ?? "";
    
    const { error } = await supabase.rpc("master_post_announcement", {
      p_agency: agency.id,
      p_title: title,
      p_body: body,
    });
    
    if (error) throw error;
    toast.success("공지 등록 완료");
  });

  const toggleActive = wrap(async () => {
    if (!confirm("에이전시 활성/비활성 상태를 전환할까요?")) return;
    
    const { error } = await supabase.rpc("master_toggle_agency_active", {
      p_agency: agency.id,
    });
    
    if (error) throw error;
    toast.success("상태가 변경되었습니다");
  });

  const rotateApiKey = wrap(async () => {
    if (!confirm("API 키를 회전하시겠습니까? 기존 키는 비활성화됩니다.")) return;
    
    const { data, error } = await supabase.rpc("master_rotate_api_key", {
      p_agency: agency.id,
    });
    
    if (error) throw error;
    const newKey = (data as any)?.[0]?.api_key ?? "";
    toast.success(`새 API 키: ${newKey}`);
  });

  const revokeInvite = wrap(async () => {
    const token = prompt("취소할 초대 토큰(UUID)을 입력하세요");
    if (!token) return;
    
    const { error } = await supabase.rpc("master_revoke_invite", {
      p_token: token,
    });
    
    if (error) throw error;
    toast.success("초대가 취소되었습니다");
  });

  const setRole = wrap(async () => {
    const userId = prompt("대상 사용자 user_id(UUID)를 입력하세요");
    if (!userId) return;
    const role = prompt("설정할 역할(staff/admin/agency_owner/master)") ?? "staff";
    
    const { error } = await supabase.rpc("master_set_role", {
      p_user: userId,
      p_role: role,
    });
    
    if (error) throw error;
    toast.success("역할이 변경되었습니다");
  });

  return (
    <div className="p-6 border border-border rounded-xl bg-card space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Master 제어 패널</h3>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="default"
          className="gap-2"
          onClick={postAnnouncement}
          disabled={busy}
        >
          <Megaphone className="h-4 w-4" />
          공지 등록
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={toggleActive}
          disabled={busy}
        >
          <Power className="h-4 w-4" />
          활성/비활성 전환
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={setRole}
          disabled={busy}
        >
          <Shield className="h-4 w-4" />
          사용자 역할 변경
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={revokeInvite}
          disabled={busy}
        >
          <Undo2 className="h-4 w-4" />
          초대 취소
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={rotateApiKey}
          disabled={busy}
        >
          <KeyRound className="h-4 w-4" />
          API 키 회전
        </Button>
      </div>
    </div>
  );
}
