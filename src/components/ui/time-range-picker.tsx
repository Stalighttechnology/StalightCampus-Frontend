import * as React from "react";
import { Clock, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface TimeRangePickerProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

interface TimeObject {
  hour: string;
  minute: string;
  period: "AM" | "PM";
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

function parseTimePart(str?: string): TimeObject | null {
  if (!str) return null;
  const trimmed = str.trim();
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?$/i);
  if (!match) return null;

  let h = parseInt(match[1], 10);
  const m = match[2] ? match[2].padStart(2, "0") : "00";
  let p = match[3] ? (match[3].toUpperCase() as "AM" | "PM") : null;

  if (!p) {
    if (h >= 12) {
      p = "PM";
      h = h === 12 ? 12 : h - 12;
    } else {
      p = "AM";
      h = h === 0 ? 12 : h;
    }
  } else {
    if (h === 0) h = 12;
    else if (h > 12) {
      h = h - 12;
      p = "PM";
    }
  }

  return {
    hour: h.toString().padStart(2, "0"),
    minute: m,
    period: p,
  };
}

function parseRangeString(val?: string): { start: TimeObject; end: TimeObject; hasValue: boolean } {
  if (!val || !val.trim()) {
    return {
      start: { hour: "10", minute: "00", period: "AM" },
      end: { hour: "01", minute: "00", period: "PM" },
      hasValue: false,
    };
  }

  const split = val.split(/\s*(?:-|–|—|to|TO)\s*/);
  if (split.length >= 2) {
    const s = parseTimePart(split[0]);
    const e = parseTimePart(split[1]);
    if (s && e) {
      return { start: s, end: e, hasValue: true };
    }
  }

  return {
    start: { hour: "10", minute: "00", period: "AM" },
    end: { hour: "01", minute: "00", period: "PM" },
    hasValue: Boolean(val.trim()),
  };
}

function getDurationText(start: TimeObject, end: TimeObject): string {
  let startH = parseInt(start.hour, 10);
  if (start.period === "PM" && startH !== 12) startH += 12;
  if (start.period === "AM" && startH === 12) startH = 0;
  const startMins = startH * 60 + parseInt(start.minute, 10);

  let endH = parseInt(end.hour, 10);
  if (end.period === "PM" && endH !== 12) endH += 12;
  if (end.period === "AM" && endH === 12) endH = 0;
  let endMins = endH * 60 + parseInt(end.minute, 10);

  if (endMins < startMins) {
    endMins += 24 * 60;
  }

  const diff = endMins - startMins;
  if (diff <= 0) return "0 hrs";
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;

  if (hrs > 0 && mins > 0) return `${hrs} hr ${mins} min`;
  if (hrs > 0) return `${hrs} ${hrs === 1 ? "hr" : "hrs"}`;
  return `${mins} mins`;
}

function formatRange(start: TimeObject, end: TimeObject): string {
  return `${start.hour}:${start.minute} ${start.period} - ${end.hour}:${end.minute} ${end.period}`;
}

export function TimeRangePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Select exam time",
  className,
}: TimeRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const parsed = React.useMemo(() => parseRangeString(value), [value]);

  const [start, setStart] = React.useState<TimeObject>(parsed.start);
  const [end, setEnd] = React.useState<TimeObject>(parsed.end);

  // Sync internal state when external value changes
  React.useEffect(() => {
    const res = parseRangeString(value);
    setStart(res.start);
    setEnd(res.end);
  }, [value]);

  const handleStartTimeChange = (field: keyof TimeObject, val: string) => {
    const newStart = { ...start, [field]: val };
    setStart(newStart);
    onChange(formatRange(newStart, end));
  };

  const handleEndTimeChange = (field: keyof TimeObject, val: string) => {
    const newEnd = { ...end, [field]: val };
    setEnd(newEnd);
    onChange(formatRange(start, newEnd));
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const duration = React.useMemo(() => getDurationText(start, end), [start, end]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between text-left font-normal bg-background px-3 py-1 text-sm shadow-sm transition-colors hover:bg-accent/50",
            !value && "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <span className={cn("truncate font-medium", value ? "text-foreground" : "text-muted-foreground")}>
              {value || placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-1">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className="p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Clear time"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[320px] sm:w-[340px] p-4 shadow-xl border-border bg-card text-card-foreground rounded-xl" align="start">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Exam Time Range</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {duration}
            </span>
          </div>

          {/* Start & End Time Pickers */}
          <div className="space-y-3">
            {/* Start Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Start Time</label>
              <div className="flex items-center gap-1.5 justify-start">
                <Select value={start.hour} onValueChange={(v) => handleStartTimeChange("hour", v)}>
                  <SelectTrigger className="h-8 w-[64px] px-2 text-xs font-semibold bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-48 z-[60]">
                    {HOURS.map((h) => (
                      <SelectItem key={`start-h-${h}`} value={h} className="text-xs">
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="font-bold text-muted-foreground text-xs">:</span>

                <Select value={start.minute} onValueChange={(v) => handleStartTimeChange("minute", v)}>
                  <SelectTrigger className="h-8 w-[64px] px-2 text-xs font-semibold bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-48 z-[60]">
                    {MINUTES.map((m) => (
                      <SelectItem key={`start-m-${m}`} value={m} className="text-xs">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={start.period} onValueChange={(v: "AM" | "PM") => handleStartTimeChange("period", v)}>
                  <SelectTrigger className="h-8 w-[68px] px-2 text-xs font-bold text-primary bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectItem value="AM" className="text-xs font-medium">AM</SelectItem>
                    <SelectItem value="PM" className="text-xs font-medium">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* End Time */}
            <div className="space-y-1.5 pt-2 border-t">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">End Time</label>
              <div className="flex items-center gap-1.5 justify-start">
                <Select value={end.hour} onValueChange={(v) => handleEndTimeChange("hour", v)}>
                  <SelectTrigger className="h-8 w-[64px] px-2 text-xs font-semibold bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-48 z-[60]">
                    {HOURS.map((h) => (
                      <SelectItem key={`end-h-${h}`} value={h} className="text-xs">
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="font-bold text-muted-foreground text-xs">:</span>

                <Select value={end.minute} onValueChange={(v) => handleEndTimeChange("minute", v)}>
                  <SelectTrigger className="h-8 w-[64px] px-2 text-xs font-semibold bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-48 z-[60]">
                    {MINUTES.map((m) => (
                      <SelectItem key={`end-m-${m}`} value={m} className="text-xs">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={end.period} onValueChange={(v: "AM" | "PM") => handleEndTimeChange("period", v)}>
                  <SelectTrigger className="h-8 w-[68px] px-2 text-xs font-bold text-primary bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectItem value="AM" className="text-xs font-medium">AM</SelectItem>
                    <SelectItem value="PM" className="text-xs font-medium">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t text-xs">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onChange(formatRange(start, end));
                setOpen(false);
              }}
              className="h-7 text-xs px-3"
            >
              Apply Range
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
