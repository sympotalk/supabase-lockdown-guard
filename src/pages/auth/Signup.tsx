import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, CheckCircle2, AlertCircle } from "lucide-react";
import { Spinner, ButtonSpinner } from "@/components/pd/Spinner";
import { FocusTrap } from "@/components/pd/FocusTrap";
import { announce } from "@/components/pd/LiveRegion";
import { PD_MESSAGES } from "@/lib/pd/messages";
import { slideInLeft, slideInLeftConfig, fadeIn, fadeInConfig } from "@/lib/pd/motion";
import { UIState } from "@/lib/pd/state";

// Mock Data
const mockInviteData: Record<string, any> = {
  "AG-2025-XK7M": {
    agencyName: "테스트 에이전시",
    masterName: "SympoHub 본사",
    expiresAt: "2025-12-31",
    status: "active",
  },
  "AG-2025-P9QR": {
    agencyName: "신규 파트너사",
    masterName: "SympoHub 본사",
    expiresAt: "2025-12-31",
    status: "used",
  },
};

export default function Signup() {
  const { inviteId } = useParams<{ inviteId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [formState, setFormState] = useState<UIState>(UIState.IDLE);
  const [inviteValid, setInviteValid] = useState(false);
  const [inviteData, setInviteData] = useState<any>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    teamName: "",
    position: "",
    phone: "",
    notes: "",
  });

  const [passwordMismatch, setPasswordMismatch] = useState(false);

  useEffect(() => {
    // Mock invite validation
    const validateInvite = async () => {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (inviteId && mockInviteData[inviteId]) {
        const data = mockInviteData[inviteId];
        if (data.status === "active") {
          setInviteData(data);
          setInviteValid(true);
        } else {
          toast.error("이미 사용된 초대 코드입니다");
          announce("이미 사용된 초대 코드입니다");
        }
      } else {
        toast.error("유효하지 않은 초대 코드입니다");
        announce("유효하지 않은 초대 코드입니다");
      }
      
      setIsLoading(false);
    };

    validateInvite();
  }, [inviteId]);

  useEffect(() => {
    // Check password mismatch
    if (formData.password && formData.confirmPassword) {
      setPasswordMismatch(formData.password !== formData.confirmPassword);
    } else {
      setPasswordMismatch(false);
    }
  }, [formData.password, formData.confirmPassword]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    
    // Validation
    const errors: Record<string, string> = {};
    
    if (!formData.name) errors.name = "이름을 입력해주세요";
    if (!formData.email) errors.email = "이메일을 입력해주세요";
    if (!formData.password) errors.password = "비밀번호를 입력해주세요";
    if (!formData.confirmPassword) errors.confirmPassword = "비밀번호를 확인해주세요";

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "비밀번호가 일치하지 않습니다";
    }

    if (formData.password && formData.password.length < 8) {
      errors.password = "비밀번호는 8자 이상이어야 합니다";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(PD_MESSAGES.error.validationError);
      announce(PD_MESSAGES.error.validationError);
      
      // 첫 번째 에러 필드로 포커스 이동
      const firstErrorField = Object.keys(errors)[0];
      document.getElementById(firstErrorField)?.focus();
      return;
    }

    setFormState(UIState.LOADING);

    try {
      // Simulate registration
      await new Promise(resolve => setTimeout(resolve, 1500));

      setFormState(UIState.SUCCESS);
      toast.success(PD_MESSAGES.success.signupComplete);
      announce(PD_MESSAGES.success.signupComplete);

      // Navigate to login or dashboard
      setTimeout(() => {
        navigate("/admin/dashboard");
      }, 1200);
    } catch (error) {
      setFormState(UIState.ERROR);
      toast.error(PD_MESSAGES.error.networkError);
      announce(PD_MESSAGES.error.networkError);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">초대 코드를 확인하고 있습니다...</p>
        </motion.div>
      </div>
    );
  }

  if (!inviteValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="w-full max-w-md shadow-card">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>유효하지 않은 초대 코드</CardTitle>
              <CardDescription>
                초대 코드가 만료되었거나 이미 사용되었습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={() => navigate("/admin/dashboard")}
              >
                대시보드로 이동
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 py-12">
      <motion.div
        variants={slideInLeft}
        initial="initial"
        animate="animate"
        transition={slideInLeftConfig}
        className="w-full max-w-2xl"
      >
        <Card className="shadow-card"
          style={
            formState === UIState.SUCCESS
              ? { backgroundColor: "hsl(var(--success) / 0.05)", borderColor: "hsl(var(--success))" }
              : undefined
          }
        >
          <CardHeader className="text-center">
            <motion.div
              variants={fadeIn}
              initial="initial"
              animate="animate"
              transition={{ ...fadeInConfig, delay: 0.1 }}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">SympoHub 회원가입</CardTitle>
              <CardDescription className="text-base">
                초청된 에이전시의 구성원으로 등록됩니다. 아래 정보를 입력해주세요.
              </CardDescription>
            </motion.div>
          </CardHeader>
          <CardContent>
            <FocusTrap active={true}>
            <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">초대 코드 확인 완료</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    초대 코드: <span className="font-mono">{inviteId}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    만료일: {inviteData.expiresAt}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="agencyName">
                초청 에이전시명
              </Label>
              <Input
                id="agencyName"
                value={inviteData.agencyName}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="grid gap-3 sm:gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  이름 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="홍길동"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  aria-describedby={fieldErrors.name ? "name-error" : undefined}
                  aria-invalid={!!fieldErrors.name}
                  className={fieldErrors.name ? "border-destructive" : ""}
                />
                {fieldErrors.name && (
                  <p id="name-error" className="text-xs text-destructive">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  연락처
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="010-1234-5678"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                이메일 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="example@company.com"
                value={formData.email}
                onChange={handleInputChange}
                required
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                aria-invalid={!!fieldErrors.email}
                className={fieldErrors.email ? "border-destructive" : ""}
              />
              {fieldErrors.email && (
                <p id="email-error" className="text-xs text-destructive">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="teamName">
                  소속 팀명
                </Label>
                <Input
                  id="teamName"
                  name="teamName"
                  placeholder="예: 마케팅팀"
                  value={formData.teamName}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">
                  직책 / 직무명
                </Label>
                <Input
                  id="position"
                  name="position"
                  placeholder="예: 팀장, 매니저"
                  value={formData.position}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                비밀번호 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="8자 이상 입력"
                value={formData.password}
                onChange={handleInputChange}
                required
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                aria-invalid={!!fieldErrors.password}
                className={fieldErrors.password ? "border-destructive" : ""}
              />
              {fieldErrors.password && (
                <p id="password-error" className="text-xs text-destructive">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                비밀번호 확인 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="비밀번호 재입력"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                aria-describedby={
                  passwordMismatch || fieldErrors.confirmPassword
                    ? "confirmPassword-error"
                    : undefined
                }
                aria-invalid={passwordMismatch || !!fieldErrors.confirmPassword}
                className={passwordMismatch || fieldErrors.confirmPassword ? "border-destructive" : ""}
              />
              {(passwordMismatch || fieldErrors.confirmPassword) && (
                <p id="confirmPassword-error" className="text-xs text-destructive">
                  {fieldErrors.confirmPassword || "비밀번호가 일치하지 않습니다"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">
                비고 / 메모
              </Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="추가로 전달하실 내용이 있으시면 입력해주세요 (선택)"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                회원가입 시 SympoHub의 서비스 약관 및 개인정보 처리방침에 동의하는 것으로 간주됩니다
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={formState === UIState.LOADING || passwordMismatch}
            >
              {formState === UIState.LOADING ? (
                <>
                  <ButtonSpinner />
                  <span className="ml-2">처리 중...</span>
                </>
              ) : formState === UIState.SUCCESS ? (
                "가입 완료 ✓"
              ) : (
                "가입 완료"
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate("/admin/dashboard")}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                로그인으로 돌아가기
              </button>
            </div>
          </form>
          </FocusTrap>
        </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
