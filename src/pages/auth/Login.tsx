import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogIn } from "lucide-react";
import { ButtonSpinner } from "@/components/pd/Spinner";
import { FocusTrap } from "@/components/pd/FocusTrap";
import { announce } from "@/components/pd/LiveRegion";
import { PD_MESSAGES } from "@/lib/pd/messages";
import { slideInLeft, slideInLeftConfig, fadeIn, fadeInConfig } from "@/lib/pd/motion";
import { UIState } from "@/lib/pd/state";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/context/UserContext";

export default function Login() {
  const navigate = useNavigate();
  const { role, userId, refreshContext } = useUser();
  const [formState, setFormState] = useState<UIState>(UIState.IDLE);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Redirect if already logged in
  useEffect(() => {
    if (userId && role) {
      if (role === "master") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/agency/profile", { replace: true });
      }
    }
  }, [userId, role, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (!formData.email) errors.email = "이메일을 입력해주세요";
    if (!formData.password) errors.password = "비밀번호를 입력해주세요";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(PD_MESSAGES.error.validationError);
      announce(PD_MESSAGES.error.validationError);
      return;
    }

    setFormState(UIState.LOADING);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error("로그인에 실패했습니다");
      }

      // Refresh user context to get role
      await refreshContext();

      setFormState(UIState.SUCCESS);
      toast.success(PD_MESSAGES.success.loginSuccess);
      announce(PD_MESSAGES.success.loginSuccess);

      // Get user role from user_roles table
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .single();

      // Navigate based on role
      setTimeout(() => {
        const userRole = roleData?.role || "staff";
        if (userRole === "master") {
          navigate("/admin/dashboard");
        } else {
          navigate("/agency/profile");
        }
      }, 500);
    } catch (error: any) {
      console.error("로그인 오류:", error);
      setFormState(UIState.ERROR);

      let errorMessage = PD_MESSAGES.error.networkError;
      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "이메일 또는 비밀번호가 올바르지 않습니다";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      announce(errorMessage);
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
                <LogIn className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">SympoHub 로그인</CardTitle>
              <CardDescription className="text-base">
                계정 정보를 입력하여 로그인하세요
              </CardDescription>
            </motion.div>
          </CardHeader>
          <CardContent>
            <FocusTrap active={true}>
              <form onSubmit={handleSubmit} className="space-y-4">
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

                <div className="space-y-2">
                  <Label htmlFor="password">
                    비밀번호 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="비밀번호를 입력하세요"
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

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={formState === UIState.LOADING}
                >
                  {formState === UIState.LOADING ? (
                    <>
                      <ButtonSpinner />
                      <span className="ml-2">로그인 중...</span>
                    </>
                  ) : formState === UIState.SUCCESS ? (
                    "로그인 완료 ✓"
                  ) : (
                    "로그인"
                  )}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  <p>초대를 받으셨나요?</p>
                  <p className="mt-1">
                    초대 링크를 통해 가입해주세요
                  </p>
                </div>
              </form>
            </FocusTrap>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
