import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useRole, type RoleTier } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "master" | "agency_owner" | "admin" | "staff" | "viewer";

/**
 * Role-based route protection hook using new role_tier system
 */
export function useRoleGuard(requiredRole?: RoleTier) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading, isAtLeast } = useRole();

  useEffect(() => {
    if (loading) return;

    // Check if user has required role
    if (requiredRole && !isAtLeast(requiredRole)) {
      console.log("[RLS] Unauthorized access attempt, required:", requiredRole, "has:", role);
      toast({
        title: "접근 권한 없음",
        description: "이 페이지에 접근할 권한이 없습니다.",
        variant: "destructive",
      });
      
      // Redirect based on current role
      if (role === "master") {
        navigate("/master/dashboard");
      } else if (role) {
        navigate("/admin/dashboard");
      } else {
        navigate("/auth/login");
      }
    }
  }, [requiredRole, role, loading, navigate, toast, isAtLeast]);

  return { userRole: role, loading };
}

/**
 * Check if user has a specific role
 */
export async function hasRole(userId: string, role: RoleTier): Promise<boolean> {
  const { data, error } = await supabase
    .rpc("has_role_tier", { _user_id: userId, _role: role });

  if (error) {
    console.error("[RLS] Error checking role:", error);
    return false;
  }

  return !!data;
}
