import { useNavigate, useLocation } from "react-router-dom";
import { User, Settings, Shield, Bell } from "lucide-react";
import { SidebarItem } from "./SidebarItem";
import { toast } from "sonner";

const menuItems = [
  {
    title: "프로필",
    icon: User,
    url: "/agency/profile",
  },
  {
    title: "계정 설정",
    icon: Settings,
    url: "/agency/settings",
  },
  {
    title: "보안 관리",
    icon: Shield,
    url: "/agency/security",
  },
  {
    title: "알림 설정",
    icon: Bell,
    url: "/agency/notifications",
  },
];

export function AccountSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (url: string, title: string) => {
    navigate(url);
    toast.info(`${title} 탭으로 이동합니다.`);
  };

  return (
    <aside className="fixed left-60 top-16 z-30 h-[calc(100vh-4rem)] w-[200px] border-r border-border bg-card">
      <nav className="flex flex-col gap-1 p-5">
        {menuItems.map((item) => (
          <SidebarItem
            key={item.url}
            icon={item.icon}
            label={item.title}
            active={location.pathname === item.url}
            onClick={() => handleNavigation(item.url, item.title)}
          />
        ))}
      </nav>
    </aside>
  );
}
