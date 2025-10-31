import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { AccountSidebar } from "./AccountSidebar";

interface AccountLayoutProps {
  children: ReactNode;
}

export function AccountLayout({ children }: AccountLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-background">
      <Header />
      <div className="flex w-full pt-16">
        <Sidebar />
        <AccountSidebar />
        <AnimatePresence mode="wait">
          <motion.main
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.25 }}
            className="ml-[460px] flex-1 p-6 bg-muted/30"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
