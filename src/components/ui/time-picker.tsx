import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function TimePicker({
  value,
  onChange,
  disabled,
  className
}: {
  value?: string; // Format: "HH:mm" (24h)
  onChange: (time: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [hour, setHour] = React.useState<string>("12");
  const [minute, setMinute] = React.useState<string>("00");
  const [period, setPeriod] = React.useState<string>("AM");

  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(":");
      const parsedH = parseInt(h, 10);
      if (!isNaN(parsedH)) {
        setMinute(m || "00");
        if (parsedH >= 12) {
          setPeriod("PM");
          setHour(parsedH === 12 ? "12" : (parsedH - 12).toString().padStart(2, "0"));
        } else {
          setPeriod("AM");
          setHour(parsedH === 0 ? "12" : parsedH.toString().padStart(2, "0"));
        }
      }
    }
  }, [value]);

  const handleTimeChange = (newHour: string, newMinute: string, newPeriod: string) => {
    let h24 = parseInt(newHour, 10);
    if (isNaN(h24)) h24 = 12;
    if (newPeriod === "PM" && h24 !== 12) h24 += 12;
    if (newPeriod === "AM" && h24 === 12) h24 = 0;
    
    onChange(`${h24.toString().padStart(2, "0")}:${newMinute}`);
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  return (
    <div className={cn("flex items-center gap-1.5 w-full", className, disabled && "opacity-50 cursor-not-allowed")}>
      <div className="flex-1 min-w-[65px]">
        <Select 
          disabled={disabled}
          value={hour} 
          onValueChange={(v) => { setHour(v); handleTimeChange(v, minute, period); }}
        >
          <SelectTrigger className="h-10 text-xs font-medium w-full shadow-sm">
            <SelectValue placeholder="HH" />
          </SelectTrigger>
          <SelectContent className="max-h-56">
            {hours.map(h => (
              <SelectItem key={h} value={h} className="text-xs">
                {h} hr
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <span className="text-muted-foreground font-bold text-xs select-none">:</span>

      <div className="flex-1 min-w-[65px]">
        <Select 
          disabled={disabled}
          value={minute} 
          onValueChange={(v) => { setMinute(v); handleTimeChange(hour, v, period); }}
        >
          <SelectTrigger className="h-10 text-xs font-medium w-full shadow-sm">
            <SelectValue placeholder="MM" />
          </SelectTrigger>
          <SelectContent className="max-h-56">
            {minutes.map(m => (
              <SelectItem key={m} value={m} className="text-xs">
                {m} min
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-[75px] shrink-0">
        <Select 
          disabled={disabled}
          value={period} 
          onValueChange={(v) => { setPeriod(v); handleTimeChange(hour, minute, v); }}
        >
          <SelectTrigger className="h-10 text-xs font-semibold text-primary w-full shadow-sm">
            <SelectValue placeholder="AM/PM" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM" className="text-xs font-semibold">AM</SelectItem>
            <SelectItem value="PM" className="text-xs font-semibold">PM</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
