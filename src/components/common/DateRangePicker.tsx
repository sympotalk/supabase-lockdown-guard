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
  const [hasStartDate, setHasStartDate] = useState(false);

  const handleSelect = (range: DateRange | undefined) => {
    if (range) {
      onChange(range);
      
      // Track first click (start date)
      if (range.from && !hasStartDate) {
        setHasStartDate(true);
      }
      
      // Auto-close only when both dates are selected (second click)
      if (range.from && range.to && hasStartDate) {
        setTimeout(() => {
          setOpen(false);
          setHasStartDate(false);
        }, 200);
      }
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setHasStartDate(false);
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
