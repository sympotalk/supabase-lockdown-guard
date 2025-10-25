import { useState } from "react";
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasswordModal({ open, onOpenChange }: PasswordModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newData = {
      ...formData,
      [e.target.name]: e.target.value,
    };
    setFormData(newData);

    // Check password mismatch
    if (e.target.name === "newPassword" || e.target.name === "confirmPassword") {
      if (newData.newPassword && newData.confirmPassword) {
        setPasswordMismatch(newData.newPassword !== newData.confirmPassword);
      } else {
        setPasswordMismatch(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast.error("모든 필드를 입력해주세요");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("새 비밀번호가 일치하지 않습니다");
      return;
    }

    if (formData.newPassword.length < 8) {
      toast.error("비밀번호는 8자 이상이어야 합니다");
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast.success("비밀번호가 변경되었습니다.");
    
    setIsSubmitting(false);
    setFormData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>비밀번호 변경</DialogTitle>
          <DialogDescription>
            새로운 비밀번호를 입력해주세요
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">
              현재 비밀번호 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={formData.currentPassword}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">
              새 비밀번호 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              placeholder="8자 이상 입력"
              value={formData.newPassword}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              새 비밀번호 확인 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="비밀번호 재입력"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
            />
            {passwordMismatch && (
              <p className="text-xs text-destructive">
                비밀번호가 일치하지 않습니다.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || passwordMismatch}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  변경 중...
                </>
              ) : (
                "변경"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
