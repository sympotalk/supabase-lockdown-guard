import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AgencyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMode?: boolean;
  agency?: {
    id: string;
    name: string;
    contact_email: string;
  } | null;
  onSuccess: () => void;
}

export function AgencyModal({
  open,
  onOpenChange,
  editMode = false,
  agency = null,
  onSuccess,
}: AgencyModalProps) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Initialize fields when agency changes or modal opens
  useEffect(() => {
    if (open && editMode && agency) {
      setName(agency.name);
      setEmail(agency.contact_email || "");
    } else if (open && !editMode) {
      setName("");
      setEmail("");
    }
  }, [open, editMode, agency]);

  // Reset all fields when modal closes
  useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "입력 오류",
        description: "에이전시명을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // Email validation only in edit mode
    if (editMode && email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast({
          title: "입력 오류",
          description: "올바른 이메일 형식을 입력해주세요.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      if (editMode && agency?.id) {
        // Update existing agency
        const { error } = await supabase
          .from("agencies")
          .update({
            name: name.trim(),
            contact_email: email.trim() || null,
          })
          .eq("id", agency.id);

        if (error) throw error;

        toast({
          title: "수정 완료",
          description: `${name}이(가) 수정되었습니다.`,
        });

        onOpenChange(false);
        onSuccess();
      } else {
        // Create new agency
        const { data, error } = await supabase
          .from("agencies")
          .insert([{ name: name.trim() }])
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "등록 완료",
          description: `${name}이(가) 등록되었습니다.`,
        });

        onOpenChange(false);
        onSuccess();

        // Navigate to the new agency detail page
        if (data?.id) {
          navigate(`/master/agency/${data.id}`);
        }
      }
    } catch (error: any) {
      console.error("[AgencyModal] Failed:", error);
      toast({
        title: "오류",
        description: error.message || `에이전시 ${editMode ? "수정" : "등록"} 중 오류가 발생했습니다.`,
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
          <DialogTitle>
            {editMode ? "에이전시 수정" : "새 에이전시 등록"}
          </DialogTitle>
          <DialogDescription>
            {editMode
              ? "에이전시 정보를 수정합니다."
              : "새로운 에이전시를 등록합니다. (마스터 전용)"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="agency-name">
              에이전시명 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="agency-name"
              placeholder="예: 절호의기획"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          {editMode && (
            <div className="space-y-2">
              <Label htmlFor="agency-email">대표 이메일 (선택)</Label>
              <Input
                id="agency-email"
                type="email"
                placeholder="contact@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading
              ? editMode
                ? "수정 중..."
                : "등록 중..."
              : editMode
              ? "수정 완료"
              : "등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
