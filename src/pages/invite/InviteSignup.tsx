import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { ButtonSpinner } from "@/components/pd/Spinner";
import { FocusTrap } from "@/components/pd/FocusTrap";
import { slideInLeft, slideInLeftConfig, fadeIn, fadeInConfig } from "@/lib/pd/motion";
import { supabase } from "@/integrations/supabase/client";

type ValidationStatus = "loading" | "valid" | "invalid" | "expired" | "used";

interface InviteData {
  email: string;
  agency_id: string;
  agency_name?: string;
  role: string;
  expires_at: string;
}

interface SignupFormData {
  email?: string;
  display_name: string;
  password: string;
  password_confirm: string;
  phone?: string;
  position?: string;
}

export default function InviteSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<ValidationStatus>("loading");
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>();

  const password = watch("password");

  // [74-A.9] Validate invite token on mount
  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    validateInviteToken();
  }, [token]);

  const validateInviteToken = async () => {
    if (!token) return;

    try {
      // [74-B.0-FIX] Use validate_invite_token RPC for proper validation
      const { data: validationResult, error } = await supabase.rpc(
        'validate_invite_token',
        { p_token: token }
      );

      if (error) {
        console.error("[InviteSignup] RPC error:", error);
        setStatus("invalid");
        return;
      }

      const result = validationResult as any;

      if (!result?.is_valid) {
        // Map reason to status
        if (result?.reason === "expired") {
          setStatus("expired");
        } else if (result?.reason === "already_used") {
          setStatus("used");
        } else {
          setStatus("invalid");
        }
        return;
      }

      // Valid invite
      setInviteData({
        email: result.email || "",
        agency_id: result.agency_id || "",
        agency_name: result.agency_name || "",
        role: result.role || "staff",
        expires_at: result.expires_at || "",
      });
      setStatus("valid");
    } catch (error) {
      console.error("[InviteSignup] Validation error:", error);
      setStatus("invalid");
    }
  };

  const onSubmit = async (formData: SignupFormData) => {
    if (!token || !inviteData) return;

    if (formData.password !== formData.password_confirm) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Sign up user
      const signupEmail = inviteData.email || formData.email;
      if (!signupEmail) {
        toast.error("이메일을 입력해주세요.");
        return;
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: signupEmail,
        password: formData.password,
        options: {
          data: {
            display_name: formData.display_name,
            phone: formData.phone || null,
            position: formData.position || null,
          },
          emailRedirectTo: `${window.location.origin}/admin/dashboard`,
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("회원가입에 실패했습니다.");

      // [74-B.0-FIX.11] Auto-confirm email for invited users
      const { error: confirmError } = await supabase.rpc(
        'auto_confirm_invited_user',
        { p_user_id: authData.user.id }
      );

      if (confirmError) {
        console.warn("[InviteSignup] Auto-confirm failed, user will need to confirm via email:", confirmError);
      }

      // [74-B.0-FIX.14] Step 2: Use RPC to link user to agency via invite token
      const { data: linkResult, error: linkError } = await supabase.rpc(
        'link_invited_user',
        { 
          p_user_id: authData.user.id,
          p_invite_token: token 
        }
      );

      if (linkError) {
        console.error("[InviteSignup] Link error:", linkError);
        throw linkError;
      }

      const result = linkResult as any;
      if (result?.status !== 'success') {
        throw new Error(result?.message || '에이전시 연결 실패');
      }

      console.log("[InviteSignup] Successfully linked to agency:", result);

      // [74-B.0-FIX.11] Show appropriate success message
      if (!authData.user.email_confirmed_at && confirmError) {
        toast.success("가입 완료! 이메일로 발송된 확인 링크를 클릭해주세요.", {
          description: "이메일 확인 후 로그인이 가능합니다.",
          duration: 10000,
        });
      } else {
        toast.success("가입이 완료되었습니다. 에이전시에 연결되었습니다.");
      }

      // Navigate to dashboard after brief delay
      setTimeout(() => {
        navigate("/admin/dashboard", { replace: true });
      }, 1500);
    } catch (error: any) {
      console.error("[InviteSignup] Signup error:", error);

      let errorMessage = "가입 처리 중 오류가 발생했습니다.";
      if (error.message?.includes("already registered")) {
        errorMessage = "이미 초대를 수락한 사용자입니다.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        variants={slideInLeft}
        initial="initial"
        animate="animate"
        transition={slideInLeftConfig}
        className="w-full max-w-md"
      >
        <Card className="shadow-card">
          <CardHeader className="text-center">
            <motion.div
              variants={fadeIn}
              initial="initial"
              animate="animate"
              transition={{ ...fadeInConfig, delay: 0.1 }}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <UserPlus className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">에이전시 초대 수락</CardTitle>
              <CardDescription className="text-base">
                SympoHub 초대를 수락하고 계정을 생성하세요
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent>
            {/* Loading State */}
            {status === "loading" && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">초대 정보를 확인 중입니다...</p>
              </div>
            )}

            {/* Invalid Token */}
            {status === "invalid" && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">유효하지 않은 초대</h3>
                <p className="text-muted-foreground mb-6">
                  초대 링크가 잘못되었거나 존재하지 않습니다.
                </p>
                <Button onClick={() => (window.location.href = "/")}>홈으로 돌아가기</Button>
              </div>
            )}

            {/* Expired Token */}
            {status === "expired" && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warning/10">
                  <XCircle className="h-8 w-8 text-warning" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">만료된 초대</h3>
                <p className="text-muted-foreground mb-6">
                  이 초대 링크는 만료되었습니다.
                  <br />
                  새로운 초대 링크를 요청하세요.
                </p>
                <Button onClick={() => (window.location.href = "/")}>홈으로 돌아가기</Button>
              </div>
            )}

            {/* Already Used */}
            {status === "used" && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">이미 수락된 초대</h3>
                <p className="text-muted-foreground mb-6">
                  이미 초대를 수락한 사용자입니다.
                  <br />
                  로그인하여 계속 진행하세요.
                </p>
                <Button onClick={() => navigate("/auth/login")}>로그인하기</Button>
              </div>
            )}

            {/* Valid Invite - Signup Form */}
            {status === "valid" && inviteData && (
              <FocusTrap active={true}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Agency Info Display */}
                  <div className="rounded-lg bg-primary-light border border-primary/20 p-4 mb-6">
                    <p className="text-sm text-muted-foreground mb-1">초대 에이전시</p>
                    <p className="text-base font-semibold text-foreground">
                      {inviteData.agency_name || "에이전시"}
                    </p>
                  </div>

                  {/* Email (Optional if not provided) */}
                  {inviteData.email ? (
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        이메일 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={inviteData.email}
                        readOnly
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        이메일 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="이메일을 입력하세요"
                        {...register("email", { 
                          required: "이메일을 입력해주세요",
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: "올바른 이메일 형식이 아닙니다"
                          }
                        })}
                        aria-invalid={!!errors.email}
                        className={errors.email ? "border-destructive" : ""}
                      />
                      {errors.email && (
                        <p className="text-xs text-destructive">{errors.email.message}</p>
                      )}
                    </div>
                  )}

                  {/* Display Name */}
                  <div className="space-y-2">
                    <Label htmlFor="display_name">
                      이름 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="display_name"
                      placeholder="홍길동"
                      {...register("display_name", { required: "이름을 입력해주세요" })}
                      aria-invalid={!!errors.display_name}
                      className={errors.display_name ? "border-destructive" : ""}
                    />
                    {errors.display_name && (
                      <p className="text-xs text-destructive">{errors.display_name.message}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      비밀번호 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="8자 이상 입력하세요"
                      {...register("password", {
                        required: "비밀번호를 입력해주세요",
                        minLength: { value: 8, message: "8자 이상 입력해주세요" },
                      })}
                      aria-invalid={!!errors.password}
                      className={errors.password ? "border-destructive" : ""}
                    />
                    {errors.password && (
                      <p className="text-xs text-destructive">{errors.password.message}</p>
                    )}
                  </div>

                  {/* Password Confirm */}
                  <div className="space-y-2">
                    <Label htmlFor="password_confirm">
                      비밀번호 확인 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="password_confirm"
                      type="password"
                      placeholder="비밀번호를 다시 입력하세요"
                      {...register("password_confirm", {
                        required: "비밀번호 확인을 입력해주세요",
                        validate: (value) => value === password || "비밀번호가 일치하지 않습니다",
                      })}
                      aria-invalid={!!errors.password_confirm}
                      className={errors.password_confirm ? "border-destructive" : ""}
                    />
                    {errors.password_confirm && (
                      <p className="text-xs text-destructive">{errors.password_confirm.message}</p>
                    )}
                  </div>

                  {/* Phone (Optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">연락처</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="010-1234-5678"
                      {...register("phone")}
                    />
                  </div>

                  {/* Position (Optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="position">직책</Label>
                    <Input
                      id="position"
                      placeholder="예: 팀장, 대리"
                      {...register("position")}
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full mt-6"
                    size="lg"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <ButtonSpinner />
                        <span className="ml-2">가입 처리 중...</span>
                      </>
                    ) : (
                      "초대 수락 및 가입하기"
                    )}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground mt-4">
                    가입 시 SympoHub의 이용약관 및 개인정보처리방침에 동의하게 됩니다.
                  </p>
                </form>
              </FocusTrap>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
