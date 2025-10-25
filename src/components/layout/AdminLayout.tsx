import { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-background">
      <Header />
      <div className="flex w-full pt-16">
        <Sidebar />
        <main className="ml-60 flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
