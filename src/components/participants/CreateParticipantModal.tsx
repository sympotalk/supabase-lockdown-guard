// [Phase 73-L.7.27-A] Create participant modal with minimal required fields
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

interface CreateParticipantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateParticipantModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateParticipantModalProps) {
  const { eventId } = useParams();
  const { agencyScope } = useUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    organization: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("이름을 입력해주세요");
      return;
    }

    if (!eventId || !agencyScope) {
      toast.error("행사 정보를 찾을 수 없습니다");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("participants").insert({
        event_id: eventId,
        agency_id: agencyScope,
        name: formData.name.trim(),
        organization: formData.organization.trim() || null,
        phone: formData.phone.trim() || null,
        role_badge: "참석자", // [Phase 73-L.7.26] Default role
        fixed_role: "참석자",
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("새 참가자가 추가되었습니다");
      
      // Reset form
      setFormData({ name: "", organization: "", phone: "" });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("[CreateParticipant] Error:", error);
      
      if (error.code === "42501") {
        toast.error("참가자 추가 권한이 없습니다");
      } else {
        toast.error("참가자 추가 중 오류가 발생했습니다");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            새 참가자 추가
          </DialogTitle>
          <DialogDescription>
            기본 정보를 입력하여 참가자를 등록합니다. 상세 정보는 나중에 수정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              이름 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={handleChange("name")}
              placeholder="홍길동"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization">소속</Label>
            <Input
              id="organization"
              value={formData.organization}
              onChange={handleChange("organization")}
              placeholder="OO병원"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">연락처</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={handleChange("phone")}
              placeholder="010-1234-5678"
              disabled={loading}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              취소
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  추가 중...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  추가
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
