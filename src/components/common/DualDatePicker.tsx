"use client";

import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";

type OutRange = { from?: Date; to?: Date };
type InRange = { start?: Date; end?: Date };
type Props = {
  value?: InRange;
  onChange?: (v: OutRange) => void;
};

export default function DualDatePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState<"start" | "end" | null>(null);
  const [dates, setDates] = useState<InRange>({ start: value?.start, end: value?.end });

  // 포맷
  const fmt = (d?: Date) =>
    d
      ? d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })
      : "날짜 선택";

  // ✅ 핵심: 시작일이 갱신되면 자동으로 종료일 팝오버 열기
  useEffect(() => {
    if (open === "start" && dates.start) {
      // Start 팝오버가 열려 있고 시작일이 방금 선택된 경우
      setOpen("end");
    }
  }, [dates.start, open]);

  // ✅ 래퍼 호환을 위해 onSelect, onDayClick 모두 연결
  const selectStart = (date?: Date) => {
    if (!date) return;
    setDates({ start: date, end: undefined });
    // open 전환은 위 useEffect가 담당
  };
  const selectEnd = (date?: Date) => {
    if (!date) return;
    const start = dates.start;
    if (!start || date < start) {
      // 잘못 클릭하면 시작일부터 다시
      setDates({ start: date, end: undefined });
      setOpen("end");
      return;
    }
    setDates({ start, end: date });
    setOpen(null);
    onChange?.({ from: start, to: date });
  };

  return (
    <div className="flex gap-3 w-full">
      {/* 시작일 */}
      <div className="flex-1">
        <div className="text-xs text-muted-foreground font-medium pl-1 mb-1">시작일</div>
        <Popover open={open === "start"} onOpenChange={(v) => setOpen(v ? "start" : null)}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start font-normal hover:border-primary"
              onClick={() => setOpen("start")}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {fmt(dates.start)}
            </Button>
          </PopoverTrigger>
          {open === "start" && (
            <PopoverContent
              align="start"
              className="p-3 w-auto bg-popover border shadow-lg rounded-xl"
              onPointerDownOutside={(e) => e.preventDefault()}
            >
              <Calendar
                mode="single"
                numberOfMonths={2}
                selected={dates.start}
                onSelect={selectStart as any}
                onDayClick={selectStart as any}
                defaultMonth={dates.start ?? new Date()}
              />
            </PopoverContent>
          )}
        </Popover>
      </div>

      {/* 종료일 */}
      <div className="flex-1">
        <div className="text-xs text-muted-foreground font-medium pl-1 mb-1">종료일</div>
        <Popover open={open === "end"} onOpenChange={(v) => setOpen(v ? "end" : null)}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start font-normal hover:border-primary"
              onClick={() => setOpen("end")}
              disabled={!dates.start}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {fmt(dates.end)}
            </Button>
          </PopoverTrigger>
          {open === "end" && (
            <PopoverContent
              align="start"
              className="p-3 w-auto bg-popover border shadow-lg rounded-xl"
              onPointerDownOutside={(e) => e.preventDefault()}
            >
              <Calendar
                mode="single"
                numberOfMonths={2}
                selected={dates.end}
                disabled={(d: Date) => !!dates.start && d < dates.start}
                onSelect={selectEnd as any}
                onDayClick={selectEnd as any}
                defaultMonth={dates.end ?? dates.start ?? new Date()}
              />
            </PopoverContent>
          )}
        </Popover>
      </div>
    </div>
  );
}
