import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RoleTier = "master" | "agency_owner" | "admin" | "staff" | "viewer";

interface UseRoleReturn {
  role: RoleTier | null;
  agencyId: string | null;
  agencyScope: string | null;
  loading: boolean;
  hasRole: (requiredRole: RoleTier) => boolean;
  isAtLeast: (minRole: RoleTier) => boolean;
}

const roleHierarchy: Record<RoleTier, number> = {
  master: 1,
  agency_owner: 2,
  admin: 3,
  staff: 4,
  viewer: 5,
};

export function useRole(): UseRoleReturn {
  const [role, setRole] = useState<RoleTier | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [agencyScope, setAgencyScope] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUserRole() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          if (mounted) {
            setRole(null);
            setAgencyId(null);
            setAgencyScope(null);
            setLoading(false);
          }
          return;
        }

        // Query user_agency_roles using raw query to avoid type issues
        const { data: userRoles, error: roleError } = await (supabase as any)
          .from("user_agency_roles")
          .select("role, agency_id, agencies(name)")
          .eq("user_id", user.id)
          .eq("is_active", true);

        if (roleError) {
          console.error("[useRole] Error fetching roles:", roleError);
          if (mounted) {
            setRole(null);
            setAgencyId(null);
            setAgencyScope(null);
            setLoading(false);
          }
          return;
        }

        if (!userRoles || userRoles.length === 0) {
          if (mounted) {
            setRole(null);
            setAgencyId(null);
            setAgencyScope(null);
            setLoading(false);
          }
          return;
        }

        // Get the highest role (lowest number in hierarchy)
        const sortedRoles = userRoles.sort(
          (a: any, b: any) => roleHierarchy[a.role as RoleTier] - roleHierarchy[b.role as RoleTier]
        );
        
        const highestRole = sortedRoles[0];
        
        if (mounted) {
          setRole(highestRole.role as RoleTier);
          setAgencyId(highestRole.agency_id);
          setAgencyScope(
            highestRole.role === "master" 
              ? "MASTER" 
              : highestRole.agencies?.name || null
          );
          setLoading(false);
        }
      } catch (error) {
        console.error("[useRole] Unexpected error:", error);
        if (mounted) {
          setRole(null);
          setAgencyId(null);
          setAgencyScope(null);
          setLoading(false);
        }
      }
    }

    loadUserRole();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserRole();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const hasRole = (requiredRole: RoleTier): boolean => {
    if (!role) return false;
    return role === requiredRole;
  };

  const isAtLeast = (minRole: RoleTier): boolean => {
    if (!role) return false;
    return roleHierarchy[role] <= roleHierarchy[minRole];
  };

  return {
    role,
    agencyId,
    agencyScope,
    loading,
    hasRole,
    isAtLeast,
  };
}
