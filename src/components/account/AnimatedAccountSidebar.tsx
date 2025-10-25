import { useNavigate, useLocation } from "react-router-dom";
import { User, Settings, Shield, Bell, Users } from "lucide-react";
import { motion } from "framer-motion";
import { SidebarItem } from "./SidebarItem";
import { toast } from "sonner";

// Mock role - will be replaced with actual auth context in Pro
const mockUserRole: "AGENCY" | "ADMIN" = "AGENCY"; // Change to "ADMIN" to test admin sidebar

const agencyMenuItems = [
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

const adminMenuItems = [
  {
    title: "시스템 설정",
    icon: Settings,
    url: "/admin/settings",
  },
  {
    title: "보안 관리",
    icon: Shield,
    url: "/admin/security",
  },
  {
    title: "사용자 접근",
    icon: Users,
    url: "/admin/users",
  },
];

export function AnimatedAccountSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = mockUserRole === "ADMIN";
  const menuItems = isAdmin ? adminMenuItems : agencyMenuItems;

  const handleNavigation = (url: string, title: string) => {
    navigate(url);
    toast.success(`${title} 페이지로 이동했습니다.`);
  };

  return (
    <motion.aside
      initial={{ x: -220, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -220, opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="fixed left-60 top-16 z-30 h-[calc(100vh-4rem)] w-[200px] border-r border-border bg-card"
    >
      <nav className="flex flex-col gap-1 p-5">
        {menuItems.map((item) => (
          <motion.div
            key={item.url}
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.2 }}
          >
            <SidebarItem
              icon={item.icon}
              label={item.title}
              active={location.pathname === item.url}
              onClick={() => handleNavigation(item.url, item.title)}
            />
          </motion.div>
        ))}
      </nav>
    </motion.aside>
  );
}
