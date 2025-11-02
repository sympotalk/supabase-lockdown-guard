// @locked-phase-90
// Phase 90-FINAL-QA-LOCK: QA overlay for visual inspection
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface QAOverlayProps {
  pageName: string;
  isApproved?: boolean;
}

export function QAOverlay({ pageName, isApproved = false }: QAOverlayProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Only show in QA lock mode
  const isQAMode = import.meta.env.VITE_PHASE_LOCK === '90';
  
  if (!isQAMode) return null;
  
  return (
    <div 
      className={cn(
        "fixed top-0 right-0 z-50 m-4 transition-opacity",
        isHovered ? "opacity-100" : "opacity-30"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Badge 
        variant={isApproved ? "default" : "secondary"}
        className={cn(
          "text-xs px-3 py-1.5",
          isApproved 
            ? "bg-green-500 hover:bg-green-600" 
            : "bg-yellow-500 hover:bg-yellow-600 text-black"
        )}
      >
        🔒 QA: {pageName} {isApproved ? "✓" : "⚠"}
      </Badge>
    </div>
  );
}
