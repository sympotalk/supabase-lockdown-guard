import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

type RestoreState = "idle" | "restoring" | "success" | "error";

export default function SessionSyncManager() {
  const location = useLocation();
  const [restoreState, setRestoreState] = useState<RestoreState>("idle");

  // Don't run on auth pages
  const isAuthPage = location.pathname.startsWith("/auth") || location.pathname === "/";

  useEffect(() => {
    // Skip session sync on auth pages
    if (isAuthPage) {
      console.log("[SessionSync] Skipping on auth page");
      return;
    }

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        console.log("[SessionSync] Tab became visible, checking session...");
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            console.log("[SessionSync] No session found, attempting refresh...");
            setRestoreState("restoring");
            
            const { data: refreshData, error } = await supabase.auth.refreshSession();
            
            if (error || !refreshData.session) {
              console.error("[SessionSync] Refresh failed:", error);
              setRestoreState("error");
              toast.error("세션이 만료되었습니다. 다시 로그인해주세요.");
              
              setTimeout(() => {
                window.location.href = "/auth/login";
              }, 2000);
            } else {
              console.log("[SessionSync] Session restored successfully");
              setRestoreState("success");
              toast.success("세션이 복원되었습니다!");
              
              setTimeout(() => {
                setRestoreState("idle");
              }, 2000);
            }
          } else {
            console.log("[SessionSync] Session is valid");
          }
        } catch (error) {
          console.error("[SessionSync] Error:", error);
          setRestoreState("error");
          toast.error("세션 확인 중 오류가 발생했습니다.");
        }
      }
    };

    // Check session on mount
    handleVisibilityChange();

    // Listen for visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthPage]);

  return (
    <AnimatePresence>
      {restoreState !== "idle" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="bg-card rounded-lg shadow-xl px-8 py-6 text-center min-w-[320px] border border-border"
          >
            {restoreState === "restoring" && (
              <>
                <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
                <p className="text-lg font-semibold text-foreground">세션 복원 중입니다</p>
                <p className="text-sm text-muted-foreground mt-2">잠시만 기다려주세요...</p>
              </>
            )}
            
            {restoreState === "success" && (
              <>
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-semibold text-foreground">세션이 복원되었습니다!</p>
                <p className="text-sm text-muted-foreground mt-2">계속 작업하실 수 있습니다</p>
              </>
            )}
            
            {restoreState === "error" && (
              <>
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <p className="text-lg font-semibold text-foreground">세션이 만료되었습니다</p>
                <p className="text-sm text-muted-foreground mt-2">다시 로그인해주세요</p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
