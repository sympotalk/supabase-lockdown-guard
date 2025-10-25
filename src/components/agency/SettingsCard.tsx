import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bell, Moon, Sun, Lock, FileText, Trash2 } from "lucide-react";

interface SettingsCardProps {
  settings: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    theme: "light" | "dark";
  };
  onNotificationChange: (type: "email" | "sms", value: boolean) => void;
  onThemeChange: (theme: "light" | "dark") => void;
  onPasswordChange: () => void;
  onViewLogs: () => void;
  onDeleteAccount: () => void;
}

export function SettingsCard({
  settings,
  onNotificationChange,
  onThemeChange,
  onPasswordChange,
  onViewLogs,
  onDeleteAccount,
}: SettingsCardProps) {
  return (
    <div className="space-y-6">
      {/* Notifications */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            알림 수신 설정
          </CardTitle>
          <CardDescription>
            이메일 및 문자 알림 수신 여부를 설정합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications" className="text-base">
                이메일 알림
              </Label>
              <p className="text-sm text-muted-foreground">
                중요 공지 및 업데이트를 이메일로 받습니다
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => onNotificationChange("email", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-notifications" className="text-base">
                문자 알림
              </Label>
              <p className="text-sm text-muted-foreground">
                긴급 알림을 문자로 받습니다
              </p>
            </div>
            <Switch
              id="sms-notifications"
              checked={settings.smsNotifications}
              onCheckedChange={(checked) => onNotificationChange("sms", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {settings.theme === "light" ? (
              <Sun className="h-5 w-5 text-primary" />
            ) : (
              <Moon className="h-5 w-5 text-primary" />
            )}
            인터페이스 테마
          </CardTitle>
          <CardDescription>
            화면 테마를 선택합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant={settings.theme === "light" ? "default" : "outline"}
              className="flex-1 gap-2"
              onClick={() => onThemeChange("light")}
            >
              <Sun className="h-4 w-4" />
              라이트 모드
            </Button>
            <Button
              variant={settings.theme === "dark" ? "default" : "outline"}
              className="flex-1 gap-2"
              onClick={() => onThemeChange("dark")}
            >
              <Moon className="h-4 w-4" />
              다크 모드
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            보안 설정
          </CardTitle>
          <CardDescription>
            비밀번호 및 보안 관련 설정입니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full gap-2" onClick={onPasswordChange}>
            <Lock className="h-4 w-4" />
            비밀번호 변경
          </Button>
        </CardContent>
      </Card>

      {/* System Logs */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            시스템 로그
          </CardTitle>
          <CardDescription>
            시스템 활동 기록을 확인합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={onViewLogs}
            disabled
          >
            <FileText className="h-4 w-4" />
            로그 보기
            <Badge variant="secondary" className="ml-2">
              준비 중
            </Badge>
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            위험 영역
          </CardTitle>
          <CardDescription>
            계정 삭제는 복구할 수 없습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={onDeleteAccount}
          >
            <Trash2 className="h-4 w-4" />
            계정 삭제
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
