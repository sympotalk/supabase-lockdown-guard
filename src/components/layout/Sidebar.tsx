// [71-UI.STANDARD.A] Sidebar - Fixed layout standard
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export function Sidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (url: string) => currentPath === url;

  return (
    <aside className="fixed top-0 left-0 h-screen w-[240px] bg-white border-r border-gray-100 z-30">
      <div className="h-[64px] flex items-center gap-2 px-5 border-b border-gray-100">
        <Building2 className="w-5 h-5 text-primary" />
        <span className="text-[15px] font-semibold text-foreground">SympoHub</span>
      </div>
      
      <nav className="flex flex-col gap-1 px-3 py-4">
        {menuItems.map((item) => {
          const active = isActive(item.url);
          return (
            <NavLink
              key={item.url}
              to={item.url}
              className={cn(
                "relative flex items-center gap-3 px-3 py-3 rounded-lg text-[15px] font-medium",
                "transition-all duration-150",
                "text-gray-700 hover:bg-sympoblue-50/40 hover:text-foreground",
                active && "bg-sympoblue-50 text-sympoblue-700"
              )}
            >
              {active && (
                <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <item.icon className="h-[18px] w-[18px]" />
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
