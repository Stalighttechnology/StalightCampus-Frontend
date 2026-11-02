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
import { Input } from "@/components/ui/input";
import { TimePicker } from "./time-picker";

export function DateTimePicker({
  value,
  onChange,
  disabled,
  className
}: {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value);
  const [time, setTime] = React.useState<string>(
    value ? format(value, "HH:mm") : ""
  );

  React.useEffect(() => {
    setSelectedDate(value);
    setTime(value ? format(value, "HH:mm") : "");
  }, [value]);

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedDate(undefined);
      onChange(undefined);
      return;
    }
    
    // Create new date with selected date but preserve existing time
    const newDate = new Date(date);
    if (time) {
      const [hours, minutes] = time.split(":");
      newDate.setHours(parseInt(hours, 10));
      newDate.setMinutes(parseInt(minutes, 10));
    } else {
      // Default to start of day if no time
      newDate.setHours(0, 0, 0, 0);
    }
    
    setSelectedDate(newDate);
    onChange(newDate);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTime(newTime);
    
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      if (newTime) {
        const [hours, minutes] = newTime.split(":");
        newDate.setHours(parseInt(hours, 10));
        newDate.setMinutes(parseInt(minutes, 10));
      } else {
        newDate.setHours(0, 0, 0, 0);
      }
      setSelectedDate(newDate);
      onChange(newDate);
    } else if (newTime) {
      // If time selected but no date, use today
      const newDate = new Date();
      const [hours, minutes] = newTime.split(":");
      newDate.setHours(parseInt(hours, 10));
      newDate.setMinutes(parseInt(minutes, 10));
      setSelectedDate(newDate);
      onChange(newDate);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "MMM d, yyyy h:mm a") : <span>Pick a date & time</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[70]" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
        />
        <div className="p-3 border-t border-border flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">Time</span>
          <TimePicker 
            value={time}
            onChange={(newTime) => {
              handleTimeChange({ target: { value: newTime } } as any);
            }}
          />
        </div>
        <div className="p-2 border-t border-border flex items-center justify-between gap-2 bg-muted/20">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              const now = new Date();
              setSelectedDate(now);
              setTime(format(now, "HH:mm"));
              onChange(now);
            }}
          >
            Today / Now
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => setOpen(false)}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
