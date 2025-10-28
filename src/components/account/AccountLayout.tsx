import { ReactNode, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { AnimatedAccountSidebar } from "./AnimatedAccountSidebar";

interface AccountLayoutProps {
  children: ReactNode;
}

export function AccountLayout({ children }: AccountLayoutProps) {
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
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <AnimatedAccountSidebar />
        <AnimatePresence mode="wait">
          <motion.main
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.25 }}
            className="ml-[460px] flex-1 p-6 bg-muted/30"
            style={{ marginLeft: sidebarOpen ? '460px' : '220px' }}
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
