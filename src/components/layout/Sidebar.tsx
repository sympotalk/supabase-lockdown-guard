// [71-UI.STANDARD.C] Sidebar - With collapse toggle
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Building2,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const menuItems = [
  {
    title: "대시보드",
    icon: LayoutDashboard,
    url: "/admin/dashboard",
  },
  {
    title: "행사 관리",
    icon: Calendar,
    url: "/admin/events",
  },
  {
    title: "계정 관리",
    icon: Building2,
    url: "/admin/account",
  },
];

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (url: string) => currentPath === url;

  return (
    <aside 
      className={cn(
        "group fixed top-0 left-0 h-screen bg-sidebar-background z-30 transition-all duration-300 ease-in-out",
        isOpen 
          ? "w-[240px] opacity-100" 
          : "w-[60px] opacity-90 hover:w-[240px] hover:opacity-100"
      )}
    >
      <div className="h-[64px] flex items-center justify-between px-4">
        <div className={cn(
          "flex items-center gap-2 whitespace-nowrap transition-opacity duration-200",
          !isOpen && "opacity-0"
        )}>
          <Building2 className="w-5 h-5 text-primary" />
          <span className="text-[15px] font-semibold text-sidebar-foreground">SympoHub</span>
        </div>
        <button
          onClick={onToggle}
          className="p-2 rounded-md hover:bg-sidebar-accent transition-colors"
          aria-label={isOpen ? "사이드바 접기" : "사이드바 펼치기"}
        >
          <Menu className="h-4 w-4 text-sidebar-foreground" />
        </button>
      </div>
  
      <nav className={cn(
        "flex flex-col gap-1 px-3 py-4 transition-opacity duration-300",
        !isOpen && "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
      )}>
        {menuItems.map((item) => {
          const active = isActive(item.url);
          return (
            <NavLink
              key={item.url}
              to={item.url}
              className={cn(
                "relative flex items-center gap-3 px-3 py-3 rounded-lg text-[15px] font-medium",
                "transition-all duration-150",
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                active && "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            >
              {active && (
                <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
              <span className="whitespace-nowrap">{item.title}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
