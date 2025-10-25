import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "master" | "agency_owner" | "admin" | "staff";

/**
 * Simplified Role-based route protection hook
 * Uses UserContext for role information
 */
export function useRoleGuard(requiredRole?: AppRole) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading } = useUser();

  useEffect(() => {
    if (loading) return;

    // Check if user has required role
    if (requiredRole && role !== requiredRole && role !== "master") {
      console.log("[RLS] Unauthorized access attempt, required:", requiredRole, "has:", role);
      toast({
        title: "접근 권한 없음",
        description: "이 페이지에 접근할 권한이 없습니다.",
        variant: "destructive",
      });
      navigate("/unauthorized");
    }
  }, [requiredRole, role, loading, navigate, toast]);

  return { userRole: role, loading };
}

/**
 * Check if user has a specific role
 */
export async function hasRole(userId: string, role: AppRole): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", role)
    .single();

  if (error) {
    console.error("[RLS] Error checking role:", error);
    return false;
  }

  return !!data;
}
