import { useEffect, useState } from "react";
import { Bell, Settings, ChevronDown, Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationCenter } from "@/components/common/NotificationCenter";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MasterHeader() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { user, role, agencyScope } = useUser();
  const [currentAgencyName, setCurrentAgencyName] = useState<string>("");

  // [LOCKED] Do not remove: Calculate agency view mode status
  const isAgencyView =
    (role === "master" && agencyScope && agencyScope !== "master") ||
    (role === "agency_owner" && agencyScope);

  // [LOCKED] Do not remove: Fetch agency name for agency view badge
  useEffect(() => {
    const fetchAgencyName = async () => {
      if (agencyScope && isAgencyView) {
        const { data } = await supabase
          .from("agency_summary")
          .select("name")
          .eq("id", agencyScope)
          .single();
        
        if (data) {
          setCurrentAgencyName(data.name);
        }
      } else {
        setCurrentAgencyName("");
      }
    };

    fetchAgencyName();

    // Debug logs
    if (process.env.NODE_ENV !== "production") {
      console.log("[MasterHeader] isAgencyView:", isAgencyView);
      console.log("[MasterHeader] currentAgencyName:", currentAgencyName);
      console.log("[MasterHeader] agencyScope:", agencyScope);
      console.log("[MasterHeader] role:", role);
    }
  }, [agencyScope, role, isAgencyView, currentAgencyName]);

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

  const displayName = user?.email?.split("@")[0] || "관리자";

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background transition-colors duration-300">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-2" />
          <span className="text-xl font-bold text-primary">SympoHub Master</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <NotificationCenter />

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

          {/* [LOCKED] Do not remove: Agency view badge visibility fix */}
          {isAgencyView && (
            <Badge 
              variant="outline" 
              className="ml-2 text-xs border-primary text-primary bg-primary/10 font-medium"
            >
              에이전시 뷰 · {currentAgencyName || "(알 수 없음)"}
            </Badge>
          )}

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
                  <span className="text-xs text-muted-foreground">마스터 관리자</span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover">
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
  );
}
