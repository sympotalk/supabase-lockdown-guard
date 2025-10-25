import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

type Props = {
  value?: DateRange;
  onChange: (value: DateRange) => void;
};

export default function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange>({ from: undefined, to: undefined });

  const handleSelect = (range: DateRange | undefined) => {
    if (!range?.from) return;

    const clickedDate = range.from;

    // No dates selected → set as start date
    if (!tempRange.from && !tempRange.to) {
      setTempRange({ from: clickedDate, to: undefined });
      onChange({ from: clickedDate, to: undefined });
      return;
    }

    // Only start date exists → set end date with auto-swap
    if (tempRange.from && !tempRange.to) {
      const newRange = clickedDate < tempRange.from
        ? { from: clickedDate, to: tempRange.from }
        : { from: tempRange.from, to: clickedDate };
      
      setTempRange(newRange);
      onChange(newRange);
      
      // Auto-close after selecting end date
      setTimeout(() => {
        setOpen(false);
      }, 300);
      return;
    }

    // Both dates already selected → start new selection
    if (tempRange.from && tempRange.to) {
      setTempRange({ from: clickedDate, to: undefined });
      onChange({ from: clickedDate, to: undefined });
      return;
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Reset temp state when opening
      setTempRange({ from: value?.from, to: value?.to });
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value?.from && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, "yyyy-MM-dd")} ~ {format(value.to, "yyyy-MM-dd")}
              </>
            ) : (
              format(value.from, "yyyy-MM-dd")
            )
          ) : (
            <span>날짜 선택</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={handleSelect}
          initialFocus
          numberOfMonths={2}
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
