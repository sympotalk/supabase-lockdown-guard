import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";

interface SelfRegenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SelfRegenModal({
  open,
  onOpenChange,
  onSuccess,
}: SelfRegenModalProps) {
  const [loading, setLoading] = useState(false);

  const handleRegen = async () => {
    setLoading(true);

    try {
      const { error } = await (supabase as any).rpc("fn_manage_user_account", {
        p_action: "self_regen",
      });

      if (error) throw error;

      toast({
        title: "계정 복원 완료",
        description: "계정 복원이 완료되었습니다.",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "계정 복원 실패",
        description: error.message || "계정 복원 중 오류가 발생했습니다.",
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
            <RefreshCw className="h-5 w-5" />
            계정 복원
          </DialogTitle>
          <DialogDescription>
            비활성화된 계정을 복원하시겠습니까?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleRegen} disabled={loading}>
            {loading ? "처리 중..." : "복원"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
