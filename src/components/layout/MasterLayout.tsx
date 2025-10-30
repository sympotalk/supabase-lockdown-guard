import { useEffect, ReactNode } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { Spinner } from "@/components/pd/Spinner";
import { MasterHeader } from "./MasterHeader";
import { MasterSidebar } from "./MasterSidebar";
import { CacheStatus } from "@/components/common/CacheStatus";
import { SidebarProvider } from "@/components/ui/sidebar";

interface MasterLayoutProps {
  children?: ReactNode;
}

export function MasterLayout({ children }: MasterLayoutProps) {
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
    <SidebarProvider>
      <div className="min-h-screen w-full bg-background flex">
        <CacheStatus />
        <MasterSidebar />
        <div className="flex-1 flex flex-col">
          <MasterHeader />
          <main className="flex-1 p-8 pt-24">
            {children || <Outlet />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
