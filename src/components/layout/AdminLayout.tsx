// [71-H.REBUILD-FINAL] Admin Layout - Complete restructure
import { Outlet, useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { AgencyDataProvider } from "@/context/AgencyDataContext";

export function AdminLayout() {
  const navigate = useNavigate();
  const { role, agencyScope } = useUser();

  // Guard: Master without agency scope
  if (role === "master" && !agencyScope) {
    return (
      <div className="relative w-full h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <Header />
        <main className="ml-[240px] pt-[64px] h-screen overflow-y-auto bg-gray-50">
          <div className="p-6">
            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
              <h2 className="text-2xl font-semibold mb-2">에이전시 선택 필요</h2>
              <p className="text-lg mb-6">에이전시 관리에서 대상을 선택하면 대시보드가 활성화됩니다.</p>
              <Button size="lg" onClick={() => navigate('/master/agencies')}>
                에이전시 선택하기
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <AgencyDataProvider>
      <div className="flex w-full h-screen bg-background">
        <Sidebar />
        <div className="flex-1 ml-[240px] flex flex-col h-screen">
          <Header />
          <main className="flex-1 pt-[64px] overflow-y-auto bg-background">
            <div className="p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </AgencyDataProvider>
  );
}
