import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Mail, UserPlus } from "lucide-react";

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  isMaster?: boolean;
  agencies?: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

export function InviteModal({
  open,
  onOpenChange,
  agencyId,
  isMaster = false,
  agencies = [],
  onSuccess,
}: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [selectedAgencyId, setSelectedAgencyId] = useState(agencyId);
  const [role, setRole] = useState("staff");
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email) {
      toast({
        title: "입력 오류",
        description: "이메일을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (isMaster && !selectedAgencyId) {
      toast({
        title: "입력 오류",
        description: "에이전시를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const rpcName = isMaster ? "invite_master_user" : "invite_agency_user";
      const params = isMaster
        ? { p_email: email, p_agency_id: selectedAgencyId }
        : { p_email: email, p_agency_id: agencyId, p_role: role };

      const { error } = await supabase.rpc(rpcName, params);

      if (error) throw error;

      toast({
        title: "초대 완료",
        description: `${email}에게 초대를 보냈습니다.`,
      });

      setEmail("");
      setRole("staff");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "초대 실패",
        description: error.message || "초대 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            사용자 초대
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isMaster && agencies.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="agency">에이전시</Label>
              <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
                <SelectTrigger id="agency">
                  <SelectValue placeholder="에이전시 선택" />
                </SelectTrigger>
                <SelectContent>
                  {agencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isMaster && (
            <div className="space-y-2">
              <Label htmlFor="role">권한</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button onClick={handleInvite} disabled={loading} className="w-full">
            {loading ? "전송 중..." : "초대 보내기"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
