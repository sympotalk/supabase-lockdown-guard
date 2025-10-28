// [71-UI.STANDARD.C] Header - Event integration & dynamic layout
import { useState, useEffect } from "react";
import { Bell, Settings, ChevronDown, Moon, Sun, LogOut, X, ArrowLeft, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  sidebarOpen: boolean;
}

export function Header({ sidebarOpen }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { user, role, agencyScope, setAgencyScope } = useUser();
  const [agencyName, setAgencyName] = useState<string | null>(null);
  const [eventData, setEventData] = useState<any>(null);
  
  const isEventDetailPage = location.pathname.includes("/admin/events/") && params.eventId;

  useEffect(() => {
    const fetchAgencyName = async () => {
      if (role === "master" && agencyScope) {
        const { data } = await supabase
          .from("agencies")
          .select("name")
          .eq("id", agencyScope)
          .single();
        
        if (data) {
          setAgencyName(data.name);
        }
      } else {
        setAgencyName(null);
      }
    };

    fetchAgencyName();
  }, [role, agencyScope]);

  useEffect(() => {
    const fetchEventData = async () => {
      if (isEventDetailPage && params.eventId && agencyScope) {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("id", params.eventId)
          .eq("agency_id", agencyScope)
          .single();
        
        if (!error && data) {
          setEventData(data);
        }
      } else {
        setEventData(null);
      }
    };

    fetchEventData();
  }, [isEventDetailPage, params.eventId, agencyScope]);

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

  const handleExitViewMode = () => {
    setAgencyScope(null);
    toast.info("View Mode가 종료되었습니다.");
    navigate("/master/dashboard");
  };

  const displayName = user?.email?.split("@")[0] || "사용자";
  const roleLabel = role === "master" ? "관리자" : role === "agency_owner" ? "에이전시 오너" : "스태프";

  return (
    <header 
      className="fixed top-0 right-0 h-[64px] bg-sidebar-background z-20 transition-all duration-300"
      style={{ left: sidebarOpen ? '240px' : '0px' }}
    >
      <div className="flex h-full items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          {!sidebarOpen && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                const sidebar = document.querySelector('aside');
                if (sidebar) {
                  const event = new CustomEvent('toggleSidebar');
                  window.dispatchEvent(event);
                }
              }}
              className="mr-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          {isEventDetailPage && eventData ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin/events")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold leading-tight text-sidebar-foreground">
                  {eventData.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(eventData.start_date), "yyyy.MM.dd")} ~ {format(new Date(eventData.end_date), "yyyy.MM.dd")}
                </p>
              </div>
            </>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {role === "master" && 
           agencyScope && 
           agencyName && 
           window.location.pathname.startsWith("/admin") && (
            <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-full px-3 py-1">
              <span className="text-sm font-medium">{agencyName}</span>
              <span className="text-xs opacity-70">(View Mode)</span>
              <button
                onClick={handleExitViewMode}
                className="ml-1 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
                title="전체 보기로 돌아가기"
                aria-label="Exit view mode"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
          </Button>

          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="transition-transform duration-200 hover:rotate-12"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 transition-all" />
            ) : (
              <Moon className="h-5 w-5 transition-all" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden flex-col items-start md:flex">
                  <span className="text-[15px] font-medium">{displayName}</span>
                  <span className="text-xs text-muted-foreground">{roleLabel}</span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{user?.email}</span>
                  <span className="text-xs text-muted-foreground">{roleLabel}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/admin/account")}>
                프로필
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin/settings")}>
                설정
              </DropdownMenuItem>
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
  );
}
