"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

type Props = {
  value?: DateRange;
  onChange?: (v: DateRange) => void;
};

export function DateRangePicker({ value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(value ?? { from: undefined, to: undefined });

  const handleSelect = (next?: DateRange) => {
    if (!next) return;
    setRange(next);

    // 두 날짜 선택되면 콜백만 호출 (닫지 않음)
    if (next.from && next.to) onChange?.(next);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="justify-start text-left font-normal w-full hover:border-primary"
          onClick={() => setIsOpen(true)}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
          {range?.from && range?.to
            ? `${range.from.toLocaleDateString()} ~ ${range.to.toLocaleDateString()}`
            : "날짜 선택"}
        </Button>
      </PopoverTrigger>

      {isOpen && (
        <PopoverContent
          align="start"
          className="p-3 w-auto bg-popover border shadow-lg rounded-xl"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={range}
            onSelect={handleSelect}
            defaultMonth={range?.from ?? new Date()}
            className="rounded-md"
          />

          <div className="flex justify-end mt-3">
            <Button
              variant="secondary"
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
