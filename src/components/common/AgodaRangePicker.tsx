"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

type Props = {
  value?: DateRange;
  onChange?: (v: DateRange | null) => void;
};

export default function AgodaRangePicker({ value, onChange }: Props) {
  const [range, setRange] = useState<DateRange>(value ?? { from: undefined, to: undefined });
  const [tab, setTab] = useState<"calendar" | "unset">("calendar");
  const [open, setOpen] = useState(false);

  const fmt = (d?: Date) => d?.toLocaleDateString("ko-KR", { month: "long", day: "numeric" }) ?? "날짜 선택";

  return (
    <div className="relative">
      {/* 상단 입력 박스 */}
      <div
        className="flex gap-2 border border-input rounded-lg px-3 py-2 bg-background shadow-sm hover:border-primary cursor-pointer transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex-1 text-left">
          <div className="text-xs text-muted-foreground">시작일</div>
          <div className={cn("font-medium", !range.from && "text-muted-foreground")}>
            {fmt(range.from)}
          </div>
        </div>
        <div className="flex-1 text-left">
          <div className="text-xs text-muted-foreground">종료일</div>
          <div className={cn("font-medium", !range.to && "text-muted-foreground")}>
            {fmt(range.to)}
          </div>
        </div>
      </div>

      {/* 캘린더 영역 */}
      {open && (
        <div className="absolute z-50 mt-2 bg-popover rounded-2xl border border-border p-4 w-[640px] shadow-xl">
          {/* 상단 탭 */}
          <div className="flex border-b border-border mb-3">
            <button
              className={cn("px-4 py-2 text-sm font-medium transition-colors",
                tab === "calendar" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setTab("calendar")}
            >
              캘린더
            </button>
            <button
              className={cn("px-4 py-2 text-sm font-medium transition-colors",
                tab === "unset" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}
              onClick={() => {
                setTab("unset");
                setRange({ from: undefined, to: undefined });
                onChange?.(null);
              }}
            >
              날짜 미정
            </button>
          </div>

          {tab === "calendar" && (
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={range}
              onSelect={(val) => {
                const newRange = val ?? { from: undefined, to: undefined };
                setRange(newRange);
                if (newRange?.from && newRange?.to) {
                  onChange?.(newRange);
                }
              }}
              className="rounded-md"
            />
          )}

          {tab === "unset" && (
            <div className="py-8 text-center text-muted-foreground">
              날짜가 미정인 경우 이 옵션을 선택하세요
            </div>
          )}

          {/* 하단 버튼 */}
          <div className="flex justify-end mt-4 gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setRange({ from: undefined, to: undefined });
                setOpen(false);
              }}
            >
              취소
            </Button>
            <Button
              variant="default"
              onClick={() => {
                setOpen(false);
                if (range.from && range.to) {
                  onChange?.(range);
                }
              }}
            >
              완료
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
