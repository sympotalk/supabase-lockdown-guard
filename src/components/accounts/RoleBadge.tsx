import { Badge } from "@/components/ui/badge";

interface RoleBadgeProps {
  role: string;
  variant?: "default" | "outline";
}

const roleConfig: Record<string, { label: string; color: string }> = {
  master: { label: "Master", color: "hsl(217, 91%, 60%)" }, // #2F73D9 SympoBlue
  agency_owner: { label: "Owner", color: "hsl(159, 56%, 45%)" }, // #2EB67D SympoGreen
  staff: { label: "Staff", color: "hsl(43, 91%, 59%)" }, // #F7B731 SympoAmber
};

export function RoleBadge({ role, variant = "outline" }: RoleBadgeProps) {
  const config = roleConfig[role] || { label: role, color: "hsl(var(--muted-foreground))" };
  
  return (
    <Badge 
      variant={variant}
      style={{
        borderColor: config.color,
        color: variant === "outline" ? config.color : "white",
        backgroundColor: variant === "outline" ? "transparent" : config.color,
      }}
    >
      {config.label}
    </Badge>
  );
}
