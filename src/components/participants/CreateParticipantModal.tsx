// [Phase 73-L.7.28-B] Create participant modal with full field expansion
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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { getRoleBadgeColor } from "@/lib/participantUtils";
import { cn } from "@/lib/utils";

interface CreateParticipantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const roleBadgeOptions = ["참석자", "좌장", "연자", "패널", "스폰서"];

export function CreateParticipantModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateParticipantModalProps) {
  const { eventId } = useParams();
  const { agencyScope } = useUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    role_badge: "참석자",
    participant_name: "",
    company_name: "",
    phone: "",
    request_note: "",
    sfe_company_code: "",
    sfe_customer_code: "",
    manager_team: "",
    manager_name: "",
    manager_phone: "",
    manager_emp_id: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // [Phase 73-L.7.28-B] Required field validation
    if (!formData.participant_name.trim()) {
      toast.error("성명을 입력해주세요");
      return;
    }

    if (!formData.company_name.trim()) {
      toast.error("소속을 입력해주세요");
      return;
    }

    if (!eventId || !agencyScope) {
      toast.error("행사 정보를 찾을 수 없습니다");
      return;
    }

    setLoading(true);
    try {
      // [Phase 73-L.7.28-B] Build manager_info JSON
      const managerInfo = (formData.manager_team || formData.manager_name || 
                           formData.manager_phone || formData.manager_emp_id)
        ? {
            team: formData.manager_team.trim() || null,
            name: formData.manager_name.trim() || null,
            phone: formData.manager_phone.trim() || null,
            emp_id: formData.manager_emp_id.trim() || null,
          }
        : null;

      const { error } = await supabase.from("participants").insert({
        event_id: eventId,
        agency_id: agencyScope,
        role_badge: formData.role_badge,
        fixed_role: formData.role_badge,
        participant_name: formData.participant_name.trim(),
        company_name: formData.company_name.trim(),
        phone: formData.phone.trim() || null,
        request_note: formData.request_note.trim() || null,
        sfe_company_code: formData.sfe_company_code.trim() || null,
        sfe_customer_code: formData.sfe_customer_code.trim() || null,
        manager_info: managerInfo,
        created_at: new Date().toISOString(),
        delete_flag: false,
      } as any);

      if (error) throw error;

      toast.success("새 참가자가 추가되었습니다");
      
      // Reset form
      setFormData({
        role_badge: "참석자",
        participant_name: "",
        company_name: "",
        phone: "",
        request_note: "",
        sfe_company_code: "",
        sfe_customer_code: "",
        manager_team: "",
        manager_name: "",
        manager_phone: "",
        manager_emp_id: "",
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("[CreateParticipant] Error:", error);
      
      if (error.code === "42501") {
        toast.error("참가자 추가 권한이 없습니다");
      } else {
        toast.error("입력값을 확인해주세요");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleRoleBadgeChange = (badge: string) => {
    setFormData((prev) => ({ ...prev, role_badge: badge }));
  };

  const isFormValid = formData.participant_name.trim() !== "" && 
                      formData.company_name.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            새 참가자 추가
          </DialogTitle>
          <DialogDescription>
            참가자 정보를 입력합니다. 성명과 소속은 필수 항목입니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* [Phase 73-L.7.28-B] 1. Role Badge Selection */}
          <div className="space-y-2">
            <Label>
              구분 <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2 flex-wrap">
              {roleBadgeOptions.map((badge) => (
                <button
                  key={badge}
                  type="button"
                  onClick={() => handleRoleBadgeChange(badge)}
                  disabled={loading}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                    formData.role_badge === badge
                      ? getRoleBadgeColor(badge)
                      : "bg-background border border-border text-foreground hover:bg-accent"
                  )}
                >
                  {badge}
                </button>
              ))}
            </div>
          </div>

          {/* [Phase 73-L.7.28-B] 2-4. Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="participant_name">
                성명 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="participant_name"
                value={formData.participant_name}
                onChange={handleChange("participant_name")}
                placeholder="홍길동"
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name">
                소속 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={handleChange("company_name")}
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

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="request_note">요청사항</Label>
              <Textarea
                id="request_note"
                value={formData.request_note}
                onChange={handleChange("request_note")}
                placeholder="특이사항이나 요청사항을 입력해주세요"
                disabled={loading}
                rows={2}
              />
            </div>
          </div>

          {/* [Phase 73-L.7.28-B] 5-6. SFE Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sfe_company_code">SFE 거래처코드</Label>
              <Input
                id="sfe_company_code"
                value={formData.sfe_company_code}
                onChange={handleChange("sfe_company_code")}
                placeholder="거래처코드"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sfe_customer_code">SFE 고객코드</Label>
              <Input
                id="sfe_customer_code"
                value={formData.sfe_customer_code}
                onChange={handleChange("sfe_customer_code")}
                placeholder="고객코드"
                disabled={loading}
              />
            </div>
          </div>

          <Separator />

          {/* [Phase 73-L.7.28-B] 7-10. Manager Information */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">담당자 정보</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manager_team">담당자 팀명</Label>
                <Input
                  id="manager_team"
                  value={formData.manager_team}
                  onChange={handleChange("manager_team")}
                  placeholder="팀명"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manager_name">담당자 성명</Label>
                <Input
                  id="manager_name"
                  value={formData.manager_name}
                  onChange={handleChange("manager_name")}
                  placeholder="담당자 이름"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manager_phone">담당자 연락처</Label>
                <Input
                  id="manager_phone"
                  value={formData.manager_phone}
                  onChange={handleChange("manager_phone")}
                  placeholder="010-0000-0000"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manager_emp_id">담당자 사번</Label>
                <Input
                  id="manager_emp_id"
                  value={formData.manager_emp_id}
                  onChange={handleChange("manager_emp_id")}
                  placeholder="사번"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* [Phase 73-L.7.28-B] Action Buttons */}
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
            <Button 
              type="submit" 
              disabled={loading || !isFormValid} 
              className="flex-1"
            >
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
