import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanionBadgeProps {
  companionCount: number;
  companions?: Array<{
    id: string;
    name: string;
    role?: string;
    phone?: string;
  }>;
  className?: string;
}

export default function CompanionBadge({ companionCount, companions, className }: CompanionBadgeProps) {
  if (companionCount === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className={cn(
              "gap-1 cursor-pointer hover:bg-blue-100 border-blue-300 bg-blue-50 text-blue-700",
              className
            )}
          >
            <Link2 className="w-3 h-3" />
            <Users className="w-3 h-3" />
            {companionCount}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold text-xs mb-2">동반의료인 그룹</p>
            {companions && companions.length > 0 ? (
              companions.map((c, idx) => (
                <div key={idx} className="text-xs flex items-center gap-2 py-0.5">
                  <span className="font-medium">{c.name}</span>
                  {c.role && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {c.role}
                    </Badge>
                  )}
                  {c.phone && (
                    <span className="text-muted-foreground">{c.phone}</span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">
                {companionCount}명의 동반자와 연결됨
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
