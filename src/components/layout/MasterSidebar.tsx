import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  ScrollText,
  Users,
  FileText,
  Link2,
} from "lucide-react";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
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
    title: "계정 관리",
    icon: Users,
    url: "/master/account",
  },
  {
    title: "Orphan 복구",
    icon: Link2,
    url: "/master/orphan-linker",
  },
  {
    title: "QA 리포트",
    icon: FileText,
    url: "/master/qa-reports",
  },
  {
    title: "시스템 로그",
    icon: ScrollText,
    url: "/master/logs",
  },
];

export function MasterSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (url: string) => currentPath === url;

  return (
    <ShadcnSidebar
      collapsible="icon"
      className="fixed left-0 top-16 h-[calc(100vh-4rem)] border-r"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {masterMenuItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink
                        to={item.url}
                        className={cn(
                          "relative flex items-center gap-3 text-[15px] font-medium transition-all",
                          active && "bg-accent text-primary"
                        )}
                      >
                        {active && (
                          <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                        )}
                        <item.icon className="h-5 w-5" />
                        {state !== "collapsed" && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </ShadcnSidebar>
  );
}
