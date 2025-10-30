// [Phase 73-L.7.26] RoleBadge Immediate Default Fix (Eliminate "선택" state)
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { normalizeRoleBadge, getRoleBadgeColor } from "@/lib/participantUtils";

const fixedBadges = ["좌장", "연자", "참석자"];

interface RoleBadgeSelectorProps {
  fixedRole?: string | null;
  customRole?: string | null;
  onFixedRoleChange?: (role: string | null) => void;
  onCustomRoleChange?: (role: string) => void;
}

export const RoleBadgeSelector = ({ 
  fixedRole, 
  customRole,
  onFixedRoleChange,
  onCustomRoleChange 
}: RoleBadgeSelectorProps) => {
  // ✅ Immediately normalize on mount - no flicker
  const [selected, setSelected] = useState<string>(() => normalizeRoleBadge(fixedRole));
  const [customBadge, setCustomBadge] = useState<string>(customRole || "");
  const [isCustomBadgeSaving, setIsCustomBadgeSaving] = useState(false);

  // ✅ Update when prop changes, but always normalize
  useEffect(() => {
    const normalized = normalizeRoleBadge(fixedRole);
    if (normalized !== selected) {
      setSelected(normalized);
    }
  }, [fixedRole]);

  useEffect(() => {
    setCustomBadge(customRole || "");
  }, [customRole]);

  // ✅ Fixed badge click handler
  const handleSelect = (badge: string) => {
    setSelected(badge);
    onFixedRoleChange?.(badge);
  };

  // ✅ Custom badge change handler with optimistic UI
  const handleCustomBadgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBadge = e.target.value.slice(0, 12); // 최대 12자 제한
    setCustomBadge(newBadge);
  };

  // ✅ Custom badge blur handler - save to DB
  const handleCustomBadgeBlur = async () => {
    const trimmed = customBadge.trim();
    
    // Skip if no change
    if (trimmed === customRole?.trim()) return;
    
    // Optimistic UI update
    setIsCustomBadgeSaving(true);
    
    try {
      // Call parent handler
      await onCustomRoleChange?.(trimmed);
    } finally {
      setIsCustomBadgeSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Fixed role badges */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">고정 뱃지 (단일 선택)</Label>
        <div className="flex gap-2 flex-wrap">
          {fixedBadges.map((role) => (
            <Badge
              key={role}
              variant={selected === role ? "default" : "outline"}
              className={cn(
                "cursor-pointer px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                selected === role ? getRoleBadgeColor(role) : "hover:bg-muted"
              )}
              onClick={() => handleSelect(role)}
            >
              {role}
            </Badge>
          ))}
        </div>
      </div>

      {/* Custom role input */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">추가 뱃지 (직접입력)</Label>
        <Input
          placeholder="최대 12자"
          value={customBadge}
          onChange={handleCustomBadgeChange}
          onBlur={handleCustomBadgeBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
          maxLength={12}
          disabled={isCustomBadgeSaving}
          className={cn(
            "h-8 text-sm",
            isCustomBadgeSaving && "opacity-50 cursor-wait"
          )}
        />
        <p className="text-xs text-muted-foreground">
          좌장/연자/참석자는 상호배타(1개), 추가 뱃지는 1개만 입력 가능합니다.
        </p>
      </div>
    </div>
  );
};
