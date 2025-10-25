import { useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { Spinner } from "@/components/pd/Spinner";
import { MasterHeader } from "./MasterHeader";
import { MasterSidebar } from "./MasterSidebar";

export function MasterLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, loading, setAgencyScope } = useUser();

  // Clear agency scope when entering master routes
  useEffect(() => {
    if (location.pathname.startsWith("/master")) {
      console.log("[MasterLayout] Clearing agencyScope for master routes");
      setAgencyScope(null);
    }
  }, [location.pathname, setAgencyScope]);

  // Redirect if not master
  useEffect(() => {
    if (!loading && role !== "master") {
      console.log("[MasterLayout] Non-master user detected, redirecting");
      navigate("/admin/dashboard");
    }
  }, [loading, role, navigate]);


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

  return (
    <div className="min-h-screen w-full bg-background">
      <MasterHeader />
      <div className="flex w-full pt-16">
        <MasterSidebar />
        <main className="ml-60 flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
