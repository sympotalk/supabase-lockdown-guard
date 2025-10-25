import { useState } from "react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Smartphone, Key, AlertTriangle } from "lucide-react";
import { PasswordModal } from "@/components/agency/PasswordModal";
import { toast } from "sonner";

export default function Security() {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    loginAlerts: true,
    sessionTimeout: true,
  });

  const handleSecurityToggle = (key: string, value: boolean) => {
    setSecuritySettings({
      ...securitySettings,
      [key]: value,
    });
    toast.success("보안 설정이 업데이트되었습니다.");
  };

  return (
    <AccountLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">보안 관리</h1>
          <p className="mt-2 text-muted-foreground">
            계정의 보안 설정을 관리합니다
          </p>
        </div>

        {/* Password Change */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              비밀번호
            </CardTitle>
            <CardDescription>
              정기적으로 비밀번호를 변경하여 계정을 안전하게 보호하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="gap-2" onClick={() => setIsPasswordModalOpen(true)}>
              <Key className="h-4 w-4" />
              비밀번호 변경
            </Button>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              2단계 인증
            </CardTitle>
            <CardDescription>
              추가 보안 계층으로 계정을 보호합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="two-factor" className="text-base">
                  2단계 인증 활성화
                </Label>
                <p className="text-sm text-muted-foreground">
                  로그인 시 추가 인증 코드를 요구합니다
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">준비 중</Badge>
                <Switch
                  id="two-factor"
                  checked={securitySettings.twoFactorAuth}
                  onCheckedChange={(checked) => handleSecurityToggle("twoFactorAuth", checked)}
                  disabled
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Login Alerts */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              로그인 알림
            </CardTitle>
            <CardDescription>
              새로운 기기에서 로그인 시 알림을 받습니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="login-alerts" className="text-base">
                  로그인 알림 받기
                </Label>
                <p className="text-sm text-muted-foreground">
                  새로운 위치나 기기에서 로그인 시 이메일로 알림
                </p>
              </div>
              <Switch
                id="login-alerts"
                checked={securitySettings.loginAlerts}
                onCheckedChange={(checked) => handleSecurityToggle("loginAlerts", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Session Management */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              세션 관리
            </CardTitle>
            <CardDescription>
              자동 로그아웃 및 세션 보안 설정
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="session-timeout" className="text-base">
                  자동 로그아웃
                </Label>
                <p className="text-sm text-muted-foreground">
                  30분 동안 활동이 없으면 자동으로 로그아웃
                </p>
              </div>
              <Switch
                id="session-timeout"
                checked={securitySettings.sessionTimeout}
                onCheckedChange={(checked) => handleSecurityToggle("sessionTimeout", checked)}
              />
            </div>

            <div className="rounded-lg border border-warning/50 bg-warning/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-warning" />
                <div>
                  <p className="text-sm font-medium">보안 권장 사항</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    정기적으로 비밀번호를 변경하고, 2단계 인증을 활성화하여 계정을 안전하게 보호하세요.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <PasswordModal
          open={isPasswordModalOpen}
          onOpenChange={setIsPasswordModalOpen}
        />
      </div>
    </AccountLayout>
  );
}
