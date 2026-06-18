import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/use-toast';
import { useTheme } from '../../context/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Users, Plus, Download, LogOut, Bell, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  createWardenVisitorLog,
  getWardenStudents,
  getWardenVisitorLogs,
  exportWardenVisitorLogsPdf,
  checkoutWardenVisitorLog,
  sendWardenVisitorReminder
} from '../../utils/warden_api';
import { getAcademicInit, getHostels } from '../../utils/hms_api';

interface VisitorLog {
  id: number;
  student: number;
  student_name: string;
  student_usn: string;
  visitor_name: string;
  mobile_number: string;
  purpose: string;
  check_in_time: string;
  check_out_time: string | null;
  hostel: number;
  hostel_name: string;
}

// Date Time Picker Helper
const combineDateAndTime = (date: Date | undefined, timeStr: string): string => {
  if (!date) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hhMm = timeStr || "00:00";
  return `${yyyy}-${mm}-${dd}T${hhMm}`;
};

const parseDateTime = (dateTimeStr: string) => {
  if (!dateTimeStr) return { date: undefined, time: "00:00" };
  const [datePart, timePart] = dateTimeStr.split('T');
  if (!datePart) return { date: undefined, time: "00:00" };
  const [year, month, day] = datePart.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return { date, time: timePart || "00:00" };
};

const formatDisplay = (value: string) => {
  if (!value) return "Select date & time...";
  const { date, time } = parseDateTime(value);
  if (!date) return "Select date & time...";
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  // Convert 24h to 12h format with AM/PM
  const [hoursStr, minutesStr] = time.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr || "00";
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const formattedHours = String(hours).padStart(2, '0');

  return `${day}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
};

interface DateTimePickerProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

const DateTimePicker = ({ value, onChange, className }: DateTimePickerProps) => {
  const { date: selectedDate, time: selectedTime } = parseDateTime(value);

  // Split selectedTime into hours (12h format), minutes, and AM/PM
  const [hoursStr, minutesStr] = selectedTime.split(':');
  const hours24 = parseInt(hoursStr || '0', 10);
  const currentMinutes = minutesStr || '00';

  const currentAmpm = hours24 >= 12 ? 'PM' : 'AM';
  let currentHours12 = hours24 % 12;
  currentHours12 = currentHours12 ? currentHours12 : 12;
  const currentHours12Str = String(currentHours12);

  const handleTimeChange = (type: 'hour' | 'minute' | 'ampm', val: string) => {
    let h12 = currentHours12;
    let m = currentMinutes;
    let ap = currentAmpm;

    if (type === 'hour') h12 = parseInt(val, 10);
    if (type === 'minute') m = val;
    if (type === 'ampm') ap = val;

    let h24 = h12;
    if (ap === 'PM' && h24 < 12) h24 += 12;
    if (ap === 'AM' && h24 === 12) h24 = 0;

    const timeStr = `${String(h24).padStart(2, '0')}:${m}`;
    onChange(combineDateAndTime(selectedDate || new Date(), timeStr));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          className={cn(
            "w-full justify-start text-left font-normal h-9 text-xs bg-background border border-input px-3 hover:bg-accent hover:text-accent-foreground",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-75 shrink-0" />
          <span className="truncate">{value ? formatDisplay(value) : "Select date & time..."}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[100] bg-popover text-popover-foreground border shadow-md rounded-md" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(newDate) => {
            const newTime = selectedTime || "00:00";
            onChange(combineDateAndTime(newDate, newTime));
          }}
          initialFocus
        />
        <div className="p-3 border-t border-border flex items-center justify-between gap-2 bg-muted/20">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-75 shrink-0">Time</span>
          <div className="flex items-center gap-1">
            <Select value={currentHours12Str} onValueChange={(val) => handleTimeChange('hour', val)}>
              <SelectTrigger className="h-8 text-[11px] bg-background w-[55px] px-1.5 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-48 z-[110]">
                {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
                  <SelectItem key={h} value={h}>
                    {h.padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-muted-foreground text-[11px] font-bold">:</span>

            <Select value={currentMinutes} onValueChange={(val) => handleTimeChange('minute', val)}>
              <SelectTrigger className="h-8 text-[11px] bg-background w-[55px] px-1.5 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-48 z-[110]">
                {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={currentAmpm} onValueChange={(val) => handleTimeChange('ampm', val)}>
              <SelectTrigger className="h-8 text-[11px] bg-background w-[55px] px-1.5 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[110]">
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="PM">PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const WardenVisitorLogs = () => {
  const { toast } = useToast();
  const { theme } = useTheme();
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
  const [exporting, setExporting] = useState(false);
  const [viewPurpose, setViewPurpose] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState<number | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState<number | null>(null);

  // Academic filters for modal
  const [batches, setBatches] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [semestersByBranch, setSemestersByBranch] = useState<any>({});
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [hasMoreStudents, setHasMoreStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [debouncedStudentSearch, setDebouncedStudentSearch] = useState('');
  const [hasPrevStudents, setHasPrevStudents] = useState(false);
  const [studentCount, setStudentCount] = useState(0);
  const [selectedStudentName, setSelectedStudentName] = useState('');

  // Auto trigger states for sequential dropdown selection
  const [isBatchSelectOpen, setIsBatchSelectOpen] = useState(false);
  const [isBranchSelectOpen, setIsBranchSelectOpen] = useState(false);
  const [isSemesterSelectOpen, setIsSemesterSelectOpen] = useState(false);
  const [isStudentSelectOpen, setIsStudentSelectOpen] = useState(false);

  const [formData, setFormData] = useState({
    student: '',
    hostel: '',
    visitor_name: '',
    mobile_number: '',
    purpose: '',
    check_in_time: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    check_out_time: '',
  });

  useEffect(() => {
    fetchAcademicInit();
    fetchHostels();
  }, []);

  // Debounce student search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStudentSearch(studentSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearch]);

  // Reset student page to 1 on filter or search changes
  useEffect(() => {
    setStudentPage(1);
  }, [selectedBatch, selectedBranch, selectedSemester, formData.hostel, debouncedStudentSearch]);

  useEffect(() => {
    if (isModalOpen) {
      fetchStudents(studentPage, selectedBatch, selectedBranch, selectedSemester, formData.hostel, debouncedStudentSearch);
    }
  }, [isModalOpen, selectedBatch, selectedBranch, selectedSemester, formData.hostel, studentPage, debouncedStudentSearch]);

  const fetchAcademicInit = async () => {
    try {
      const response = await getAcademicInit();
      if (response.success || response.batches) {
        setBatches(response.batches || response.data?.batches || []);
        setBranches(response.branches || response.data?.branches || []);
        setSemestersByBranch(response.semesters_by_branch || response.data?.semesters_by_branch || {});
      }
    } catch (error) {
      console.error("Failed to load academic data", error);
    }
  };

  const fetchHostels = async () => {
    try {
      const response = await getHostels();
      if (response.success) {
        setHostels(response.results || response.data || []);
      }
    } catch (error) {
      console.error("Failed to load hostels", error);
    }
  };

  const fetchStudents = async (
    page: number = 1,
    batch: string = '',
    branch: string = '',
    semester: string = '',
    hostelId: string = '',
    search: string = ''
  ) => {
    try {
      const response = await getWardenStudents(
        hostelId ? parseInt(hostelId) : undefined,
        undefined,
        search ? '' : batch,
        search ? '' : branch,
        search ? '' : semester,
        page,
        search
      );
      const newStudents = response.results || response.students || response.data || [];
      setStudents(newStudents);
      setStudentCount(response.count || 0);
      setHasMoreStudents(!!response.next);
      setHasPrevStudents(!!response.previous);
    } catch (error) {
      console.error("Failed to load students", error);
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchLogs();
  }, [page, debouncedSearch]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await getWardenVisitorLogs(page, debouncedSearch);
      setLogs(response.results || []);
      setTotalCount(response.count || 0);
      setTotalPages(Math.ceil((response.count || 0) / 10) || 1);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load visitor logs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const blob = await exportWardenVisitorLogsPdf(debouncedSearch);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Visitor_Logs_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Visitor logs PDF downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export visitor logs PDF',
        variant: 'destructive'
      });
    } finally {
      setExporting(false);
    }
  };

  const handleCheckout = async (logId: number) => {
    setIsCheckingOut(logId);
    try {
      await checkoutWardenVisitorLog(logId);
      toast({
        title: 'Success',
        description: 'Visitor checked out successfully',
      });
      fetchLogs();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to check out visitor',
        variant: 'destructive'
      });
    } finally {
      setIsCheckingOut(null);
    }
  };

  const isOverdue = (checkInTime: string, checkOutTime: string | null) => {
    if (checkOutTime) return false;
    const checkIn = new Date(checkInTime).getTime();
    const now = new Date().getTime();
    return (now - checkIn) > 2 * 60 * 60 * 1000;
  };

  const handleSendReminder = async (logId: number) => {
    setIsSendingReminder(logId);
    try {
      await sendWardenVisitorReminder(logId);
      toast({
        title: 'Success',
        description: 'Reminder sent to host student successfully',
      });
      // Optionally re-fetch logs to make sure any backend status is updated, 
      // but status badge is derived on the fly anyway. Re-fetching can't hurt.
      fetchLogs();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send visitor reminder',
        variant: 'destructive'
      });
    } finally {
      setIsSendingReminder(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student || !formData.hostel || !formData.visitor_name || !formData.mobile_number) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await createWardenVisitorLog({
        student: parseInt(formData.student),
        hostel: parseInt(formData.hostel),
        visitor_name: formData.visitor_name,
        mobile_number: formData.mobile_number,
        purpose: formData.purpose,
        check_in_time: formData.check_in_time ? new Date(formData.check_in_time).toISOString() : undefined,
        check_out_time: formData.check_out_time ? new Date(formData.check_out_time).toISOString() : null,
      });
      toast({ title: 'Success', description: 'Visitor log added successfully' });
      setIsModalOpen(false);
      setFormData({
        student: '',
        hostel: '',
        visitor_name: '',
        mobile_number: '',
        purpose: '',
        check_in_time: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
        check_out_time: '',
      });
      setSelectedStudentName('');
      fetchLogs();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add visitor log', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card/50 backdrop-blur-sm shadow-sm">
        <CardHeader id="warden-visitor-logs-header" className="pb-4 border-b bg-muted/30">
          <div className="flex flex-col space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">Visitor Logs</CardTitle>
                <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-semibold text-xs py-1 px-2.5 rounded-lg border-none shadow-none hover:bg-blue-50">
                  Total: {totalCount}
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center justify-center gap-1.5 h-9 text-xs bg-primary hover:bg-primary/90 text-white transition-all px-3 whitespace-nowrap w-full sm:w-auto">
                      <Plus className="w-3.5 h-3.5" /> Add Visitor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[90%] sm:max-w-lg mx-auto custom-scrollbar rounded-xl">
                    <DialogHeader>
                      <DialogTitle>Add New Visitor</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
                      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar" style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}>

                        {/* Visitor Details Section */}
                        <div className="space-y-3 p-3.5 rounded-xl border border-border/80 bg-muted/10">
                          <div className="text-xs font-bold text-primary uppercase tracking-wider">Visitor Details</div>
                          <div className="space-y-2">
                            <Label className="text-xs">Visitor Name *</Label>
                            <Input
                              value={formData.visitor_name}
                              onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
                              placeholder="E.g., John Doe"
                              className="h-9 text-xs bg-background"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Visitor Mobile Number *</Label>
                            <Input
                              value={formData.mobile_number}
                              onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                              placeholder="E.g., +91 98765 43210"
                              className="h-9 text-xs bg-background"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Purpose/Reason for Visit</Label>
                            <Input
                              value={formData.purpose}
                              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                              placeholder="E.g., Meeting, Delivery, etc."
                              className="h-9 text-xs bg-background"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2 flex flex-col">
                              <Label className="text-xs">Check-In Time *</Label>
                              <DateTimePicker
                                value={formData.check_in_time}
                                onChange={(val) => setFormData({ ...formData, check_in_time: val })}
                              />
                            </div>
                            <div className="space-y-2 flex flex-col">
                              <Label className="text-xs">Check-Out Time</Label>
                              <DateTimePicker
                                value={formData.check_out_time}
                                onChange={(val) => setFormData({ ...formData, check_out_time: val })}
                              />
                            </div>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-border/40">
                            <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Filter Students</Label>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Batch</Label>
                                <Select
                                  value={selectedBatch}
                                  open={isBatchSelectOpen}
                                  onOpenChange={setIsBatchSelectOpen}
                                  onValueChange={(val) => {
                                    setSelectedBatch(val);
                                    setFormData({ ...formData, student: '' });
                                    setSelectedStudentName('');
                                    setTimeout(() => setIsBranchSelectOpen(true), 150);
                                  }}
                                >
                                  <SelectTrigger className="w-full h-9 text-xs bg-background">
                                    <SelectValue placeholder="Select Batch" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {batches.length === 0 ? (
                                      <SelectItem value="none" disabled>No batches found</SelectItem>
                                    ) : (
                                      batches.map((b) => (
                                        <SelectItem key={b.id} value={b.id.toString()}>
                                          {b.name}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">{translateTerminology("Branch")}</Label>
                                <Select
                                  value={selectedBranch}
                                  open={isBranchSelectOpen}
                                  onOpenChange={setIsBranchSelectOpen}
                                  onValueChange={(val) => {
                                    setSelectedBranch(val);
                                    setSelectedSemester('');
                                    setFormData({ ...formData, student: '' });
                                    setSelectedStudentName('');
                                    setTimeout(() => setIsSemesterSelectOpen(true), 150);
                                  }}
                                >
                                  <SelectTrigger className="w-full h-9 text-xs bg-background">
                                    <SelectValue placeholder={translateTerminology("Select Branch")} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {branches.length === 0 ? (
                                      <SelectItem value="none" disabled>No batches found</SelectItem>
                                    ) : (
                                      branches.map((b) => (
                                        <SelectItem key={b.id} value={b.id.toString()}>
                                          {b.name}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">{translateTerminology("Semester")}</Label>
                                <Select
                                  value={selectedSemester}
                                  open={isSemesterSelectOpen}
                                  onOpenChange={setIsSemesterSelectOpen}
                                  onValueChange={(val) => {
                                    setSelectedSemester(val);
                                    setFormData({ ...formData, student: '' });
                                    setSelectedStudentName('');
                                    setTimeout(() => setIsStudentSelectOpen(true), 150);
                                  }}
                                >
                                  <SelectTrigger className="w-full h-9 text-xs bg-background">
                                    <SelectValue placeholder={translateTerminology("Select Semester")} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {!selectedBranch ? (
                                      <SelectItem value="none" disabled>Select branch first</SelectItem>
                                    ) : !semestersByBranch[selectedBranch] || semestersByBranch[selectedBranch].length === 0 ? (
                                      <SelectItem value="none" disabled>No semesters found</SelectItem>
                                    ) : (
                                      semestersByBranch[selectedBranch].map((s: any) => (
                                        <SelectItem key={s.id} value={s.id.toString()}>
                                          Sem {s.number}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-border/40">
                            <Label className="text-xs">Student *</Label>
                            <Popover open={isStudentSelectOpen} onOpenChange={setIsStudentSelectOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  type="button"
                                  className="w-full h-10 justify-between text-left font-normal text-sm bg-background border border-input px-3 hover:bg-accent hover:text-accent-foreground"
                                >
                                  <span className="truncate">
                                    {formData.student
                                      ? selectedStudentName || "Select a student..."
                                      : "Select a student..."
                                    }
                                  </span>
                                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[320px] p-0 z-[100] bg-popover text-popover-foreground border shadow-md rounded-md" align="start">
                                <div className="p-2 border-b border-border bg-muted/10">
                                  <Input
                                    placeholder="Search student by name/USN..."
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    className="h-9 text-xs"
                                  />
                                </div>
                                <div className="max-h-48 overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
                                  {students.length === 0 ? (
                                    <div className="p-2 text-xs text-muted-foreground text-center">No students found</div>
                                  ) : (
                                    students.map((s: any) => (
                                      <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => {
                                          const matchedHostel = hostels.find(h => h.name === s.room_hostel_name);
                                          setFormData({ 
                                            ...formData, 
                                            student: s.id.toString(),
                                            hostel: matchedHostel ? matchedHostel.id.toString() : formData.hostel
                                          });
                                          setSelectedStudentName(s.name);
                                          if (s.batch) setSelectedBatch(s.batch.toString());
                                          if (s.branch) setSelectedBranch(s.branch.toString());
                                          if (s.semester) setSelectedSemester(s.semester.toString());
                                          setIsStudentSelectOpen(false);
                                        }}
                                        className={cn(
                                          "w-full text-left px-2 py-1.5 rounded-sm text-xs hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between",
                                          formData.student === s.id.toString() && "bg-accent font-semibold"
                                        )}
                                      >
                                        <div className="truncate">
                                          <div className="font-medium">{s.name} ({s.usn})</div>
                                          <div className="text-[10px] text-muted-foreground">Room {s.room_name || s.room || 'Not Allotted'}</div>
                                        </div>
                                        {formData.student === s.id.toString() && (
                                          <span className="text-primary font-bold">✓</span>
                                        )}
                                      </button>
                                    ))
                                  )}
                                </div>
                                {(students.length > 0 || studentPage > 1) && (
                                  <div className="p-2 border-t border-border flex items-center justify-between gap-2 bg-muted/20">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      type="button"
                                      className="h-7 px-2 text-[10px]"
                                      onClick={() => setStudentPage(p => Math.max(1, p - 1))}
                                      disabled={!hasPrevStudents}
                                    >
                                      Previous
                                    </Button>
                                    <span className="text-[10px] font-semibold text-muted-foreground">
                                      Page {studentPage} of {Math.ceil(studentCount / 50) || 1}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      type="button"
                                      className="h-7 px-2 text-[10px]"
                                      onClick={() => setStudentPage(p => p + 1)}
                                      disabled={!hasMoreStudents}
                                    >
                                      Next
                                    </Button>
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                      </div>

                      <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-border/40">
                        <Button type="button" variant="outline" className="h-10 text-sm px-4" onClick={() => setIsModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" className="h-10 text-sm px-4" disabled={isSubmitting}>
                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Save
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  disabled={exporting || totalCount === 0}
                  className="hidden sm:flex items-center justify-center gap-1.5 h-9 text-xs bg-primary hover:bg-primary/90 text-white border-primary transition-all px-3 whitespace-nowrap"
                >
                  {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Export PDF
                </Button>
              </div>
            </div>
            <div className="flex gap-2 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
                <Input
                  type="text"
                  placeholder="Search visitors, students, or hostels..."
                  className="pl-10 pr-12 h-10 bg-background border-primary/10 hover:border-primary/30 transition-colors w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              {/* Mobile Download PDF Icon Button */}
              <Button
                onClick={handleExportPDF}
                disabled={exporting || totalCount === 0}
                size="icon"
                variant="outline"
                className="flex sm:hidden h-10 w-10 items-center justify-center shrink-0 border border-input bg-background"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="animate-pulse space-y-4 p-4">
              {/* Mobile skeleton cards */}
              <div className="md:hidden space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 rounded-xl border border-border/60 bg-muted/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1.5 w-1/3">
                        <div className="h-4 bg-muted-foreground/15 rounded w-full"></div>
                        <div className="h-3 bg-muted-foreground/15 rounded w-2/3"></div>
                      </div>
                      <div className="space-y-1.5 w-1/4 flex flex-col items-end">
                        <div className="h-4 bg-muted-foreground/15 rounded w-16"></div>
                        <div className="h-4 bg-muted-foreground/15 rounded w-20"></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/20">
                      <div className="space-y-1">
                        <div className="h-3 bg-muted-foreground/15 rounded w-1/2"></div>
                        <div className="h-4 bg-muted-foreground/15 rounded w-3/4"></div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-3 bg-muted-foreground/15 rounded w-1/2"></div>
                        <div className="h-4 bg-muted-foreground/15 rounded w-3/4"></div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 pt-3 border-t border-border/20">
                      <div className="space-y-1">
                        <div className="h-3 bg-muted-foreground/15 rounded w-12"></div>
                        <div className="h-4 bg-muted-foreground/15 rounded w-1/2"></div>
                        <div className="h-3 bg-muted-foreground/15 rounded w-1/3"></div>
                      </div>
                      <div className="flex gap-2 w-full mt-1">
                        <div className="h-8 bg-muted-foreground/15 rounded-xl flex-1"></div>
                        <div className="h-8 bg-muted-foreground/15 rounded-xl flex-1"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop skeleton table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <th key={i} className="py-3.5 px-4"><div className="h-4 bg-muted-foreground/15 rounded w-16"></div></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i}>
                        <td className="py-4 px-4"><div className="h-4 bg-muted-foreground/15 rounded w-20"></div></td>
                        <td className="py-4 px-4"><div className="h-4 bg-muted-foreground/15 rounded w-24"></div></td>
                        <td className="py-4 px-4"><div className="h-5 bg-muted-foreground/15 rounded w-16"></div></td>
                        <td className="py-4 px-4">
                          <div className="space-y-1.5">
                            <div className="h-4 bg-muted-foreground/15 rounded w-28"></div>
                            <div className="h-3 bg-muted-foreground/15 rounded w-20"></div>
                          </div>
                        </td>
                        <td className="py-4 px-4"><div className="h-8 bg-muted-foreground/15 rounded-xl w-14"></div></td>
                        <td className="py-4 px-4"><div className="h-4 bg-muted-foreground/15 rounded w-24"></div></td>
                        <td className="py-4 px-4"><div className="h-4 bg-muted-foreground/15 rounded w-24"></div></td>
                        <td className="py-4 px-4"><div className="h-8 bg-muted-foreground/15 rounded-xl w-28 mx-auto"></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground opacity-70">
              <Users className="w-12 h-12 mb-4" />
              <p className="font-semibold text-lg">No visitor logs found</p>
            </div>
          ) : (
            <div>
              {/* Mobile View: Stacked Cards */}
              <div className="md:hidden space-y-3 p-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'
                      } flex flex-col gap-2 shadow-sm`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-lg leading-tight">{log.visitor_name}</h4>
                        <p className="text-sm text-muted-foreground mt-0.5">{log.mobile_number}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge variant="secondary" className="text-[11px] font-semibold bg-primary/5 text-primary border-none">
                          {log.hostel_name || '-'}
                        </Badge>
                        {log.check_out_time ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-none font-semibold text-[11px]">
                            Checked Out
                          </Badge>
                        ) : isOverdue(log.check_in_time, log.check_out_time) ? (
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-none font-semibold text-[11px] animate-pulse">
                            Student Reminded
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none font-semibold text-[10px] animate-pulse">
                            Checked In
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/30 text-xs">
                      <div>
                        <span className="text-xs font-bold text-muted-foreground uppercase">Check-In</span>
                        <div className="font-medium mt-0.5 text-sm">{formatDate(log.check_in_time)}</div>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-muted-foreground uppercase">Check-Out</span>
                        <div className="font-medium mt-0.5 text-sm">{formatDate(log.check_out_time)}</div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-border/30">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Student</div>
                        <div className="text-base font-semibold truncate">{log.student_name || '-'}</div>
                        <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider truncate">{log.student_usn || '-'}</div>
                      </div>
                      <div className="flex flex-col gap-2 w-full mt-1">
                        {/* Row 1: View Reason (Full Width) */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewPurpose(log.purpose)}
                          className="w-full text-xs font-semibold px-4 h-9 text-primary hover:text-primary/95 bg-primary/5 hover:bg-primary/10 border-primary/10 rounded-lg flex items-center justify-center"
                        >
                          View Reason
                        </Button>

                        {/* Row 2: Actions (Remind + Check Out) */}
                        {!log.check_out_time && (
                          <div className="flex items-center gap-2 w-full mt-1">
                            {isOverdue(log.check_in_time, log.check_out_time) ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSendReminder(log.id)}
                                  disabled={isSendingReminder === log.id || isCheckingOut === log.id}
                                  className="flex-1 text-xs font-semibold px-2 h-9 border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-950 dark:text-orange-400 dark:hover:bg-orange-950/20 rounded-lg flex items-center justify-center gap-1.5"
                                >
                                  {isSendingReminder === log.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Bell className="w-3.5 h-3.5" />
                                  )}
                                  Remind
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleCheckout(log.id)}
                                  disabled={isCheckingOut === log.id || isSendingReminder === log.id}
                                  className="flex-1 text-xs font-semibold px-2 h-9 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-1.5"
                                >
                                  {isCheckingOut === log.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <LogOut className="w-3.5 h-3.5" />
                                  )}
                                  Check Out
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleCheckout(log.id)}
                                disabled={isCheckingOut === log.id}
                                className="w-full text-xs font-semibold px-2 h-9 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-1.5"
                              >
                                {isCheckingOut === log.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <LogOut className="w-3.5 h-3.5" />
                                )}
                                Check Out
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className={`border-b ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-gray-50'}`}>
                    <tr>
                      <th className="py-3.5 px-4 font-semibold text-muted-foreground">Visitor</th>
                      <th className="py-3.5 px-4 font-semibold text-muted-foreground">Contact</th>
                      <th className="py-3.5 px-4 font-semibold text-muted-foreground">Hostel</th>
                      <th className="py-3.5 px-4 font-semibold text-muted-foreground">Student Info</th>
                      <th className="py-3.5 px-4 font-semibold text-muted-foreground">Purpose</th>
                      <th className="py-3.5 px-4 font-semibold text-muted-foreground">Check-In</th>
                      <th className="py-3.5 px-4 font-semibold text-muted-foreground">Check-Out</th>
                      <th className="py-3.5 px-4 font-semibold text-muted-foreground text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-md">{log.visitor_name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{log.mobile_number}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="bg-primary/5 font-semibold text-xs border-none text-primary">
                            {log.hostel_name || '-'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold">{log.student_name || '-'}</div>
                          <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{log.student_usn || '-'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewPurpose(log.purpose)}
                            className={`text-xs font-semibold px-3 py-1 rounded-xl h-8 transition-all ${theme === 'dark' ? 'bg-muted/10 text-foreground border border-border hover:bg-muted/20' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                          >
                            View
                          </Button>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-xs text-muted-foreground">{formatDate(log.check_in_time)}</span>
                        </td>
                        <td className="py-3 px-4">
                          {log.check_out_time ? (
                            <span className="font-medium text-xs text-muted-foreground">{formatDate(log.check_out_time)}</span>
                          ) : isOverdue(log.check_in_time, log.check_out_time) ? (
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-none font-semibold text-[10px] animate-pulse">
                              Student Reminded
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none font-semibold text-[10px] animate-pulse">
                              Checked In
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {!log.check_out_time ? (
                            <div className="flex items-center justify-center gap-2">
                              {isOverdue(log.check_in_time, log.check_out_time) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSendReminder(log.id)}
                                  disabled={isSendingReminder === log.id || isCheckingOut === log.id}
                                  className="text-xs font-semibold px-3 py-1 rounded-xl h-8 transition-all inline-flex items-center gap-1.5 border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-950 dark:text-orange-400 dark:hover:bg-orange-950/20"
                                >
                                  {isSendingReminder === log.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Bell className="w-3.5 h-3.5" />
                                  )}
                                  Remind
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleCheckout(log.id)}
                                disabled={isCheckingOut === log.id || isSendingReminder === log.id}
                                className="text-xs font-semibold px-3 py-1 rounded-xl h-8 transition-all inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white"
                              >
                                {isCheckingOut === log.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <LogOut className="w-3.5 h-3.5" />
                                )}
                                Check Out
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-none font-semibold text-[10px] py-1 px-2.5">
                              Completed
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {!loading && logs.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
              <div>
                Showing {totalCount === 0 ? 0 : Math.min((page - 1) * 10 + 1, totalCount)} to {Math.min(page * 10, totalCount)} of {totalCount} logs
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all rounded-xl"
                >
                  Previous
                </Button>

                <div className="flex items-center justify-center min-w-[2rem]">
                  <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    {page}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all rounded-xl"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Purpose Dialog */}
      <Dialog open={!!viewPurpose} onOpenChange={() => setViewPurpose(null)}>
        <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border border-border w-[90%] max-w-[90vw] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6 shadow-2xl [&>button]:hidden' : 'bg-white text-gray-900 border border-gray-200 w-[90%] max-w-[90vw] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6 shadow-2xl [&>button]:hidden'}>
          <DialogHeader>
            <DialogTitle className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Visit Purpose</DialogTitle>
          </DialogHeader>

          <div
            className={`p-3 text-base leading-relaxed whitespace-pre-wrap break-words 
                      max-h-64 overflow-y-auto rounded-md ${theme === 'dark' ? 'text-foreground bg-muted/20' : 'text-gray-900 bg-gray-50'}`}
          >
            {viewPurpose}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="bg-primary hover:bg-primary/90 text-white hover:text-white border-primary rounded-xl text-xs h-9 w-full sm:w-auto"
              onClick={() => setViewPurpose(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WardenVisitorLogs;
