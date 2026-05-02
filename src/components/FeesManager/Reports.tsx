import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import {
  Download,
  Calendar as CalendarIcon,
  Users,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileText
} from 'lucide-react';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getStaffAttendanceAudit, getStaffDetailedAttendance, STAFF_ROLES } from '../../utils/fees_manager_api';
import { useTheme } from '@/context/ThemeContext';
import { 
  Skeleton, 
  SkeletonStatsGrid, 
  SkeletonTable, 
  SkeletonList, 
  SkeletonPageHeader,
  SkeletonCard
} from "@/components/ui/skeleton";


interface AttendanceSummary {
  id: number;
  name: string;
  role: string;
  branch_dept: string;
  total_days: number;
  present: number;
  absent: number;
  attendance_percentage: number;
}

const Reports: React.FC = () => {
  const [attendanceData, setAttendanceData] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isStartPopoverOpen, setIsStartPopoverOpen] = useState(false);
  const [isEndPopoverOpen, setIsEndPopoverOpen] = useState(false);

  // Calendar Detailed View
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<AttendanceSummary | null>(null);
  const [detailedAttendance, setDetailedAttendance] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    if (selectedRole && startDate && endDate) {
      fetchAttendanceAudit();
    } else {
      setAttendanceData([]);
      setLoading(false);
    }
  }, [selectedRole, startDate, endDate, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRole, startDate, endDate]);

  const fetchAttendanceAudit = async () => {
    if (!selectedRole || !startDate || !endDate) return;
    try {
      setLoading(true);
      setError(null);
      const response = await getStaffAttendanceAudit(selectedRole, startDate, endDate, currentPage);

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

  const downloadReport = async (format: 'pdf' | 'excel') => {
    try {
      setLoading(true);
      const response = await getStaffAttendanceAudit(selectedRole, startDate, endDate, 1, format);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Staff_Attendance_${startDate}_to_${endDate}.${format === 'excel' ? 'xlsx' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError(`Failed to download ${format.toUpperCase()} report`);
      }
    } catch (err) {
      setError(`Error downloading ${format.toUpperCase()} report`);
    } finally {
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
      }
    } catch (error) {
      console.error("Error fetching detailed attendance:", error);
    } finally {
      setLoadingDetails(false);
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
    <div className="space-y-6 animate-in fade-in duration-500">
      {error && (
        <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-medium">{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="border-b bg-muted/20 pb-6 px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-semibold flex items-center gap-2">
                Staff Attendance Audit
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">Monitor attendance across all institutional roles</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadReport('pdf')}
                className="h-9 px-4 font-semibold uppercase text-[12px] tracking-widest rounded-full bg-background border-primary/20 text-primary hover:bg-primary/5 transition-all"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadReport('excel')}
                className="h-9 px-4 font-semibold uppercase text-[12px] tracking-widest rounded-full bg-background border-primary/20 text-primary hover:bg-primary/5 transition-all"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Filters Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-muted/10 p-5 rounded-2xl border border-border/50">
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.1em] ml-1">Role Type <span className="text-red-500">*</span></Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="bg-background rounded-xl border-border/50 h-11">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  {STAFF_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value} className="rounded-lg">
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.1em] ml-1">Start Date <span className="text-red-500">*</span></Label>
              <Popover open={isStartPopoverOpen} onOpenChange={setIsStartPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background rounded-xl border-border/50 h-11",
                      !startDate && "text-muted-foreground"
                    )}
                  >
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
                        setStartDate(date.toISOString().split('T')[0]);
                        setIsStartPopoverOpen(false);
                      }
                    }}
                    initialFocus
                    className="rounded-2xl"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.1em] ml-1">End Date <span className="text-red-500">*</span></Label>
              <Popover open={isEndPopoverOpen} onOpenChange={setIsEndPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background rounded-xl border-border/50 h-11",
                      !endDate && "text-muted-foreground"
                    )}
                  >
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
                        setEndDate(date.toISOString().split('T')[0]);
                        setIsEndPopoverOpen(false);
                      }
                    }}
                    initialFocus
                    className="rounded-2xl"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Table Section */}
          <div className="rounded-xl border border-border/50 overflow-x-auto bg-card/30 backdrop-blur-md custom-scrollbar">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider">Staff Name</TableHead>
                  <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider">Role</TableHead>
                  <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider">Department</TableHead>
                  <TableHead className="px-6 py-4 text-center text-[11px] font-semibold uppercase tracking-wider">Total Days</TableHead>
                  <TableHead className="px-6 py-4 text-center text-[11px] font-semibold uppercase tracking-wider text-green-600">Present</TableHead>
                  <TableHead className="px-6 py-4 text-center text-[11px] font-semibold uppercase tracking-wider text-red-600">Absent</TableHead>
                  <TableHead className="px-6 py-4 text-center text-[11px] font-semibold uppercase tracking-wider">Performance</TableHead>
                  <TableHead className="px-6 py-4 text-right pr-6 text-[11px] font-semibold uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <SkeletonTable rows={10} cols={8} />
                    </TableCell>
                  </TableRow>
                ) : attendanceData.length > 0 ? (

                  attendanceData.map((item) => (
                    <TableRow key={item.id} className="hover:bg-primary/5 transition-all duration-200 border-b border-border/50">
                      <TableCell className="py-5 px-6 font-semibold text-foreground">{item.name}</TableCell>
                      <TableCell className="px-6">
                        <Badge variant="outline" className="bg-muted/30 text-[10px] font-semibold uppercase tracking-widest border-border/50 px-2 py-0.5 rounded-md">
                          {item.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 text-sm text-muted-foreground font-medium uppercase tracking-tight">{item.branch_dept}</TableCell>
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
                        <div className="flex flex-col items-center gap-1">
                          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{item.attendance_percentage}%</div>
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                item.attendance_percentage >= 75 ? "bg-green-500" :
                                  item.attendance_percentage >= 50 ? "bg-yellow-500" : "bg-red-500"
                              )}
                              style={{ width: `${item.attendance_percentage}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
                          title="View Full Report"
                          onClick={() => handleViewAttendance(item)}
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : !selectedRole || !startDate || !endDate ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-72 text-center">
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
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-72 text-center">
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
                )}
              </TableBody>
            </Table>

            {/* Pagination Footer */}
            {totalItems > 0 && (
              <div className="p-5 border-t flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/10">
                <p className="text-[13px] font-medium text-muted-foreground">
                  Showing <span className="text-foreground font-semibold">{(currentPage - 1) * 10 + 1}</span> to <span className="text-foreground font-semibold">{Math.min(currentPage * 10, totalItems)}</span> of <span className="text-foreground font-semibold">{totalItems}</span> results
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="pagination-btn text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white px-4 h-9 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                    disabled={currentPage === 1 || loading}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className={cn(
                      "h-9 w-10 font-semibold rounded-lg border-border/50",
                      theme === 'dark' ? "bg-card text-foreground" : "bg-white text-gray-900"
                    )}
                  >
                    {currentPage}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="pagination-btn text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white px-4 h-9 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                    disabled={currentPage === totalPages || loading}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Attendance Calendar Dialog */}
      <Dialog open={isCalendarDialogOpen} onOpenChange={setIsCalendarDialogOpen}>
        <DialogContent className="w-[90%] sm:max-w-md bg-card rounded-3xl border-none shadow-2xl p-0 overflow-hidden mx-auto">
          <DialogHeader className="p-6 bg-muted/20 border-b">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Attendance History
            </DialogTitle>
            <DialogDescription className="text-sm font-medium mt-1">
              Visual audit for <span className="text-foreground font-semibold">{selectedStaff?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-6">
            {loadingDetails ? (
              <div className="space-y-6">
                <Skeleton className="h-[350px] w-full rounded-2xl" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-20 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                </div>
              </div>
            ) : (

              <>
                <div className="rounded-2xl border border-border/50 p-4 bg-muted/5 max-h-[350px] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                    {getDatesInRange(startDate, endDate).map((date, idx) => {
                      const dateStr = format(date, "yyyy-MM-dd");
                      const record = detailedAttendance.find(r => {
                        const rDate = typeof r.date === 'string' ? r.date : format(new Date(r.date), "yyyy-MM-dd");
                        return rDate === dateStr;
                      });

                      const isPresent = record?.status === 'present';
                      // If no record exists or status is explicitly 'absent', treat as absent to match summary logic
                      const isAbsent = record?.status === 'absent' || (!record && !isPresent);

                      return (
                        <div
                          key={idx}
                          className={cn(
                            "flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-300 shadow-sm",
                            isPresent ? "bg-green-500/10 border-green-500/30 text-green-700 shadow-green-500/5" :
                              isAbsent ? "bg-red-500/10 border-red-500/30 text-red-700 shadow-red-500/5" :
                                "bg-muted/30 border-border/50 text-muted-foreground opacity-30"
                          )}
                        >
                          <span className={cn(
                            "text-[10px] font-semibold uppercase tracking-tighter opacity-70",
                            (isPresent || isAbsent) && "opacity-100"
                          )}>
                            {format(date, "EEE")}
                          </span>
                          <span className="text-sm font-semibold leading-tight">
                            {format(date, "d")}
                          </span>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full mt-1.5",
                            isPresent ? "bg-green-500" : isAbsent ? "bg-red-500" : "bg-muted-foreground/30"
                          )} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-green-700/70">Present Days</span>
                      <span className="text-lg font-semibold text-green-700">{selectedStaff?.present}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-red-700/70">Absent Days</span>
                      <span className="text-lg font-semibold text-red-700">{selectedStaff?.absent}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Button
              className="w-full h-12 rounded-2xl bg-primary text-white hover:bg-primary/90 transition-all font-semibold uppercase text-[12px] tracking-widest shadow-lg shadow-primary/20 active:scale-[0.98]"
              onClick={() => setIsCalendarDialogOpen(false)}
            >
              Close History
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;