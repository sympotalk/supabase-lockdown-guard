// [71-UI.STANDARD.C] Admin Layout - Header integration & sidebar persistence
import { Outlet, useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { AgencyDataProvider } from "@/context/AgencyDataContext";
import { useState, useEffect } from "react";

export function AdminLayout() {
  const navigate = useNavigate();
  const { role, agencyScope } = useUser();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("sympohub_sidebar");
    if (saved !== null) setSidebarOpen(saved === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("sympohub_sidebar", String(sidebarOpen));
  }, [sidebarOpen]);

  // Guard: Master without agency scope
  if (role === "master" && !agencyScope) {
    return (
      <div className="relative w-full h-screen bg-background overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <Header sidebarOpen={sidebarOpen} />
        <main 
          className="pt-[64px] h-screen overflow-y-auto bg-background transition-all duration-300"
          style={{ marginLeft: sidebarOpen ? '240px' : '0px' }}
        >
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
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div 
          className="flex-1 flex flex-col h-screen transition-all duration-300"
          style={{ marginLeft: sidebarOpen ? '240px' : '0px' }}
        >
          <Header sidebarOpen={sidebarOpen} />
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
