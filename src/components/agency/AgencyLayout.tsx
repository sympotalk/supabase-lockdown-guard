import { ReactNode, useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { AgencySidebar } from "./AgencySidebar";

interface AgencyLayoutProps {
  children: ReactNode;
}

export function AgencyLayout({ children }: AgencyLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("sympohub_sidebar");
    if (saved !== null) setSidebarOpen(saved === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("sympohub_sidebar", String(sidebarOpen));
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen w-full bg-background">
      <Header sidebarOpen={sidebarOpen} />
      <div className="flex w-full pt-16">
        <AgencySidebar />
        <main 
          className="flex-1 p-8 transition-all duration-300"
          style={{ marginLeft: sidebarOpen ? '240px' : '0px' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
