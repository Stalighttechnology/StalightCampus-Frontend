import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from
  "@/components/ui/dialog";
import {
  Download,
  Calendar as CalendarIcon,
  Users,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  CalendarX,
  Edit2,
  Save,
  X,
  Clock
} from
  'lucide-react';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getStaffAttendanceAudit, getStaffDetailedAttendance, updateStaffAttendanceRecord, STAFF_ROLES } from '../../utils/fees_manager_api';
import { useTheme } from '@/context/ThemeContext';
import { PLAN_TIERS } from '../../utils/planGating';
import { translateTerminology, getInstitutionType } from '../../utils/institutionConfig';
import Swal from 'sweetalert2';
import {
  Skeleton,
  SkeletonStatsGrid,
  SkeletonTable,
  SkeletonList,
  SkeletonPageHeader,
  SkeletonCard
} from
  '@/components/ui/skeleton';
import { DateTimePicker } from '@/components/ui/datetime-picker';


interface AttendanceSummary {
  id: number;
  name: string;
  role: string;
  branch_dept: string;
  total_days: number;
  present: number;
  absent: number;
  on_leave?: number;
  total_delay_minutes?: number;
  total_missed?: number;
  total_hours?: string;
  attendance_percentage: number;
}

const Reports: React.FC<{ isReadOnly?: boolean }> = ({ isReadOnly = false }) => {
  const [attendanceData, setAttendanceData] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const todayDateStr = new Date().toLocaleDateString('sv-SE');
  const [startDate, setStartDate] = useState(todayDateStr);
  const [endDate, setEndDate] = useState(todayDateStr);
  const [isStartPopoverOpen, setIsStartPopoverOpen] = useState(false);
  const [isEndPopoverOpen, setIsEndPopoverOpen] = useState(false);

  const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const orgPlan = user?.org_plan || "basic";
  const userTier = PLAN_TIERS[orgPlan.toLowerCase()] || 1;

  const filteredRoles = STAFF_ROLES
    .filter(r => getInstitutionType() !== 'school' || r.value !== 'placement_officer')
    .map(r => ({
      ...r,
      label: translateTerminology(r.label)
    }));

  // Calendar Detailed View
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<AttendanceSummary | null>(null);
  const [detailedAttendance, setDetailedAttendance] = useState<any[]>([]);
  const [holidayDates, setHolidayDates] = useState<string[]>([]);
  const [leaveDates, setLeaveDates] = useState<string[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<Record<string, string>>({});
  const [selectedStaffJoinDate, setSelectedStaffJoinDate] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedDateDetailsStr, setSelectedDateDetailsStr] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Edit Record Mode
  const [isEditingRecord, setIsEditingRecord] = useState(false);
  const [editPayload, setEditPayload] = useState<any>({});
  const [isSavingRecord, setIsSavingRecord] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedRole && startDate && endDate) {
      fetchAttendanceAudit();
    } else {
      setAttendanceData([]);
      setLoading(false);
    }
  }, [selectedRole, startDate, endDate, currentPage, debouncedSearchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRole, startDate, endDate, debouncedSearchQuery]);

  const fetchAttendanceAudit = async () => {
    if (!selectedRole || !startDate || !endDate) return;
    try {
      setLoading(true);
      setError(null);
      const response = await getStaffAttendanceAudit(selectedRole, startDate, endDate, currentPage, undefined, debouncedSearchQuery);

      if (response.success) {
        setAttendanceData(response.results.attendance_summary || []);
        setTotalItems(response.count || 0);
        setTotalPages(Math.ceil((response.count || 0) / 10));
      } else {
        setError(response.message || 'Failed to fetch attendance data');
      }
    } catch (err) {
      setError('An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = () => {
    setCurrentPage(1);
    fetchAttendanceAudit();
  };

  const downloadReport = async (format: 'excel') => {
    try {
      setDownloading(true);
      setLoading(true);
      const response = await getStaffAttendanceAudit(selectedRole, startDate, endDate, 1, format);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Staff_Attendance_${startDate}_to_${endDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError(`Failed to download Excel report`);
      }
    } catch (err) {
      setError(`Error downloading Excel report`);
    } finally {
      setDownloading(false);
      setLoading(false);
    }
  };

  const handleViewAttendance = async (staff: AttendanceSummary) => {
    setSelectedStaff(staff);
    setIsCalendarDialogOpen(true);
    setLoadingDetails(true);
    try {
      const response = await getStaffDetailedAttendance(staff.id, startDate, endDate);
      if (response.success) {
        setDetailedAttendance(response.results);
        setHolidayDates(response.holidays || []);
        setLeaveDates((response as any).leave_dates || []);
        setLeaveTypes((response as any).leave_types || {});
        setSelectedStaffJoinDate((response as any).date_joined || null);
      }
    } catch (error) {

    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedStaff || !selectedDateDetailsStr) return;
    try {
      setIsSavingRecord(true);
      const response = await updateStaffAttendanceRecord(selectedStaff.id, selectedDateDetailsStr, editPayload);
      if (response.success) {
        setIsEditingRecord(false);
        // Refresh detail view data
        const refreshResponse = await getStaffDetailedAttendance(selectedStaff.id, startDate, endDate);
        if (refreshResponse.success) {
          setDetailedAttendance(refreshResponse.results);
          setHolidayDates(refreshResponse.holidays || []);
          setLeaveDates((refreshResponse as any).leave_dates || []);
          setLeaveTypes((refreshResponse as any).leave_types || {});
        }
        // Refresh main list
        fetchAttendanceAudit();
        
        // Delay Swal to allow Radix dialog to animate out cleanly without stutter
        setTimeout(() => {
          Swal.fire({ title: 'Success!', text: 'Record updated successfully.', icon: 'success', confirmButtonColor: '#10b981' });
        }, 300);
      } else {
        Swal.fire({ title: 'Error', text: response.message || 'Failed to update record', icon: 'error', confirmButtonColor: '#ef4444' });
      }
    } catch (err) {
      Swal.fire({ title: 'Error', text: 'An unexpected error occurred', icon: 'error', confirmButtonColor: '#ef4444' });
    } finally {
      setIsSavingRecord(false);
    }
  };

  const { theme } = useTheme();

  const getDatesInRange = (start: string, end: string) => {
    if (!start || !end) return [];
    const dates = [];
    // Force local midnight to avoid timezone shifts
    let current = new Date(start + 'T00:00:00');
    const stop = new Date(end + 'T00:00:00');
    while (current <= stop) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  return (
    <div id="feesmanager-reports-container" className="space-y-6 animate-in fade-in duration-500">
      {error &&
        <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-medium">{error}</AlertDescription>
        </Alert>
      }

      <Card>
        <div id="feesmanager-reports-header">
          <CardHeader className="border-b border-border/50 flex flex-row items-start sm:items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-xl sm:text-xl md:text-2xl font-semibold text-gray-900">Staff Attendance Audit</CardTitle>
              <CardDescription className="text-sm sm:text-sm text-muted-foreground mt-1">
                Monitor attendance across all institutional roles
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 mt-1">
              {/* Desktop/Tablet Export Button */}
              <Button
                size="sm"
                onClick={() => downloadReport('excel')}
                disabled={loading || downloading || selectedRole === '' || startDate === '' || endDate === ''}
                className="hidden sm:flex justify-center bg-primary text-white hover:bg-primary/90 transition-all shadow-md text-sm font-medium px-4 py-2 rounded-md items-center gap-2 h-9 disabled:opacity-50">
                {downloading ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin flex-shrink-0" />
                ) : (
                  <Download className="h-4 w-4 flex-shrink-0" />
                )}
                <span>{downloading ? 'Exporting...' : 'Export Excel'}</span>
              </Button>
              {/* Mobile Export Icon Button */}
              <Button
                onClick={() => downloadReport('excel')}
                disabled={loading || downloading || selectedRole === '' || startDate === '' || endDate === ''}
                size="icon"
                variant="outline"
                className="flex sm:hidden h-10 w-10 items-center justify-center shrink-0 border border-input bg-background"
                title="Export Excel"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 pb-4">
            {/* Filters Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-muted/10 p-2 rounded-2xl border border-border/50">
              <div className="space-y-2">
                <Label className="sm:text-[13px] text-[15px] font-semibold uppercase tracking-[0.1em] ml-1">Role Type <span className="text-red-500">*</span></Label>
                <Select value={selectedRole} onValueChange={(val) => {
                  const isFirstSelection = selectedRole === '';
                  setSelectedRole(val);
                  if (isFirstSelection) {
                    setTimeout(() => setIsStartPopoverOpen(true), 100);
                  }
                }}>
                  <SelectTrigger className="bg-background rounded-xl border-border/50 h-11">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl">
                    {filteredRoles.map((role) =>
                      <SelectItem key={role.value} value={role.value} className="rounded-lg">
                        {role.label}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="sm:text-[13px] text-[15px] font-semibold uppercase tracking-[0.1em] ml-1">Start Date <span className="text-red-500">*</span></Label>
                <Popover open={isStartPopoverOpen} onOpenChange={setIsStartPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background rounded-xl border-border/50 h-11",
                        !startDate && "text-muted-foreground"
                      )}>

                      <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                      {startDate ? format(new Date(startDate), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-none" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate ? new Date(startDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setStartDate(date.toLocaleDateString('sv-SE'));
                          setIsStartPopoverOpen(false);
                          setTimeout(() => setIsEndPopoverOpen(true), 100);
                        }
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(23, 59, 59, 999);
                        if (date > today) return true;
                        if (endDate) {
                          const end = new Date(endDate + 'T00:00:00');
                          return date > end;
                        }
                        return false;
                      }}
                      initialFocus
                      className="rounded-2xl" />

                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="sm:text-[13px] text-[15px] font-semibold uppercase tracking-[0.1em] ml-1">End Date <span className="text-red-500">*</span></Label>
                <Popover open={isEndPopoverOpen} onOpenChange={setIsEndPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background rounded-xl border-border/50 h-11",
                        !endDate && "text-muted-foreground"
                      )}>

                      <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                      {endDate ? format(new Date(endDate), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-none" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate ? new Date(endDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setEndDate(date.toLocaleDateString('sv-SE'));
                          setIsEndPopoverOpen(false);
                        }
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(23, 59, 59, 999);
                        if (date > today) return true;
                        if (startDate) {
                          const start = new Date(startDate + 'T00:00:00');
                          return date < start;
                        }
                        return false;
                      }}
                      initialFocus
                      className="rounded-2xl" />

                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="sm:text-[13px] text-[15px] font-semibold uppercase tracking-[0.1em] ml-1">Search Staff</Label>
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background rounded-xl border-border/50 h-11"
                />
              </div>
            </div>
          </CardContent>
        </div>

        <CardContent className="p-6 pt-4">
          {/* Table Section */}
          <div className="rounded-xl border border-border/50 overflow-x-auto bg-card/30 backdrop-blur-md custom-scrollbar">
            <Table>
              <TableHeader className="bg-muted/40 whitespace-nowrap">
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="px-6 py-4 text-sm sm:text-[14px] font-semibold uppercase tracking-wider">Staff Name</TableHead>
                  <TableHead className="px-6 py-4 text-sm sm:text-[14px] font-semibold uppercase tracking-wider">Role</TableHead>
                  <TableHead className="px-6 py-4 text-sm sm:text-[14px] font-semibold uppercase tracking-wider">{translateTerminology("Department")}</TableHead>
                  <TableHead className="px-6 py-4 text-center text-sm sm:text-[14px] font-semibold uppercase tracking-wider">Total Days</TableHead>
                  <TableHead className="px-6 py-4 text-center text-sm sm:text-[14px] font-semibold uppercase tracking-wider text-green-600">Present</TableHead>
                  <TableHead className="px-6 py-4 text-center text-sm sm:text-[14px] font-semibold uppercase tracking-wider text-red-600">Absent</TableHead>
                  <TableHead className="px-6 py-4 text-center text-sm sm:text-[14px] font-semibold uppercase tracking-wider text-purple-600">On Leave</TableHead>
                  <TableHead className="px-6 py-4 text-center text-sm sm:text-[14px] font-semibold uppercase tracking-wider">Percentage</TableHead>
                  <TableHead className="px-6 py-4 text-center text-sm sm:text-[14px] font-semibold uppercase tracking-wider text-orange-600">Delay (m)</TableHead>
                  <TableHead className="px-6 py-4 text-center text-sm sm:text-[14px] font-semibold uppercase tracking-wider text-red-600">Missed</TableHead>
                  <TableHead className="px-6 py-4 text-center text-sm sm:text-[14px] font-semibold uppercase tracking-wider text-blue-600">Hours</TableHead>
                  <TableHead className="px-6 py-4 text-right pr-6 text-sm sm:text-[14px] font-semibold uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ?
                  <TableRow>
                    <TableCell colSpan={12} className="p-0">
                      <SkeletonTable rows={10} cols={12} />
                    </TableCell>
                  </TableRow> :
                  attendanceData.length > 0 ?

                    attendanceData.map((item) =>
                      <TableRow key={item.id} className="hover:bg-primary/5 transition-all duration-200 border-b border-border/50">
                        <TableCell className="py-5 px-6 font-semibold text-sm sm:text-base text-foreground">{item.name}</TableCell>
                        <TableCell className="px-6">
                          <Badge variant="outline" className="bg-muted/30 text-[10px] font-semibold uppercase tracking-widest border-border/50 px-2 py-0.5 rounded-md whitespace-nowrap">
                            {translateTerminology(item.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 text-sm text-muted-foreground font-medium">{item.branch_dept}</TableCell>
                        <TableCell className="text-center font-mono font-semibold text-sm">{item.total_days}</TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 font-semibold text-sm">
                            {item.present}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 font-semibold text-sm">
                            {item.absent}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 font-semibold text-sm">
                            {item.on_leave != null ? item.on_leave : 0}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{item.attendance_percentage}%</div>
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-1000",
                                  item.attendance_percentage >= 75 ? "bg-green-500" :
                                    item.attendance_percentage >= 50 ? "bg-yellow-500" : "bg-red-500"
                                )}
                                style={{ width: `${item.attendance_percentage}%` }} />

                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm text-orange-600">
                          {item.total_delay_minutes || 0}
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm text-red-600">
                          {item.total_missed || 0}
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm text-blue-600 font-semibold">
                          {item.total_hours || '00:00'}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
                            title="View Full Report"
                            onClick={() => handleViewAttendance(item)}>

                            <Eye className="h-4.5 w-4.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ) :
                    !selectedRole || !startDate || !endDate ?
                      <TableRow>
                        <TableCell colSpan={12} className="h-72 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3 opacity-60">
                            <div className="bg-primary/10 p-4 rounded-full">
                              <Filter className="h-8 w-8 text-primary" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-semibold uppercase tracking-widest">Filters Required</p>
                              <p className="text-xs text-muted-foreground">Please select a Role and Date Range to generate the audit report</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow> :

                      <TableRow>
                        <TableCell colSpan={12} className="h-72 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3 opacity-60">
                            <div className="bg-muted p-4 rounded-full">
                              <Users className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-semibold uppercase tracking-widest">No Records Found</p>
                              <p className="text-xs text-muted-foreground">Try adjusting your filters or date range</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                }
              </TableBody>
            </Table>

          </div>
        </CardContent>
        {/* Pagination Footer */}
        {totalPages > 1 && (
          <CardFooter className={`flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto`}>
            <div className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Showing Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 px-4 h-9 shadow-sm shadow-primary/10"
                onClick={() => {
                  if (currentPage > 1) {
                    setCurrentPage((prev) => prev - 1);
                  }
                }}
                disabled={currentPage === 1 || loading}
              >
                Previous
              </Button>

              <div className={`min-w-10 h-9 flex items-center justify-center rounded-md border text-sm font-bold ${theme === 'dark' ? 'bg-muted/50 border-border text-foreground' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                {currentPage}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 px-4 h-9 shadow-sm shadow-primary/10"
                onClick={() => {
                  if (currentPage < totalPages) {
                    setCurrentPage((prev) => prev + 1);
                  }
                }}
                disabled={currentPage === totalPages || loading}
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      <Dialog open={isCalendarDialogOpen} onOpenChange={setIsCalendarDialogOpen}>
        <DialogContent className="w-[92%] sm:max-w-md max-h-[90vh] sm:max-h-[600px] h-auto bg-card rounded-2xl border-none shadow-2xl p-0 overflow-hidden mx-auto flex flex-col">
          <DialogHeader className="p-5 sm:p-6 bg-muted/20 border-b shrink-0 text-left">
            <DialogTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Attendance History
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm font-medium mt-1 truncate">
              Visual audit for <span className="text-foreground font-semibold">{selectedStaff?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 sm:p-6 pt-4 space-y-4 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
            {loadingDetails ? (
              <div className="space-y-4 flex-1 justify-center flex flex-col">
                <Skeleton className="h-[200px] sm:h-[250px] w-full rounded-2xl" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-14 sm:h-16 rounded-xl" />
                  <Skeleton className="h-14 sm:h-16 rounded-xl" />
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-border/50 p-3 sm:p-4 bg-muted/5 max-h-[240px] sm:max-h-[280px] overflow-y-auto custom-scrollbar shrink-0">
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 sm:gap-3">
                    {getDatesInRange(startDate, endDate)
                      .filter((date) => {
                        const dateStr = format(date, "yyyy-MM-dd");
                        return selectedStaffJoinDate ? dateStr >= selectedStaffJoinDate : true;
                      })
                      .map((date, idx) => {
                        const dateStr = format(date, "yyyy-MM-dd");
                        const record = detailedAttendance.find((r) => {
                          const rDate = typeof r.date === 'string' ? r.date : format(new Date(r.date), "yyyy-MM-dd");
                          return rDate === dateStr;
                        });

                        const isSunday = date.getDay() === 0;
                        const isHoliday = holidayDates.includes(dateStr);
                        const isNonWorkingDay = isSunday || isHoliday;

                        const isOnLeave = leaveDates.includes(dateStr) || record?.status === 'on_leave';
                        const isPresent = record?.status === 'present';
                        const isAbsent = !isNonWorkingDay && !isOnLeave && (record?.status === 'absent' || (!record && !isPresent));

                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedDateDetailsStr(dateStr)}
                            title={isOnLeave ? (leaveTypes[dateStr] ? `On Leave (${leaveTypes[dateStr]})` : 'On Leave') : isPresent ? 'Present' : isAbsent ? 'Absent' : isHoliday ? 'Holiday' : isSunday ? 'Sunday' : 'Not Marked'}
                            className={cn(
                              "flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 hover:scale-105",
                              isOnLeave ? "bg-purple-500/10 border-purple-500/30 text-purple-700 shadow-purple-500/5 hover:border-purple-500" :
                                isPresent ? "bg-green-500/10 border-green-500/30 text-green-700 shadow-green-500/5 hover:border-green-500" :
                                  isAbsent ? "bg-red-500/10 border-red-500/30 text-red-700 shadow-red-500/5 hover:border-red-500" :
                                    isNonWorkingDay ? "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 text-slate-400" :
                                      "bg-muted/30 border-border/50 text-muted-foreground opacity-30 hover:border-primary/20"
                            )}
                          >
                            <span className={cn(
                              "text-[9px] sm:text-[10px] font-semibold uppercase tracking-tighter opacity-70 detail-day-weekday",
                              (isPresent || isAbsent || isOnLeave || isNonWorkingDay) && "opacity-100"
                            )}>
                              {format(date, "EEE")}
                            </span>
                            <span className="text-xs sm:text-sm font-semibold leading-tight mt-0.5">
                              {format(date, "d")}
                            </span>
                            <div className={cn(
                              "w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full mt-1 detail-status-badge",
                              isOnLeave ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]" : isPresent ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : isAbsent ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" : isNonWorkingDay ? "bg-slate-300 dark:bg-slate-600" : "bg-muted-foreground/30"
                            )} />
                          </button>
                        );
                      })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 shrink-0">
                  <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-green-500/10 border border-green-500/20">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-green-700/70 truncate">Present Days</span>
                      <span className="text-base sm:text-lg font-semibold text-green-700 leading-none mt-0.5">{selectedStaff?.present}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-red-500/10 border border-red-500/20">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-red-700/70 truncate">Absent Days</span>
                      <span className="text-base sm:text-lg font-semibold text-red-700 leading-none mt-0.5">{selectedStaff?.absent}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Button
              className="w-full h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-primary text-white hover:bg-primary/90 transition-all font-semibold uppercase text-[11px] sm:text-[12px] tracking-widest shadow-lg shadow-primary/20 active:scale-[0.98] shrink-0"
              onClick={() => setIsCalendarDialogOpen(false)}
            >
              Close History
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Secondary Dialog for Date Details in Reports */}
      {selectedDateDetailsStr && (() => {
        const dateObj = new Date(selectedDateDetailsStr);
        const dateStr = selectedDateDetailsStr;
        const record = detailedAttendance.find((r) => {
          const rDate = typeof r.date === 'string' ? r.date : format(new Date(r.date), "yyyy-MM-dd");
          return rDate === dateStr;
        });
        
        const todayStr = new Date().toLocaleDateString('sv-SE');
        const isFuture = dateStr > todayStr;
        const isSunday = dateObj.getDay() === 0;
        const isHoliday = holidayDates.includes(dateStr);
        const isNonWorkingDay = isSunday || isHoliday;
        const isPresent = record?.status === 'present';
        const isOnLeave = leaveDates.includes(dateStr) || record?.status === 'on_leave';
        
        // Use document.documentElement.classList to check theme safely in Reports
        const isDark = document.documentElement.classList.contains('dark');

        return (
          <Dialog open={!!selectedDateDetailsStr} onOpenChange={(open) => {
            if (!open) {
              setSelectedDateDetailsStr(null);
              setIsEditingRecord(false);
            }
          }}>
            <DialogContent className={`w-[90%] max-w-[360px] p-0 border-0 rounded-2xl overflow-hidden shadow-2xl ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}`}>
              <div className={`p-4 ${isDark ? 'bg-slate-800' : 'bg-primary/5'} border-b flex justify-between items-center ${isDark ? 'border-white/10' : 'border-primary/10'}`}>
                <div>
                  <DialogTitle className="text-lg font-bold">
                    {dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </DialogTitle>
                  <div className={`mt-1 font-medium text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {isEditingRecord ? 'Edit Attendance Record' : 'Attendance Record Details'}
                  </div>
                </div>
                {!isEditingRecord && (
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditPayload({
                      status: record?.status && record.status !== 'not_marked' 
                        ? record.status 
                        : (isOnLeave ? 'on_leave' : 'present'),
                      notes: record?.notes || '',
                      checkin_timestamps: record?.checkin_timestamps || []
                    });
                    setIsEditingRecord(true);
                  }} className="h-8 gap-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Button>
                )}
              </div>

              <div className="p-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {isEditingRecord ? (
                  <div className="space-y-4">
                    {record?.is_frozen && (
                      <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-semibold flex gap-2">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        This record is frozen for payroll and cannot be saved.
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select 
                        value={editPayload.status || 'present'} 
                        onValueChange={(val) => setEditPayload({...editPayload, status: val})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="on_leave">On Leave</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes (Optional)</Label>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                        placeholder="Reason for edit..."
                        value={editPayload.notes || ''}
                        onChange={(e) => setEditPayload({...editPayload, notes: e.target.value})}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>Check-in/out Timestamps</Label>
                      {editPayload.checkin_timestamps && editPayload.checkin_timestamps.length > 0 ? (
                        editPayload.checkin_timestamps.map((ts: any, idx: number) => {
                          const label = editPayload.checkin_timestamps.length === 4 
                            ? (idx === 0 ? '1st Half In' : idx === 1 ? '1st Half Out' : idx === 2 ? '2nd Half In' : '2nd Half Out')
                            : (idx === 0 ? 'Check In' : 'Check Out');
                            
                          const valStr = ts && ts !== "Missed" ? ts.substring(0, 16) : "";

                          return (
                            <div key={idx} className="flex flex-col gap-1">
                              <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                              <div className="flex items-center gap-2">
                                <DateTimePicker 
                                  value={ts && ts !== "Missed" ? new Date(ts) : undefined}
                                  onChange={(date) => {
                                    const newTs = [...editPayload.checkin_timestamps];
                                    newTs[idx] = date ? date.toISOString() : "Missed";
                                    setEditPayload({...editPayload, checkin_timestamps: newTs});
                                  }}
                                />
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  title="Mark as Missed"
                                  onClick={() => {
                                    const newTs = [...editPayload.checkin_timestamps];
                                    newTs[idx] = "Missed";
                                    setEditPayload({...editPayload, checkin_timestamps: newTs});
                                  }}
                                >
                                  <X className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-sm text-muted-foreground italic bg-muted/50 p-3 rounded-lg border border-dashed border-border text-center">
                          {isOnLeave || editPayload.status === 'on_leave' ? (
                            "This day is recorded as an approved leave. Editing this to 'Present' or 'Absent' will override the leave status."
                          ) : (
                            "Record was auto-marked absent and has no checkpoint structure. Adding multi-punch timestamps here is not supported for a completely missed day yet. Just mark as Present/Absent."
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t mt-4">
                      <Button variant="outline" className="w-full" onClick={() => setIsEditingRecord(false)}>Cancel</Button>
                      <Button className="w-full" onClick={handleSaveEdit} disabled={isSavingRecord || record?.is_frozen}>
                        {isSavingRecord ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {record && (
                      <div className="space-y-4">
                        <div className={`${isPresent ? 'text-green-500 bg-green-500/10' : (record.status === 'on_leave' ? 'text-purple-500 bg-purple-500/10' : 'text-red-500 bg-red-500/10')} p-3 rounded-xl font-bold flex items-center gap-2 text-base`}>
                          {isPresent ? <CheckCircle className="w-5 h-5" /> : (record.status === 'on_leave' ? <CalendarIcon className="w-5 h-5" /> : <XCircle className="w-5 h-5" />)} 
                          {record.status === 'not_marked' ? 'Not Marked' : (record.status === 'on_leave' ? (leaveTypes[dateStr] ? `On Leave (${leaveTypes[dateStr]})` : 'On Leave') : record.status.charAt(0).toUpperCase() + record.status.slice(1))}
                        </div>
                        
                        {record.checkin_timestamps && record.checkin_timestamps.length > 0 ? (
                          <div className={`space-y-2 p-4 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                            {record.checkin_timestamps.map((ts: any, idx: number) => (
                              <div key={idx} className={`flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0 ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                                <span className="font-semibold text-gray-500">
                                  {record.checkin_timestamps.length === 4
                                    ? (idx === 0 ? '1st Half In' : idx === 1 ? '1st Half Out' : idx === 2 ? '2nd Half In' : '2nd Half Out')
                                    : (idx === 0 ? 'Check In' : 'Check Out')}
                                </span>
                                <div className="flex items-center gap-2">
                                  {ts === "Missed" ? (
                                    <span className="text-red-500 font-bold">Missed</span>
                                  ) : ts ? (
                                    <>
                                      <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                      </span>
                                      {record.delays && record.delays[idx] > 0 && (
                                        <span className="text-xs text-orange-500 font-black bg-orange-500/20 px-2 py-0.5 rounded shadow-sm">
                                          +{record.delays[idx]}m
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-gray-400 italic font-medium">Pending</span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {record.check_out_time && (
                              <div className={`flex items-center justify-between font-bold pt-2 border-t mt-2 ${isDark ? 'border-white/10' : 'border-gray-300'}`}>
                                <span className="text-gray-500">Check Out</span> 
                                <span className={`${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {new Date(record.check_out_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (record.check_in_time || record.check_out_time) && (
                          <div className={`space-y-2 p-4 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                            {record.check_in_time && (
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-gray-500">Check In</span> 
                                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {new Date(record.check_in_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                </span>
                              </div>
                            )}
                            {record.check_out_time && (
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-gray-500">Check Out</span> 
                                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {new Date(record.check_out_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {record.total_hours && (
                          <div className="flex items-center justify-between font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-4 py-3 rounded-xl border border-blue-500/20">
                            <span>Total Worked</span>
                            <span>{record.total_hours}</span>
                          </div>
                        )}

                        {record.notes?.includes('[Off-Campus Check-in]') && (
                          <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 font-semibold leading-relaxed">
                            <span className="block text-xs uppercase tracking-wider font-black mb-1 opacity-70">Off-Campus Duty</span>
                            {record.notes.replace('[Off-Campus Check-in] Reason:', '').trim()}
                          </div>
                        )}

                        {leaveTypes[dateStr] && record.status !== 'on_leave' && (
                          <div className="flex items-center justify-center gap-2 text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-4 py-2.5 rounded-full font-medium text-sm border border-purple-100 dark:border-purple-500/20 mt-2">
                            <Clock className="w-4 h-4" />
                            <span>On Leave ({leaveTypes[dateStr]})</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!record && isOnLeave && (
                      <div className="text-purple-500 font-bold flex flex-col items-center justify-center gap-2 p-6 bg-purple-500/10 rounded-xl border border-purple-500/20 text-center">
                        <CalendarIcon className="w-10 h-10 opacity-80" />
                        <span>{leaveTypes[dateStr] ? `On Leave (${leaveTypes[dateStr]})` : 'On Leave'}</span>
                      </div>
                    )}

                    {!record && !isFuture && !isNonWorkingDay && !isOnLeave && (
                      <div className="text-red-500 font-bold flex flex-col items-center justify-center gap-2 p-6 bg-red-500/10 rounded-xl border border-red-500/20 text-center">
                        <XCircle className="w-10 h-10 opacity-80" /> 
                        <span>Auto-marked Absent</span>
                      </div>
                    )}
                    
                    {isNonWorkingDay && (
                      <div className={`font-bold flex flex-col items-center justify-center gap-2 p-6 rounded-xl border text-center ${isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
                        <CalendarX className="w-10 h-10 opacity-50" /> 
                        <span>{isHoliday ? 'Holiday' : 'Sunday'}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
};

export default Reports;