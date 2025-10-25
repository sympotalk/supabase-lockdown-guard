import { useState, useRef, useEffect } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import { ChevronDown, Building2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AgencySwitcher() {
  const { agencyList, agency, setActiveAgency, loading } = useAppData();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Don't show switcher if no agencies or loading
  if (!agencyList?.length || loading) {
    return null;
  }

  // Don't show if only one agency
  if (agencyList.length === 1) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg border border-border">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          {agency?.name || agencyList[0].name}
        </span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        className="flex items-center gap-2 min-w-[200px] justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span className="truncate">{agency?.name || "에이전시 선택"}</span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[280px] bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-border bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground uppercase px-2">
              관리 중인 에이전시 ({agencyList.length})
            </p>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {agencyList.map((agencyItem) => (
              <button
                key={agencyItem.id}
                onClick={() => {
                  setActiveAgency(agencyItem);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors",
                  agency?.id === agencyItem.id && "bg-primary/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    agency?.id === agencyItem.id ? "bg-primary" : "bg-muted"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    agency?.id === agencyItem.id ? "text-primary" : "text-foreground"
                  )}>
                    {agencyItem.name}
                  </span>
                </div>
                {agency?.id === agencyItem.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
