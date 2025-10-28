// [71-H.REBUILD-FINAL] Admin Layout - Complete restructure
import { Outlet, useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { AgencyDataProvider } from "@/context/AgencyDataContext";
import { SidebarProvider } from "@/components/ui/sidebar";

export function AdminLayout() {
  const navigate = useNavigate();
  const { role, agencyScope } = useUser();

  // Guard: Master without agency scope
  if (role === "master" && !agencyScope) {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full bg-background overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1">
            <Header />
            <main className="flex-1 overflow-y-auto px-6 pt-[72px] pb-8">
              <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                <h2 className="text-2xl font-semibold mb-2">에이전시 선택 필요</h2>
                <p className="text-lg mb-6">에이전시 관리에서 대상을 선택하면 대시보드가 활성화됩니다.</p>
                <Button size="lg" onClick={() => navigate('/master/agencies')}>
                  에이전시 선택하기
                </Button>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <AgencyDataProvider>
      <SidebarProvider>
        <div className="w-full h-screen grid grid-cols-[240px_1fr] bg-background overflow-hidden">
          <Sidebar />
          <div className="flex flex-col">
            <Header />
            <main className="w-full h-full bg-white overflow-hidden">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AgencyDataProvider>
  );
}
