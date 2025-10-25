import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Hotel,
  MessageSquare,
  FileText,
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
    title: "참가자 관리",
    icon: Users,
    url: "/admin/participants",
  },
  {
    title: "숙박 및 룸핑",
    icon: Hotel,
    url: "/admin/rooming",
  },
  {
    title: "문자·알림 발송",
    icon: MessageSquare,
    url: "/admin/messages",
  },
  {
    title: "설문·초청장",
    icon: FileText,
    url: "/admin/forms",
  },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-60 border-r border-border bg-sidebar-background">
      <nav className="flex flex-col gap-1 p-3">
        {menuItems.map((item) => (
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
