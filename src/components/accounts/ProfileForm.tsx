import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, Building2 } from "lucide-react";

interface ProfileData {
  name?: string;
  email?: string;
  phone?: string;
  agency?: string;
}

interface ProfileFormProps {
  user: ProfileData;
  onSave: (data: ProfileData) => Promise<void>;
  readOnly?: string[];
}

export function ProfileForm({ user, onSave, readOnly = [] }: ProfileFormProps) {
  const [formData, setFormData] = useState(user);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  const isReadOnly = (field: string) => readOnly.includes(field);

  return (
    <Card className="shadow-md rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">프로필 정보</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isReadOnly("name")}
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
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isReadOnly("email")}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">연락처</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={isReadOnly("phone")}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agency">소속</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="agency"
                value={formData.agency || ""}
                onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                disabled={isReadOnly("agency")}
                className="pl-9"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "저장 중..." : "저장"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
