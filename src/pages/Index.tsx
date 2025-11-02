import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { Spinner } from "@/components/pd/Spinner";

const Index = () => {
  const navigate = useNavigate();
  const { role, userId, loading } = useUser();

  useEffect(() => {
    if (!loading) {
      if (userId && role) {
        // Redirect to appropriate dashboard based on role
        if (role === "master") {
          navigate("/master-dashboard", { replace: true });
        } else {
          navigate("/admin/events", { replace: true });
        }
      } else {
        // Not logged in, redirect to login
        navigate("/auth/login", { replace: true });
      }
    }
  }, [userId, role, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground">리디렉션 중...</p>
      </div>
    </div>
  );
};

export default Index;

console.log("ENV TEST:", import.meta.env.VITE_PHASE_LOCK, import.meta.env.VITE_DEPLOY_ENV);
