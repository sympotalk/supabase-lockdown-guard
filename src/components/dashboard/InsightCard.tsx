import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "error";
}

export function InsightCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: InsightCardProps) {
  const variantStyles = {
    default: "bg-primary/10 text-primary",
    success: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    warning: "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
    error: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  };

  return (
    <Card className="shadow-md rounded-2xl border-border transition-shadow hover:shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-[13px] font-medium text-muted-foreground mb-2">{title}</p>
            <h3 className="text-[32px] font-bold text-foreground leading-none mb-2">
              {value}
            </h3>
            {subtitle && (
              <p className="text-[12px] text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className="mt-2 flex items-center gap-1">
                <span
                  className={cn(
                    "text-[12px] font-medium",
                    trend.isPositive ? "text-green-600" : "text-red-600"
                  )}
                >
                  {trend.isPositive ? "+" : ""}
                  {trend.value}%
                </span>
                <span className="text-[11px] text-muted-foreground">vs 지난달</span>
              </div>
            )}
          </div>
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              variantStyles[variant]
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
