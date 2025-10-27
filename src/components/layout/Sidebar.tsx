import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Building2,
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

// [LOCKED][71-H.STABLE] Hide tab-merged items (moved to event detail tabs)
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
  // [LOCKED][71-H.STABLE] 참가자, 숙박, 문자, 설문 항목은 상단 탭으로 이동 → 주석 처리
  // {
  //   title: "참가자 관리",
  //   icon: Users,
  //   url: "/admin/participants",
  // },
  // {
  //   title: "숙박 및 룸핑",
  //   icon: Hotel,
  //   url: "/admin/rooming",
  // },
  // {
  //   title: "문자·알림 발송",
  //   icon: MessageSquare,
  //   url: "/admin/messages",
  // },
  // {
  //   title: "설문·초청장",
  //   icon: FileText,
  //   url: "/admin/forms",
  // },
  {
    title: "계정 관리",
    icon: Building2,
    url: "/admin/account",
  },
];

export function Sidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (url: string) => currentPath === url;

  return (
    <ShadcnSidebar
      collapsible="icon"
      className="fixed left-0 top-16 h-[calc(100vh-4rem)] border-r bg-background"
    >
      <SidebarContent className="px-3 py-4 sidebar-container">
        <div className="text-[15px] font-semibold text-foreground flex items-center gap-2 pl-1 mb-6">
          <Building2 className="w-4 h-4 text-primary" />
          {state !== "collapsed" && <span>SympoHub</span>}
        </div>
        
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={active}
                      className={cn(
                        "relative flex items-center gap-2 px-3 py-2 rounded-xl text-[15px] font-medium transition-all duration-150",
                        "hover:bg-primary/8 hover:text-primary",
                        "sidebar-item",
                        active && "bg-transparent text-primary"
                      )}
                    >
                      <NavLink to={item.url}>
                        {active && (
                          <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                        )}
                        <item.icon className="h-[18px] w-[18px]" />
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
