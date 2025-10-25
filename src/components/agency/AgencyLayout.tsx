import { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { AgencySidebar } from "./AgencySidebar";

interface AgencyLayoutProps {
  children: ReactNode;
}

export function AgencyLayout({ children }: AgencyLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-background">
      <Header />
      <div className="flex w-full pt-16">
        <AgencySidebar />
        <main className="ml-60 flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
