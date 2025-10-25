import { NavLink } from "react-router-dom";
import { User, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const menuItems = [
  {
    title: "프로필",
    icon: User,
    url: "/agency/profile",
  },
  {
    title: "설정",
    icon: Settings,
    url: "/agency/settings",
  },
];

export function AgencySidebar() {
  const handleLogout = () => {
    toast.success("로그아웃되었습니다");
    // Navigate to login or home
    setTimeout(() => {
      window.location.href = "/admin/dashboard";
    }, 1000);
  };

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
        
        <div className="mt-4 border-t border-border pt-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-[15px] font-medium text-sidebar-foreground hover:bg-muted hover:text-sidebar-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            로그아웃
          </Button>
        </div>
      </nav>
    </aside>
  );
}
