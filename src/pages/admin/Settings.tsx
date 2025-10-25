import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, Settings as SettingsIcon, Users, FileText } from "lucide-react";
import { announce } from "@/components/pd/LiveRegion";
import { PD_MESSAGES } from "@/lib/pd/messages";
import { slideInLeft, slideInLeftConfig } from "@/lib/pd/motion";

export default function Settings() {
  const [operationMode, setOperationMode] = useState<"production" | "test">("production");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);

  const handleModeChange = (value: string) => {
    setOperationMode(value as "production" | "test");
    const message = "관리자 설정은 Pro 환경에서 적용됩니다";
    toast.info(message);
    announce(message);
  };

  const handlePasswordChange = () => {
    const message = "관리자 설정은 Pro 환경에서 적용됩니다";
    toast.info(message);
    announce(message);
  };

  const handleTwoFactorToggle = (checked: boolean) => {
    setTwoFactorEnabled(checked);
    const message = "관리자 설정은 Pro 환경에서 적용됩니다";
    toast.info(message);
    announce(message);
  };

  const handleLoginAlertsToggle = (checked: boolean) => {
    setLoginAlerts(checked);
    const message = "관리자 설정은 Pro 환경에서 적용됩니다";
    toast.info(message);
    announce(message);
  };

  const handleViewLogs = () => {
    const message = "관리자 설정은 Pro 환경에서 적용됩니다";
    toast.info(message);
    announce(message);
  };

  return (
    <motion.div
      variants={slideInLeft}
      initial="initial"
      animate="animate"
      transition={slideInLeftConfig}
      className="space-y-8"
    >
        <div>
          <h1 className="text-3xl font-bold">관리자 계정 설정</h1>
          <p className="mt-2 text-muted-foreground">
            시스템 환경 및 보안 설정을 관리합니다
          </p>
        </div>

        {/* 시스템 환경 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              시스템 환경 설정
            </CardTitle>
            <CardDescription>운영 모드를 선택합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>운영 모드</Label>
              <Select value={operationMode} onValueChange={handleModeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">운영</SelectItem>
                  <SelectItem value="test">테스트</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 계정 보안 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              계정 보안
            </CardTitle>
            <CardDescription>비밀번호 및 2단계 인증 설정</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>비밀번호 변경</Label>
                <p className="text-sm text-muted-foreground">
                  관리자 계정 비밀번호를 변경합니다
                </p>
              </div>
              <Button variant="outline" onClick={handlePasswordChange}>
                변경
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>2단계 인증 (2FA)</Label>
                <p className="text-sm text-muted-foreground">
                  추가 보안을 위한 2단계 인증 활성화
                </p>
              </div>
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={handleTwoFactorToggle}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>로그인 알림</Label>
                <p className="text-sm text-muted-foreground">
                  새로운 위치에서 로그인 시 알림 전송
                </p>
              </div>
              <Switch
                checked={loginAlerts}
                onCheckedChange={handleLoginAlertsToggle}
              />
            </div>
          </CardContent>
        </Card>

        {/* 사용자 접근 관리 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              사용자 접근 관리
            </CardTitle>
            <CardDescription>에이전시 추가 및 접근 권한 관리</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => toast.info("관리자 설정은 Pro 환경에서 적용됩니다.")}>
              에이전시 관리
            </Button>
          </CardContent>
        </Card>

        {/* 로그 관리 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              로그 관리
            </CardTitle>
            <CardDescription>최근 로그인 및 시스템 변경 내역</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleViewLogs}>
              시스템 로그 보기
            </Button>
          </CardContent>
        </Card>
      </motion.div>
  );
}
