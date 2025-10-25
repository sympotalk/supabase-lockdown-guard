import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AdminLayout() {
  return (
    <div className="min-h-screen w-full bg-background">
      <Header />
      <div className="flex w-full pt-16">
        <Sidebar />
        <main className="ml-60 flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
