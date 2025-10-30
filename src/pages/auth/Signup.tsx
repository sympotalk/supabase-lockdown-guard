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
import { supabase } from "@/integrations/supabase/client";

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
    // Validate invite from Supabase
    const validateInvite = async () => {
      if (!inviteId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from("account_provisioning")
          .select("*, agencies(name)")
          .eq("invite_token", inviteId)
          .eq("is_used", false)
          .eq("is_active", true)
          .gt("expires_at", new Date().toISOString())
          .single();

        if (error || !data) {
          toast.error("유효하지 않거나 만료된 초대 링크입니다");
          announce("유효하지 않거나 만료된 초대 링크입니다");
          setInviteValid(false);
        } else {
          setInviteData({
            agencyName: data.agencies?.name || "알 수 없음",
            agencyId: data.agency_id,
            role: data.role,
            email: data.email,
            expiresAt: new Date(data.expires_at).toLocaleDateString("ko-KR"),
          });
          setFormData(prev => ({ ...prev, email: data.email || "" }));
          setInviteValid(true);
        }
      } catch (error) {
        console.error("초대 검증 오류:", error);
        toast.error("초대 링크 확인 중 오류가 발생했습니다");
        setInviteValid(false);
      } finally {
        setIsLoading(false);
      }
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
      
      const firstErrorField = Object.keys(errors)[0];
      document.getElementById(firstErrorField)?.focus();
      return;
    }

    setFormState(UIState.LOADING);

    try {
      // 1. Supabase Auth signUp
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.name,
            display_name: formData.name,
            phone: formData.phone,
            position: formData.position,
          },
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (!authData.user) {
        throw new Error("회원가입에 실패했습니다");
      }

      // 2. [Phase 74-A.2] Accept invite and link to agency
      const { data: linkData, error: linkError } = await supabase.rpc(
        "accept_invite_and_link",
        { p_token: inviteId }
      );

      const linkResult = linkData as any;

      if (linkError || linkResult?.status === "error") {
        const errorCode = linkResult?.code;
        let errorMessage = linkResult?.message || "에이전시 연결에 실패했습니다";

        // Handle specific error codes
        if (errorCode === "EMAIL_MISMATCH") {
          errorMessage = linkResult?.message;
          toast.error(errorMessage);
          announce(errorMessage);
          
          // Show alert and stay on page
          setTimeout(() => {
            if (window.confirm(errorMessage + "\n\n다시 시도하시겠습니까?")) {
              window.location.reload();
            }
          }, 500);
          
          setFormState(UIState.ERROR);
          return;
        }
        
        if (errorCode === "EXPIRED") {
          errorMessage = "초대가 만료되었습니다. 새로운 초대를 요청해주세요.";
        }
        
        throw new Error(errorMessage);
      }

      setFormState(UIState.SUCCESS);
      
      // [Phase 74-A.2] Show onboarding toast with appropriate message
      const isAlreadyLinked = linkResult?.code === "ALREADY_LINKED" || linkResult?.already_linked;
      const onboardingMessage = isAlreadyLinked 
        ? "계정이 확인되었습니다"
        : "에이전시에 연결되었습니다";
      
      toast.success(onboardingMessage);
      announce(onboardingMessage);

      // Navigate to admin dashboard (all agency users)
      setTimeout(() => {
        navigate("/admin/dashboard");
      }, 1200);
    } catch (error: any) {
      console.error("가입 오류:", error);
      setFormState(UIState.ERROR);
      
      const errorMessage = error.message || PD_MESSAGES.error.networkError;
      toast.error(errorMessage);
      announce(errorMessage);
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
