import { useState } from "react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Mail, MessageSquare, Calendar, Users, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Notifications() {
  const [notifications, setNotifications] = useState({
    // Email Notifications
    emailEvents: true,
    emailParticipants: true,
    emailMessages: false,
    emailSystem: true,
    
    // SMS Notifications
    smsUrgent: true,
    smsEvents: false,
    smsParticipants: false,
    
    // Push Notifications
    pushEvents: true,
    pushMessages: true,
    pushSystem: false,
  });

  const handleToggle = (key: string, value: boolean) => {
    setNotifications({
      ...notifications,
      [key]: value,
    });
    toast.success("알림 설정이 업데이트되었습니다.");
  };

  return (
    <AccountLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">알림 설정</h1>
          <p className="mt-2 text-muted-foreground">
            받고 싶은 알림 유형을 선택하세요
          </p>
        </div>

        {/* Email Notifications */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              이메일 알림
            </CardTitle>
            <CardDescription>
              이메일로 받을 알림을 설정합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-events" className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  행사 관련 알림
                </Label>
                <p className="text-sm text-muted-foreground">
                  새로운 행사 등록, 일정 변경 등
                </p>
              </div>
              <Switch
                id="email-events"
                checked={notifications.emailEvents}
                onCheckedChange={(checked) => handleToggle("emailEvents", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-participants" className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  참가자 관련 알림
                </Label>
                <p className="text-sm text-muted-foreground">
                  새로운 참가자 등록, 취소 등
                </p>
              </div>
              <Switch
                id="email-participants"
                checked={notifications.emailParticipants}
                onCheckedChange={(checked) => handleToggle("emailParticipants", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-messages" className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4" />
                  메시지 알림
                </Label>
                <p className="text-sm text-muted-foreground">
                  새로운 메시지 및 댓글
                </p>
              </div>
              <Switch
                id="email-messages"
                checked={notifications.emailMessages}
                onCheckedChange={(checked) => handleToggle("emailMessages", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-system" className="flex items-center gap-2 text-base">
                  <Bell className="h-4 w-4" />
                  시스템 알림
                </Label>
                <p className="text-sm text-muted-foreground">
                  시스템 업데이트, 공지사항 등
                </p>
              </div>
              <Switch
                id="email-system"
                checked={notifications.emailSystem}
                onCheckedChange={(checked) => handleToggle("emailSystem", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* SMS Notifications */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              문자 알림
            </CardTitle>
            <CardDescription>
              문자 메시지로 받을 알림을 설정합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sms-urgent" className="flex items-center gap-2 text-base">
                  <AlertCircle className="h-4 w-4" />
                  긴급 알림
                </Label>
                <p className="text-sm text-muted-foreground">
                  중요한 변경사항 및 긴급 공지
                </p>
              </div>
              <Switch
                id="sms-urgent"
                checked={notifications.smsUrgent}
                onCheckedChange={(checked) => handleToggle("smsUrgent", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sms-events" className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  행사 시작 알림
                </Label>
                <p className="text-sm text-muted-foreground">
                  행사 시작 1시간 전 알림
                </p>
              </div>
              <Switch
                id="sms-events"
                checked={notifications.smsEvents}
                onCheckedChange={(checked) => handleToggle("smsEvents", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sms-participants" className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  참가자 취소 알림
                </Label>
                <p className="text-sm text-muted-foreground">
                  참가자 취소 시 즉시 알림
                </p>
              </div>
              <Switch
                id="sms-participants"
                checked={notifications.smsParticipants}
                onCheckedChange={(checked) => handleToggle("smsParticipants", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              푸시 알림
            </CardTitle>
            <CardDescription>
              브라우저 푸시 알림을 설정합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-events" className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  행사 알림
                </Label>
                <p className="text-sm text-muted-foreground">
                  행사 관련 실시간 알림
                </p>
              </div>
              <Switch
                id="push-events"
                checked={notifications.pushEvents}
                onCheckedChange={(checked) => handleToggle("pushEvents", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-messages" className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4" />
                  메시지 알림
                </Label>
                <p className="text-sm text-muted-foreground">
                  새로운 메시지 실시간 알림
                </p>
              </div>
              <Switch
                id="push-messages"
                checked={notifications.pushMessages}
                onCheckedChange={(checked) => handleToggle("pushMessages", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-system" className="flex items-center gap-2 text-base">
                  <Bell className="h-4 w-4" />
                  시스템 알림
                </Label>
                <p className="text-sm text-muted-foreground">
                  시스템 공지 및 업데이트
                </p>
              </div>
              <Switch
                id="push-system"
                checked={notifications.pushSystem}
                onCheckedChange={(checked) => handleToggle("pushSystem", checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AccountLayout>
  );
}
