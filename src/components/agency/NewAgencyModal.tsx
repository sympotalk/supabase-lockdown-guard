import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface NewAgencyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NewAgencyModal({
  open,
  onOpenChange,
  onSuccess,
}: NewAgencyModalProps) {
  const [agencyName, setAgencyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [memo, setMemo] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Reset all fields when modal closes
  useEffect(() => {
    if (!open) {
      setAgencyName("");
      setContactEmail("");
      setMemo("");
    }
  }, [open]);

  const handleRegister = async () => {
    if (!agencyName.trim() || !contactEmail.trim()) {
      toast({
        title: "입력 오류",
        description: "에이전시명과 대표 이메일을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      toast({
        title: "입력 오류",
        description: "올바른 이메일 형식을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("[NewAgencyModal] Registering agency:", {
        name: agencyName,
        email: contactEmail,
      });

      const { data, error } = await supabase.rpc("fn_register_agency", {
        p_name: agencyName,
        p_email: contactEmail,
        p_memo: memo.trim() || null,
      });

      if (error) {
        console.error("[NewAgencyModal] RPC error:", error);
        throw error;
      }

      console.log("[NewAgencyModal] Agency registered:", data);

      toast({
        title: "에이전시 등록 완료",
        description: `${agencyName}이(가) 등록되었습니다.`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("[NewAgencyModal] Failed to register agency:", error);
      toast({
        title: "등록 실패",
        description: error.message || "에이전시 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl">
        <DialogHeader>
          <DialogTitle>새 에이전시 등록</DialogTitle>
          <DialogDescription>
            새로운 에이전시를 등록합니다. (마스터 전용)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="agency-name">
              에이전시명 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="agency-name"
              placeholder="절호의기획"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email">
              대표 이메일 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contact-email"
              type="email"
              placeholder="contact@sympohub.io"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="memo">메모 (선택)</Label>
            <Textarea
              id="memo"
              placeholder="내부 참고용 메모"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              내부 참고용 메모입니다. 에이전시에는 공개되지 않습니다.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button onClick={handleRegister} disabled={isLoading}>
            {isLoading ? "등록 중..." : "등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
