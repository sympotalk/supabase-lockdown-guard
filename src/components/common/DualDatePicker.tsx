"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";

type DateSelection = {
  start?: Date;
  end?: Date;
};

type Props = {
  value?: DateSelection;
  onChange?: (dates: { from?: Date; to?: Date }) => void;
};

export function DualDatePicker({ value, onChange }: Props) {
  const [openPicker, setOpenPicker] = useState<"start" | "end" | null>(null);
  const [dates, setDates] = useState<DateSelection>({
    start: value?.start,
    end: value?.end,
  });

  const format = (date?: Date) =>
    date
      ? date.toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          weekday: "short",
        })
      : "날짜 선택";

  const handleSelectStart = (date?: Date) => {
    if (!date) return;
    setDates({ start: date, end: undefined });
    // 자동으로 종료일 선택으로 포커스 이동
    setTimeout(() => setOpenPicker("end"), 180);
  };

  const handleSelectEnd = (date?: Date) => {
    if (!date || !dates.start) return;
    
    // 시작일보다 이전 선택 방지
    if (date < dates.start) {
      setDates({ start: date, end: undefined });
      setOpenPicker("end");
    } else {
      setDates((prev) => ({ ...prev, end: date }));
      setOpenPicker(null);
      onChange?.({ from: dates.start, to: date });
    }
  };

  return (
    <div className="flex gap-3 w-full">
      {/* 시작일 선택 */}
      <div className="flex flex-col flex-1 gap-1">
        <label className="text-xs text-muted-foreground font-medium pl-1">시작일</label>
        <Popover open={openPicker === "start"} onOpenChange={(v) => setOpenPicker(v ? "start" : null)}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start font-normal hover:border-primary"
              onClick={() => setOpenPicker("start")}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {format(dates.start)}
            </Button>
          </PopoverTrigger>
          {openPicker === "start" && (
            <PopoverContent
              align="start"
              className="p-3 w-auto bg-popover border shadow-lg rounded-xl"
              onPointerDownOutside={(e) => e.preventDefault()}
            >
              <Calendar
                mode="single"
                numberOfMonths={2}
                selected={dates.start}
                onSelect={handleSelectStart}
                defaultMonth={dates.start ?? new Date()}
              />
            </PopoverContent>
          )}
        </Popover>
      </div>

      {/* 종료일 선택 */}
      <div className="flex flex-col flex-1 gap-1">
        <label className="text-xs text-muted-foreground font-medium pl-1">종료일</label>
        <Popover open={openPicker === "end"} onOpenChange={(v) => setOpenPicker(v ? "end" : null)}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start font-normal hover:border-primary"
              onClick={() => setOpenPicker("end")}
              disabled={!dates.start}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {format(dates.end)}
            </Button>
          </PopoverTrigger>
          {openPicker === "end" && (
            <PopoverContent
              align="start"
              className="p-3 w-auto bg-popover border shadow-lg rounded-xl"
              onPointerDownOutside={(e) => e.preventDefault()}
            >
              <Calendar
                mode="single"
                numberOfMonths={2}
                selected={dates.end}
                disabled={(date) => dates.start ? date < dates.start : false}
                onSelect={handleSelectEnd}
                defaultMonth={dates.end ?? dates.start ?? new Date()}
              />
            </PopoverContent>
          )}
        </Popover>
      </div>
    </div>
  );
}

export default DualDatePicker;
