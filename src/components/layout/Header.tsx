// [71-UI.STANDARD.C-FINAL] Header - Event integration & static layout
import { useState, useEffect } from "react";
import { Bell, Settings, ChevronDown, Moon, Sun, LogOut, X, ArrowLeft } from "lucide-react";
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

export function Header() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { user, role, agencyScope, setAgencyScope, displayName } = useUser();
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

  return (
    <header 
      className="fixed top-0 left-[240px] right-0 h-[64px] bg-sidebar-background border-b border-sidebar-border shadow-sm z-20 transition-all duration-150"
    >
      <div className="flex h-full items-center px-6 justify-between">
        <div className="flex items-center gap-3">
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
             <div className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/30 rounded-full px-3 py-1 transition-all duration-150">
              <span className="text-sm font-medium">{agencyName}</span>
              <span className="text-xs opacity-70">(View Mode)</span>
              <button
                onClick={handleExitViewMode}
                className="ml-1 hover:text-primary/80 transition-colors duration-150"
                title="전체 보기로 돌아가기"
                aria-label="Exit view mode"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <Button variant="ghost" size="icon" className="relative hover:bg-sidebar-accent transition-colors duration-150">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
          </Button>

          <Button variant="ghost" size="icon" className="hover:bg-sidebar-accent transition-colors duration-150">
            <Settings className="h-5 w-5" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="transition-all duration-150 hover:bg-sidebar-accent hover:rotate-12"
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
                    {(displayName || "사용자").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden flex-col items-start md:flex">
                  <span className="text-[15px] font-medium">{displayName || "사용자"}</span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{displayName || "사용자"}</span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
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
