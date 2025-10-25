import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (value) {
      setTempRange(value);
    }
  }, [value]);

  const handleSelect = (range: DateRange | undefined) => {
    if (!range) return;
    
    setTempRange(range);
    onChange(range);
    
    // Auto-close after selecting both dates
    if (range.from && range.to) {
      setTimeout(() => {
        setOpen(false);
      }, 300);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setTempRange(value || { from: undefined, to: undefined });
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal hover:border-primary focus:border-primary",
            !tempRange?.from && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
          {tempRange?.from ? (
            tempRange.to ? (
              <>
                {format(tempRange.from, "yyyy-MM-dd")} ~ {format(tempRange.to, "yyyy-MM-dd")}
              </>
            ) : (
              format(tempRange.from, "yyyy-MM-dd")
            )
          ) : (
            <span>날짜 선택</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 shadow-lg border rounded-xl bg-background" align="start">
        <Calendar
          mode="range"
          selected={tempRange}
          onSelect={handleSelect}
          initialFocus
          numberOfMonths={2}
          defaultMonth={tempRange?.from || new Date()}
          className="pointer-events-auto rounded-md border-none"
        />
      </PopoverContent>
    </Popover>
  );
}
