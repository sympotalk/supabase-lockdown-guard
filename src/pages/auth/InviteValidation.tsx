import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/pd/Spinner";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";

export default function InviteValidation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [validationResult, setValidationResult] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setValidationResult({
        status: "error",
        code: "NO_TOKEN",
        message: "초대 토큰이 없습니다",
      });
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("validate_invite_token", {
        p_token: token,
      });

      const result = data as any;

      if (error || result?.status === "error") {
        setValidationResult(result || { status: "error", code: "UNKNOWN", message: error?.message });
      } else {
        setValidationResult(result);
        // Auto-redirect to signup after 1 second if valid
        setTimeout(() => {
          navigate(`/signup/${token}`);
        }, 1000);
      }
    } catch (error: any) {
      console.error("[InviteValidation] Error:", error);
      setValidationResult({
        status: "error",
        code: "SYSTEM_ERROR",
        message: error.message || "토큰 검증 중 오류가 발생했습니다",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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

  const isValid = validationResult?.status === "success";
  const errorCode = validationResult?.code;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="text-center">
            {isValid ? (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>초대 확인 완료</CardTitle>
                <CardDescription>
                  {validationResult.agency_name}의 초대입니다
                  <br />
                  잠시 후 가입 페이지로 이동합니다...
                </CardDescription>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  {errorCode === "EXPIRED" ? (
                    <Clock className="h-6 w-6 text-destructive" />
                  ) : errorCode === "ALREADY_USED" ? (
                    <CheckCircle2 className="h-6 w-6 text-destructive" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-destructive" />
                  )}
                </div>
                <CardTitle>
                  {errorCode === "EXPIRED"
                    ? "초대가 만료되었습니다"
                    : errorCode === "ALREADY_USED"
                    ? "이미 사용된 초대 코드입니다"
                    : errorCode === "REVOKED"
                    ? "취소된 초대 코드입니다"
                    : "유효하지 않은 초대 코드"}
                </CardTitle>
                <CardDescription>
                  {validationResult?.message || "초대 코드를 확인할 수 없습니다"}
                </CardDescription>
              </>
            )}
          </CardHeader>
          
          {!isValid && (
            <CardContent>
              <div className="space-y-3">
                {errorCode === "EXPIRED" && (
                  <p className="text-sm text-muted-foreground text-center">
                    초대를 보낸 관리자에게 새로운 초대 링크를 요청해주세요.
                  </p>
                )}
                
                {errorCode === "ALREADY_USED" && validationResult?.used_at && (
                  <p className="text-sm text-muted-foreground text-center">
                    사용 일시: {new Date(validationResult.used_at).toLocaleString("ko-KR")}
                  </p>
                )}

                <Button
                  className="w-full"
                  onClick={() => navigate("/auth/login")}
                >
                  로그인 페이지로 이동
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
