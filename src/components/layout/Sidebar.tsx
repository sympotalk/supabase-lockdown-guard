// [71-H.REBUILD-FINAL] Sidebar - Clean hover and alignment
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
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (url: string) => currentPath === url;

  return (
    <ShadcnSidebar
      collapsible="icon"
      className={cn(
        "fixed left-0 top-[72px] h-[calc(100vh-72px)] border-r bg-background transition-all duration-200",
        state === "collapsed" ? "w-[64px]" : "w-[220px]"
      )}
    >
      <SidebarContent className="px-3 py-4">
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
                      className="p-0 h-auto hover:bg-transparent"
                    >
                      <NavLink 
                        to={item.url}
                        className={cn(
                          "relative flex items-center gap-3 px-3 py-2 rounded-lg text-[15px] font-medium w-full",
                          "transition-all duration-150",
                          "text-muted-foreground hover:text-foreground hover:bg-muted",
                          "sidebar-item",
                          active && "text-primary bg-muted/50"
                        )}
                        data-active={active}
                      >
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
