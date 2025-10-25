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
};

export function DateRangePicker({ value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(value ?? { from: undefined, to: undefined });

  // 날짜 선택 로직
  const handleSelect = (next?: DateRange) => {
    if (!next) return;
    setRange(next);

    // 두 날짜가 모두 잡힌 경우에만 닫기
    if (next.from && next.to) {
      onChange?.(next);
      // 자동 닫힘을 강제로 제어 (focus out 무시)
      setTimeout(() => setIsOpen(false), 150);
    } else {
      // 한 날짜만 선택한 경우는 열린 상태 유지
      setIsOpen(true);
    }
  };

  const handleOpen = (next: boolean) => {
    // react-day-picker 내부 focus로 인한 자동 닫힘 방지
    // 강제적으로 state로 제어
    setIsOpen(next);
  };

  const displayText = range?.from
    ? range?.to
      ? `${range.from.toLocaleDateString()} ~ ${range.to.toLocaleDateString()}`
      : range.from.toLocaleDateString()
    : "날짜 선택";

  return (
    <Popover open={isOpen} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal hover:border-blue-500 focus:border-blue-500"
          onClick={() => handleOpen(!isOpen)}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
          {displayText}
        </Button>
      </PopoverTrigger>

      {/* focus 이벤트로 닫히지 않도록 포커스 트랩 */}
      {isOpen && (
        <PopoverContent
          align="start"
          side="bottom"
          className="p-2 shadow-lg border rounded-xl bg-white w-auto"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()} // 외부 클릭해도 닫히지 않음
        >
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={range}
            onSelect={handleSelect}
            defaultMonth={range?.from ?? new Date()}
            className="rounded-md border-none"
          />
          <div className="flex justify-end mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-gray-600"
              onClick={() => setIsOpen(false)}
            >
              닫기
            </Button>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}

export default DateRangePicker;
