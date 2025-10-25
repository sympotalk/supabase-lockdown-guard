import { ReactNode, useEffect } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { Spinner } from "@/components/pd/Spinner";
import { 
  LayoutDashboard, 
  Building2, 
  ScrollText,
  Bell,
  Settings,
  Moon,
  Sun,
  LogOut,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MasterLayoutProps {
  children: ReactNode;
}

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

export function MasterLayout({ children }: MasterLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, loading, setAgencyScope } = useUser();
  const { theme, setTheme } = useTheme();

  // Clear agency scope when entering master routes
  useEffect(() => {
    if (location.pathname.startsWith("/master")) {
      console.log("[MasterLayout] Clearing agencyScope for master routes");
      setAgencyScope(null);
    }
  }, [location.pathname, setAgencyScope]);

  // Redirect if not master
  useEffect(() => {
    if (!loading && role !== "master") {
      console.log("[MasterLayout] Non-master user detected, redirecting");
      navigate("/admin/dashboard");
    }
  }, [loading, role, navigate]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("로그아웃되었습니다");
      navigate("/auth/login");
    } catch (error) {
      console.error("로그아웃 오류:", error);
      toast.error("로그아웃 중 오류가 발생했습니다");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  const displayName = user?.email?.split("@")[0] || "관리자";

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Master Header */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold">SympoHub Master</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-white hover:bg-blue-500">
              <Bell className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" className="text-white hover:bg-blue-500">
              <Settings className="h-5 w-5" />
            </Button>

            <Button 
              variant="ghost" 
              size="icon"
              className="text-white hover:bg-blue-500"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 text-white hover:bg-blue-500">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-blue-800 text-white text-sm">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[15px] font-medium">{displayName}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{user?.email}</span>
                    <span className="text-xs text-muted-foreground">마스터 관리자</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex w-full pt-16">
        {/* Master Sidebar */}
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
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-sidebar-foreground hover:bg-muted"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-blue-600" />
                    )}
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="ml-60 flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
