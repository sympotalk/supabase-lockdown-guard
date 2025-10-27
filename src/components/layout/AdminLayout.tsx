// [LOCKED][71-D.FIXFLOW.STABLE] Do not remove or inline this block without architect/QA approval.
import { Outlet, useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { AgencyDataProvider } from "@/context/AgencyDataContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export function AdminLayout() {
  const navigate = useNavigate();
  const { role, agencyScope } = useUser();

  // Guard: Master without agency scope
  if (role === "master" && !agencyScope) {
    return (
      <SidebarProvider>
        <div className="min-h-screen w-full bg-background flex">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 p-8 pt-24">
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
        <div className="min-h-screen w-full bg-background flex">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 p-8 pt-24">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AgencyDataProvider>
  );
}
