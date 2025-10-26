import { Navigate } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { Spinner } from "@/components/pd/Spinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "master" | "agency_owner" | "staff";
  allowedRoles?: Array<"master" | "agency_owner" | "staff">;
}

export const ProtectedRoute = ({ children, requiredRole, allowedRoles }: ProtectedRouteProps) => {
  const { role, loading, userId, agencyScope } = useUser();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return <Navigate to="/auth/login" replace />;
  }

  // Check if user has required role or one of allowed roles
  const hasPermission = 
    (!requiredRole && !allowedRoles) ||
    (requiredRole && role === requiredRole) ||
    (allowedRoles && role && allowedRoles.includes(role));

  if (!hasPermission) {
    // Redirect to appropriate dashboard based on role
    if (role === "master") {
      return <Navigate to="/master/dashboard" replace />;
    } else {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
