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
import { toast } from "@/hooks/use-toast";
import { Building2, Mail, User } from "lucide-react";

interface AgencyCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AgencyCreateModal({
  open,
  onOpenChange,
  onSuccess,
}: AgencyCreateModalProps) {
  const [name, setName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || !managerName || !contactEmail) {
      toast({
        title: "입력 오류",
        description: "모든 필드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.rpc("create_agency", {
        p_name: name,
        p_manager_name: managerName,
        p_contact_email: contactEmail,
      });

      if (error) throw error;

      toast({
        title: "에이전시 생성 완료",
        description: `${name} 에이전시가 생성되었습니다.`,
      });

      setName("");
      setManagerName("");
      setContactEmail("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "생성 실패",
        description: error.message || "에이전시 생성 중 오류가 발생했습니다.",
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
            <Building2 className="h-5 w-5" />
            새 에이전시 등록
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">에이전시명</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                placeholder="에이전시 이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manager">담당자명</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="manager"
                placeholder="담당자 이름"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="contact@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Button onClick={handleCreate} disabled={loading} className="w-full">
            {loading ? "생성 중..." : "에이전시 생성"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
