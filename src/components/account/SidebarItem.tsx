import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}

export function SidebarItem({ icon: Icon, label, active, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-[15px] font-medium transition-all",
        active
          ? "bg-primary/5 text-primary"
          : "text-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {active && (
        <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
      )}
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );
}
