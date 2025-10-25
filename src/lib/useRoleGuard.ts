import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type AppRole = "master" | "agency_owner" | "admin" | "staff";

/**
 * Role-based route protection hook
 * Checks user's role from user_roles table and redirects if unauthorized
 */
export function useRoleGuard(requiredRole?: AppRole) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log("[RLS] No authenticated user, redirecting to login");
          navigate("/");
          return;
        }

        console.log("[RLS] Session initialized:", user.id);

        // Fetch user's role from user_roles table
        const { data: roleData, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("[RLS] Error fetching user role:", error);
          toast({
            title: "권한 확인 실패",
            description: "사용자 권한을 확인할 수 없습니다.",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        const role = roleData?.role as AppRole;
        setUserRole(role);
        console.log("[RLS] User role verified:", role);

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
      } catch (error) {
        console.error("[RLS] Role check error:", error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [requiredRole, navigate, toast]);

  return { userRole, loading };
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
