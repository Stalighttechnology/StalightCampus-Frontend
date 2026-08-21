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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">#1</div>
                <div>
                  <Label className="text-sm font-semibold">First Half Check-In Window</Label>
                  <p className="text-xs text-muted-foreground">Morning check-in timeframe</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-medium">Start:</span>
                <Input
                  type="time"
                  value={currentConfig.half_day_split?.first_half_in?.start || "09:00"}
                  onChange={(e) => updateWindow('half_day_split', 'first_half_in', 'start', e.target.value)}
                  className={cn("h-8 w-28 px-2 text-xs", theme === 'dark' && 'bg-background border-border text-foreground')}
                />
                <span className="text-muted-foreground font-medium ml-2">End:</span>
                <Input
                  type="time"
                  value={currentConfig.half_day_split?.first_half_in?.end || "09:30"}
                  onChange={(e) => updateWindow('half_day_split', 'first_half_in', 'end', e.target.value)}
                  className={cn("h-8 w-28 px-2 text-xs", theme === 'dark' && 'bg-background border-border text-foreground')}
                />
              </div>
            </div>
          </div>

          {/* 1st Half Out */}
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-card/70 border-border/80' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">#2</div>
                <div>
                  <Label className="text-sm font-semibold">First Half Check-Out Window</Label>
                  <p className="text-xs text-muted-foreground">Lunch / mid-day departure window</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-medium">Start:</span>
                <Input
                  type="time"
                  value={currentConfig.half_day_split?.first_half_out?.start || "12:30"}
                  onChange={(e) => updateWindow('half_day_split', 'first_half_out', 'start', e.target.value)}
                  className={cn("h-8 w-28 px-2 text-xs", theme === 'dark' && 'bg-background border-border text-foreground')}
                />
                <span className="text-muted-foreground font-medium ml-2">End:</span>
                <Input
                  type="time"
                  value={currentConfig.half_day_split?.first_half_out?.end || "13:00"}
                  onChange={(e) => updateWindow('half_day_split', 'first_half_out', 'end', e.target.value)}
                  className={cn("h-8 w-28 px-2 text-xs", theme === 'dark' && 'bg-background border-border text-foreground')}
                />
              </div>
            </div>
          </div>

          <div className="text-xs font-bold text-primary uppercase tracking-wider pt-2">Session 2 (Second Half)</div>

          {/* 2nd Half In */}
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-card/70 border-border/80' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">#3</div>
                <div>
                  <Label className="text-sm font-semibold">Second Half Check-In Window</Label>
                  <p className="text-xs text-muted-foreground">Post-lunch check-in timeframe</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-medium">Start:</span>
                <Input
                  type="time"
                  value={currentConfig.half_day_split?.second_half_in?.start || "13:30"}
                  onChange={(e) => updateWindow('half_day_split', 'second_half_in', 'start', e.target.value)}
                  className={cn("h-8 w-28 px-2 text-xs", theme === 'dark' && 'bg-background border-border text-foreground')}
                />
                <span className="text-muted-foreground font-medium ml-2">End:</span>
                <Input
                  type="time"
                  value={currentConfig.half_day_split?.second_half_in?.end || "14:00"}
                  onChange={(e) => updateWindow('half_day_split', 'second_half_in', 'end', e.target.value)}
                  className={cn("h-8 w-28 px-2 text-xs", theme === 'dark' && 'bg-background border-border text-foreground')}
                />
              </div>
            </div>
          </div>

          {/* 2nd Half Out */}
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-card/70 border-border/80' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">#4</div>
                <div>
                  <Label className="text-sm font-semibold">Second Half Check-Out Window</Label>
                  <p className="text-xs text-muted-foreground">Evening final departure window</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-medium">Start:</span>
                <Input
                  type="time"
                  value={currentConfig.half_day_split?.second_half_out?.start || "17:00"}
                  onChange={(e) => updateWindow('half_day_split', 'second_half_out', 'start', e.target.value)}
                  className={cn("h-8 w-28 px-2 text-xs", theme === 'dark' && 'bg-background border-border text-foreground')}
                />
                <span className="text-muted-foreground font-medium ml-2">End:</span>
                <Input
                  type="time"
                  value={currentConfig.half_day_split?.second_half_out?.end || "17:30"}
                  onChange={(e) => updateWindow('half_day_split', 'second_half_out', 'end', e.target.value)}
                  className={cn("h-8 w-28 px-2 text-xs", theme === 'dark' && 'bg-background border-border text-foreground')}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Day Mode Controls */}
      {mode === 'full_day' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-card/70 border-border/80' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">#1</div>
                <div>
                  <Label className="text-sm font-semibold">Full Day Check-In Window</Label>
                  <p className="text-xs text-muted-foreground">Morning arrival check-in timeframe</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-medium">Start:</span>
                <Input
                  type="time"
                  value={currentConfig.full_day?.check_in?.start || "09:00"}
                  onChange={(e) => updateWindow('full_day', 'check_in', 'start', e.target.value)}
                  className={cn("h-8 w-28 px-2 text-xs", theme === 'dark' && 'bg-background border-border text-foreground')}
                />
                <span className="text-muted-foreground font-medium ml-2">End:</span>
                <Input
                  type="time"
                  value={currentConfig.full_day?.check_in?.end || "09:30"}
                  onChange={(e) => updateWindow('full_day', 'check_in', 'end', e.target.value)}
                  className={cn("h-8 w-28 px-2 text-xs", theme === 'dark' && 'bg-background border-border text-foreground')}
                />
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-card/70 border-border/80' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">#2</div>
                <div>
                  <Label className="text-sm font-semibold">Full Day Check-Out Window</Label>
                  <p className="text-xs text-muted-foreground">Evening departure check-out timeframe</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-medium">Start:</span>
                <Input
                  type="time"
                  value={currentConfig.full_day?.check_out?.start || "17:00"}
                  onChange={(e) => updateWindow('full_day', 'check_out', 'start', e.target.value)}
                  className={cn("h-8 w-28 px-2 text-xs", theme === 'dark' && 'bg-background border-border text-foreground')}
                />
                <span className="text-muted-foreground font-medium ml-2">End:</span>
                <Input
                  type="time"
                  value={currentConfig.full_day?.check_out?.end || "17:30"}
                  onChange={(e) => updateWindow('full_day', 'check_out', 'end', e.target.value)}
                  className={cn("h-8 w-28 px-2 text-xs", theme === 'dark' && 'bg-background border-border text-foreground')}
                />
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
    leave_approval_routing: Record<string, string>;
  }>({
    monthly_short_permission_limit: 2,
    total_standard_leaves: 12,
    short_permission_max_hours: 2,
    leave_approval_routing: {
      teacher: 'hod',
      hod: 'principal',
      principal: 'dean',
      coe: 'dean',
      fees_manager: 'dean',
      driver: 'transport_admin',
      warden: 'hms_admin'
    } as Record<string, string>
  });

  const [periodicCheckinCount, setPeriodicCheckinCount] = useState<number>(1);
  const [checkinWindows, setCheckinWindows] = useState<{ start: string, end: string }[]>([]);
  const [strictCheckinWindow, setStrictCheckinWindow] = useState<boolean>(true);
  const [allowWebAttendance, setAllowWebAttendance] = useState<boolean>(true);
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
        setLeavePolicy({
          monthly_short_permission_limit: data.monthly_short_permission_limit ?? 2,
          total_standard_leaves: data.total_standard_leaves ?? 12,
          short_permission_max_hours: data.short_permission_max_hours ?? 2,
          leave_approval_routing: data.leave_approval_routing || {
            teacher: 'hod',
            hod: 'principal',
            principal: 'dean',
            coe: 'dean',
            fees_manager: 'dean',
            driver: 'transport_admin',
            warden: 'hms_admin'
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
      const payload = {
        ...leavePolicy,
        monthly_short_permission_limit: leavePolicy.monthly_short_permission_limit === '' ? 2 : Number(leavePolicy.monthly_short_permission_limit),
        total_standard_leaves: leavePolicy.total_standard_leaves === '' ? 12 : Number(leavePolicy.total_standard_leaves),
        short_permission_max_hours: leavePolicy.short_permission_max_hours === '' ? 2 : Number(leavePolicy.short_permission_max_hours)
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
            <div className={`p-1.5 rounded-2xl flex flex-col sm:flex-row w-full gap-1.5 ${theme === 'dark' ? 'bg-muted/40 border border-border/60' : 'bg-slate-100/90 border border-slate-200/80'}`}>
              <button
                type="button"
                className={`w-full sm:flex-1 py-2.5 px-4 font-semibold text-xs sm:text-sm rounded-xl transition-all duration-200 flex items-center justify-center sm:justify-center gap-2 ${
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
                className={`w-full sm:flex-1 py-2.5 px-4 font-semibold text-xs sm:text-sm rounded-xl transition-all duration-200 flex items-center justify-center sm:justify-center gap-2 ${
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
                className={`w-full sm:flex-1 py-2.5 px-4 font-semibold text-xs sm:text-sm rounded-xl transition-all duration-200 flex items-center justify-center sm:justify-center gap-2 ${
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
                className={`w-full sm:flex-1 py-2.5 px-4 font-semibold text-xs sm:text-sm rounded-xl transition-all duration-200 flex items-center justify-center sm:justify-center gap-2 ${
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
                  <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
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
                    {/* Quota Settings Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className={`border ${theme === 'dark' ? 'bg-background border-border' : 'bg-slate-50/50 border-gray-100'}`}>
                        <CardContent className="p-4 space-y-2">
                          <Label className="text-sm font-semibold">Short Permissions / Month</Label>
                          <p className="text-xs text-muted-foreground">Max short period permission requests per faculty each month.</p>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={leavePolicy.monthly_short_permission_limit}
                            onChange={(e) => {
                              const clean = e.target.value.replace(/[^0-9]/g, '');
                              setLeavePolicy({ ...leavePolicy, monthly_short_permission_limit: clean });
                            }}
                            placeholder="e.g. 2"
                            className={`mt-2 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}
                          />
                        </CardContent>
                      </Card>

                      <Card className={`border ${theme === 'dark' ? 'bg-background border-border' : 'bg-slate-50/50 border-gray-100'}`}>
                        <CardContent className="p-4 space-y-2">
                          <Label className="text-sm font-semibold">Total Standard Leaves</Label>
                          <p className="text-xs text-muted-foreground">Standard leaves limit allowed per faculty per year.</p>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={leavePolicy.total_standard_leaves}
                            onChange={(e) => {
                              const clean = e.target.value.replace(/[^0-9]/g, '');
                              setLeavePolicy({ ...leavePolicy, total_standard_leaves: clean });
                            }}
                            placeholder="e.g. 12"
                            className={`mt-2 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}
                          />
                        </CardContent>
                      </Card>

                      <Card className={`border ${theme === 'dark' ? 'bg-background border-border' : 'bg-slate-50/50 border-gray-100'}`}>
                        <CardContent className="p-4 space-y-2">
                          <Label className="text-sm font-semibold">Max Duration (Hours)</Label>
                          <p className="text-xs text-muted-foreground">Maximum duration allowed for a single short permission.</p>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={leavePolicy.short_permission_max_hours}
                            onChange={(e) => {
                              const clean = e.target.value.replace(/[^0-9]/g, '');
                              setLeavePolicy({ ...leavePolicy, short_permission_max_hours: clean });
                            }}
                            placeholder="e.g. 2"
                            className={`mt-2 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}
                          />
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
                          { roleKey: 'teacher', label: 'Faculty / Teacher Leaves', defaultApprover: 'hod' },
                          { roleKey: 'hod', label: 'Head of Department (HOD) Leaves', defaultApprover: 'principal' },
                          { roleKey: 'dean', label: 'Dean Leaves', defaultApprover: 'principal' },
                          { roleKey: 'coe', label: 'COE Leaves', defaultApprover: 'dean' },
                          { roleKey: 'fees_manager', label: 'Fees Manager Leaves', defaultApprover: 'dean' },
                          { roleKey: 'counsellor', label: 'Counsellor Leaves', defaultApprover: 'principal' },
                          { roleKey: 'hms_admin', label: 'HMS Admin Leaves', defaultApprover: 'principal' },
                          { roleKey: 'warden', label: 'Hostel Warden Leaves', defaultApprover: 'hms_admin' },
                          { roleKey: 'caretaker', label: 'Hostel Caretaker Leaves', defaultApprover: 'hms_admin' },
                          { roleKey: 'transport_admin', label: 'Transport Admin Leaves', defaultApprover: 'principal' },
                          { roleKey: 'driver', label: 'Driver Leaves', defaultApprover: 'transport_admin' },
                          { roleKey: 'library_admin', label: 'Library Admin Leaves', defaultApprover: 'principal' },
                          { roleKey: 'placement_officer', label: 'Placement Officer Leaves', defaultApprover: 'principal' },
                          { roleKey: 'admission_manager', label: 'Admission Manager Leaves', defaultApprover: 'principal' }
                        ].map((item) => (
                          <div key={item.roleKey} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{item.label}</span>
                              <p className="text-xs text-muted-foreground">Requests will be forwarded to the selected approver</p>
                            </div>
                            <div className="w-full sm:w-60">
                              <Select
                                value={leavePolicy.leave_approval_routing?.[item.roleKey] || item.defaultApprover}
                                onValueChange={(val) => {
                                  setLeavePolicy({
                                    ...leavePolicy,
                                    leave_approval_routing: {
                                      ...(leavePolicy.leave_approval_routing || {}),
                                      [item.roleKey]: val
                                    }
                                  });
                                }}
                              >
                                <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}>
                                  <SelectValue placeholder="Select approver" />
                                </SelectTrigger>
                                <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                                  <SelectItem value="hod">Head of Department (HOD)</SelectItem>
                                  <SelectItem value="principal">Principal</SelectItem>
                                  <SelectItem value="dean">Dean</SelectItem>
                                  <SelectItem value="transport_admin">Transport Admin</SelectItem>
                                  <SelectItem value="hms_admin">HMS Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
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
                  <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
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
                      <div className="flex flex-wrap gap-2">
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
                  <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
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
                      
                      {/* Staff Category Tabs */}
                      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
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
