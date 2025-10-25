import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "active" | "pending" | "completed" | "cancelled" | "confirmed" | "unconfirmed";
  className?: string;
}

const statusConfig = {
  active: {
    label: "진행중",
    className: "bg-primary/10 text-primary hover:bg-primary/20",
  },
  pending: {
    label: "대기중",
    className: "bg-warning/10 text-warning hover:bg-warning/20",
  },
  completed: {
    label: "완료",
    className: "bg-success/10 text-success hover:bg-success/20",
  },
  cancelled: {
    label: "취소됨",
    className: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  },
  confirmed: {
    label: "확정",
    className: "bg-success/10 text-success hover:bg-success/20",
  },
  unconfirmed: {
    label: "미확정",
    className: "bg-muted text-muted-foreground hover:bg-muted/80",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant="secondary"
      className={cn(config.className, "rounded-xl border-0", className)}
    >
      {config.label}
    </Badge>
  );
}
