// [Phase 73-L.7.25] RoleBadgeSelector 기본값 + 추가 뱃지 반영
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  const [selected, setSelected] = useState<string | null>(fixedRole || "참석자"); // ✅ 기본값 고정
  const [customBadge, setCustomBadge] = useState<string>(customRole || "");

  // ✅ 초기값 반영
  useEffect(() => {
    if (!fixedRole || fixedRole === "선택" || fixedRole === "") {
      setSelected("참석자");
      onFixedRoleChange?.("참석자");
    } else {
      setSelected(fixedRole);
    }
  }, [fixedRole]);

  useEffect(() => {
    setCustomBadge(customRole || "");
  }, [customRole]);

  // ✅ 고정 뱃지 클릭
  const handleSelect = (badge: string) => {
    const newRole = selected === badge ? null : badge;
    setSelected(newRole);
    onFixedRoleChange?.(newRole);
  };

  // ✅ 추가 뱃지 입력 (직접입력)
  const handleCustomBadgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBadge = e.target.value.slice(0, 12); // 최대 12자 제한
    setCustomBadge(newBadge);
  };

  const handleCustomBadgeBlur = () => {
    const trimmed = customBadge.trim();
    onCustomRoleChange?.(trimmed); // ✅ 상위 반영
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
                selected === role && role === '좌장' && "bg-[#6E59F6] text-white hover:bg-[#6E59F6]/90",
                selected === role && role === '연자' && "bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90",
                selected === role && role === '참석자' && "bg-[#9CA3AF] text-white hover:bg-[#9CA3AF]/90",
                selected !== role && "hover:bg-muted"
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
          className="h-8 text-sm"
        />
        <p className="text-xs text-muted-foreground">
          좌장/연자/참석자는 상호배타(1개), 추가 뱃지는 1개만 입력 가능합니다.
        </p>
      </div>
    </div>
  );
};
