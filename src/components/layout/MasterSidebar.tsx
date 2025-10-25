import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const masterMenuItems = [
  {
    title: "마스터 대시보드",
    icon: LayoutDashboard,
    url: "/master/dashboard",
  },
  {
    title: "에이전시 관리",
    icon: Building2,
    url: "/master/agencies",
  },
  {
    title: "시스템 로그",
    icon: ScrollText,
    url: "/master/logs",
  },
];

export function MasterSidebar() {
  return (
    <aside className="fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-60 border-r border-border bg-sidebar-background">
      <nav className="flex flex-col gap-1 p-3">
        {masterMenuItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-3 rounded-lg px-4 py-3 text-[15px] font-medium transition-all",
                isActive
                  ? "bg-accent text-primary"
                  : "text-sidebar-foreground hover:bg-muted"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                )}
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
