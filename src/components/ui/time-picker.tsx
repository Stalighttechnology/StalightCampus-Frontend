import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock } from "lucide-react";
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
      setMinute(m || "00");
      if (parsedH >= 12) {
        setPeriod("PM");
        setHour(parsedH === 12 ? "12" : (parsedH - 12).toString().padStart(2, "0"));
      } else {
        setPeriod("AM");
        setHour(parsedH === 0 ? "12" : parsedH.toString().padStart(2, "0"));
      }
    }
  }, [value]);

  const handleTimeChange = (newHour: string, newMinute: string, newPeriod: string) => {
    let h24 = parseInt(newHour, 10);
    if (newPeriod === "PM" && h24 !== 12) h24 += 12;
    if (newPeriod === "AM" && h24 === 12) h24 = 0;
    
    onChange(`${h24.toString().padStart(2, "0")}:${newMinute}`);
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  return (
    <div className={cn("flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm", className, disabled && "opacity-50 cursor-not-allowed")}>
      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex items-center gap-1">
        <Select 
          disabled={disabled}
          value={hour} 
          onValueChange={(v) => { setHour(v); handleTimeChange(v, minute, period); }}
        >
          <SelectTrigger className="h-7 w-[60px] border-0 p-0 shadow-none focus:ring-0 bg-transparent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground font-bold pb-[2px]">:</span>
        <Select 
          disabled={disabled}
          value={minute} 
          onValueChange={(v) => { setMinute(v); handleTimeChange(hour, v, period); }}
        >
          <SelectTrigger className="h-7 w-[60px] border-0 p-0 shadow-none focus:ring-0 bg-transparent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select 
          disabled={disabled}
          value={period} 
          onValueChange={(v) => { setPeriod(v); handleTimeChange(hour, minute, v); }}
        >
          <SelectTrigger className="h-7 w-[65px] border-0 p-0 shadow-none focus:ring-0 bg-transparent text-primary font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
