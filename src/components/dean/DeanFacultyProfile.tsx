import { useEffect, useState, useCallback } from "react";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { Calendar as CalendarIcon, Sliders, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "../ui/dialog";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonStatsGrid, SkeletonTable, SkeletonPageHeader, SkeletonCard, SkeletonList } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";

// Types for this component
interface Branch {
  readonly id?: number;
  readonly branch_id?: number;
  readonly branch?: string;
  readonly name?: string;
}

interface Faculty {
  readonly id: number;
  readonly name: string;
  readonly email?: string;
}

interface Assignment {
  readonly subject?: string;
  readonly branch?: string;
  readonly semester?: string | number;
  readonly section?: string | number;
}

interface ScheduledClass {
  readonly id: number;
  readonly day?: string;
  readonly start_time?: string;
  readonly end_time?: string;
  readonly subject?: string;
  readonly section?: string;
  readonly duration_hours?: number;
}

interface AttendanceSummary {
  readonly present_days?: number;
  readonly absent_days?: number;
  readonly percent_present?: number | string;
  readonly leave_days?: number;
  readonly unmarked_days?: number;
}

interface Profile {
  readonly email?: string;
  readonly total_weekly_hours?: number;
  readonly attendance_summary?: AttendanceSummary;
  readonly assignments?: Assignment[];
  readonly scheduled_classes?: ScheduledClass[];
}

interface DeanFacultyProfileProps {
  readonly facultyId?: string;
  readonly initialStartDate?: string;
  readonly initialEndDate?: string;
}

// Helper: safe error message extractor
const safeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error occurred';
  }
};

// Custom hook: Load branches
const useBranches = (setError: (err: string | null) => void) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/dean/reports/branches/`);
        const json = await res.json();
        if (!mounted) return;
        if (json.success) setBranches(json.data || []);
        else setError(json.message || 'Failed to load branches');
      } catch (e: unknown) {
        const msg = safeErrorMessage(e);
        setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [setError]);

  return { branches, loading };
};

// Custom hook: Load faculties by branch
const useFacultiesByBranch = (selectedBranch: string | null, setError: (err: string | null) => void) => {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadFaculties = async () => {
      if (!selectedBranch) {
        setFaculties([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/dean/reports/faculties/?branch_id=${selectedBranch}`);
        const json = await res.json();
        if (!mounted) return;
        if (json.success) setFaculties(json.data || []);
        else setError(json.message || 'Failed to load faculties');
      } catch (e: unknown) {
        const msg = safeErrorMessage(e);
        setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadFaculties();
    return () => { mounted = false; };
  }, [selectedBranch, setError]);

  return { faculties, loading };
};

// Custom hook: Load faculty profile
const useFacultyProfile = (facultyId: string | null, startDate: string, endDate: string, reloadKey: number, setError: (err: string | null) => void) => {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      if (!facultyId) {
        setProfile(null);
        return;
      }
      setError(null);
      try {
        let url = `${API_ENDPOINT}/dean/faculty/${facultyId}/profile/`;
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (params.toString()) url += `?${params.toString()}`;

        const res = await fetchWithTokenRefresh(url);
        const json = await res.json();
        if (!mounted) return;
        if (json.success) setProfile(json.data || json.profile || null);
        else setError(json.message || 'Failed to load profile');
      } catch (e: unknown) {
        const msg = safeErrorMessage(e);
        setError(msg);
      }
    };
    loadProfile();
    return () => { mounted = false; };
  }, [facultyId, startDate, endDate, reloadKey, setError]);

  return { profile };
};

// Custom hook: Initialize dates
const useInitialDates = (initialStartDate?: string, initialEndDate?: string) => {
  const [startDate, setStartDate] = useState<string>(initialStartDate || '');
  const [endDate, setEndDate] = useState<string>(initialEndDate || '');

  useEffect(() => {
    if (!initialStartDate && !initialEndDate) {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    }
  }, [initialStartDate, initialEndDate]);

  useEffect(() => {
    if (initialStartDate !== undefined) setStartDate(initialStartDate || '');
  }, [initialStartDate]);

  useEffect(() => {
    if (initialEndDate !== undefined) setEndDate(initialEndDate || '');
  }, [initialEndDate]);

  return { startDate, setStartDate, endDate, setEndDate };
};

// Dean view: load branches -> faculties -> selected faculty profile (attendance, scheduled classes, weekly hours)
const DeanFacultyProfile = ({ facultyId: initialFacultyId, initialStartDate, initialEndDate }: DeanFacultyProfileProps) => {
  const [error, setError] = useState<string | null>(null);
  const { branches, loading: branchesLoading } = useBranches(setError);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const { faculties, loading: facultiesLoading } = useFacultiesByBranch(selectedBranch, setError);
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(initialFacultyId || null);
  const { startDate, setStartDate, endDate, setEndDate } = useInitialDates(initialStartDate, initialEndDate);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [startDatePopoverOpen, setStartDatePopoverOpen] = useState(false);
  const [endDatePopoverOpen, setEndDatePopoverOpen] = useState(false);
  const { theme } = useTheme();
  const { profile } = useFacultyProfile(selectedFaculty, startDate, endDate, reloadKey, setError);

  // Update when parent passes new initial props
  useEffect(() => {
    if (initialFacultyId) setSelectedFaculty(initialFacultyId);
  }, [initialFacultyId]);

  const handleDateFilter = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  const handleClearDates = useCallback(() => {
    setStartDate('');
    setEndDate('');
    setReloadKey((k) => k + 1);
  }, [setStartDate, setEndDate]);

  const isInitialLoading = branchesLoading || (selectedBranch && facultiesLoading) || (selectedFaculty && !profile);

  return (
    <div className={`dean-profile min-h-screen ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'} p-0`}>
      <style>{`
        @media (min-width: 481px) and (max-width: 768px) {
          .dean-profile .filters-row { display: flex !important; flex-direction: row !important; align-items: flex-end !important; gap: 1rem !important; }
          .dean-profile .filters-row .flex-1 { flex: 1 1 0% !important; min-width: 0 !important; }
          .dean-profile .filters-row .flex-shrink-0 { align-self: flex-end !important; margin-top: 0 !important; }
        }
        @media (max-width: 480px) {
          .dean-profile .filters-row { gap: 12px !important; display: flex !important; flex-direction: column !important; align-items: stretch !important; }
          .dean-profile .filters-row .flex-1 { width: 100% !important; min-width: 0 !important; }
          .dean-profile .filters-row .flex-shrink-0 { width: 100% !important; margin-top: 0.25rem !important; display: flex !important; justify-content: flex-end !important; }

          .dean-profile h1 { font-size: 28px !important; line-height: 1.4 !important; }
          .dean-profile h2 { font-size: 22px !important; line-height: 1.45 !important; }
          .dean-profile h3 { font-size: 18px !important; line-height: 1.5 !important; }
          .dean-profile, .dean-profile p, .dean-profile label, .dean-profile input, .dean-profile button { font-size: 14px !important; }

          .dean-profile .card, .dean-profile .card-content { padding-left: 12px !important; padding-right: 12px !important; }

          .dean-profile .button-group, .dean-profile .flex-row { flex-direction: column !important; gap: 8px !important; }
          .dean-profile button, .dean-profile .btn { width: 100% !important; max-width: 320px !important; padding: 10px 16px !important; min-height: 40px !important; }

          .dean-profile img, .dean-profile .responsive-img { max-width: 100% !important; height: auto !important; }

          .dean-profile table, .dean-profile .table-responsive { width: 100% !important; display: block !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }

          .dean-profile .modal, .dean-profile .popup, .dean-profile .dialog, .dean-profile .swal2-popup, .dean-profile [role="dialog"] {
            width: 90vw !important; max-width: 340px !important; padding: 20px !important; border-radius: 12px !important; left: 50% !important; top: 50% !important; transform: translate(-50%, -50%) !important; box-sizing: border-box !important; max-height: 90vh !important; overflow: auto !important;
          }

          /* Target the dialog rendered in the portal from this component */
          .dean-filters-dialog {
            width: 90vw !important;
            max-width: 320px !important;
            padding: 16px !important;
            border-radius: 12px !important;
            box-shadow: 0 8px 30px rgba(0,0,0,0.12) !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
          }

          .dean-profile .modal-header, .dean-profile .dialog-header, .dean-profile .swal2-title { font-size: 20px !important; margin-bottom: 12px !important; }
          .dean-profile .modal-body, .dean-profile .dialog-body, .dean-profile .swal2-html-container { font-size: 14px !important; line-height: 1.5 !important; }
          .dean-profile .modal-footer, .dean-profile .dialog-footer, .dean-profile .swal2-actions { margin-top: 16px !important; display: flex !important; gap: 8px !important; flex-direction: column !important; }
          .dean-profile .modal-button, .dean-profile .swal2-confirm, .dean-profile .swal2-cancel { width: 100% !important; padding: 10px 16px !important; min-height: 40px !important; }
        }
      `}</style>
      <Card className={theme === 'dark' ? 'w-full bg-card border border-border shadow-md' : 'w-full bg-white border border-gray-200 shadow-md'}>
        <CardHeader className="flex flex-col items-start gap-2 px-6 pt-6 pb-4">
          {isInitialLoading ? (
            <SkeletonPageHeader />
          ) : (
            <div className="flex w-full justify-between items-center">
              <div>
                <CardTitle className={`text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Faculty Profile</CardTitle>
                <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>View faculty attendance, schedule and assignments</p>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-2 space-y-6">
          {isInitialLoading ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SkeletonCard className="h-20" />
                <SkeletonCard className="h-20" />
                <SkeletonCard className="h-20" />
              </div>
              <SkeletonStatsGrid items={6} />
              <SkeletonList items={3} />
              <SkeletonTable rows={5} cols={5} />
            </div>
          ) : error ? (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="filters-row flex flex-col lg:flex-row gap-6 items-start lg:items-end mb-6">
                <div className="flex-1">
                  <Label className={`text-sm mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Branch</Label>
                  <Select value={selectedBranch || ''} onValueChange={(val) => setSelectedBranch(val || null)}>
                    <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}>
                      <SelectValue placeholder="Select a branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b: Branch) => (
                        <SelectItem key={(b.branch_id ?? b.id) ?? ''} value={String((b.branch_id ?? b.id) ?? '')}>
                          {b.branch || b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <Label className={`text-sm mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Faculty</Label>
                  <Select value={selectedFaculty || ''} onValueChange={(val) => setSelectedFaculty(val || null)}>
                    <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`} disabled={!selectedBranch || facultiesLoading}>
                      <SelectValue placeholder="Select a faculty member" />
                    </SelectTrigger>
                    <SelectContent>
                      {faculties.map((f: Faculty) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-shrink-0 flex items-end mt-2 lg:mt-0">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex items-center gap-2 px-4 h-10"
                        disabled={!selectedBranch || !selectedFaculty || facultiesLoading}
                        title={!selectedBranch || !selectedFaculty ? 'Select branch and faculty to enable filters' : undefined}
                      >
                        Filters
                        <Sliders className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className={`${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} dean-filters-dialog`}>
                      <DialogHeader>
                        <DialogTitle>Attendance Report Filters</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <DatePickerField
                          label="Start Date"
                          date={startDate}
                          onDateChange={setStartDate}
                          popoverOpen={startDatePopoverOpen}
                          onPopoverChange={setStartDatePopoverOpen}
                          theme={theme}
                        />
                        <DatePickerField
                          label="End Date"
                          date={endDate}
                          onDateChange={setEndDate}
                          popoverOpen={endDatePopoverOpen}
                          onPopoverChange={setEndDatePopoverOpen}
                          theme={theme}
                        />
                        <div className="flex justify-end gap-2">
                          <DialogClose asChild>
                            <Button onClick={handleClearDates} className={`px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors`}>Clear</Button>
                          </DialogClose>
                          <DialogClose asChild>
                            <Button onClick={handleDateFilter} className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors`}>Apply</Button>
                          </DialogClose>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {profile ? (
                <div>
                  {/* Stats Cards */}
                  <div className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
                      <StatsCard label="Weekly Hours" value={profile.total_weekly_hours ?? 0} color="blue" theme={theme} />
                      <StatsCard label="Present Days" value={profile.attendance_summary?.present_days ?? 0} color="green" theme={theme} />
                      <StatsCard label="Absent Days" value={profile.attendance_summary?.absent_days ?? 0} color="red" theme={theme} />
                      <StatsCard label="Attendance %" value={profile.attendance_summary?.percent_present ?? 'N/A'} color="purple" theme={theme} />
                      <StatsCard label="Leave Days" value={profile.attendance_summary?.leave_days ?? 0} color="yellow" theme={theme} />
                      <StatsCard label="Unmarked Days" value={profile.attendance_summary?.unmarked_days ?? 0} color="amber" theme={theme} />
                    </div>

                    {/* Assignments */}
                    <div className="mb-8">
                      <h3 className={`text-xl font-semibold mb-4 flex items-center ${theme === 'dark' ? 'text-foreground' : 'text-gray-800'}`}>
                        <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Subject Assignments
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <AssignmentsList assignments={profile.assignments ?? []} theme={theme} />
                      </div>
                    </div>

                    {/* Scheduled Classes */}
                    <div>
                      <h3 className={`text-xl font-semibold mb-4 flex items-center ${theme === 'dark' ? 'text-foreground' : 'text-gray-800'}`}>
                        <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Weekly Schedule
                      </h3>
                      <ScheduledClassesTable classesList={profile.scheduled_classes ?? []} theme={theme} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`p-8 text-center border-2 border-dashed rounded-xl ${theme === 'dark' ? 'border-border text-muted-foreground' : 'border-gray-200 text-gray-500'}`}>
                  Select a faculty member to view their profile.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Subcomponent: Stats Card
interface StatsCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly color: 'blue' | 'green' | 'red' | 'purple' | 'yellow' | 'amber';
  readonly theme: string;
}

function StatsCard({ label, value, color, theme }: StatsCardProps) {
  const colorMap: Record<string, { gradient: string; border: string; label: string; value: string; darkGradient: string; darkBorder: string; darkLabel: string; darkValue: string }> = {
    blue: { gradient: 'from-blue-50 to-blue-100', border: 'border-blue-200', label: 'text-blue-600', value: 'text-blue-900', darkGradient: 'from-blue-900/20 to-blue-800/20', darkBorder: 'border-blue-800/30', darkLabel: 'text-blue-400', darkValue: 'text-blue-100' },
    green: { gradient: 'from-green-50 to-green-100', border: 'border-green-200', label: 'text-green-600', value: 'text-green-900', darkGradient: 'from-green-900/20 to-green-800/20', darkBorder: 'border-green-800/30', darkLabel: 'text-green-400', darkValue: 'text-green-100' },
    red: { gradient: 'from-red-50 to-red-100', border: 'border-red-200', label: 'text-red-600', value: 'text-red-900', darkGradient: 'from-red-900/20 to-red-800/20', darkBorder: 'border-red-800/30', darkLabel: 'text-red-400', darkValue: 'text-red-100' },
    purple: { gradient: 'from-purple-50 to-purple-100', border: 'border-purple-200', label: 'text-purple-600', value: 'text-purple-900', darkGradient: 'from-purple-900/20 to-purple-800/20', darkBorder: 'border-purple-800/30', darkLabel: 'text-purple-400', darkValue: 'text-purple-100' },
    yellow: { gradient: 'from-yellow-50 to-yellow-100', border: 'border-yellow-200', label: 'text-yellow-600', value: 'text-yellow-900', darkGradient: 'from-yellow-900/20 to-yellow-800/20', darkBorder: 'border-yellow-800/30', darkLabel: 'text-yellow-400', darkValue: 'text-yellow-100' },
    amber: { gradient: 'from-amber-50 to-amber-100', border: 'border-amber-200', label: 'text-amber-600', value: 'text-amber-900', darkGradient: 'from-amber-900/20 to-amber-800/20', darkBorder: 'border-amber-800/30', darkLabel: 'text-amber-400', darkValue: 'text-amber-100' },
  };

  const cfg = colorMap[color] ?? colorMap.blue;

  return (
    <div className={`bg-gradient-to-br ${theme === 'dark' ? cfg.darkGradient : cfg.gradient} p-6 rounded-xl border ${theme === 'dark' ? cfg.darkBorder : cfg.border}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${theme === 'dark' ? cfg.darkLabel : cfg.label}`}>{label}</p>
          <p className={`text-3xl font-bold ${theme === 'dark' ? cfg.darkValue : cfg.value}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

// Subcomponent: Date Picker Field
interface DatePickerFieldProps {
  readonly label: string;
  readonly date: string;
  readonly onDateChange: (date: string) => void;
  readonly popoverOpen: boolean;
  readonly onPopoverChange: (open: boolean) => void;
  readonly theme: string;
}

function DatePickerField({ label, date, onDateChange, popoverOpen, onPopoverChange, theme }: DatePickerFieldProps) {
  return (
    <div>
      <Label className={`text-sm mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>{label}</Label>
      <Popover open={popoverOpen} onOpenChange={onPopoverChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
              theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(new Date(date), "MMM dd, yyyy") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className={`w-auto p-0 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}>
          <CalendarComponent
            mode="single"
            selected={date ? new Date(date) : undefined}
            onSelect={(selectedDate) => {
              if (selectedDate) {
                const dateStr = format(selectedDate, "yyyy-MM-dd");
                onDateChange(dateStr);
                onPopoverChange(false);
              }
            }}
            disabled={(d) => d > new Date()}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Subcomponent: Assignments List
interface AssignmentsListProps {
  readonly assignments: readonly Assignment[];
  readonly theme: string;
}

function AssignmentsList({ assignments, theme }: AssignmentsListProps) {
  if (!assignments || assignments.length === 0) {
    return (
      <div className={`col-span-full text-center py-8 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        No assignments found
      </div>
    );
  }

  return (
    <>
      {assignments.map((a, idx) => {
        const key = a.subject ? `${a.subject}-${a.branch ?? ''}-${a.section ?? ''}` : `assignment-${idx}`;
        return (
          <div key={key} className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${theme === 'dark' ? 'bg-muted/50 border-border' : 'bg-gray-50 border-gray-200'}`}>
            <div className={`font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-800'}`}>{a.subject}</div>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>{a.branch}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'}`}>Semester {a.semester}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-800'}`}>Section {a.section}</span>
            </div>
          </div>
        );
      })}
    </>
  );
}

// Subcomponent: Scheduled Classes Table
interface ScheduledClassesTableProps {
  readonly classesList: readonly ScheduledClass[];
  readonly theme: string;
}

function ScheduledClassesTable({ classesList, theme }: ScheduledClassesTableProps) {
  if (!classesList || classesList.length === 0) {
    return (
      <div className={`text-center py-8 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        No scheduled classes found
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto border rounded-lg ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
      <table className="w-full">
        <thead className={theme === 'dark' ? 'bg-muted/50' : 'bg-gray-50'}>
          <tr>
            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Day</th>
            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Time</th>
            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Subject</th>
            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Section</th>
            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Hours</th>
          </tr>
        </thead>
        <tbody className={`divide-y ${theme === 'dark' ? 'divide-border' : 'divide-gray-200'}`}>
          {classesList.map((s) => (
            <tr key={s.id} className={`hover:${theme === 'dark' ? 'bg-muted/50' : 'bg-gray-50'} transition-colors`}>
              <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>{s.day}</span></td>
              <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{s.start_time} - {s.end_time}</td>
              <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{s.subject}</td>
              <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'}`}>{s.section}</span></td>
              <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{s.duration_hours} hrs</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DeanFacultyProfile;