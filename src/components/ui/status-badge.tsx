import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "active" | "pending" | "completed" | "cancelled" | "confirmed" | "unconfirmed";
  className?: string;
}

const statusConfig = {
  active: {
    label: "진행중",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  },
  pending: {
    label: "대기",
    className: "bg-orange-100 text-orange-700 hover:bg-orange-200",
  },
  completed: {
    label: "완료",
    className: "bg-green-100 text-green-700 hover:bg-green-200",
  },
  cancelled: {
    label: "취소",
    className: "bg-gray-100 text-gray-700 hover:bg-gray-200",
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
  // ✅ 안전한 fallback 처리 추가
  const config = statusConfig[status] || {
    label: "알수없음",
    className: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  };

  return (
    <Badge
      variant="secondary"
      className={cn(config.className, "rounded-xl border-0", className)}
    >
      {config.label}
    </Badge>
  );
}
