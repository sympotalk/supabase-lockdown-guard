import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import type { Session, User } from "@supabase/supabase-js";
import type { AppRole } from "@/lib/useRoleGuard";
import SessionSyncManager from "@/components/auth/SessionSyncManager";

interface UserContextType {
  role: AppRole | null;
  agencyScope: string | null;
  userId: string | null;
  user: User | null;
  session: Session | null;
  displayName: string | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

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
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        console.log("[UserContext] No authenticated session");
        setRole(null);
        setAgencyScope(null);
        setUserId(null);
        setUser(null);
        setSession(null);
        setLoading(false);
        navigate("/");
        return;
      }

      const currentUser = currentSession.user;
      setUserId(currentUser.id);
      setUser(currentUser);
      setSession(currentSession);
      console.log("[UserContext] User authenticated:", currentUser.id);

      // Fetch user role from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role, agency_id")
        .eq("user_id", currentUser.id)
        .single();

      if (roleError) {
        console.error("[UserContext] Error fetching role:", roleError);
        setLoading(false);
        return;
      }

      const userRole = roleData?.role as AppRole;
      setRole(userRole);
      console.log("[UserContext] Role loaded:", userRole);

      // Fetch display name from profiles
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", currentUser.id)
        .single();

      const userDisplayName = profileData?.display_name || currentUser.email?.split("@")[0] || "사용자";
      setDisplayName(userDisplayName);
      console.log("[UserContext] Display name loaded:", userDisplayName);

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
        // For AGENCY: use agency_id from user_roles
        if (roleData?.agency_id) {
          setAgencyScope(roleData.agency_id);
          console.log("[UserContext] AGENCY scope auto-set:", roleData.agency_id);
        } else {
          // Fallback: use user's own ID as agency scope
          setAgencyScope(currentUser.id);
          console.log("[UserContext] AGENCY scope set to user ID:", currentUser.id);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("[UserContext] Refresh error:", error);
      setLoading(false);
    }
  };

  // Auto-clear agency scope when navigating to master routes
  useEffect(() => {
    if (location.pathname.startsWith("/master")) {
      console.log("[UserContext] Master route detected, clearing agencyScope");
      setAgencyScopeState(null);
      localStorage.removeItem("agency_scope");
    }
  }, [location.pathname]);

  useEffect(() => {
    // Initialize auth state
    refreshContext();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      console.log("[UserContext] Auth state changed:", _event);
      
      // Only sync state updates here, defer Supabase calls to prevent deadlock
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        // Defer context refresh to prevent deadlock
        setTimeout(() => {
          refreshContext();
        }, 0);
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
        user,
        session,
        displayName,
        loading,
        setRole,
        setAgencyScope,
        refreshContext,
      }}
    >
      <SessionSyncManager />
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
