import { useState, useEffect } from "react";
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
import { Mail, UserPlus, Copy, Check } from "lucide-react";

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  isMaster?: boolean;
  agencies?: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

// [LOCKED][71-E.FIXSELECT.STABLE] Do not remove or inline this block without architect/QA approval.
export function InviteModal({
  open,
  onOpenChange,
  agencyId,
  isMaster = false,
  agencies = [],
  onSuccess,
}: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | undefined>(agencyId);
  const [role, setRole] = useState<string>("staff");
  const [loading, setLoading] = useState(false);

  // [71-E.FIXSELECT] Debug log
  useEffect(() => {
    console.log('[71-E.FIXSELECT] InviteModal Select initialized', { selectedAgencyId, role });
  }, [selectedAgencyId, role]);

  const [inviteUrl, setInviteUrl] = useState<string>("");
  const [showInviteUrl, setShowInviteUrl] = useState(false);

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
      // [Phase 74-A.1] Use create_agency_invite RPC
      const { data, error } = await supabase.rpc("create_agency_invite", {
        p_agency_id: isMaster ? selectedAgencyId : agencyId,
        p_email: email,
        p_role: role,
      });

      const result = data as any;

      if (error || result?.status === "error") {
        throw new Error(result?.message || "초대 생성에 실패했습니다");
      }

      // Show invite URL for copying
      setInviteUrl(result.invite_url);
      setShowInviteUrl(true);

      const message = result.regenerated 
        ? "기존 초대 링크가 갱신되었습니다"
        : "초대 링크가 발급되었습니다";

      toast({
        title: "초대 완료",
        description: message,
      });

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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({
        title: "복사 완료",
        description: "초대 링크가 클립보드에 복사되었습니다.",
      });
    } catch (error) {
      toast({
        title: "복사 실패",
        description: "링크 복사에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setEmail("");
    setRole("staff");
    setInviteUrl("");
    setShowInviteUrl(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            사용자 초대
          </DialogTitle>
        </DialogHeader>
        
        {!showInviteUrl ? (
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
                  disabled={loading}
                />
              </div>
            </div>

            {isMaster && agencies.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="agency">에이전시</Label>
                <Select 
                  value={selectedAgencyId || undefined} 
                  onValueChange={(v) => setSelectedAgencyId(v || undefined)}
                  disabled={loading}
                >
                  <SelectTrigger id="agency">
                    <SelectValue placeholder="에이전시 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {agencies
                      .filter((agency) => 
                        typeof agency.id === "string" && 
                        agency.id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
                      )
                      .map((agency) => (
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
                <Select value={role} onValueChange={setRole} disabled={loading}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={handleInvite} disabled={loading} className="w-full">
              {loading ? "전송 중..." : "초대 보내기"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="font-medium text-green-900 dark:text-green-100">
                  초대 링크가 생성되었습니다
                </p>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                아래 링크를 복사하여 {email}에게 전달해주세요
              </p>
            </div>

            <div className="space-y-2">
              <Label>초대 링크</Label>
              <div className="flex gap-2">
                <Input
                  value={inviteUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  size="icon"
                  className="flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                이 링크는 7일 동안 유효합니다
              </p>
            </div>

            <Button onClick={handleClose} className="w-full">
              완료
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
