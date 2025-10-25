"use client";

import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type OutRange = { from?: Date; to?: Date };
type InRange = { start?: Date; end?: Date };
type Props = {
  value?: InRange;
  onChange?: (v: OutRange) => void;
};

export default function DualDatePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState<"start" | "end" | null>(null);
  const [dates, setDates] = useState<InRange>({ start: value?.start, end: value?.end });

  // ─────────────────────────────────────────────
  // Diagnostics (콘솔에서 상태흐름 확인)
  useEffect(() => {
    // 요일/포맷 단순화 로그
    const fmt = (d?: Date) => (d ? d.toISOString().slice(0, 10) : "-");
    console.log("[DualDatePicker:state]", { open, start: fmt(dates.start), end: fmt(dates.end) });
  }, [open, dates.start, dates.end]);
  // ─────────────────────────────────────────────

  const fmt = (kind: "start" | "end", d?: Date) =>
    d
      ? d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })
      : (kind === "start" ? "시작일" : "종료일");

  // 시작일 선택
  const selectStart = (date?: Date) => {
    console.log("[DualDatePicker:selectStart]", { date });
    if (!date) return;
    setDates({ start: date, end: undefined });
    // Popover의 자동 onOpenChange와 충돌 방지: setTimeout으로 프레임 분리
    setTimeout(() => setOpen("end"), 0);
  };

  // 종료일 선택
  const selectEnd = (date?: Date) => {
    console.log("[DualDatePicker:selectEnd]", { date, start: dates.start });
    if (!date) return;
    const start = dates.start;
    if (!start || date < start) {
      // 역방향 클릭: 시작일로 재설정하고 종료일 계속 열어둠
      setDates({ start: date, end: undefined });
      setOpen("end");
      return;
    }
    setDates({ start, end: date });
    setOpen(null);
    onChange?.({ from: start, to: date });
    
    // 완료 토스트
    toast({
      title: "기간이 설정되었습니다.",
      duration: 2000,
    });
  };

  // Popover의 onOpenChange가 자동으로 닫아버리지 않도록 no-op 핸들러 사용
  const ignoreOpenChange = () => { /* no-op: 수동 제어만 허용 */ };

  return (
    <div className="flex gap-3 w-full">
      {/* 시작일 */}
      <div className="flex-1">
        <div className="text-xs text-gray-500 font-medium pl-1 -mb-1">시작일</div>
        <Popover open={open === "start"} onOpenChange={ignoreOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start font-normal px-5 h-[44px] hover:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-300 transition-all duration-200"
              onClick={() => setOpen("start")}
              aria-label="시작일 선택"
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
              {fmt("start", dates.start)}
            </Button>
          </PopoverTrigger>
          {open === "start" && (
            <PopoverContent
              align="start"
              className="p-3 w-auto bg-popover border shadow-lg rounded-xl animate-scale-in transition-all duration-200"
              onPointerDownOutside={(e) => { console.log("[DualDatePicker:outside-start]"); e.preventDefault(); }}
              onInteractOutside={(e) => e.preventDefault()}
            >
              <Calendar
                mode="single"
                numberOfMonths={2}
                selected={dates.start}
                onSelect={selectStart}
                defaultMonth={dates.start ?? new Date()}
                className="sympo-calendar"
              />
            </PopoverContent>
          )}
        </Popover>
      </div>

      {/* 종료일 */}
      <div className="flex-1">
        <div className="text-xs text-gray-500 font-medium pl-1 -mb-1">종료일</div>
        <Popover open={open === "end"} onOpenChange={ignoreOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start font-normal px-5 h-[44px] hover:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-300 transition-all duration-200 disabled:opacity-50"
              onClick={() => setOpen("end")}
              disabled={!dates.start}
              aria-label="종료일 선택"
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
              {fmt("end", dates.end)}
            </Button>
          </PopoverTrigger>
          {open === "end" && (
            <PopoverContent
              align="start"
              className="p-3 w-auto bg-popover border shadow-lg rounded-xl animate-fade-in transition-all duration-200"
              onPointerDownOutside={(e) => { console.log("[DualDatePicker:outside-end]"); e.preventDefault(); }}
              onInteractOutside={(e) => e.preventDefault()}
            >
              <Calendar
                mode="single"
                numberOfMonths={2}
                selected={dates.end}
                disabled={(d: Date) => !!dates.start && d < dates.start}
                onSelect={selectEnd}
                defaultMonth={dates.end ?? dates.start ?? new Date()}
                className="sympo-calendar"
              />
            </PopoverContent>
          )}
        </Popover>
      </div>
    </div>
  );
}
