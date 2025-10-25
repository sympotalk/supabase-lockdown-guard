"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

type Props = {
  value?: DateRange;
  onChange?: (v: DateRange) => void;
  resetOnOpen?: boolean; // 모달을 닫았다가 열 때 초기화하려면 true로
};

export function DateRangePicker({ value, onChange, resetOnOpen = false }: Props) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(value ?? { from: undefined, to: undefined });

  // Popover 열 때 초기화 옵션
  const handleOpenChange = (next: boolean) => {
    if (next && resetOnOpen) setRange({ from: undefined, to: undefined });
    setOpen(next);
  };

  const handleSelect = (next?: DateRange) => {
    // react-day-picker가 넘겨주는 next는 {from? , to?}
    setRange(next ?? { from: undefined, to: undefined });

    // 둘 다 선택된 경우에만 닫기
    if (next?.from && next?.to) {
      onChange?.(next);
      // 약간의 딜레이 후 닫으면 포커스 점프 덜함
      setTimeout(() => setOpen(false), 80);
    } else {
      // 시작일만 선택된 상태에서는 닫지 않음(두 번째 클릭 대기)
      setOpen(true);
    }
  };

  const label = range?.from
    ? range.to
      ? `${range.from.toLocaleDateString()} ~ ${range.to.toLocaleDateString()}`
      : range.from.toLocaleDateString()
    : "날짜 선택";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal hover:border-blue-500 focus:border-blue-500"
          onClick={() => handleOpenChange(true)}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
          {label}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="p-2 shadow-lg border rounded-xl bg-white w-auto" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={handleSelect}
          numberOfMonths={2}
          defaultMonth={range?.from ?? new Date()}
        />
      </PopoverContent>
    </Popover>
  );
}

export default DateRangePicker;
