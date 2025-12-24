"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRange } from "react-day-picker";

interface DatePickerProps {
  id?: string;
  value?: string; // ISO date string (YYYY-MM-DD)
  onChange?: (date: string) => void;
  placeholder?: string;
  minDate?: Date;
  disabled?: boolean;
}

interface DateRangePickerProps {
  id?: string;
  startDate?: string; // ISO date string (YYYY-MM-DD)
  endDate?: string; // ISO date string (YYYY-MM-DD)
  onStartDateChange?: (date: string) => void;
  onEndDateChange?: (date: string) => void;
  placeholder?: string;
  minDate?: Date;
  disabled?: boolean;
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  minDate,
  disabled = false,
}: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  );

  const handleSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate && onChange) {
      // Convert to ISO date string (YYYY-MM-DD)
      const isoDate = format(selectedDate, "yyyy-MM-dd");
      onChange(isoDate);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center rounded-md border-2 border-border bg-background px-4 py-2 text-sm transition-all",
            "hover:border-primary/50 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="text-left flex-1">
            {date ? format(date, "PPP") : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            return false;
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export function DateRangePicker({
  id,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  placeholder = "Select dates",
  minDate,
  disabled = false,
}: DateRangePickerProps) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => {
    if (startDate && endDate) {
      return {
        from: new Date(startDate),
        to: new Date(endDate),
      };
    } else if (startDate) {
      return {
        from: new Date(startDate),
        to: undefined,
      };
    }
    return undefined;
  });

  // Update dateRange when props change
  React.useEffect(() => {
    if (startDate && endDate) {
      setDateRange({
        from: new Date(startDate),
        to: new Date(endDate),
      });
    } else if (startDate) {
      setDateRange({
        from: new Date(startDate),
        to: undefined,
      });
    } else {
      setDateRange(undefined);
    }
  }, [startDate, endDate]);

  const handleSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    
    if (range?.from && onStartDateChange) {
      const isoDate = format(range.from, "yyyy-MM-dd");
      onStartDateChange(isoDate);
    }
    
    if (range?.to && onEndDateChange) {
      const isoDate = format(range.to, "yyyy-MM-dd");
      onEndDateChange(isoDate);
    } else if (range?.from && !range?.to && onEndDateChange) {
      // Clear end date if only start date is selected
      onEndDateChange("");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center rounded-md border-2 border-border bg-background px-4 py-2 text-sm transition-all",
            "hover:border-primary/50 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !dateRange && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="text-left flex-1">
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} -{" "}
                  {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              placeholder
            )}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={handleSelect}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            return false;
          }}
          numberOfMonths={2}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

