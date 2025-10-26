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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface NewAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencies: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}

export function NewAccountModal({
  open,
  onOpenChange,
  agencies,
  onSuccess,
}: NewAccountModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"master" | "agency_owner" | "staff">("staff");
  const [agencyId, setAgencyId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Reset all fields when modal closes
  useEffect(() => {
    if (!open) {
      setEmail("");
      setPassword("");
      setRole("staff");
      setAgencyId("");
    }
  }, [open]);

  // Master role cannot have agency
  const canSelectAgency = role !== "master";

  // When agency is selected, master role is not available
  const availableRoles = agencyId
    ? [
        { value: "agency_owner", label: "에이전시 오너" },
        { value: "staff", label: "스태프" },
      ]
    : [
        { value: "master", label: "마스터" },
        { value: "agency_owner", label: "에이전시 오너" },
        { value: "staff", label: "스태프" },
      ];

  const handleRoleChange = (newRole: string) => {
    setRole(newRole as "master" | "agency_owner" | "staff");
    // If master is selected, clear agency
    if (newRole === "master") {
      setAgencyId("");
    }
  };

  const handleAgencyChange = (newAgencyId: string) => {
    setAgencyId(newAgencyId);
    // If agency is selected and role is master, change role to staff
    if (newAgencyId && role === "master") {
      setRole("staff");
    }
  };

  const handleCreate = async () => {
    if (!email || !password) {
      toast({
        title: "입력 오류",
        description: "이메일과 비밀번호를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // Validate master constraint
    if (role === "master" && agencyId) {
      toast({
        title: "입력 오류",
        description: "마스터 권한은 에이전시를 선택할 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    // Validate non-master constraint
    if (role !== "master" && !agencyId) {
      toast({
        title: "입력 오류",
        description: "에이전시를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("[NewAccountModal] Creating user:", { email, role, agencyId });

      // Call edge function to create user
      const { data, error } = await supabase.functions.invoke("create-user-account", {
        body: {
          email,
          password,
          role,
          agency_id: agencyId || null,
        },
      });

      if (error) {
        console.error("[NewAccountModal] Edge function error:", error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to create account");
      }

      console.log("[NewAccountModal] User created successfully:", data);

      toast({
        title: "계정 생성 완료",
        description: "계정이 정상적으로 생성되었습니다.",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("[NewAccountModal] Failed to create account:", error);
      toast({
        title: "계정 생성 실패",
        description: error.message || "계정 생성 중 오류가 발생했습니다.",
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
          <DialogTitle>새 계정 생성</DialogTitle>
          <DialogDescription>
            새 사용자 계정을 직접 생성합니다. (마스터 전용)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="create-email">이메일</Label>
            <Input
              id="create-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-password">비밀번호</Label>
            <Input
              id="create-password"
              type="password"
              placeholder="최소 6자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-role">권한</Label>
            <Select value={role} onValueChange={handleRoleChange} disabled={isLoading}>
              <SelectTrigger id="create-role">
                <SelectValue placeholder="권한 선택" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {role === "master" && (
              <p className="text-xs text-muted-foreground">
                마스터 권한은 에이전시를 선택할 수 없습니다.
              </p>
            )}
          </div>
          {canSelectAgency && (
            <div className="space-y-2">
              <Label htmlFor="create-agency">에이전시</Label>
              <Select
                value={agencyId}
                onValueChange={handleAgencyChange}
                disabled={isLoading}
              >
                <SelectTrigger id="create-agency">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            취소
          </Button>
          <Button onClick={handleCreate} disabled={isLoading}>
            {isLoading ? "생성 중..." : "생성"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
