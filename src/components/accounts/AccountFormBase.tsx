import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCircle } from "lucide-react";

export interface AccountFormData {
  email: string;
  role?: string;
  agency_id?: string;
  agency_name?: string;
}

interface AccountFormBaseProps {
  user: AccountFormData;
  onSave: (data: AccountFormData) => Promise<void>;
  readOnly?: string[];
  showRoleEdit?: boolean;
  variant?: "master" | "agency";
}

const roleOptions = [
  { value: "master", label: "Master", color: "hsl(217, 91%, 60%)" },
  { value: "agency_owner", label: "Owner", color: "hsl(159, 56%, 45%)" },
  { value: "staff", label: "Staff", color: "hsl(43, 91%, 59%)" },
];

export function AccountFormBase({ 
  user, 
  onSave, 
  readOnly = [], 
  showRoleEdit = false,
  variant = "agency" 
}: AccountFormBaseProps) {
  const [formData, setFormData] = useState<AccountFormData>(user);
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

  const cardClass = variant === "master" 
    ? "shadow-md rounded-xl border-border" 
    : "shadow-sm rounded-lg border-border";

  return (
    <Card className={cardClass}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserCircle className="h-5 w-5" />
          계정 정보
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isReadOnly("email")}
            />
          </div>

          {showRoleEdit && (
            <div className="space-y-2">
              <Label htmlFor="role">권한</Label>
              <Select
                value={formData.role || "staff"}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                disabled={isReadOnly("role")}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="권한 선택" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.agency_name && (
            <div className="space-y-2">
              <Label htmlFor="agency">에이전시</Label>
              <Input
                id="agency"
                value={formData.agency_name}
                disabled
                className="bg-muted"
              />
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={loading}
          >
            {loading ? "저장 중..." : "저장"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
