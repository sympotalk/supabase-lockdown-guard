import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Mail, Phone, Briefcase, Save } from "lucide-react";
import { useUser } from "@/context/UserContext";

export default function Profile() {
  const { user, loading: userLoading } = useUser();
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialData, setInitialData] = useState({
    display_name: "",
    email: "",
    phone: "",
    position: "",
  });
  const [formData, setFormData] = useState({
    display_name: "",
    email: "",
    phone: "",
    position: "",
  });

  useEffect(() => {
    if (user) {
      // Load from auth.users metadata
      const metadata = (user as any).user_metadata || {};
      const data = {
        display_name: metadata.display_name || metadata.full_name || "",
        email: (user as any).email || "",
        phone: metadata.phone || "",
        position: metadata.position || "",
      };
      setFormData(data);
      setInitialData(data);
    }
  }, [user]);

  useEffect(() => {
    // Check if form has changes
    const changed = 
      formData.display_name !== initialData.display_name ||
      formData.phone !== initialData.phone ||
      formData.position !== initialData.position;
    setHasChanges(changed);
  }, [formData, initialData]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.display_name?.trim()) {
      toast.error("이름을 입력해주세요");
      return;
    }

    if (!formData.phone?.trim()) {
      toast.error("연락처를 입력해주세요");
      return;
    }

    setLoading(true);

    try {
      // [Phase 74-A.3] Use profile_update_and_sync RPC
      const { data, error } = await supabase.rpc("profile_update_and_sync", {
        p_display_name: formData.display_name || null,
        p_phone: formData.phone || null,
        p_position: formData.position || null,
        p_avatar_url: null,
      });

      const result = data as any;

      if (error || result?.status === "error") {
        throw new Error(result?.message || "프로필 저장에 실패했습니다");
      }

      toast.success(result?.message || "프로필이 저장되었습니다");
      
      // Update initial data to reset change tracking
      setInitialData(formData);
      setHasChanges(false);

    } catch (error: any) {
      console.error("[Profile] Save error:", error);
      toast.error(error.message || "저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <AccountLayout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">프로필</h1>
          <p className="mt-2 text-muted-foreground">
            개인 정보를 관리합니다
          </p>
        </div>

        <Card className="shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">프로필 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="display_name">
                  이름 <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) =>
                      setFormData({ ...formData, display_name: e.target.value })
                    }
                    className="pl-9"
                    placeholder="홍길동"
                    required
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
                    value={formData.email}
                    disabled
                    className="pl-9 bg-muted"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  이메일은 변경할 수 없습니다
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  연락처 <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="pl-9"
                    placeholder="010-1234-5678"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">직책</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                    className="pl-9"
                    placeholder="매니저"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading || !hasChanges} 
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? "저장 중..." : "저장"}
              </Button>

              {!hasChanges && (
                <p className="text-xs text-muted-foreground text-center">
                  변경사항이 없습니다
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </AccountLayout>
  );
}
