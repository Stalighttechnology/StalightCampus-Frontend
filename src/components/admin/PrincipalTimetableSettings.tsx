import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Edit2, GripVertical, Clock, AlertTriangle, Save, ShieldCheck, ChevronRight, CalendarCheck2, Users, Sliders, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { useToast } from "../../hooks/use-toast";
import { Checkbox } from "../../components/ui/checkbox";
import { Switch } from "../../components/ui/switch";
import { useTheme } from "../../context/ThemeContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { SkeletonTable } from "../ui/skeleton";
import { translateTerminology } from "../../utils/institutionConfig";

const MySwal = withReactContent(Swal);

interface TimetableSlot {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
  order: number;
}

const hoursOptions = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const minutesOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

const parseTimeTo12h = (timeStr: string) => {
  if (!timeStr) return { hour: "09", minute: "00", period: "AM" };
  const [hStr, mStr] = timeStr.split(":");
  let hourVal = parseInt(hStr, 10);
  const minute = mStr ? mStr.substring(0, 2) : "00";
  let period = "AM";
  if (hourVal >= 12) {
    period = "PM";
    if (hourVal > 12) hourVal -= 12;
  }
  if (hourVal === 0) hourVal = 12;
  const hour = hourVal.toString().padStart(2, "0");
  return { hour, minute, period };
};

const parseAnyTime12h = (timeStr: string | undefined, defaultVal: { hour: string; minute: string; period: "AM" | "PM" }) => {
  if (!timeStr) return defaultVal;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let hourVal = parseInt(match[1], 10);
    if (hourVal > 12) hourVal = 12;
    if (hourVal < 1) hourVal = 1;
    return {
      hour: hourVal.toString().padStart(2, "0"),
      minute: match[2].padStart(2, "0"),
      period: match[3].toUpperCase() as "AM" | "PM"
    };
  }
  return parseTimeTo12h(timeStr) as { hour: string; minute: string; period: "AM" | "PM" };
};

const formatTime24h = (hour: string, minute: string, period: string) => {
  let h = parseInt(hour, 10);
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return `${h.toString().padStart(2, "0")}:${minute}`;
};

const formatTimeTo12hString = (timeStr: string) => {
  if (!timeStr) return "";
  const { hour, minute, period } = parseTimeTo12h(timeStr);
  return `${hour}:${minute} ${period}`;
};

const DEFAULT_CATEGORY_WORKFLOWS: Record<string, any> = {
  teaching: {
    mode: 'half_day_split',
    strict_window: true,
    full_day: { check_in: { start: '09:00', end: '09:30' }, check_out: { start: '17:00', end: '17:30' } },
    half_day_split: {
      first_half_in: { start: '09:00', end: '09:30' },
      first_half_out: { start: '12:30', end: '13:00' },
      second_half_in: { start: '13:30', end: '14:00' },
      second_half_out: { start: '17:00', end: '17:30' },
    },
    periodic_count: 1,
    periodic_windows: [{ start: '09:00', end: '09:30' }]
  },
  non_teaching: {
    mode: 'full_day',
    strict_window: true,
    full_day: { check_in: { start: '08:30', end: '09:00' }, check_out: { start: '16:30', end: '17:00' } },
    half_day_split: {
      first_half_in: { start: '08:30', end: '09:00' },
      first_half_out: { start: '12:00', end: '12:30' },
      second_half_in: { start: '13:00', end: '13:30' },
      second_half_out: { start: '16:30', end: '17:00' },
    },
    periodic_count: 1,
    periodic_windows: [{ start: '08:30', end: '09:00' }]
  },
  admin_branch: {
    mode: 'full_day',
    strict_window: true,
    full_day: { check_in: { start: '09:00', end: '09:30' }, check_out: { start: '17:30', end: '18:00' } },
    half_day_split: {
      first_half_in: { start: '09:00', end: '09:30' },
      first_half_out: { start: '13:00', end: '13:30' },
      second_half_in: { start: '14:00', end: '14:30' },
      second_half_out: { start: '17:30', end: '18:00' },
    },
    periodic_count: 1,
    periodic_windows: [{ start: '09:00', end: '09:30' }]
  }
};

const DEFAULT_STAFF_CATEGORY_MAPPING: Record<string, string[]> = {
  teaching: ['teacher', 'hod', 'dean'],
  non_teaching: ['caretaker', 'driver', 'warden', 'library_admin', 'transport_admin', 'hms_admin'],
  admin_branch: ['principal', 'org_admin', 'admission_manager', 'fees_manager', 'coe', 'placement_officer', 'counsellor'],
};

function ShadcnTimePicker({
  value,
  onChange,
  theme,
}: {
  value: string;
  onChange: (val: string) => void;
  theme: string;
}) {
  const parts = parseTimeTo12h(value || "09:00");
  const handleUpdate = (key: "hour" | "minute" | "period", val: string) => {
    const next = { ...parts, [key]: val };
    const next24 = formatTime24h(next.hour, next.minute, next.period);
    onChange(next24);
  };

  return (
    <div className="flex items-center gap-1">
      <Select value={parts.hour} onValueChange={(v) => handleUpdate("hour", v)}>
        <SelectTrigger className={`h-8 px-1.5 text-xs w-[52px] ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300'}`}>
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent className={`max-h-[200px] z-50 ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
          {hoursOptions.map((h) => (
            <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground font-semibold text-xs">:</span>
      <Select value={parts.minute} onValueChange={(v) => handleUpdate("minute", v)}>
        <SelectTrigger className={`h-8 px-1.5 text-xs w-[52px] ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300'}`}>
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent className={`max-h-[200px] z-50 ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
          {minutesOptions.map((m) => (
            <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={parts.period} onValueChange={(v) => handleUpdate("period", v)}>
        <SelectTrigger className={`h-8 px-1.5 text-xs w-[58px] ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300'}`}>
          <SelectValue placeholder="AM/PM" />
        </SelectTrigger>
        <SelectContent className={`z-50 ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
          <SelectItem value="AM" className="text-xs">AM</SelectItem>
          <SelectItem value="PM" className="text-xs">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function CategoryWorkflowTabContent({
  catKey,
  catConfig,
  theme,
  onUpdateConfig,
}: {
  catKey: string;
  catConfig: any;
  theme: string;
  onUpdateConfig: (newCatConfig: any) => void;
}) {
  const currentConfig = catConfig || DEFAULT_CATEGORY_WORKFLOWS[catKey] || DEFAULT_CATEGORY_WORKFLOWS.teaching;
  const mode = currentConfig.mode || 'half_day_split';

  const updateWindow = (modeKey: string, fieldKey: string, startOrEnd: 'start' | 'end', val: string) => {
    onUpdateConfig({
      ...currentConfig,
      [modeKey]: {
        ...(currentConfig[modeKey] || {}),
        [fieldKey]: {
          ...((currentConfig[modeKey] && currentConfig[modeKey][fieldKey]) || { start: '09:00', end: '09:30' }),
          [startOrEnd]: val
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Workflow Mode Selector */}
      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-card/40 border-border/80' : 'bg-slate-50/70 border-gray-200'} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Label className="text-sm font-semibold">Attendance Workflow Mode</Label>
            <p className="text-xs text-muted-foreground">Select daily check-in & check-out structure for this staff category.</p>
          </div>
          <Select
            value={mode}
            onValueChange={(val) => onUpdateConfig({ ...currentConfig, mode: val })}
          >
            <SelectTrigger className={`w-full sm:w-64 text-xs font-semibold ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}>
              <SelectValue placeholder="Select Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="half_day_split">Half-Day Split (1st & 2nd Half In/Out - 4 Checkpoints)</SelectItem>
              <SelectItem value="full_day">Standard Full-Day (1 Check-In & 1 Check-Out)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Half-Day Split Controls */}
      {mode === 'half_day_split' && (
        <div className="space-y-4">
          <div className="text-xs font-bold text-primary uppercase tracking-wider">Session 1 (First Half)</div>
          
          {/* 1st Half In */}
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-card/70 border-border/80' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">#1</div>
                <div>
                  <Label className="text-sm font-semibold">First Half Check-In Window</Label>
                  <p className="text-xs text-muted-foreground">Morning check-in timeframe</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 text-xs pt-1 sm:pt-0">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium w-10 sm:w-auto text-left sm:text-left">Start:</span>
                  <ShadcnTimePicker
                    value={currentConfig.half_day_split?.first_half_in?.start || "09:00"}
                    onChange={(val) => updateWindow('half_day_split', 'first_half_in', 'start', val)}
                    theme={theme}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium w-10 sm:w-auto text-left sm:text-left">End:</span>
                  <ShadcnTimePicker
                    value={currentConfig.half_day_split?.first_half_in?.end || "09:30"}
                    onChange={(val) => updateWindow('half_day_split', 'first_half_in', 'end', val)}
                    theme={theme}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 1st Half Out */}
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-card/70 border-border/80' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">#2</div>
                <div>
                  <Label className="text-sm font-semibold">First Half Check-Out Window</Label>
                  <p className="text-xs text-muted-foreground">Lunch / mid-day departure window</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 text-xs pt-1 sm:pt-0">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium w-10 sm:w-auto text-left sm:text-left">Start:</span>
                  <ShadcnTimePicker
                    value={currentConfig.half_day_split?.first_half_out?.start || "12:30"}
                    onChange={(val) => updateWindow('half_day_split', 'first_half_out', 'start', val)}
                    theme={theme}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium w-10 sm:w-auto text-left sm:text-left">End:</span>
                  <ShadcnTimePicker
                    value={currentConfig.half_day_split?.first_half_out?.end || "13:00"}
                    onChange={(val) => updateWindow('half_day_split', 'first_half_out', 'end', val)}
                    theme={theme}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs font-bold text-primary uppercase tracking-wider pt-2">Session 2 (Second Half)</div>

          {/* 2nd Half In */}
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-card/70 border-border/80' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">#3</div>
                <div>
                  <Label className="text-sm font-semibold">Second Half Check-In Window</Label>
                  <p className="text-xs text-muted-foreground">Post-lunch check-in timeframe</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 text-xs pt-1 sm:pt-0">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium w-10 sm:w-auto text-left sm:text-left">Start:</span>
                  <ShadcnTimePicker
                    value={currentConfig.half_day_split?.second_half_in?.start || "13:30"}
                    onChange={(val) => updateWindow('half_day_split', 'second_half_in', 'start', val)}
                    theme={theme}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium w-10 sm:w-auto text-left sm:text-left">End:</span>
                  <ShadcnTimePicker
                    value={currentConfig.half_day_split?.second_half_in?.end || "14:00"}
                    onChange={(val) => updateWindow('half_day_split', 'second_half_in', 'end', val)}
                    theme={theme}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2nd Half Out */}
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-card/70 border-border/80' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">#4</div>
                <div>
                  <Label className="text-sm font-semibold">Second Half Check-Out Window</Label>
                  <p className="text-xs text-muted-foreground">Evening final departure window</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 text-xs pt-1 sm:pt-0">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium w-10 sm:w-auto text-left sm:text-left">Start:</span>
                  <ShadcnTimePicker
                    value={currentConfig.half_day_split?.second_half_out?.start || "17:00"}
                    onChange={(val) => updateWindow('half_day_split', 'second_half_out', 'start', val)}
                    theme={theme}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium w-10 sm:w-auto text-left sm:text-left">End:</span>
                  <ShadcnTimePicker
                    value={currentConfig.half_day_split?.second_half_out?.end || "17:30"}
                    onChange={(val) => updateWindow('half_day_split', 'second_half_out', 'end', val)}
                    theme={theme}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Day Mode Controls */}
      {mode === 'full_day' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-card/70 border-border/80' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">#1</div>
                <div>
                  <Label className="text-sm font-semibold">Full Day Check-In Window</Label>
                  <p className="text-xs text-muted-foreground">Morning arrival check-in timeframe</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 text-xs pt-1 sm:pt-0">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium w-10 sm:w-auto text-left sm:text-left">Start:</span>
                  <ShadcnTimePicker
                    value={currentConfig.full_day?.check_in?.start || "09:00"}
                    onChange={(val) => updateWindow('full_day', 'check_in', 'start', val)}
                    theme={theme}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium w-10 sm:w-auto text-left sm:text-left">End:</span>
                  <ShadcnTimePicker
                    value={currentConfig.full_day?.check_in?.end || "09:30"}
                    onChange={(val) => updateWindow('full_day', 'check_in', 'end', val)}
                    theme={theme}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-card/70 border-border/80' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">#2</div>
                <div>
                  <Label className="text-sm font-semibold">Full Day Check-Out Window</Label>
                  <p className="text-xs text-muted-foreground">Evening departure check-out timeframe</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 text-xs pt-1 sm:pt-0">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium w-10 sm:w-auto text-left sm:text-left">Start:</span>
                  <ShadcnTimePicker
                    value={currentConfig.full_day?.check_out?.start || "17:00"}
                    onChange={(val) => updateWindow('full_day', 'check_out', 'start', val)}
                    theme={theme}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium w-10 sm:w-auto text-left sm:text-left">End:</span>
                  <ShadcnTimePicker
                    value={currentConfig.full_day?.check_out?.end || "17:30"}
                    onChange={(val) => updateWindow('full_day', 'check_out', 'end', val)}
                    theme={theme}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Strict Window Switch */}
      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-background/50 border-border' : 'bg-gray-50/80 border-gray-100'}`}>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-semibold">Strict Window Time ({catKey.replace('_', ' ').toUpperCase()})</Label>
            <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              If enabled, staff cannot check-in or check-out after their window ends. If disabled, late check-ins/outs are permitted and marked as delayed.
            </p>
          </div>
          <Switch
            checked={currentConfig.strict_window !== false}
            onCheckedChange={(val) => onUpdateConfig({ ...currentConfig, strict_window: val })}
          />
        </div>
      </div>
    </div>
  );
}

export default function PrincipalTimetableSettings() {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { theme } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);

  const [approvalChain, setApprovalChain] = useState<string[]>(['hod', 'principal', 'coe']);
  const [chainLoading, setChainLoading] = useState(true);
  const [chainSaving, setChainSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'timetable' | 'qp-workflow' | 'attendance-workflow' | 'leave-policy'>('timetable');

  // Leave & Short Permission Policy state
  const [leavePolicyLoading, setLeavePolicyLoading] = useState(false);
  const [leavePolicySaving, setLeavePolicySaving] = useState(false);
  const [leavePolicy, setLeavePolicy] = useState<{
    monthly_short_permission_limit: number | string;
    total_standard_leaves: number | string;
    short_permission_max_hours: number | string;
    leave_policy_rules: {
      casual_leave: {
        annual_quota: number | string;
        max_stretch_days: number | string;
        allow_half_day: boolean;
        half_day_session: string;
      };
      earned_leave: {
        annual_quota: number | string;
        jan_credit: number | string;
        jul_credit: number | string;
        min_stretch_days: number | string;
        max_stretch_days: number | string;
      };
      restricted_holiday: {
        annual_quota: number | string;
        monthly_limit: number | string;
      };
      short_permission: {
        monthly_limit: number | string;
        max_hours: number | string;
      };
    };
    leave_approval_routing: Record<string, any>;
  }>({
    monthly_short_permission_limit: 5,
    total_standard_leaves: 15,
    short_permission_max_hours: 2,
    leave_policy_rules: {
      casual_leave: {
        annual_quota: 15,
        max_stretch_days: 3,
        allow_half_day: true,
        half_day_session: 'afternoon_only'
      },
      earned_leave: {
        annual_quota: 15,
        jan_credit: 7,
        jul_credit: 8,
        min_stretch_days: 2,
        max_stretch_days: 5
      },
      restricted_holiday: {
        annual_quota: 2,
        monthly_limit: 1
      },
      short_permission: {
        monthly_limit: 5,
        max_hours: 2
      }
    },
    leave_approval_routing: {
      teacher: { num_stages: 2, stages: ['hod', 'principal'] },
      hod: { num_stages: 1, stages: ['principal'] },
      principal: { num_stages: 1, stages: ['dean'] },
      coe: { num_stages: 1, stages: ['principal'] },
      fees_manager: { num_stages: 1, stages: ['principal'] },
      counsellor: { num_stages: 2, stages: ['admission_manager', 'principal'] },
      driver: { num_stages: 2, stages: ['transport_admin', 'principal'] },
      warden: { num_stages: 2, stages: ['hms_admin', 'principal'] }
    } as Record<string, any>
  });

  const [periodicCheckinCount, setPeriodicCheckinCount] = useState<number>(1);
  const [checkinWindows, setCheckinWindows] = useState<{ start: string, end: string }[]>([]);
  const [strictCheckinWindow, setStrictCheckinWindow] = useState<boolean>(true);
  const [allowWebAttendance, setAllowWebAttendance] = useState<boolean>(true);
  const [requireDeviceIdAttendance, setRequireDeviceIdAttendance] = useState<boolean>(false);
  const [weekendPolicy, setWeekendPolicy] = useState<string>('sundays_only');
  const [staffCategoryMapping, setStaffCategoryMapping] = useState<Record<string, string[]>>(DEFAULT_STAFF_CATEGORY_MAPPING);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'teaching' | 'non_teaching' | 'admin_branch'>('teaching');
  const [categoryWorkflows, setCategoryWorkflows] = useState<Record<string, any>>(DEFAULT_CATEGORY_WORKFLOWS);
  const [attendanceConfigLoading, setAttendanceConfigLoading] = useState(true);
  const [attendanceSaving, setAttendanceSaving] = useState(false);

  const PRESETS: Record<string, string[]> = {
    "Common": ["hod", "coe", "principal"],
    "Standard": ["hod", "principal", "coe"],
    "Short": ["hod", "principal"],
    "Extended": ["hod", "principal", "coe", "dean"],
  };

  const AVAILABLE_ROLES = [
    { value: 'teacher', label: 'Teacher' },
    { value: 'hod', label: translateTerminology('HOD') },
    { value: 'dean', label: 'Dean' },
    { value: 'principal', label: 'Principal' },
    { value: 'coe', label: 'COE' },
    { value: 'org_admin', label: 'Org Admin' },
    { value: 'admission_manager', label: 'Admission Manager' },
    { value: 'fees_manager', label: 'Fees Manager' },
    { value: 'placement_officer', label: 'Placement Officer' },
    { value: 'counsellor', label: 'Counsellor' },
    { value: 'hms_admin', label: 'HMS Admin' },
    { value: 'caretaker', label: 'Caretaker' },
    { value: 'driver', label: 'Driver' },
    { value: 'warden', label: 'Warden' },
    { value: 'library_admin', label: 'Library Admin' },
    { value: 'transport_admin', label: 'Transport Admin' },
  ];

  const [startTimeParts, setStartTimeParts] = useState({ hour: "09", minute: "00", period: "AM" });
  const [endTimeParts, setEndTimeParts] = useState({ hour: "10", minute: "00", period: "AM" });

  const [formData, setFormData] = useState({
    name: "",
    start_time: "09:00",
    end_time: "10:00",
    is_break: false,
    order: 0,
  });

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/timetable-slots/`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data);
      } else {
        throw new Error("Failed to fetch slots");
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to fetch slots", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovalChain = async () => {
    try {
      setChainLoading(true);
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/organizations/qp-approval-chain/`);
      if (res.ok) {
        const data = await res.json();
        setApprovalChain(data.qp_approval_chain || ['hod', 'principal', 'coe']);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChainLoading(false);
    }
  };

  const fetchAttendanceConfig = async () => {
    try {
      setAttendanceConfigLoading(true);
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/organizations/attendance-workflow/`);
      if (res.ok) {
        const data = await res.json();
        setPeriodicCheckinCount(data.periodic_checkin_count || 1);
        setCheckinWindows(data.checkin_windows || []);
        if (data.strict_checkin_window !== undefined) {
          setStrictCheckinWindow(data.strict_checkin_window);
        }
        if (data.allow_web_attendance !== undefined) {
          setAllowWebAttendance(data.allow_web_attendance);
        }
        if (data.require_device_id_attendance !== undefined) {
          setRequireDeviceIdAttendance(data.require_device_id_attendance || false);
        }
        if (data.weekend_policy !== undefined) {
          setWeekendPolicy(data.weekend_policy);
        }
        const mapping = data.staff_category_mapping;
        if (mapping && Object.keys(mapping).length > 0) {
          setStaffCategoryMapping(mapping);
        } else {
          setStaffCategoryMapping(DEFAULT_STAFF_CATEGORY_MAPPING);
        }
        if (data.category_attendance_workflows) {
          setCategoryWorkflows(prev => ({
            ...DEFAULT_CATEGORY_WORKFLOWS,
            ...data.category_attendance_workflows
          }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAttendanceConfigLoading(false);
    }
  };

  const handleSaveApprovalChain = async () => {
    try {
      setChainSaving(true);
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/organizations/qp-approval-chain/`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qp_approval_chain: approvalChain })
      });
      if (res.ok) {
        toast({ title: "Success", description: "Approval workflow saved" });
      } else {
        toast({ title: "Error", description: "Failed to save workflow", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to save workflow", variant: "destructive" });
    } finally {
      setChainSaving(false);
    }
  };

  const fetchLeavePolicy = async () => {
    try {
      setLeavePolicyLoading(true);
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/organizations/leave-policy-settings/`);
      if (res.ok) {
        const data = await res.json();
        const rules = data.leave_policy_rules || {
          casual_leave: {
            annual_quota: data.total_standard_leaves ?? 15,
            max_stretch_days: 3,
            allow_half_day: true,
            half_day_session: 'afternoon_only'
          },
          earned_leave: {
            annual_quota: 15,
            jan_credit: 7,
            jul_credit: 8,
            min_stretch_days: 2,
            max_stretch_days: 5
          },
          restricted_holiday: {
            annual_quota: 2,
            monthly_limit: 1
          },
          short_permission: {
            monthly_limit: data.monthly_short_permission_limit ?? 5,
            max_hours: data.short_permission_max_hours ?? 2
          }
        };

        setLeavePolicy({
          monthly_short_permission_limit: rules.short_permission?.monthly_limit ?? data.monthly_short_permission_limit ?? 5,
          total_standard_leaves: rules.casual_leave?.annual_quota ?? data.total_standard_leaves ?? 15,
          short_permission_max_hours: rules.short_permission?.max_hours ?? data.short_permission_max_hours ?? 2,
          leave_policy_rules: rules,
          leave_approval_routing: data.leave_approval_routing || {
            teacher: { num_stages: 2, stages: ['hod', 'principal'] },
            hod: { num_stages: 1, stages: ['principal'] },
            principal: { num_stages: 1, stages: ['dean'] },
            coe: { num_stages: 1, stages: ['principal'] },
            fees_manager: { num_stages: 1, stages: ['principal'] },
            counsellor: { num_stages: 2, stages: ['admission_manager', 'principal'] },
            driver: { num_stages: 2, stages: ['transport_admin', 'principal'] },
            warden: { num_stages: 2, stages: ['hms_admin', 'principal'] }
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch leave policy', err);
    } finally {
      setLeavePolicyLoading(false);
    }
  };

  const handleSaveLeavePolicy = async () => {
    try {
      setLeavePolicySaving(true);
      const cleanRules = {
        casual_leave: {
          annual_quota: leavePolicy.leave_policy_rules?.casual_leave?.annual_quota === '' ? 15 : Number(leavePolicy.leave_policy_rules?.casual_leave?.annual_quota),
          max_stretch_days: leavePolicy.leave_policy_rules?.casual_leave?.max_stretch_days === '' ? 3 : Number(leavePolicy.leave_policy_rules?.casual_leave?.max_stretch_days),
          allow_half_day: Boolean(leavePolicy.leave_policy_rules?.casual_leave?.allow_half_day),
          half_day_session: leavePolicy.leave_policy_rules?.casual_leave?.half_day_session || 'afternoon_only'
        },
        earned_leave: {
          annual_quota: leavePolicy.leave_policy_rules?.earned_leave?.annual_quota === '' ? 15 : Number(leavePolicy.leave_policy_rules?.earned_leave?.annual_quota),
          jan_credit: leavePolicy.leave_policy_rules?.earned_leave?.jan_credit === '' ? 7 : Number(leavePolicy.leave_policy_rules?.earned_leave?.jan_credit),
          jul_credit: leavePolicy.leave_policy_rules?.earned_leave?.jul_credit === '' ? 8 : Number(leavePolicy.leave_policy_rules?.earned_leave?.jul_credit),
          min_stretch_days: leavePolicy.leave_policy_rules?.earned_leave?.min_stretch_days === '' ? 2 : Number(leavePolicy.leave_policy_rules?.earned_leave?.min_stretch_days),
          max_stretch_days: leavePolicy.leave_policy_rules?.earned_leave?.max_stretch_days === '' ? 5 : Number(leavePolicy.leave_policy_rules?.earned_leave?.max_stretch_days)
        },
        restricted_holiday: {
          annual_quota: leavePolicy.leave_policy_rules?.restricted_holiday?.annual_quota === '' ? 2 : Number(leavePolicy.leave_policy_rules?.restricted_holiday?.annual_quota),
          monthly_limit: leavePolicy.leave_policy_rules?.restricted_holiday?.monthly_limit === '' ? 1 : Number(leavePolicy.leave_policy_rules?.restricted_holiday?.monthly_limit)
        },
        short_permission: {
          monthly_limit: leavePolicy.leave_policy_rules?.short_permission?.monthly_limit === '' ? 5 : Number(leavePolicy.leave_policy_rules?.short_permission?.monthly_limit),
          max_hours: leavePolicy.leave_policy_rules?.short_permission?.max_hours === '' ? 2 : Number(leavePolicy.leave_policy_rules?.short_permission?.max_hours)
        }
      };

      const payload = {
        leave_policy_rules: cleanRules,
        monthly_short_permission_limit: cleanRules.short_permission.monthly_limit,
        total_standard_leaves: cleanRules.casual_leave.annual_quota,
        short_permission_max_hours: cleanRules.short_permission.max_hours,
        leave_approval_routing: leavePolicy.leave_approval_routing
      };

      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/organizations/leave-policy-settings/`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast({ title: "Success", description: "Leave policy & workflow saved successfully" });
      } else {
        toast({ title: "Error", description: "Failed to save leave policy", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to save leave policy", variant: "destructive" });
    } finally {
      setLeavePolicySaving(false);
    }
  };

  const handleSaveAttendanceConfig = async () => {
    const mappedRoles = Object.values(staffCategoryMapping).flat();
    const unmappedRoles = AVAILABLE_ROLES.filter(r => !mappedRoles.includes(r.value));
    
    if (unmappedRoles.length > 0) {
      const unmappedLabels = unmappedRoles.map(r => r.label).join(', ');
      await MySwal.fire({
        title: 'Action Required',
        html: `<div style="text-align:left; font-size:14px;">
          Please assign the following roles to a category before saving:<br/><br/>
          <b>${unmappedLabels}</b>
        </div>`,
        icon: 'warning',
        confirmButtonText: 'Okay',
        confirmButtonColor: '#f59e0b',
      });
      return;
    }

    const result = await MySwal.fire({
      title: 'Save Workflow Settings?',
      html: `<span>Are you sure you want to save the attendance configuration?</span>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Save',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#10b981',
    });

    if (!result.isConfirmed) return;

    try {
      setAttendanceSaving(true);
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/organizations/attendance-workflow/`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodic_checkin_count: periodicCheckinCount,
          checkin_windows: checkinWindows,
          strict_checkin_window: strictCheckinWindow,
          allow_web_attendance: allowWebAttendance,
          require_device_id_attendance: requireDeviceIdAttendance,
          weekend_policy: weekendPolicy,
          staff_category_mapping: staffCategoryMapping,
          category_attendance_workflows: categoryWorkflows
        })
      });
      if (res.ok) {
        toast({ title: "Success", description: "Attendance workflow saved" });
      } else {
        toast({ title: "Error", description: "Failed to save workflow", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to save workflow", variant: "destructive" });
    } finally {
      setAttendanceSaving(false);
    }
  };

  useEffect(() => {
    fetchSlots();
    fetchApprovalChain();
    fetchLeavePolicy();
    fetchAttendanceConfig();
  }, []);

  useEffect(() => {
    if (slots.length < 2) return;
    const sortedSlots = [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time));
    for (let i = 0; i < sortedSlots.length - 1; i++) {
      const currentEnd = sortedSlots[i].end_time.substring(0, 5);
      const nextStart = sortedSlots[i + 1].start_time.substring(0, 5);
      if (currentEnd < nextStart) {
        const gapFrom = formatTimeTo12hString(currentEnd);
        const gapTo = formatTimeTo12hString(nextStart);
        MySwal.fire({
          title: "Continuous Timetable Warning",
          text: `There is a missing time slot between ${gapFrom} and ${gapTo}. Consider adding it for a continuous timetable.`,
          icon: "warning",
          confirmButtonText: "Got it",
          confirmButtonColor: "#f59e0b",
        });
        break;
      }
    }
  }, [slots]);

  const handleOpen = (slot?: TimetableSlot) => {
    if (slot) {
      setEditingSlot(slot);
      const start = parseTimeTo12h(slot.start_time);
      const end = parseTimeTo12h(slot.end_time);
      setStartTimeParts(start);
      setEndTimeParts(end);
      setFormData({
        name: slot.name,
        start_time: slot.start_time.substring(0, 5),
        end_time: slot.end_time.substring(0, 5),
        is_break: slot.is_break,
        order: slot.order,
      });
    } else {
      setEditingSlot(null);
      let defaultStartStr = "09:00";
      let defaultEndStr = "10:00";
      let startParts = { hour: "09", minute: "00", period: "AM" };
      let endParts = { hour: "10", minute: "00", period: "AM" };

      if (slots.length > 0) {
        const sortedSlots = [...slots].sort((a, b) => a.end_time.localeCompare(b.end_time));
        const lastSlot = sortedSlots[sortedSlots.length - 1];
        defaultStartStr = lastSlot.end_time.substring(0, 5);
        startParts = parseTimeTo12h(defaultStartStr);

        const [hStr, mStr] = defaultStartStr.split(":");
        let hour = parseInt(hStr, 10);
        let minute = parseInt(mStr, 10);
        hour = (hour + 1) % 24;
        defaultEndStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        endParts = parseTimeTo12h(defaultEndStr);
      }

      setStartTimeParts(startParts);
      setEndTimeParts(endParts);
      setFormData({
        name: "",
        start_time: defaultStartStr,
        end_time: defaultEndStr,
        is_break: false,
        order: slots.length > 0 ? Math.max(...slots.map(s => s.order)) + 1 : 1,
      });
    }
    setIsOpen(true);
  };

  const updateStartTime = (key: 'hour' | 'minute' | 'period', value: string) => {
    const newParts = { ...startTimeParts, [key]: value };
    setStartTimeParts(newParts);
    setFormData(prev => ({
      ...prev,
      start_time: formatTime24h(newParts.hour, newParts.minute, newParts.period)
    }));
  };

  const updateEndTime = (key: 'hour' | 'minute' | 'period', value: string) => {
    const newParts = { ...endTimeParts, [key]: value };
    setEndTimeParts(newParts);
    setFormData(prev => ({
      ...prev,
      end_time: formatTime24h(newParts.hour, newParts.minute, newParts.period)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.start_time >= formData.end_time) {
      toast({
        title: "Error",
        description: "Start time must be before end time.",
        variant: "destructive"
      });
      return;
    }

    // Check client-side for duplicate timings first
    const duplicate = slots.find(
      s => s.start_time.substring(0, 5) === formData.start_time &&
        s.end_time.substring(0, 5) === formData.end_time &&
        (!editingSlot || s.id !== editingSlot.id)
    );
    if (duplicate) {
      toast({
        title: "Error",
        description: "You already have a slot for these timings.",
        variant: "destructive"
      });
      return;
    }

    const overlapping = slots.find(s => {
      if (editingSlot && s.id === editingSlot.id) return false;
      const sStart = s.start_time.substring(0, 5);
      const sEnd = s.end_time.substring(0, 5);
      return formData.start_time < sEnd && formData.end_time > sStart;
    });
    if (overlapping) {
      toast({
        title: "Error",
        description: "Time slot overlaps with an existing period.",
        variant: "destructive"
      });
      return;
    }

    const duplicateOrder = slots.find(
      s => s.order === Number(formData.order) &&
        (!editingSlot || s.id !== editingSlot.id)
    );
    if (duplicateOrder) {
      toast({
        title: "Error",
        description: "Order number already exists. Please choose a different order.",
        variant: "destructive"
      });
      return;
    }

    try {
      let res;
      if (editingSlot) {
        res = await fetchWithTokenRefresh(`${API_ENDPOINT}/timetable-slots/${editingSlot.id}/`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
      } else {
        res = await fetchWithTokenRefresh(`${API_ENDPOINT}/timetable-slots/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
      }

      if (res.ok) {
        const responseData = await res.json();
        toast({ title: "Success", description: editingSlot ? "Slot updated" : "Slot created" });
        setIsOpen(false);
        if (editingSlot) {
          setSlots(prev => prev.map(s => s.id === editingSlot.id ? responseData : s));
        } else {
          setSlots(prev => [...prev, responseData]);
        }
      } else {
        let errorMsg = "Failed to save slot";
        let isOrderError = false;
        try {
          const errData = await res.json();
          if (errData && errData.order) {
            errorMsg = Array.isArray(errData.order) ? errData.order[0] : errData.order;
            isOrderError = true;
          } else if (errData && (errData.non_field_errors || errData.detail || errData.error || errData.message)) {
            errorMsg = errData.non_field_errors?.[0] || errData.detail || errData.error || errData.message;
          }
        } catch (_) { }

        if (!isOrderError && (res.status === 500 || errorMsg.toLowerCase().includes("unique") || errorMsg.toLowerCase().includes("already exists"))) {
          errorMsg = "You already have a slot for these timings.";
        }

        toast({ title: "Error", description: errorMsg, variant: "destructive" });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save slot",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: number) => {
    const result = await MySwal.fire({
      title: "Are you sure?",
      text: "Existing timetable entries may be affected by deleting this slot.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, cancel",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/timetable-slots/${id}/`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast({ title: "Success", description: "Slot deleted" });
        setSlots(prev => prev.filter(s => s.id !== id));
      } else {
        throw new Error("Failed to delete slot");
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete slot", variant: "destructive" });
    }
  };

  return (
    <>
      <style>{`
        /* Hide number input spinner arrows */
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none !important; 
          margin: 0 !important; 
        }
        input[type=number] {
          -moz-appearance: textfield !important;
        }
      `}</style>

      <div className="space-y-6 w-full">
        <Card className={`border shadow-sm ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-xl sm:text-2xl font-semibold">Workflow Configuration</CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Manage timetable slots and question paper approval workflows
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 pb-6 space-y-6">
            {/* Mobile Dropdown View (< sm) */}
            <div className="block sm:hidden w-full">
              <Select value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
                <SelectTrigger className="w-full h-11 px-3 bg-background border-border/80 rounded-xl font-medium text-sm shadow-sm flex items-center justify-between">
                  <SelectValue placeholder="Select tab" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="timetable" className="py-2.5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>Timetable Slots</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="qp-workflow" className="py-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                      <span>Question Paper Workflow</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="leave-policy" className="py-2.5">
                    <div className="flex items-center gap-2">
                      <CalendarCheck2 className="w-4 h-4 text-muted-foreground" />
                      <span>Short Permission & Leave Policy</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="attendance-workflow" className="py-2.5">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>Attendance Workflow</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Desktop / Tablet Tab Pills (>= sm) */}
            <div className={`hidden sm:flex p-1.5 rounded-2xl flex-row w-full gap-1.5 ${theme === 'dark' ? 'bg-muted/40 border border-border/60' : 'bg-slate-100/90 border border-slate-200/80'}`}>
              <button
                type="button"
                className={`flex-1 py-2.5 px-4 font-semibold text-xs sm:text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === 'timetable'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                }`}
                onClick={() => setActiveTab('timetable')}
              >
                <Clock className="w-4 h-4" />
                <span>Timetable Slots</span>
              </button>
              <button
                type="button"
                className={`flex-1 py-2.5 px-4 font-semibold text-xs sm:text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === 'qp-workflow'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                }`}
                onClick={() => setActiveTab('qp-workflow')}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Question Paper Workflow</span>
              </button>
              <button
                type="button"
                className={`flex-1 py-2.5 px-4 font-semibold text-xs sm:text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === 'leave-policy'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                }`}
                onClick={() => setActiveTab('leave-policy')}
              >
                <CalendarCheck2 className="w-4 h-4" />
                <span>Short Permission & Leave Policy</span>
              </button>
              <button
                type="button"
                className={`flex-1 py-2.5 px-4 font-semibold text-xs sm:text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === 'attendance-workflow'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                }`}
                onClick={() => setActiveTab('attendance-workflow')}
              >
                <Users className="w-4 h-4" />
                <span>Attendance Workflow</span>
              </button>
            </div>

            {activeTab === 'timetable' && (
              <div className="space-y-6">
                <div id="principal-timetable-settings-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
                  <div>
                    <h3 className="text-lg font-semibold">Timetable Configuration</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Configure the daily class periods and breaks for your institution.
                    </p>
                  </div>
                  <div className="w-full sm:w-auto">
                    <Button onClick={() => handleOpen()} className="w-full sm:w-auto shadow-sm">
                      <Plus className="w-4 h-4 mr-2" /> Add Slot
                    </Button>
                  </div>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                  <DialogContent className={`w-[90%] max-w-[90%] md:max-w-xl rounded-2xl ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white text-gray-900'}`}>
                    <DialogHeader>
                      <DialogTitle className="text-lg font-semibold">
                        {editingSlot ? 'Edit Slot' : 'Create New Slot'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="slot-name">Slot Name (e.g., Period 1, Lunch Break)</Label>
                        <Input
                          id="slot-name"
                          required
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          className={theme === 'dark' ? 'bg-background border-border' : ''}
                          placeholder="Enter slot name..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Time</Label>
                          <div className="flex gap-1.5 items-center">
                            <Select value={startTimeParts.hour} onValueChange={(v) => updateStartTime('hour', v)}>
                              <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-background border-border' : ''}`}>
                                <SelectValue placeholder="HH" />
                              </SelectTrigger>
                              <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                                {hoursOptions.map(h => (
                                  <SelectItem key={h} value={h}>{h}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-muted-foreground font-semibold">:</span>
                            <Select value={startTimeParts.minute} onValueChange={(v) => updateStartTime('minute', v)}>
                              <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-background border-border' : ''}`}>
                                <SelectValue placeholder="MM" />
                              </SelectTrigger>
                              <SelectContent className={`max-h-[200px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                                {minutesOptions.map(m => (
                                  <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={startTimeParts.period} onValueChange={(v) => updateStartTime('period', v)}>
                              <SelectTrigger className={`w-28 ${theme === 'dark' ? 'bg-background border-border' : ''}`}>
                                <SelectValue placeholder="AM/PM" />
                              </SelectTrigger>
                              <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                                <SelectItem value="AM">AM</SelectItem>
                                <SelectItem value="PM">PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>End Time</Label>
                          <div className="flex gap-1.5 items-center">
                            <Select value={endTimeParts.hour} onValueChange={(v) => updateEndTime('hour', v)}>
                              <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-background border-border' : ''}`}>
                                <SelectValue placeholder="HH" />
                              </SelectTrigger>
                              <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                                {hoursOptions.map(h => (
                                  <SelectItem key={h} value={h}>{h}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-muted-foreground font-semibold">:</span>
                            <Select value={endTimeParts.minute} onValueChange={(v) => updateEndTime('minute', v)}>
                              <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-background border-border' : ''}`}>
                                <SelectValue placeholder="MM" />
                              </SelectTrigger>
                              <SelectContent className={`max-h-[200px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                                {minutesOptions.map(m => (
                                  <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={endTimeParts.period} onValueChange={(v) => updateEndTime('period', v)}>
                              <SelectTrigger className={`w-28 ${theme === 'dark' ? 'bg-background border-border' : ''}`}>
                                <SelectValue placeholder="AM/PM" />
                              </SelectTrigger>
                              <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                                <SelectItem value="AM">AM</SelectItem>
                                <SelectItem value="PM">PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                          id="is_break"
                          checked={formData.is_break}
                          onCheckedChange={(c: boolean) => setFormData({ ...formData, is_break: c })}
                        />
                        <Label htmlFor="is_break" className="cursor-pointer select-none">This is a break/lunch period</Label>
                      </div>

                      <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Slot</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                {loading ? (
                  <SkeletonTable rows={5} cols={5} />
                ) : slots.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center ${theme === 'dark' ? 'border-border bg-muted/5' : 'border-gray-200 bg-gray-50/30'
                    }`}>
                    <div className={`rounded-full p-4 mb-4 ${theme === 'dark' ? 'bg-muted/40 text-muted-foreground' : 'bg-gray-100/80 text-gray-500'}`}>
                      <Clock className="w-8 h-8" />
                    </div>
                    <h3 className={`text-lg font-semibold tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      No slots configured yet.
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-xs">
                      Set up periods and breaks to organize class schedules for your institution.
                    </p>
                    <Button onClick={() => handleOpen()} size="sm" className="shadow-sm">
                      <Plus className="w-4 h-4 mr-2" /> Configure your first slot
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {slots.map((slot) => (
                      <Card
                        key={slot.id}
                        className={`border shadow-sm transition-all duration-150 hover:shadow-md ${theme === 'dark' ? 'bg-background border-border' : 'bg-slate-50/50 border-gray-100'
                          } ${slot.is_break
                            ? 'border-l-4 border-l-orange-500'
                            : ''
                          }`}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={`font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                {slot.name}
                              </p>
                              {slot.is_break && (
                                <span className={`text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full border ${theme === 'dark'
                                  ? 'bg-orange-950/40 text-orange-400 border-orange-900/60'
                                  : 'bg-orange-100 text-orange-800 border-orange-200'
                                  }`}>
                                  Break
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="w-3.5 h-3.5" />
                              {formatTimeTo12hString(slot.start_time)} - {formatTimeTo12hString(slot.end_time)}
                            </p>
                          </div>

                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpen(slot)}
                              className={`h-9 w-9 hover:bg-muted ${theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-9 w-9 text-red-500 hover:text-red-600 ${theme === 'dark' ? 'hover:bg-red-950/20' : 'hover:bg-red-50'}`}
                              onClick={() => handleDelete(slot.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'leave-policy' && (
              <div className="space-y-6 pt-2">
                <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                  <div className={`hidden sm:flex p-2 rounded-lg ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                    <CalendarCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Short Permission & Leave Policy Configuration</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Customize short period permissions per month, standard leaves limit, and configure approval routing.
                    </p>
                  </div>
                </div>

                {leavePolicyLoading ? (
                  <SkeletonTable rows={3} cols={2} />
                ) : (
                  <div className="space-y-6">
                    {/* Granular Leave Type Policies Configuration (CL, EL, RH, Short Permission) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 1. Casual Leave (CL) Policy Card */}
                      <Card className={`border ${theme === 'dark' ? 'bg-background/80 border-border' : 'bg-slate-50/70 border-gray-200'}`}>
                        <CardHeader className="p-4 pb-2 border-b border-border/40">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 shrink-0 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/20">
                                CL
                              </span>
                              <CardTitle className="text-sm font-semibold truncate sm:whitespace-normal">Casual Leave (CL) Policy</CardTitle>
                            </div>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 shrink-0 self-start sm:self-auto">
                              Personal / Urgent
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Configure standard annual casual leaves and stretch parameters.</p>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Annual Quota (Days)</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={leavePolicy.leave_policy_rules?.casual_leave?.annual_quota ?? 15}
                                onChange={(e) => {
                                  const clean = e.target.value.replace(/[^0-9]/g, '');
                                  setLeavePolicy(prev => ({
                                    ...prev,
                                    total_standard_leaves: clean,
                                    leave_policy_rules: {
                                      ...prev.leave_policy_rules,
                                      casual_leave: { ...prev.leave_policy_rules?.casual_leave, annual_quota: clean }
                                    }
                                  }));
                                }}
                                placeholder="15"
                                className={`h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Max Stretch (Days)</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={leavePolicy.leave_policy_rules?.casual_leave?.max_stretch_days ?? 3}
                                onChange={(e) => {
                                  const clean = e.target.value.replace(/[^0-9]/g, '');
                                  setLeavePolicy(prev => ({
                                    ...prev,
                                    leave_policy_rules: {
                                      ...prev.leave_policy_rules,
                                      casual_leave: { ...prev.leave_policy_rules?.casual_leave, max_stretch_days: clean }
                                    }
                                  }));
                                }}
                                placeholder="3"
                                className={`h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}
                              />
                            </div>
                          </div>

                          <div className="pt-2 border-t border-border/40 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label className="text-xs font-medium">Allow Half-Day Applications</Label>
                                <p className="text-[11px] text-muted-foreground">Permit staff to apply for 0.5 day sessions</p>
                              </div>
                              <Switch
                                checked={leavePolicy.leave_policy_rules?.casual_leave?.allow_half_day !== false}
                                onCheckedChange={(val) => {
                                  setLeavePolicy(prev => ({
                                    ...prev,
                                    leave_policy_rules: {
                                      ...prev.leave_policy_rules,
                                      casual_leave: { ...prev.leave_policy_rules?.casual_leave, allow_half_day: val }
                                    }
                                  }));
                                }}
                              />
                            </div>

                            {leavePolicy.leave_policy_rules?.casual_leave?.allow_half_day !== false && (
                              <div className="space-y-3 pt-1 border-t border-border/30">
                                <div className="flex items-center justify-between gap-2">
                                  <Label className="text-xs text-muted-foreground">Half-Day Session Rule:</Label>
                                  <Select
                                    value={leavePolicy.leave_policy_rules?.casual_leave?.half_day_session || 'afternoon_only'}
                                    onValueChange={(val) => {
                                      setLeavePolicy(prev => ({
                                        ...prev,
                                        leave_policy_rules: {
                                          ...prev.leave_policy_rules,
                                          casual_leave: { ...prev.leave_policy_rules?.casual_leave, half_day_session: val }
                                        }
                                      }));
                                    }}
                                  >
                                    <SelectTrigger className="h-7 w-48 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="afternoon_only">Afternoon Session Only</SelectItem>
                                      <SelectItem value="forenoon_only">Morning Session Only</SelectItem>
                                      <SelectItem value="both">Both Morning & Afternoon</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2.5">
                                  {/* Custom Timings for Forenoon (if 'forenoon_only' or 'both') */}
                                  {(leavePolicy.leave_policy_rules?.casual_leave?.half_day_session === 'forenoon_only' ||
                                    leavePolicy.leave_policy_rules?.casual_leave?.half_day_session === 'both') && (
                                    <div className="p-2.5 rounded-lg border bg-muted/20 border-border/60 space-y-2.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                          <Clock className="w-3.5 h-3.5 text-primary" />
                                          Morning (Forenoon) Session Window
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-medium">Morning Half-Day</span>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {/* Forenoon Start */}
                                        {(() => {
                                          const parts = parseAnyTime12h(
                                            leavePolicy.leave_policy_rules?.casual_leave?.forenoon_start_time,
                                            { hour: "09", minute: "00", period: "AM" }
                                          );
                                          const update = (key: "hour" | "minute" | "period", val: string) => {
                                            const updated = { ...parts, [key]: val };
                                            setLeavePolicy(prev => ({
                                              ...prev,
                                              leave_policy_rules: {
                                                ...prev.leave_policy_rules,
                                                casual_leave: {
                                                  ...prev.leave_policy_rules?.casual_leave,
                                                  forenoon_start_time: `${updated.hour}:${updated.minute} ${updated.period}`
                                                }
                                              }
                                            }));
                                          };
                                          return (
                                            <div className="space-y-1">
                                              <Label className="text-[10px] font-medium text-muted-foreground">Start Time</Label>
                                              <div className="flex gap-1 items-center">
                                                <Select value={parts.hour} onValueChange={(v) => update("hour", v)}>
                                                  <SelectTrigger className={`h-7 px-1.5 text-xs flex-1 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}>
                                                    <SelectValue placeholder="HH" />
                                                  </SelectTrigger>
                                                  <SelectContent className={`max-h-[180px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                                                    {hoursOptions.map(h => (<SelectItem key={h} value={h}>{h}</SelectItem>))}
                                                  </SelectContent>
                                                </Select>
                                                <span className="text-muted-foreground font-semibold text-xs">:</span>
                                                <Select value={parts.minute} onValueChange={(v) => update("minute", v)}>
                                                  <SelectTrigger className={`h-7 px-1.5 text-xs flex-1 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}>
                                                    <SelectValue placeholder="MM" />
                                                  </SelectTrigger>
                                                  <SelectContent className={`max-h-[180px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                                                    {minutesOptions.map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                                                  </SelectContent>
                                                </Select>
                                                <Select value={parts.period} onValueChange={(v) => update("period", v)}>
                                                  <SelectTrigger className={`h-7 px-1.5 text-xs w-16 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}>
                                                    <SelectValue placeholder="AM/PM" />
                                                  </SelectTrigger>
                                                  <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                                                    <SelectItem value="AM">AM</SelectItem>
                                                    <SelectItem value="PM">PM</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                            </div>
                                          );
                                        })()}

                                        {/* Forenoon End */}
                                        {(() => {
                                          const parts = parseAnyTime12h(
                                            leavePolicy.leave_policy_rules?.casual_leave?.forenoon_end_time,
                                            { hour: "12", minute: "00", period: "PM" }
                                          );
                                          const update = (key: "hour" | "minute" | "period", val: string) => {
                                            const updated = { ...parts, [key]: val };
                                            setLeavePolicy(prev => ({
                                              ...prev,
                                              leave_policy_rules: {
                                                ...prev.leave_policy_rules,
                                                casual_leave: {
                                                  ...prev.leave_policy_rules?.casual_leave,
                                                  forenoon_end_time: `${updated.hour}:${updated.minute} ${updated.period}`
                                                }
                                              }
                                            }));
                                          };
                                          return (
                                            <div className="space-y-1">
                                              <Label className="text-[10px] font-medium text-muted-foreground">End Time (Cut-off)</Label>
                                              <div className="flex gap-1 items-center">
                                                <Select value={parts.hour} onValueChange={(v) => update("hour", v)}>
                                                  <SelectTrigger className={`h-7 px-1.5 text-xs flex-1 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}>
                                                    <SelectValue placeholder="HH" />
                                                  </SelectTrigger>
                                                  <SelectContent className={`max-h-[180px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                                                    {hoursOptions.map(h => (<SelectItem key={h} value={h}>{h}</SelectItem>))}
                                                  </SelectContent>
                                                </Select>
                                                <span className="text-muted-foreground font-semibold text-xs">:</span>
                                                <Select value={parts.minute} onValueChange={(v) => update("minute", v)}>
                                                  <SelectTrigger className={`h-7 px-1.5 text-xs flex-1 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}>
                                                    <SelectValue placeholder="MM" />
                                                  </SelectTrigger>
                                                  <SelectContent className={`max-h-[180px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                                                    {minutesOptions.map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                                                  </SelectContent>
                                                </Select>
                                                <Select value={parts.period} onValueChange={(v) => update("period", v)}>
                                                  <SelectTrigger className={`h-7 px-1.5 text-xs w-16 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}>
                                                    <SelectValue placeholder="AM/PM" />
                                                  </SelectTrigger>
                                                  <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                                                    <SelectItem value="AM">AM</SelectItem>
                                                    <SelectItem value="PM">PM</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  )}

                                  {/* Custom Timings for Afternoon (if 'afternoon_only' or 'both') */}
                                  {(leavePolicy.leave_policy_rules?.casual_leave?.half_day_session === 'afternoon_only' ||
                                    leavePolicy.leave_policy_rules?.casual_leave?.half_day_session === 'both' ||
                                    !leavePolicy.leave_policy_rules?.casual_leave?.half_day_session) && (
                                  <div className="p-2.5 rounded-lg border bg-muted/20 border-border/60 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-primary" />
                                        Afternoon (PM) Session Window
                                      </span>
                                      <span className="text-[10px] text-muted-foreground font-medium">PM Half-Day</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                      {/* Afternoon Start */}
                                      {(() => {
                                        const parts = parseAnyTime12h(
                                          leavePolicy.leave_policy_rules?.casual_leave?.afternoon_start_time,
                                          { hour: "12", minute: "00", period: "PM" }
                                        );
                                        const update = (key: "hour" | "minute" | "period", val: string) => {
                                          const updated = { ...parts, [key]: val };
                                          setLeavePolicy(prev => ({
                                            ...prev,
                                            leave_policy_rules: {
                                              ...prev.leave_policy_rules,
                                              casual_leave: {
                                                ...prev.leave_policy_rules?.casual_leave,
                                                afternoon_start_time: `${updated.hour}:${updated.minute} ${updated.period}`
                                              }
                                            }
                                          }));
                                        };
                                        return (
                                          <div className="space-y-1">
                                            <Label className="text-[10px] font-medium text-muted-foreground">Start Time (Begins)</Label>
                                            <div className="flex gap-1 items-center">
                                              <Select value={parts.hour} onValueChange={(v) => update("hour", v)}>
                                                <SelectTrigger className={`h-7 px-1.5 text-xs flex-1 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}>
                                                  <SelectValue placeholder="HH" />
                                                </SelectTrigger>
                                                <SelectContent className={`max-h-[180px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                                                  {hoursOptions.map(h => (<SelectItem key={h} value={h}>{h}</SelectItem>))}
                                                </SelectContent>
                                              </Select>
                                              <span className="text-muted-foreground font-semibold text-xs">:</span>
                                              <Select value={parts.minute} onValueChange={(v) => update("minute", v)}>
                                                <SelectTrigger className={`h-7 px-1.5 text-xs flex-1 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}>
                                                  <SelectValue placeholder="MM" />
                                                </SelectTrigger>
                                                <SelectContent className={`max-h-[180px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                                                  {minutesOptions.map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                                                </SelectContent>
                                              </Select>
                                              <Select value={parts.period} onValueChange={(v) => update("period", v)}>
                                                <SelectTrigger className={`h-7 px-1.5 text-xs w-16 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}>
                                                  <SelectValue placeholder="AM/PM" />
                                                </SelectTrigger>
                                                <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                                                  <SelectItem value="AM">AM</SelectItem>
                                                  <SelectItem value="PM">PM</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          </div>
                                        );
                                      })()}

                                      {/* Afternoon End */}
                                      {(() => {
                                        const parts = parseAnyTime12h(
                                          leavePolicy.leave_policy_rules?.casual_leave?.afternoon_end_time,
                                          { hour: "05", minute: "00", period: "PM" }
                                        );
                                        const update = (key: "hour" | "minute" | "period", val: string) => {
                                          const updated = { ...parts, [key]: val };
                                          setLeavePolicy(prev => ({
                                            ...prev,
                                            leave_policy_rules: {
                                              ...prev.leave_policy_rules,
                                              casual_leave: {
                                                ...prev.leave_policy_rules?.casual_leave,
                                                afternoon_end_time: `${updated.hour}:${updated.minute} ${updated.period}`
                                              }
                                            }
                                          }));
                                        };
                                        return (
                                          <div className="space-y-1">
                                            <Label className="text-[10px] font-medium text-muted-foreground">End Time (Closes)</Label>
                                            <div className="flex gap-1 items-center">
                                              <Select value={parts.hour} onValueChange={(v) => update("hour", v)}>
                                                <SelectTrigger className={`h-7 px-1.5 text-xs flex-1 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}>
                                                  <SelectValue placeholder="HH" />
                                                </SelectTrigger>
                                                <SelectContent className={`max-h-[180px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                                                  {hoursOptions.map(h => (<SelectItem key={h} value={h}>{h}</SelectItem>))}
                                                </SelectContent>
                                              </Select>
                                              <span className="text-muted-foreground font-semibold text-xs">:</span>
                                              <Select value={parts.minute} onValueChange={(v) => update("minute", v)}>
                                                <SelectTrigger className={`h-7 px-1.5 text-xs flex-1 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}>
                                                  <SelectValue placeholder="MM" />
                                                </SelectTrigger>
                                                <SelectContent className={`max-h-[180px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                                                  {minutesOptions.map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                                                </SelectContent>
                                              </Select>
                                              <Select value={parts.period} onValueChange={(v) => update("period", v)}>
                                                <SelectTrigger className={`h-7 px-1.5 text-xs w-16 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}>
                                                  <SelectValue placeholder="AM/PM" />
                                                </SelectTrigger>
                                                <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                                                  <SelectItem value="AM">AM</SelectItem>
                                                  <SelectItem value="PM">PM</SelectItem>
                                                </SelectContent>
                                              </Select>
                                          </div>
                                            </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                )}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* 2. Earned Leave (EL) Policy Card */}
                      <Card className={`border ${theme === 'dark' ? 'bg-background/80 border-border' : 'bg-slate-50/70 border-gray-200'}`}>
                        <CardHeader className="p-4 pb-2 border-b border-border/40">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 shrink-0 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-500/20">
                                EL
                              </span>
                              <CardTitle className="text-sm font-semibold truncate sm:whitespace-normal">Earned Leave (EL) Policy</CardTitle>
                            </div>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 shrink-0 self-start sm:self-auto">
                              Service Accrued
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Bi-annual credit distribution and continuous stretch boundaries.</p>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Annual Quota</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={leavePolicy.leave_policy_rules?.earned_leave?.annual_quota ?? 15}
                                onChange={(e) => {
                                  const clean = e.target.value.replace(/[^0-9]/g, '');
                                  setLeavePolicy(prev => ({
                                    ...prev,
                                    leave_policy_rules: {
                                      ...prev.leave_policy_rules,
                                      earned_leave: { ...prev.leave_policy_rules?.earned_leave, annual_quota: clean }
                                    }
                                  }));
                                }}
                                placeholder="15"
                                className={`h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Jan Credit (H1)</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={leavePolicy.leave_policy_rules?.earned_leave?.jan_credit ?? 7}
                                onChange={(e) => {
                                  const clean = e.target.value.replace(/[^0-9]/g, '');
                                  setLeavePolicy(prev => ({
                                    ...prev,
                                    leave_policy_rules: {
                                      ...prev.leave_policy_rules,
                                      earned_leave: { ...prev.leave_policy_rules?.earned_leave, jan_credit: clean }
                                    }
                                  }));
                                }}
                                placeholder="7"
                                className={`h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Jul Credit (H2)</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={leavePolicy.leave_policy_rules?.earned_leave?.jul_credit ?? 8}
                                onChange={(e) => {
                                  const clean = e.target.value.replace(/[^0-9]/g, '');
                                  setLeavePolicy(prev => ({
                                    ...prev,
                                    leave_policy_rules: {
                                      ...prev.leave_policy_rules,
                                      earned_leave: { ...prev.leave_policy_rules?.earned_leave, jul_credit: clean }
                                    }
                                  }));
                                }}
                                placeholder="8"
                                className={`h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Min Stretch (Days)</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={leavePolicy.leave_policy_rules?.earned_leave?.min_stretch_days ?? 2}
                                onChange={(e) => {
                                  const clean = e.target.value.replace(/[^0-9]/g, '');
                                  setLeavePolicy(prev => ({
                                    ...prev,
                                    leave_policy_rules: {
                                      ...prev.leave_policy_rules,
                                      earned_leave: { ...prev.leave_policy_rules?.earned_leave, min_stretch_days: clean }
                                    }
                                  }));
                                }}
                                placeholder="2"
                                className={`h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Max Stretch (Days)</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={leavePolicy.leave_policy_rules?.earned_leave?.max_stretch_days ?? 5}
                                onChange={(e) => {
                                  const clean = e.target.value.replace(/[^0-9]/g, '');
                                  setLeavePolicy(prev => ({
                                    ...prev,
                                    leave_policy_rules: {
                                      ...prev.leave_policy_rules,
                                      earned_leave: { ...prev.leave_policy_rules?.earned_leave, max_stretch_days: clean }
                                    }
                                  }));
                                }}
                                placeholder="5"
                                className={`h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* 3. Restricted Holiday (RH) Policy Card */}
                      <Card className={`border ${theme === 'dark' ? 'bg-background/80 border-border' : 'bg-slate-50/70 border-gray-200'}`}>
                        <CardHeader className="p-4 pb-2 border-b border-border/40">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 shrink-0 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center border border-purple-500/20">
                                RH
                              </span>
                              <CardTitle className="text-sm font-semibold truncate sm:whitespace-normal">Restricted Holiday (RH) Policy</CardTitle>
                            </div>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 shrink-0 self-start sm:self-auto">
                              Optional Holiday
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Annual entitlement and monthly availing frequency.</p>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Annual Quota (Days)</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={leavePolicy.leave_policy_rules?.restricted_holiday?.annual_quota ?? 2}
                                onChange={(e) => {
                                  const clean = e.target.value.replace(/[^0-9]/g, '');
                                  setLeavePolicy(prev => ({
                                    ...prev,
                                    leave_policy_rules: {
                                      ...prev.leave_policy_rules,
                                      restricted_holiday: { ...prev.leave_policy_rules?.restricted_holiday, annual_quota: clean }
                                    }
                                  }));
                                }}
                                placeholder="2"
                                className={`h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Monthly Limit (Days)</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={leavePolicy.leave_policy_rules?.restricted_holiday?.monthly_limit ?? 1}
                                onChange={(e) => {
                                  const clean = e.target.value.replace(/[^0-9]/g, '');
                                  setLeavePolicy(prev => ({
                                    ...prev,
                                    leave_policy_rules: {
                                      ...prev.leave_policy_rules,
                                      restricted_holiday: { ...prev.leave_policy_rules?.restricted_holiday, monthly_limit: clean }
                                    }
                                  }));
                                }}
                                placeholder="1"
                                className={`h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* 4. Short Permission Policy Card */}
                      <Card className={`border ${theme === 'dark' ? 'bg-background/80 border-border' : 'bg-slate-50/70 border-gray-200'}`}>
                        <CardHeader className="p-4 pb-2 border-b border-border/40">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 shrink-0 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/20">
                                SP
                              </span>
                              <CardTitle className="text-sm font-semibold truncate sm:whitespace-normal">Short Permission Policy</CardTitle>
                            </div>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 shrink-0 self-start sm:self-auto">
                              Hourly Window
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Short period permission quotas and max duration limit.</p>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5 flex flex-col justify-end">
                              <Label className="text-xs font-semibold leading-tight">Monthly Quota (Permissions / Month)</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={leavePolicy.leave_policy_rules?.short_permission?.monthly_limit ?? leavePolicy.monthly_short_permission_limit ?? 5}
                                onChange={(e) => {
                                  const clean = e.target.value.replace(/[^0-9]/g, '');
                                  setLeavePolicy(prev => ({
                                    ...prev,
                                    monthly_short_permission_limit: clean,
                                    leave_policy_rules: {
                                      ...prev.leave_policy_rules,
                                      short_permission: { ...prev.leave_policy_rules?.short_permission, monthly_limit: clean }
                                    }
                                  }));
                                }}
                                placeholder="5"
                                className={`h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}
                              />
                            </div>
                            <div className="space-y-1.5 flex flex-col justify-end">
                              <Label className="text-xs font-semibold leading-tight">Max Duration (Hours)</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={leavePolicy.leave_policy_rules?.short_permission?.max_hours ?? leavePolicy.short_permission_max_hours ?? 2}
                                onChange={(e) => {
                                  const clean = e.target.value.replace(/[^0-9]/g, '');
                                  setLeavePolicy(prev => ({
                                    ...prev,
                                    short_permission_max_hours: clean,
                                    leave_policy_rules: {
                                      ...prev.leave_policy_rules,
                                      short_permission: { ...prev.leave_policy_rules?.short_permission, max_hours: clean }
                                    }
                                  }));
                                }}
                                placeholder="2"
                                className={`h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Role-Based Approval Routing */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <Label className="text-sm font-semibold">Role-Based Leave Approval Routing</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Define which authority approves leave and permission requests for each staff role.
                      </p>

                      <div className={`rounded-xl border divide-y ${theme === 'dark' ? 'bg-background border-border divide-border' : 'bg-slate-50/50 border-gray-200 divide-gray-100'}`}>
                        {[
                          { roleKey: 'teacher', label: 'Faculty / Teacher Leaves', defaultStages: ['hod', 'principal'] },
                          { roleKey: 'hod', label: 'Head of Department (HOD) Leaves', defaultStages: ['dean', 'principal'] },
                          { roleKey: 'dean', label: 'Dean Leaves', defaultStages: ['principal'] },
                          { roleKey: 'coe', label: 'COE Leaves', defaultStages: ['principal'] },
                          { roleKey: 'fees_manager', label: 'Fees Manager Leaves', defaultStages: ['principal'] },
                          { roleKey: 'counsellor', label: 'Counsellor Leaves', defaultStages: ['admission_manager', 'principal'] },
                          { roleKey: 'hms_admin', label: 'HMS Admin Leaves', defaultStages: ['principal'] },
                          { roleKey: 'warden', label: 'Hostel Warden Leaves', defaultStages: ['hms_admin', 'principal'] },
                          { roleKey: 'transport_admin', label: 'Transport Admin Leaves', defaultStages: ['principal'] },
                          { roleKey: 'driver', label: 'Driver Leaves', defaultStages: ['transport_admin', 'principal'] },
                          { roleKey: 'library_admin', label: 'Library Admin Leaves', defaultStages: ['principal'] },
                          { roleKey: 'placement_officer', label: 'Placement Officer Leaves', defaultStages: ['principal'] },
                          { roleKey: 'admission_manager', label: 'Admission Manager Leaves', defaultStages: ['principal'] }
                        ].map((item) => {
                          const ALL_APPROVER_OPTIONS = [
                            { value: 'hod', label: 'Head of Department (HOD)' },
                            { value: 'principal', label: 'Principal' },
                            { value: 'dean', label: 'Dean' },
                            { value: 'admission_manager', label: 'Admission Manager' },
                            { value: 'hms_admin', label: 'HMS Admin' },
                            { value: 'transport_admin', label: 'Transport Admin' },
                            { value: 'coe', label: 'COE' },
                            { value: 'fees_manager', label: 'Fees Manager' }
                          ];

                          // Hide applicant's own role from approver options
                          const availableApprovers = ALL_APPROVER_OPTIONS.filter((opt) => opt.value !== item.roleKey);
                          const defaultFallbackApprover = availableApprovers.find(a => a.value !== 'principal')?.value || 'principal';

                          const rawConfig = leavePolicy.leave_approval_routing?.[item.roleKey];
                          let stages: string[] = item.defaultStages;
                          let numStages: number = item.defaultStages.length;

                          if (rawConfig && typeof rawConfig === 'object' && Array.isArray(rawConfig.stages)) {
                            stages = rawConfig.stages.filter((s: string) => s && s !== 'alternate_duty');
                            numStages = rawConfig.num_stages || stages.length || item.defaultStages.length;
                          } else if (typeof rawConfig === 'string' && rawConfig) {
                            if (rawConfig === 'hod') stages = item.roleKey === 'hod' ? ['dean', 'principal'] : ['hod', 'principal'];
                            else if (rawConfig === 'admission_manager') stages = ['admission_manager', 'principal'];
                            else if (rawConfig === 'hms_admin') stages = ['hms_admin', 'principal'];
                            else if (rawConfig === 'transport_admin') stages = ['transport_admin', 'principal'];
                            else if (rawConfig === 'dean') stages = ['dean'];
                            else stages = [rawConfig];
                            numStages = stages.length;
                          }

                          // Replace any accidental assignment of own role with a valid fallback
                          stages = stages.map(stg => stg === item.roleKey ? defaultFallbackApprover : stg);

                          // Ensure stages array matches numStages length
                          while (stages.length < numStages) {
                            stages.push('principal');
                          }
                          stages = stages.slice(0, numStages);

                          const handleStageCountChange = (countStr: string) => {
                            const count = parseInt(countStr, 10);
                            let newStages: string[] = [];

                            if (count === 1) {
                              newStages = ['principal'];
                            } else if (count === 2) {
                              if (item.roleKey === 'teacher') {
                                newStages = ['hod', 'principal'];
                              } else if (item.roleKey === 'hod') {
                                newStages = ['dean', 'principal'];
                              } else if (item.roleKey === 'warden') {
                                newStages = ['hms_admin', 'principal'];
                              } else if (item.roleKey === 'driver') {
                                newStages = ['transport_admin', 'principal'];
                              } else if (item.roleKey === 'counsellor') {
                                newStages = ['admission_manager', 'principal'];
                              } else {
                                newStages = [defaultFallbackApprover, 'principal'];
                              }
                            } else if (count === 3) {
                              if (item.roleKey === 'hod') {
                                newStages = ['dean', 'coe', 'principal'];
                              } else if (item.roleKey === 'teacher') {
                                newStages = ['hod', 'dean', 'principal'];
                              } else {
                                newStages = ['hms_admin', 'dean', 'principal'].filter(r => r !== item.roleKey);
                                while (newStages.length < 3) {
                                  newStages.push('principal');
                                }
                              }
                            }

                            // Ensure applicant's own role is never in stages
                            newStages = newStages.map(stg => stg === item.roleKey ? defaultFallbackApprover : stg);

                            setLeavePolicy({
                              ...leavePolicy,
                              leave_approval_routing: {
                                ...(leavePolicy.leave_approval_routing || {}),
                                [item.roleKey]: {
                                  num_stages: count,
                                  stages: newStages.slice(0, count)
                                }
                              }
                            });
                          };

                          const handleStageApproverChange = (index: number, approverValue: string) => {
                            const newStages = [...stages];
                            newStages[index] = approverValue;
                            setLeavePolicy({
                              ...leavePolicy,
                              leave_approval_routing: {
                                ...(leavePolicy.leave_approval_routing || {}),
                                [item.roleKey]: {
                                  num_stages: numStages,
                                  stages: newStages
                                }
                              }
                            });
                          };

                          const APPROVER_LABELS: Record<string, string> = {
                            hod: 'HOD',
                            principal: 'Principal',
                            dean: 'Dean',
                            admission_manager: 'Admission Mgr',
                            hms_admin: 'HMS Admin',
                            transport_admin: 'Transport Admin',
                            coe: 'COE',
                            fees_manager: 'Fees Mgr'
                          };

                          return (
                            <div key={item.roleKey} className="p-4 flex flex-col gap-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{item.label}</span>
                                  <p className="text-xs text-muted-foreground">Requests will be forwarded through the configured sequential approval stages</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Number of Stages:</Label>
                                  <Select
                                    value={String(numStages)}
                                    onValueChange={handleStageCountChange}
                                  >
                                    <SelectTrigger className={`w-28 h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                                      <SelectItem value="1">1 Stage</SelectItem>
                                      <SelectItem value="2">2 Stages</SelectItem>
                                      <SelectItem value="3">3 Stages</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {/* Dynamic Dropdowns for Each Stage */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                {Array.from({ length: numStages }).map((_, idx) => {
                                  const currentVal = availableApprovers.some(opt => opt.value === stages[idx])
                                    ? stages[idx]
                                    : (idx === numStages - 1 ? 'principal' : defaultFallbackApprover);

                                  return (
                                    <div key={idx} className="space-y-1">
                                      <Label className="text-[11px] font-medium text-muted-foreground">
                                        Stage {idx + 1} Approver:
                                      </Label>
                                      <Select
                                        value={currentVal}
                                        onValueChange={(val) => handleStageApproverChange(idx, val)}
                                      >
                                        <SelectTrigger className={`w-full h-9 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}>
                                          <SelectValue placeholder={`Select stage ${idx + 1} approver`} />
                                        </SelectTrigger>
                                        <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                                          {availableApprovers.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Live Visual Pipeline Preview */}
                              <div className="flex items-center flex-wrap gap-1.5 pt-1 text-[11px]">
                                <span className="text-muted-foreground font-medium">Pipeline:</span>
                                <span className={`px-2 py-0.5 rounded font-mono ${theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                                  Alternate Duty
                                </span>
                                {stages.map((stg, sIdx) => (
                                  <div key={sIdx} className="flex items-center gap-1.5">
                                    <span className="text-muted-foreground font-bold">➔</span>
                                    <span className={`px-2 py-0.5 rounded font-medium ${
                                      sIdx === stages.length - 1 
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                        : 'bg-primary/10 text-primary border border-primary/20'
                                    }`}>
                                      Stage {sIdx + 1}: {APPROVER_LABELS[stg] || stg}
                                    </span>
                                  </div>
                                ))}
                                <span className="text-muted-foreground font-bold">➔</span>
                                <span className="px-2 py-0.5 rounded font-medium bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                  Approved
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button onClick={handleSaveLeavePolicy} disabled={leavePolicySaving} className="shadow-sm">
                        <Save className="w-4 h-4 mr-2" /> {leavePolicySaving ? 'Saving...' : 'Save Leave Policy'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'qp-workflow' && (
              <div className="space-y-6 pt-2">
                <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                  <div className={`hidden sm:flex p-2 rounded-lg ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Question Paper Approval Workflow</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Configure the sequence of approvers for Question Papers submitted by faculty.
                    </p>
                  </div>
                </div>

                {chainLoading ? (
                  <SkeletonTable rows={2} cols={1} />
                ) : (
                  <div className="space-y-6">
                    {/* Presets */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Quick Presets</Label>
                      
                      {/* Mobile Dropdown View (< sm) */}
                      <div className="block sm:hidden w-full">
                        <Select
                          value={
                            Object.entries(PRESETS).find(
                              ([_, chain]) => JSON.stringify(approvalChain) === JSON.stringify(chain)
                            )?.[0] || ""
                          }
                          onValueChange={(val) => {
                            if (PRESETS[val]) {
                              setApprovalChain(PRESETS[val]);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full h-10 px-3 bg-background border-border/80 rounded-xl text-sm font-medium shadow-sm">
                            <SelectValue placeholder="Choose a preset..." />
                          </SelectTrigger>
                          <SelectContent className="z-50">
                            {Object.keys(PRESETS).map((presetName) => (
                              <SelectItem key={presetName} value={presetName} className="py-2.5">
                                {presetName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Desktop / Tablet Buttons (>= sm) */}
                      <div className="hidden sm:flex flex-wrap gap-2">
                        {Object.entries(PRESETS).map(([presetName, presetChain]) => (
                          <Button
                            key={presetName}
                            variant={JSON.stringify(approvalChain) === JSON.stringify(presetChain) ? "default" : "outline"}
                            size="sm"
                            onClick={() => setApprovalChain(presetChain)}
                            className={theme === 'dark' && JSON.stringify(approvalChain) !== JSON.stringify(presetChain) ? 'border-border' : ''}
                          >
                            {presetName}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Chain Builder */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Custom Workflow</Label>
                      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-background border-border' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 text-sm font-medium text-muted-foreground">
                            Faculty (Submits)
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />

                          {approvalChain.map((role, index) => (
                            <React.Fragment key={`${role}-${index}`}>
                              <div className="flex items-center gap-1">
                                <div className={`px-3 py-1.5 rounded-full border text-sm font-medium ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-700'}`}>
                                  {AVAILABLE_ROLES.find(r => r.value === role)?.label || translateTerminology(role.toUpperCase())}
                                </div>
                              </div>

                              {index < approvalChain.length - 1 && (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                              {index === approvalChain.length - 1 && (
                                <div className="flex items-center gap-2 ml-2">
                                  <ChevronRight className="w-4 h-4 text-green-500" />
                                  <div className="px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-xs font-semibold text-green-700 dark:text-green-400">
                                    Approved ✅
                                  </div>
                                </div>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button onClick={handleSaveApprovalChain} disabled={chainSaving} className="shadow-sm">
                        <Save className="w-4 h-4 mr-2" /> {chainSaving ? 'Saving...' : 'Save Workflow'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'attendance-workflow' && (
              <div className="space-y-6 pt-2">
                <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                  <div className={`hidden sm:flex p-2 rounded-lg ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Staff Attendance Workflow</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Configure periodic check-ins and required time windows.
                    </p>
                  </div>
                </div>

                {attendanceConfigLoading ? (
                  <SkeletonTable rows={2} cols={1} />
                ) : (
                  <div className="space-y-6">
                    {/* --- GLOBAL SETTINGS --- */}
                    <div className="space-y-4 pb-6 border-b border-border/60">
                      <h3 className="text-sm font-bold tracking-wide uppercase text-muted-foreground mb-4">Global Configuration</h3>
                      
                      {/* Allow Web Attendance Toggle */}
                      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-background/50 border-border' : 'bg-amber-50/60 border-amber-200/60'}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">Allow Web / Desktop Attendance Marking</span>
                              {!allowWebAttendance && (
                                <span className="text-[10px] font-bold uppercase tracking-wide bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full">Hidden for all staff</span>
                              )}
                            </div>
                            <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                              When disabled, the "My Attendance" page will be completely hidden from the sidebar for all staff roles (Faculty, HOD, Dean, Admin, etc.). Staff will only be able to mark attendance via the mobile app or any other configured method.
                            </p>
                          </div>
                          <Switch
                            checked={allowWebAttendance}
                            onCheckedChange={setAllowWebAttendance}
                          />
                        </div>
                      </div>

                      {/* Device ID Restriction Toggle */}
                      <div className={`p-4 rounded-xl border mt-4 ${theme === 'dark' ? 'bg-background/50 border-border' : 'bg-blue-50/60 border-blue-200/60'}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">Enforce Single Device Restriction</span>
                              {requireDeviceIdAttendance && (
                                <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full">Strict Mode Active</span>
                              )}
                            </div>
                            <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                              When enabled, the system restricts multiple users from marking attendance on the same device (using Device ID) on the same day. This prevents proxy attendance via a shared device.
                            </p>
                          </div>
                          <Switch
                            checked={requireDeviceIdAttendance}
                            onCheckedChange={setRequireDeviceIdAttendance}
                          />
                        </div>
                      </div>
                      
                      {/* Weekend Policy Setting */}
                      <div className={`p-4 rounded-xl border mt-4 ${theme === 'dark' ? 'bg-background/50 border-border' : 'bg-blue-50/60 border-blue-200/60'}`}>
                        <div className="flex flex-col gap-3">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-semibold">Weekend Holiday Policy</Label>
                            <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                              Select which Saturdays are considered holidays. Sundays are always compulsory holidays. The calendar will automatically block attendance marking for the selected days.
                            </p>
                          </div>
                          <Select value={weekendPolicy} onValueChange={setWeekendPolicy}>
                            <SelectTrigger className={`w-full sm:w-[350px] text-xs font-semibold ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}>
                              <SelectValue placeholder="Select Weekend Policy" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sundays_only">Sundays Only (Compulsory)</SelectItem>
                              <SelectItem value="first_third_saturdays">1st & 3rd Saturdays + Sundays</SelectItem>
                              <SelectItem value="second_fourth_saturdays">2nd & 4th Saturdays + Sundays</SelectItem>
                              <SelectItem value="all_saturdays">All Saturdays & Sundays</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end pt-4">
                          <Button size="sm" onClick={handleSaveAttendanceConfig} disabled={attendanceSaving} className="h-8">
                            <Save className="w-3.5 h-3.5 mr-2" /> {attendanceSaving ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </div>
                      </div>
                      </div>

                      {/* Staff Role Categorization */}
                      <div className={`p-4 rounded-xl border mt-4 ${theme === 'dark' ? 'bg-background/50 border-border' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex flex-col gap-4">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-semibold">Staff Role Categorization</Label>
                            <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                              Map staff roles to attendance workflow categories. All roles must be explicitly mapped to a category before saving.
                            </p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                              { key: 'teaching', label: 'Teaching Workflow' },
                              { key: 'non_teaching', label: 'Non-Teaching Workflow' },
                              { key: 'admin_branch', label: 'Administrative Workflow' },
                            ].map((col) => (
                              <div key={col.key} className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100'} space-y-3`}>
                                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground border-b pb-2">{col.label}</div>
                                <div className="space-y-2">
                                  {/* List roles mapped to this category */}
                                  {(staffCategoryMapping[col.key] || []).map((mappedRole) => {
                                    const roleDef = AVAILABLE_ROLES.find(r => r.value === mappedRole) || { label: mappedRole, value: mappedRole };
                                    return (
                                      <div key={mappedRole} className="flex items-center justify-between bg-primary/5 text-primary text-xs px-2 py-1.5 rounded">
                                        <span>{roleDef.label}</span>
                                        <button 
                                          type="button" 
                                          onClick={async () => {
                                            const result = await MySwal.fire({
                                              title: 'Remove Role?',
                                              html: `<span>Remove <b>${roleDef.label}</b> from <b>${col.label}</b>?<br/><small style="color:#888">You must assign it to another category before saving.</small></span>`,
                                              icon: 'warning',
                                              showCancelButton: true,
                                              confirmButtonText: 'Yes, Remove',
                                              cancelButtonText: 'Cancel',
                                              confirmButtonColor: '#ef4444',
                                            });
                                            if (result.isConfirmed) {
                                              const newMapping = { ...staffCategoryMapping };
                                              newMapping[col.key] = newMapping[col.key].filter(r => r !== mappedRole);
                                              setStaffCategoryMapping(newMapping);
                                            }
                                          }}
                                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                  
                                  {/* Add Role Dropdown */}
                                  <Select 
                                    value="" 
                                    onValueChange={async (val) => {
                                      if (!val) return;
                                      const roleDef = AVAILABLE_ROLES.find(r => r.value === val);
                                      const roleLabel = roleDef?.label ?? val;
                                      const result = await MySwal.fire({
                                        title: 'Add Role?',
                                        html: `<span>Move <b>${roleLabel}</b> to <b>${col.label}</b>?<br/><small style="color:#888">It will be removed from its current category if already assigned.</small></span>`,
                                        icon: 'question',
                                        showCancelButton: true,
                                        confirmButtonText: 'Yes, Move',
                                        cancelButtonText: 'Cancel',
                                        confirmButtonColor: '#6366f1',
                                      });
                                      if (result.isConfirmed) {
                                        const newMapping = { ...staffCategoryMapping };
                                        // Remove from other categories first
                                        Object.keys(newMapping).forEach(k => {
                                          newMapping[k] = (newMapping[k] || []).filter(r => r !== val);
                                        });
                                        // Add to new category
                                        newMapping[col.key] = [...(newMapping[col.key] || []), val];
                                        setStaffCategoryMapping(newMapping);
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="w-full text-xs h-7">
                                      <SelectValue placeholder="+ Add Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {AVAILABLE_ROLES.filter(r => !Object.values(staffCategoryMapping).flat().includes(r.value)).map(role => (
                                        <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-end pt-4">
                            <Button size="sm" onClick={handleSaveAttendanceConfig} disabled={attendanceSaving} className="h-8">
                              <Save className="w-3.5 h-3.5 mr-2" /> {attendanceSaving ? 'Saving...' : 'Save Changes'}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* --- CATEGORY SETTINGS --- */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold tracking-wide uppercase text-muted-foreground mb-2">Category-Specific Workflows</h3>
                      
                        {/* Mobile Category Dropdown (< sm) */}
                        <div className="block sm:hidden w-full pb-3 border-b border-border/60">
                          <Select
                            value={selectedCategoryTab}
                            onValueChange={(val: any) => setSelectedCategoryTab(val)}
                          >
                            <SelectTrigger className="w-full h-12 px-3.5 bg-background border-border/80 rounded-xl shadow-sm text-left">
                              <SelectValue placeholder="Select Staff Category" />
                            </SelectTrigger>
                            <SelectContent className="z-50">
                              {[
                                { id: 'teaching', label: 'Teaching Staff', sub: 'Faculty, HODs, Deans' },
                                { id: 'non_teaching', label: 'Non-Teaching Staff', sub: 'Lab Asst, Caretakers, Drivers' },
                                { id: 'admin_branch', label: 'Administration Branch', sub: 'Office, Principal, Admin Staff' },
                              ].map((cat) => (
                                <SelectItem key={cat.id} value={cat.id} className="py-2.5">
                                  <div className="flex flex-col text-left">
                                    <span className="text-sm font-semibold text-foreground">{cat.label}</span>
                                    <span className="text-[11px] text-muted-foreground">{cat.sub}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Desktop / Tablet Staff Category Tabs (>= sm) */}
                        <div className="hidden sm:flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
                          {[
                            { id: 'teaching', label: 'Teaching Staff', sub: 'Faculty, HODs, Deans' },
                            { id: 'non_teaching', label: 'Non-Teaching Staff', sub: 'Lab Asst, Caretakers, Drivers' },
                            { id: 'admin_branch', label: 'Administration Branch', sub: 'Office, Principal, Admin Staff' },
                          ].map(cat => {
                            const active = selectedCategoryTab === cat.id;
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedCategoryTab(cat.id as any)}
                                className={`flex flex-col text-left px-4 py-2.5 rounded-xl transition-all border ${
                                  active
                                    ? theme === 'dark'
                                      ? 'bg-primary/20 border-primary text-primary font-semibold shadow-sm'
                                      : 'bg-primary/10 border-primary/50 text-primary font-semibold shadow-sm'
                                    : theme === 'dark'
                                      ? 'bg-card border-border/60 text-muted-foreground hover:text-foreground hover:bg-card/80'
                                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                <span className="text-sm font-medium">{cat.label}</span>
                                <span className="text-[10px] opacity-75 font-normal">{cat.sub}</span>
                              </button>
                            );
                          })}
                        </div>
  
                      {/* Active Category Config Box */}
                      <CategoryWorkflowTabContent
                        catKey={selectedCategoryTab}
                        catConfig={categoryWorkflows[selectedCategoryTab]}
                        theme={theme}
                        onUpdateConfig={(newCatConfig) => {
                          setCategoryWorkflows(prev => ({
                            ...prev,
                            [selectedCategoryTab]: newCatConfig
                          }));
                        }}
                      />
                      <div className="flex justify-end pt-4">
                        <Button size="sm" onClick={handleSaveAttendanceConfig} disabled={attendanceSaving} className="h-8">
                          <Save className="w-3.5 h-3.5 mr-2" /> {attendanceSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
