import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import type { AppRole } from "@/lib/useRoleGuard";

interface UserContextType {
  role: AppRole | null;
  agencyScope: string | null;
  userId: string | null;
  loading: boolean;
  setRole: (role: AppRole | null) => void;
  setAgencyScope: (scope: string | null) => void;
  refreshContext: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [agencyScope, setAgencyScopeState] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const setAgencyScope = (scope: string | null) => {
    setAgencyScopeState(scope);
    if (scope) {
      localStorage.setItem("agency_scope", scope);
      console.log("[UserContext] Agency scope set:", scope);
    } else {
      localStorage.removeItem("agency_scope");
      console.log("[UserContext] Agency scope cleared");
    }
  };

  const refreshContext = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log("[UserContext] No authenticated user");
        setRole(null);
        setAgencyScope(null);
        setUserId(null);
        setLoading(false);
        navigate("/");
        return;
      }

      setUserId(user.id);
      console.log("[UserContext] User authenticated:", user.id);

      // Fetch user role from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleError) {
        console.error("[UserContext] Error fetching role:", roleError);
        setLoading(false);
        return;
      }

      const userRole = roleData?.role as AppRole;
      setRole(userRole);
      console.log("[UserContext] Role loaded:", userRole);

      // Handle agency scope
      if (userRole === "master") {
        // For MASTER: check URL param or localStorage
        const query = new URLSearchParams(window.location.search);
        const urlAgency = query.get("asAgency");
        const storedScope = localStorage.getItem("agency_scope");
        
        if (urlAgency) {
          setAgencyScope(urlAgency);
        } else if (storedScope) {
          setAgencyScopeState(storedScope);
        } else {
          setAgencyScopeState(null);
        }
        
        console.log("[UserContext] MASTER context:", agencyScope || "All agencies");
      } else {
        // For AGENCY: fetch from agency_summary or user_roles
        // Agency users should have their agency_id set via their organization
        const { data: agencySummary } = await supabase
          .from("agency_summary")
          .select("agency_id")
          .limit(1)
          .single();

        if (agencySummary?.agency_id) {
          setAgencyScope(agencySummary.agency_id);
          console.log("[UserContext] AGENCY scope auto-set:", agencySummary.agency_id);
        } else {
          // Fallback: use user's own ID as agency scope
          setAgencyScope(user.id);
          console.log("[UserContext] AGENCY scope set to user ID:", user.id);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("[UserContext] Refresh error:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshContext();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        refreshContext();
      } else {
        setRole(null);
        setAgencyScope(null);
        setUserId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider
      value={{
        role,
        agencyScope,
        userId,
        loading,
        setRole,
        setAgencyScope,
        refreshContext,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
