import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Building2, Mail, Phone, MapPin, Calendar, User } from "lucide-react";

interface ProfileCardProps {
  agency: {
    name: string;
    owner: string;
    email: string;
    phone: string;
    address: string;
    created_at: string;
  };
  onEdit: () => void;
}

export function ProfileCard({ agency, onEdit }: ProfileCardProps) {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Building2 className="h-6 w-6 text-primary" />
              에이전시 기본 정보
            </CardTitle>
            <CardDescription className="mt-2">
              에이전시의 기본 프로필 정보입니다
            </CardDescription>
          </div>
          <Button onClick={onEdit}>
            정보 수정
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              에이전시명
            </Label>
            <p className="text-base font-medium">{agency.name}</p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              대표자명
            </Label>
            <p className="text-base font-medium">{agency.owner}</p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              이메일
            </Label>
            <p className="text-base font-medium">{agency.email}</p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              연락처
            </Label>
            <p className="text-base font-medium">{agency.phone}</p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              주소
            </Label>
            <p className="text-base font-medium">{agency.address}</p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              생성일
            </Label>
            <p className="text-base font-medium">{agency.created_at}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
