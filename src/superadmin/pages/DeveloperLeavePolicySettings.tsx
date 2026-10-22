import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CalendarCheck2,
  Clock,
  Save,
  CheckCircle2,
  Users,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Calendar,
  Layers,
  HeartPulse,
  Briefcase
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import {
  getSuperAdminDeveloperLeavePolicy,
  updateSuperAdminDeveloperLeavePolicy
} from '../../utils/admin_api';
import Swal from 'sweetalert2';
import { toast } from 'sonner';

interface DeveloperLeavePolicyState {
  leave_policy_rules: {
    academic_year?: {
      start_month?: number;
    };
    casual_leave?: {
      is_enabled?: boolean;
      annual_quota?: number | string;
      max_stretch_days?: number | string;
      allow_half_day?: boolean;
      half_day_session?: 'afternoon_only' | 'forenoon_only' | 'both';
      forenoon_start_time?: string;
      forenoon_end_time?: string;
      afternoon_start_time?: string;
      afternoon_end_time?: string;
    };
    sick_leave?: {
      is_enabled?: boolean;
      annual_quota?: number | string;
      require_medical_proof?: boolean;
      max_stretch_days?: number | string;
    };
    earned_leave?: {
      is_enabled?: boolean;
      annual_quota?: number | string;
      jan_credit?: number | string;
      jul_credit?: number | string;
      min_stretch_days?: number | string;
      max_stretch_days?: number | string;
      accumulative?: boolean;
    };
    comp_off?: {
      is_enabled?: boolean;
      annual_quota?: number | string;
      validity_days?: number | string;
    };
    short_permission?: {
      is_enabled?: boolean;
      monthly_limit?: number | string;
      max_hours?: number | string;
    };
    restricted_holiday?: {
      is_enabled?: boolean;
      annual_quota?: number | string;
      monthly_limit?: number | string;
    };
    maternity_leave?: {
      is_enabled?: boolean;
      annual_quota?: number | string;
    };
  };
  leave_approval_routing?: Record<string, any>;
  total_standard_leaves?: number | string;
  monthly_short_permission_limit?: number | string;
  short_permission_max_hours?: number | string;
}

const defaultPolicyState: DeveloperLeavePolicyState = {
  leave_policy_rules: {
    academic_year: { start_month: 1 },
    casual_leave: {
      is_enabled: true,
      annual_quota: 15,
      max_stretch_days: 3,
      allow_half_day: true,
      half_day_session: 'both',
      forenoon_start_time: '09:30 AM',
      forenoon_end_time: '01:30 PM',
      afternoon_start_time: '01:30 PM',
      afternoon_end_time: '06:00 PM'
    },
    sick_leave: {
      is_enabled: true,
      annual_quota: 12,
      require_medical_proof: true,
      max_stretch_days: 5
    },
    earned_leave: {
      is_enabled: true,
      annual_quota: 15,
      jan_credit: 7,
      jul_credit: 8,
      min_stretch_days: 2,
      max_stretch_days: 5,
      accumulative: false
    },
    comp_off: {
      is_enabled: true,
      annual_quota: 5,
      validity_days: 60
    },
    short_permission: {
      is_enabled: true,
      monthly_limit: 3,
      max_hours: 2
    },
    restricted_holiday: {
      is_enabled: true,
      annual_quota: 2,
      monthly_limit: 1
    },
    maternity_leave: {
      is_enabled: true,
      annual_quota: 90
    }
  },
  leave_approval_routing: {
    developer: {
      require_alternate_duty: true,
      stages: ['standby', 'superadmin']
    }
  }
};

const hoursOptions = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const minutesOptions = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

const parseAnyTime12h = (
  timeStr: string | undefined | null,
  fallback: { hour: string; minute: string; period: string }
) => {
  if (!timeStr || typeof timeStr !== 'string') return fallback;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return fallback;
  let h = parseInt(match[1], 10);
  const m = match[2];
  let p = match[3] ? match[3].toUpperCase() : 'AM';
  if (h === 0) { h = 12; p = 'AM'; }
  else if (h > 12) { h = h - 12; p = 'PM'; }
  return {
    hour: h.toString().padStart(2, '0'),
    minute: m,
    period: p
  };
};

const DeveloperLeavePolicySettings: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [savingCard, setSavingCard] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState<boolean>(false);
  const [policy, setPolicy] = useState<DeveloperLeavePolicyState>(defaultPolicyState);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const fetchPolicy = async () => {
    try {
      setLoading(true);
      const res = await getSuperAdminDeveloperLeavePolicy();
      if (res && res.success) {
        setPolicy({
          leave_policy_rules: {
            ...defaultPolicyState.leave_policy_rules,
            ...(res.leave_policy_rules || {})
          },
          leave_approval_routing: res.leave_approval_routing || defaultPolicyState.leave_approval_routing,
          total_standard_leaves: res.total_standard_leaves,
          monthly_short_permission_limit: res.monthly_short_permission_limit,
          short_permission_max_hours: res.short_permission_max_hours,
        });
        if (res.updated_at) {
          setLastSaved(new Date(res.updated_at).toLocaleString());
        }
      }
    } catch (err) {
      console.error('Failed to load developer leave policy', err);
      toast.error('Failed to load developer leave policy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, []);

  const handleToggleCardEnabled = async (cardKey: string, cardTitle: string, isEnabled: boolean) => {
    const currentCardRules = policy.leave_policy_rules?.[cardKey as keyof typeof policy.leave_policy_rules] || {};
    const updatedCardRules = {
      ...currentCardRules,
      is_enabled: isEnabled
    };

    // 1. Immediately reflect in UI
    setPolicy(prev => ({
      ...prev,
      leave_policy_rules: {
        ...prev.leave_policy_rules,
        [cardKey]: updatedCardRules
      }
    }));

    // 2. Persist immediately to backend
    try {
      const payload: any = {
        leave_policy_rules: {
          [cardKey]: updatedCardRules
        }
      };

      const res = await updateSuperAdminDeveloperLeavePolicy(payload);
      if (res && res.success) {
        toast.success(`${cardTitle} ${isEnabled ? 'enabled' : 'disabled'} successfully!`);
        setLastSaved(new Date().toLocaleTimeString());
      } else {
        throw new Error(res?.message || 'Failed to update toggle state');
      }
    } catch (err: any) {
      // Revert state on failure
      setPolicy(prev => ({
        ...prev,
        leave_policy_rules: {
          ...prev.leave_policy_rules,
          [cardKey]: {
            ...currentCardRules,
            is_enabled: !isEnabled
          }
        }
      }));
      toast.error(err.message || `Failed to ${isEnabled ? 'enable' : 'disable'} ${cardTitle}`);
    }
  };

  const handleSaveIndividualCard = async (cardKey: string, cardTitle: string) => {
    try {
      setSavingCard(cardKey);
      const payload: any = {
        leave_policy_rules: {
          [cardKey]: policy.leave_policy_rules?.[cardKey as keyof typeof policy.leave_policy_rules]
        }
      };

      if (cardKey === 'casual_leave') {
        payload.total_standard_leaves = policy.leave_policy_rules?.casual_leave?.annual_quota;
      }
      if (cardKey === 'short_permission') {
        payload.monthly_short_permission_limit = policy.leave_policy_rules?.short_permission?.monthly_limit;
        payload.short_permission_max_hours = policy.leave_policy_rules?.short_permission?.max_hours;
      }

      const res = await updateSuperAdminDeveloperLeavePolicy(payload);
      if (res && res.success) {
        toast.success(`${cardTitle} policy saved successfully!`);
        setLastSaved(new Date().toLocaleTimeString());
      } else {
        throw new Error(res?.message || 'Failed to save');
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.message || 'Could not save policy changes.'
      });
    } finally {
      setSavingCard(null);
    }
  };

  const handleSaveRouting = async () => {
    try {
      setSavingCard('routing');
      const payload = {
        leave_approval_routing: policy.leave_approval_routing
      };
      const res = await updateSuperAdminDeveloperLeavePolicy(payload);
      if (res && res.success) {
        toast.success('Approval routing saved successfully!');
        setLastSaved(new Date().toLocaleTimeString());
      } else {
        throw new Error(res?.message || 'Failed to save');
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.message || 'Could not save approval routing.'
      });
    } finally {
      setSavingCard(null);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSavingAll(true);
      const payload = {
        leave_policy_rules: policy.leave_policy_rules,
        leave_approval_routing: policy.leave_approval_routing,
        total_standard_leaves: policy.leave_policy_rules?.casual_leave?.annual_quota,
        monthly_short_permission_limit: policy.leave_policy_rules?.short_permission?.monthly_limit,
        short_permission_max_hours: policy.leave_policy_rules?.short_permission?.max_hours,
      };

      const res = await updateSuperAdminDeveloperLeavePolicy(payload);
      if (res && res.success) {
        Swal.fire({
          icon: 'success',
          title: 'All Developer Leave Policies Saved!',
          text: 'Annual quotas, cycle parameters, and approval routing have been successfully updated across the platform.',
          confirmButtonColor: '#4f46e5'
        });
        setLastSaved(new Date().toLocaleTimeString());
      } else {
        throw new Error(res?.message || 'Failed to save');
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.message || 'Could not save policies.'
      });
    } finally {
      setSavingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading Developer Leave Policies...</p>
      </div>
    );
  }

  // Active Cycle calculations
  const startMonthVal = Number(policy.leave_policy_rules?.academic_year?.start_month ?? 1);
  const today = new Date();
  const curYear = today.getFullYear();
  const curMonth = today.getMonth() + 1;
  const cycleStartYear = curMonth >= startMonthVal ? curYear : curYear - 1;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startMonthName = months[startMonthVal - 1] || "Jan";
  const endMonthVal = startMonthVal === 1 ? 12 : startMonthVal - 1;
  const endMonthName = months[endMonthVal - 1] || "Dec";
  const cycleEndYear = startMonthVal === 1 ? cycleStartYear : cycleStartYear + 1;
  const lastDay = new Date(cycleEndYear, endMonthVal, 0).getDate();
  const cycleLabel = startMonthVal === 1 ? `${cycleStartYear}` : `${cycleStartYear} - ${cycleEndYear}`;
  const cyclePeriodStr = `${startMonthName} 01, ${cycleStartYear} to ${endMonthName} ${lastDay}, ${cycleEndYear}`;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Developer Leave Policy Configuration</h2>
              <p className="text-xs text-muted-foreground">
                Configure annual leave quotas, working cycle start month, stretch limits, half-day timings, and approval workflows.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-[11px] text-muted-foreground hidden md:inline">
              Last saved: {lastSaved}
            </span>
          )}
          <Button
            type="button"
            onClick={fetchPolicy}
            variant="outline"
            size="sm"
            className="h-9 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Reload
          </Button>
          <Button
            type="button"
            onClick={handleSaveAll}
            disabled={savingAll}
            size="sm"
            className="h-9 text-xs font-semibold bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {savingAll ? 'Saving All...' : 'Save All Policies'}
          </Button>
        </div>
      </div>

      {/* 1. Academic / Calendar Year Reset Banner Card */}
      <Card className={`border shadow-sm overflow-hidden ${theme === 'dark' ? 'bg-background/90 border-border' : 'bg-gradient-to-r from-indigo-50/80 via-white to-slate-50 border-indigo-100'}`}>
        <CardHeader className="p-4 pb-3 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
              <span className="w-8 h-8 shrink-0 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/20 mt-0.5 sm:mt-0">
                <Calendar className="w-4 h-4" />
              </span>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm font-semibold leading-snug">
                  Developer Annual Leave Cycle & Reset Configuration
                </CardTitle>
                <CardDescription className="text-xs leading-normal mt-0.5">
                  Configure the annual reset month and active 12-month cycle for all developer leave quotas (CL, SL, EL, Comp-Off).
                </CardDescription>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Active Cycle: {cycleLabel}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Start / Reset Month */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Annual Reset Month</Label>
              <Select
                value={String(startMonthVal)}
                onValueChange={(val) => {
                  const parsed = parseInt(val, 10);
                  setPolicy(prev => ({
                    ...prev,
                    leave_policy_rules: {
                      ...prev.leave_policy_rules,
                      academic_year: {
                        ...prev.leave_policy_rules?.academic_year,
                        start_month: parsed
                      }
                    }
                  }));
                }}
              >
                <SelectTrigger className={`h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}>
                  <SelectValue placeholder="Select Reset Month" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                  <SelectItem value="1">January 1 (Jan - Dec • Calendar Year)</SelectItem>
                  <SelectItem value="4">April 1 (Apr - Mar • Financial Year)</SelectItem>
                  <SelectItem value="6">June 1 (Jun - May • Academic Year)</SelectItem>
                  <SelectItem value="7">July 1 (Jul - Jun • Mid-Year Cycle)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">All annual developer balances automatically reset on this month.</p>
            </div>

            {/* Active Window Preview */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Current Active 12-Month Window</Label>
              <div className={`h-8 px-2.5 rounded-md border text-xs font-medium flex items-center justify-between ${theme === 'dark' ? 'bg-muted/20 border-border text-foreground' : 'bg-white border-slate-200 text-slate-800'}`}>
                <span className="truncate">{cyclePeriodStr}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold shrink-0 ml-1">12M</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Leave requests count strictly towards the cycle of their start date.</p>
            </div>

            {/* Reset status */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Enforcement Status</Label>
              <div className="h-8 px-2.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px] font-medium truncate">Annual quotas synchronized with Developer Portal.</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Developer leave balances reflect this active cycle window.</p>
            </div>
          </div>

          <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2 mt-2">
            <span className="text-[11px] text-muted-foreground">Save Annual Cycle Reset configuration</span>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSaveIndividualCard('academic_year', 'Annual Leave Cycle')}
              disabled={savingCard === 'academic_year'}
              className="h-7 px-3 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            >
              <Save className="w-3 h-3 mr-1.5" />
              {savingCard === 'academic_year' ? 'Saving...' : 'Save Cycle Policy'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid of Leave Policy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Casual Leave (CL) Policy Card */}
        <Card className={`border flex flex-col justify-between transition-all ${policy.leave_policy_rules?.casual_leave?.is_enabled === false ? (theme === 'dark' ? 'bg-muted/20 border-border/80 border-dashed' : 'bg-slate-100/60 border-gray-300 border-dashed') : (theme === 'dark' ? 'bg-background/80 border-border' : 'bg-slate-50/70 border-gray-200')}`}>
          <CardHeader className="p-4 pb-2 border-b border-border/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 shrink-0 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/20">
                  CL
                </span>
                <CardTitle className="text-sm font-semibold truncate">Casual Leave (CL) Policy</CardTitle>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[11px] font-semibold ${policy.leave_policy_rules?.casual_leave?.is_enabled !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 font-bold'}`}>
                  {policy.leave_policy_rules?.casual_leave?.is_enabled !== false ? 'Enabled' : 'Disabled'}
                </span>
                <Switch
                  checked={policy.leave_policy_rules?.casual_leave?.is_enabled !== false}
                  onCheckedChange={(val) => handleToggleCardEnabled('casual_leave', 'Casual Leave (CL)', val)}
                  className="scale-90"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Configure standard annual casual leaves, stretch limit, and half-day sessions.</p>
          </CardHeader>
          <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <div className={`space-y-3 ${policy.leave_policy_rules?.casual_leave?.is_enabled === false ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Annual Quota (Days)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={policy.leave_policy_rules?.casual_leave?.annual_quota ?? 15}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setPolicy(prev => ({
                        ...prev,
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
                    value={policy.leave_policy_rules?.casual_leave?.max_stretch_days ?? 3}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setPolicy(prev => ({
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

              {/* Half-Day Settings */}
              <div className="pt-2 border-t border-border/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-medium">Allow Half-Day Applications</Label>
                    <p className="text-[11px] text-muted-foreground">Permit developers to apply for 0.5 day sessions</p>
                  </div>
                  <Switch
                    checked={policy.leave_policy_rules?.casual_leave?.allow_half_day !== false}
                    onCheckedChange={(val) => {
                      setPolicy(prev => ({
                        ...prev,
                        leave_policy_rules: {
                          ...prev.leave_policy_rules,
                          casual_leave: { ...prev.leave_policy_rules?.casual_leave, allow_half_day: val }
                        }
                      }));
                    }}
                  />
                </div>

                {policy.leave_policy_rules?.casual_leave?.allow_half_day !== false && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Label className="text-xs text-muted-foreground">Half-Day Session Rule:</Label>
                    <Select
                      value={policy.leave_policy_rules?.casual_leave?.half_day_session || 'both'}
                      onValueChange={(val: any) => {
                        setPolicy(prev => ({
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
                        <SelectItem value="both">Both Morning & Afternoon</SelectItem>
                        <SelectItem value="afternoon_only">Afternoon Session Only</SelectItem>
                        <SelectItem value="forenoon_only">Morning Session Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">Individual Card Save</span>
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveIndividualCard('casual_leave', 'Casual Leave')}
                disabled={savingCard === 'casual_leave'}
                className="h-7 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Save className="w-3 h-3 mr-1.5" />
                {savingCard === 'casual_leave' ? 'Saving...' : 'Save CL Policy'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2. Sick / Medical Leave (SL) Policy Card */}
        <Card className={`border flex flex-col justify-between transition-all ${policy.leave_policy_rules?.sick_leave?.is_enabled === false ? (theme === 'dark' ? 'bg-muted/20 border-border/80 border-dashed' : 'bg-slate-100/60 border-gray-300 border-dashed') : (theme === 'dark' ? 'bg-background/80 border-border' : 'bg-slate-50/70 border-gray-200')}`}>
          <CardHeader className="p-4 pb-2 border-b border-border/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 shrink-0 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center border border-rose-500/20">
                  SL
                </span>
                <CardTitle className="text-sm font-semibold truncate">Sick / Medical Leave (SL)</CardTitle>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[11px] font-semibold ${policy.leave_policy_rules?.sick_leave?.is_enabled !== false ? 'text-rose-600 dark:text-rose-400' : 'text-rose-500 font-bold'}`}>
                  {policy.leave_policy_rules?.sick_leave?.is_enabled !== false ? 'Enabled' : 'Disabled'}
                </span>
                <Switch
                  checked={policy.leave_policy_rules?.sick_leave?.is_enabled !== false}
                  onCheckedChange={(val) => handleToggleCardEnabled('sick_leave', 'Sick Leave (SL)', val)}
                  className="scale-90"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Medical leaves for illness with optional doctor prescription attachment.</p>
          </CardHeader>
          <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <div className={`space-y-3 ${policy.leave_policy_rules?.sick_leave?.is_enabled === false ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Annual Quota (Days)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={policy.leave_policy_rules?.sick_leave?.annual_quota ?? 12}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setPolicy(prev => ({
                        ...prev,
                        leave_policy_rules: {
                          ...prev.leave_policy_rules,
                          sick_leave: { ...prev.leave_policy_rules?.sick_leave, annual_quota: clean }
                        }
                      }));
                    }}
                    placeholder="12"
                    className={`h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Max Stretch (Days)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={policy.leave_policy_rules?.sick_leave?.max_stretch_days ?? 5}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setPolicy(prev => ({
                        ...prev,
                        leave_policy_rules: {
                          ...prev.leave_policy_rules,
                          sick_leave: { ...prev.leave_policy_rules?.sick_leave, max_stretch_days: clean }
                        }
                      }));
                    }}
                    placeholder="5"
                    className={`h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                <div>
                  <Label className="text-xs font-medium">Require Medical Certificate</Label>
                  <p className="text-[11px] text-muted-foreground">Prompt developer to upload document proof</p>
                </div>
                <Switch
                  checked={policy.leave_policy_rules?.sick_leave?.require_medical_proof !== false}
                  onCheckedChange={(val) => {
                    setPolicy(prev => ({
                      ...prev,
                      leave_policy_rules: {
                        ...prev.leave_policy_rules,
                        sick_leave: { ...prev.leave_policy_rules?.sick_leave, require_medical_proof: val }
                      }
                    }));
                  }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">Individual Card Save</span>
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveIndividualCard('sick_leave', 'Sick Leave')}
                disabled={savingCard === 'sick_leave'}
                className="h-7 px-3 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
              >
                <Save className="w-3 h-3 mr-1.5" />
                {savingCard === 'sick_leave' ? 'Saving...' : 'Save SL Policy'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 3. Earned Leave (EL) Policy Card */}
        <Card className={`border flex flex-col justify-between transition-all ${policy.leave_policy_rules?.earned_leave?.is_enabled === false ? (theme === 'dark' ? 'bg-muted/20 border-border/80 border-dashed' : 'bg-slate-100/60 border-gray-300 border-dashed') : (theme === 'dark' ? 'bg-background/80 border-border' : 'bg-slate-50/70 border-gray-200')}`}>
          <CardHeader className="p-4 pb-2 border-b border-border/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 shrink-0 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-500/20">
                  EL
                </span>
                <CardTitle className="text-sm font-semibold truncate">Earned Leave (EL)</CardTitle>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[11px] font-semibold ${policy.leave_policy_rules?.earned_leave?.is_enabled !== false ? 'text-blue-600 dark:text-blue-400' : 'text-rose-500 font-bold'}`}>
                  {policy.leave_policy_rules?.earned_leave?.is_enabled !== false ? 'Enabled' : 'Disabled'}
                </span>
                <Switch
                  checked={policy.leave_policy_rules?.earned_leave?.is_enabled !== false}
                  onCheckedChange={(val) => handleToggleCardEnabled('earned_leave', 'Earned Leave (EL)', val)}
                  className="scale-90"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Earned leaves credited biannually with minimum and maximum stretch controls.</p>
          </CardHeader>
          <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <div className={`space-y-3 ${policy.leave_policy_rules?.earned_leave?.is_enabled === false ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Annual Quota</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={policy.leave_policy_rules?.earned_leave?.annual_quota ?? 15}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setPolicy(prev => ({
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
                  <Label className="text-[11px] font-semibold">Min Stretch</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={policy.leave_policy_rules?.earned_leave?.min_stretch_days ?? 2}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setPolicy(prev => ({
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
                  <Label className="text-[11px] font-semibold">Max Stretch</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={policy.leave_policy_rules?.earned_leave?.max_stretch_days ?? 5}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setPolicy(prev => ({
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
            </div>

            <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">Individual Card Save</span>
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveIndividualCard('earned_leave', 'Earned Leave')}
                disabled={savingCard === 'earned_leave'}
                className="h-7 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="w-3 h-3 mr-1.5" />
                {savingCard === 'earned_leave' ? 'Saving...' : 'Save EL Policy'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 4. Comp Off & Short Permission Combined Card */}
        <Card className={`border flex flex-col justify-between transition-all ${policy.leave_policy_rules?.comp_off?.is_enabled === false && policy.leave_policy_rules?.short_permission?.is_enabled === false ? (theme === 'dark' ? 'bg-muted/20 border-border/80 border-dashed' : 'bg-slate-100/60 border-gray-300 border-dashed') : (theme === 'dark' ? 'bg-background/80 border-border' : 'bg-slate-50/70 border-gray-200')}`}>
          <CardHeader className="p-4 pb-2 border-b border-border/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 shrink-0 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center border border-purple-500/20">
                  <Clock className="w-3.5 h-3.5" />
                </span>
                <CardTitle className="text-sm font-semibold truncate">Comp-Off & Short Permission</CardTitle>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                Hourly & Overtime
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Configure compensation leaves for weekend duty and monthly permission hours.</p>
          </CardHeader>
          <CardContent className="p-4 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Comp-Off Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">Compensatory Off (Comp-Off)</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold ${policy.leave_policy_rules?.comp_off?.is_enabled !== false ? 'text-purple-600 dark:text-purple-400' : 'text-rose-500 font-bold'}`}>
                      {policy.leave_policy_rules?.comp_off?.is_enabled !== false ? 'Enabled' : 'Disabled'}
                    </span>
                    <Switch
                      checked={policy.leave_policy_rules?.comp_off?.is_enabled !== false}
                      onCheckedChange={(val) => handleToggleCardEnabled('comp_off', 'Comp-Off', val)}
                      className="scale-90"
                    />
                  </div>
                </div>
                <div className={`grid grid-cols-2 gap-3 ${policy.leave_policy_rules?.comp_off?.is_enabled === false ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Comp Off Annual Quota</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={policy.leave_policy_rules?.comp_off?.annual_quota ?? 5}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/[^0-9]/g, '');
                        setPolicy(prev => ({
                          ...prev,
                          leave_policy_rules: {
                            ...prev.leave_policy_rules,
                            comp_off: { ...prev.leave_policy_rules?.comp_off, annual_quota: clean }
                          }
                        }));
                      }}
                      placeholder="5"
                      className={`h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Comp Off Validity (Days)</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={policy.leave_policy_rules?.comp_off?.validity_days ?? 60}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/[^0-9]/g, '');
                        setPolicy(prev => ({
                          ...prev,
                          leave_policy_rules: {
                            ...prev.leave_policy_rules,
                            comp_off: { ...prev.leave_policy_rules?.comp_off, validity_days: clean }
                          }
                        }));
                      }}
                      placeholder="60"
                      className={`h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}
                    />
                  </div>
                </div>
              </div>

              {/* Short Permission Section */}
              <div className="pt-3 border-t border-border/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">Short Permission (Hours)</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold ${policy.leave_policy_rules?.short_permission?.is_enabled !== false ? 'text-purple-600 dark:text-purple-400' : 'text-rose-500 font-bold'}`}>
                      {policy.leave_policy_rules?.short_permission?.is_enabled !== false ? 'Enabled' : 'Disabled'}
                    </span>
                    <Switch
                      checked={policy.leave_policy_rules?.short_permission?.is_enabled !== false}
                      onCheckedChange={(val) => handleToggleCardEnabled('short_permission', 'Short Permission', val)}
                      className="scale-90"
                    />
                  </div>
                </div>
                <div className={`grid grid-cols-2 gap-3 ${policy.leave_policy_rules?.short_permission?.is_enabled === false ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Short Permission Hours/Mo</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={policy.leave_policy_rules?.short_permission?.monthly_limit ?? 3}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/[^0-9]/g, '');
                        setPolicy(prev => ({
                          ...prev,
                          leave_policy_rules: {
                            ...prev.leave_policy_rules,
                            short_permission: { ...prev.leave_policy_rules?.short_permission, monthly_limit: clean }
                          }
                        }));
                      }}
                      placeholder="3"
                      className={`h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Max Hours Per Request</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={policy.leave_policy_rules?.short_permission?.max_hours ?? 2}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/[^0-9]/g, '');
                        setPolicy(prev => ({
                          ...prev,
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
              </div>
            </div>

            <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">Individual Card Save</span>
              <Button
                type="button"
                size="sm"
                onClick={async () => {
                  await handleSaveIndividualCard('comp_off', 'Comp Off');
                  await handleSaveIndividualCard('short_permission', 'Short Permission');
                }}
                disabled={savingCard === 'comp_off' || savingCard === 'short_permission'}
                className="h-7 px-3 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Save className="w-3 h-3 mr-1.5" />
                {savingCard === 'comp_off' || savingCard === 'short_permission' ? 'Saving...' : 'Save Comp & Hours'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 5. Restricted Holiday (RH) Policy Card */}
        <Card className={`border flex flex-col justify-between transition-all ${policy.leave_policy_rules?.restricted_holiday?.is_enabled === false ? (theme === 'dark' ? 'bg-muted/20 border-border/80 border-dashed' : 'bg-slate-100/60 border-gray-300 border-dashed') : (theme === 'dark' ? 'bg-background/80 border-border' : 'bg-slate-50/70 border-gray-200')}`}>
          <CardHeader className="p-4 pb-2 border-b border-border/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 shrink-0 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/20">
                  RH
                </span>
                <CardTitle className="text-sm font-semibold truncate">Restricted Holiday (RH)</CardTitle>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[11px] font-semibold ${policy.leave_policy_rules?.restricted_holiday?.is_enabled !== false ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500 font-bold'}`}>
                  {policy.leave_policy_rules?.restricted_holiday?.is_enabled !== false ? 'Enabled' : 'Disabled'}
                </span>
                <Switch
                  checked={policy.leave_policy_rules?.restricted_holiday?.is_enabled !== false}
                  onCheckedChange={(val) => handleToggleCardEnabled('restricted_holiday', 'Restricted Holiday', val)}
                  className="scale-90"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Optional holidays for religious and cultural observances.</p>
          </CardHeader>
          <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <div className={`space-y-3 ${policy.leave_policy_rules?.restricted_holiday?.is_enabled === false ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Annual Quota (Days)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={policy.leave_policy_rules?.restricted_holiday?.annual_quota ?? 2}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setPolicy(prev => ({
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
                    value={policy.leave_policy_rules?.restricted_holiday?.monthly_limit ?? 1}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setPolicy(prev => ({
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
            </div>

            <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">Individual Card Save</span>
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveIndividualCard('restricted_holiday', 'Restricted Holiday')}
                disabled={savingCard === 'restricted_holiday'}
                className="h-7 px-3 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Save className="w-3 h-3 mr-1.5" />
                {savingCard === 'restricted_holiday' ? 'Saving...' : 'Save RH Policy'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 6. Maternity Leave Policy Card */}
        <Card className={`border flex flex-col justify-between transition-all ${policy.leave_policy_rules?.maternity_leave?.is_enabled === false ? (theme === 'dark' ? 'bg-muted/20 border-border/80 border-dashed' : 'bg-slate-100/60 border-gray-300 border-dashed') : (theme === 'dark' ? 'bg-background/80 border-border' : 'bg-slate-50/70 border-gray-200')}`}>
          <CardHeader className="p-4 pb-2 border-b border-border/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 shrink-0 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-xs flex items-center justify-center border border-teal-500/20">
                  ML
                </span>
                <CardTitle className="text-sm font-semibold truncate">Maternity / Parental Leave</CardTitle>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[11px] font-semibold ${policy.leave_policy_rules?.maternity_leave?.is_enabled !== false ? 'text-teal-600 dark:text-teal-400' : 'text-rose-500 font-bold'}`}>
                  {policy.leave_policy_rules?.maternity_leave?.is_enabled !== false ? 'Enabled' : 'Disabled'}
                </span>
                <Switch
                  checked={policy.leave_policy_rules?.maternity_leave?.is_enabled !== false}
                  onCheckedChange={(val) => handleToggleCardEnabled('maternity_leave', 'Maternity Leave', val)}
                  className="scale-90"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Special long-duration maternity / parental care leave quota.</p>
          </CardHeader>
          <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <div className={`space-y-3 ${policy.leave_policy_rules?.maternity_leave?.is_enabled === false ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Annual Allocation (Days)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={policy.leave_policy_rules?.maternity_leave?.annual_quota ?? 90}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9]/g, '');
                    setPolicy(prev => ({
                      ...prev,
                      leave_policy_rules: {
                        ...prev.leave_policy_rules,
                        maternity_leave: { ...prev.leave_policy_rules?.maternity_leave, annual_quota: clean }
                      }
                    }));
                  }}
                  placeholder="90"
                  className={`h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">Individual Card Save</span>
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveIndividualCard('maternity_leave', 'Maternity Leave')}
                disabled={savingCard === 'maternity_leave'}
                className="h-7 px-3 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Save className="w-3 h-3 mr-1.5" />
                {savingCard === 'maternity_leave' ? 'Saving...' : 'Save ML Policy'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role-Based Approval Workflow Routing */}
      <Card className={`border shadow-sm ${theme === 'dark' ? 'bg-background/80 border-border' : 'bg-slate-50/70 border-gray-200'}`}>
        <CardHeader className="p-4 pb-2 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Developer Leave Approval Routing</CardTitle>
                <CardDescription className="text-xs">
                  Configure the sequence of approvals required before a developer leave is marked APPROVED.
                </CardDescription>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
              2-Stage Workflow
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className={`p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-slate-200'}`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <span className="text-xs font-semibold">Stage 1: Standby / Substitute Developer Acceptance</span>
              </div>
              <p className="text-[11px] text-muted-foreground ml-7">
                When nominated, the colleague developer must accept duty handover before the request reaches SuperAdmin.
              </p>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Switch
                checked={policy.leave_approval_routing?.developer?.require_alternate_duty !== false}
                onCheckedChange={(val) => {
                  setPolicy(prev => ({
                    ...prev,
                    leave_approval_routing: {
                      ...prev.leave_approval_routing,
                      developer: {
                        ...prev.leave_approval_routing?.developer,
                        require_alternate_duty: val
                      }
                    }
                  }));
                }}
              />
              <span className="text-xs font-medium">
                {policy.leave_approval_routing?.developer?.require_alternate_duty !== false ? 'Required' : 'Optional'}
              </span>
            </div>
          </div>

          <div className={`p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-slate-200'}`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <span className="text-xs font-semibold">Stage 2: HQ SuperAdmin Final Approval</span>
              </div>
              <p className="text-[11px] text-muted-foreground ml-7">
                SuperAdmin reviews reasons, documents, and developer leave quota balances to approve or reject.
              </p>
            </div>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 font-mono">
              Final Authority
            </span>
          </div>

          <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">Save Developer Approval Routing workflow</span>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveRouting}
              disabled={savingCard === 'routing'}
              className="h-7 px-3 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Save className="w-3 h-3 mr-1.5" />
              {savingCard === 'routing' ? 'Saving...' : 'Save Approval Routing'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeveloperLeavePolicySettings;
