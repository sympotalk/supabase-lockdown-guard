// [LOCKED][71-D.FIXFLOW.STABLE] Do not remove or inline this block without architect/QA approval.
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
      <div className="min-h-screen w-full bg-background">
        <Header />
        <div className="flex w-full pt-16">
          <Sidebar />
          <main className="ml-60 flex-1 p-8">
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
    );
  }

  return (
    <AgencyDataProvider>
      <div className="min-h-screen w-full bg-background">
        <Header />
        <div className="flex w-full pt-16">
          <Sidebar />
          <main className="ml-60 flex-1 p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </AgencyDataProvider>
  );
}
