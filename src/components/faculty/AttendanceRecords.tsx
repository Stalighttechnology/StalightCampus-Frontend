import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Loader2, FileDown, FileSpreadsheet, CheckCircle, CalendarIcon, Filter, XCircle, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "../ui/dialog";
import { getAttendanceRecordsWithSummary, getAttendanceRecordDetails, getAssignedSubjects, updateAttendanceRecord } from "@/utils/faculty_api";
import { API_BASE_URL, API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/useOptimizations";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AttendanceRecord {
  id: number;
  date: string;
  subject: string | null;
  section: string | null;
  semester: number | null;
  branch: string | null;
  file_path: string | null;
  status: string;
  branch_id: number | null;
  section_id: number | null;
  subject_id: number | null;
  semester_id: number | null;
  summary: {
    present_count: number;
    absent_count: number;
    total_count: number;
    present_percentage: number;
  };
}

interface AttendanceDetail {
  student: string;
  usn: string;
  present: number;
  total_sessions: number;
  percentage: number | string;
}

const AttendanceRecords = () => {
  const formatDateToDDMMYYYY = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "--";
    try {
      const trimmed = dateStr.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [year, month, day] = trimmed.split("-");
        return `${day}-${month}-${year}`;
      }
      const dateObj = new Date(trimmed);
      if (isNaN(dateObj.getTime())) return dateStr;
      return format(dateObj, "dd-MM-yyyy");
    } catch (e) {
      return dateStr;
    }
  };

  const formatAttendancePercentage = (percentage: number | string): string => {
    if (percentage === "NA" || percentage === null || percentage === undefined) {
      return "NA";
    }
    if (typeof percentage === "string") {
      return percentage;
    }
    return `${percentage}%`;
  };

  const pagination = usePagination({
    queryKey: ['attendanceRecords'],
    pageSize: 20,
  });

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [presentList, setPresentList] = useState<{ id: number; name: string; usn: string }[]>([]);
  const [absentList, setAbsentList] = useState<{ id: number; name: string; usn: string }[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  const { theme } = useTheme();
  const { toast } = useToast();

  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await getAssignedSubjects();
        if (res.success && res.data) {
          const uniqueSubjects = Array.from(
            new Map(res.data.map((item: any) => [item.subject_id, item])).values()
          );
          setSubjects(uniqueSubjects);
        }
      } catch (e) {
        console.error("Failed to load subjects", e);
      }
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getAttendanceRecordsWithSummary({
          page: pagination.page,
          page_size: pagination.pageSize,
          subject_id: selectedSubject || undefined,
          start_date: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
          end_date: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
        });
        if (res.success && res.data) {
          setRecords(res.data);
          pagination.updatePagination(res);
        } else {
          setError(res.message || "Failed to fetch records");
        }
      } catch (e: any) {
        setError(e.message || "Failed to fetch records");
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [pagination.page, pagination.pageSize, selectedSubject, startDate, endDate]);

  const handleSubjectChange = (val: string) => {
    setSelectedSubject(val);
    pagination.goToPage(1);
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    pagination.goToPage(1);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    pagination.goToPage(1);
  };

  const handleExportFilteredPdf = async () => {
    setExporting(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("report_type", "attendance");
      if (selectedSubject) queryParams.append("subject_id", selectedSubject);
      if (startDate) queryParams.append("start_date", format(startDate, "yyyy-MM-dd"));
      if (endDate) queryParams.append("end_date", format(endDate, "yyyy-MM-dd"));

      const response = await fetchWithTokenRefresh(
        `${API_ENDPOINT}/reports/export-pdf/?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
          }
        }
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `attendance_records_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        setError("Failed to download PDF report");
      }
    } catch (e: any) {
      setError(e.message || "Failed to download PDF report");
    } finally {
      setExporting(false);
    }
  };

  const handleViewDetails = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setLoadingDetails(true);
    setDetailsError("");
    setPresentList([]);
    setAbsentList([]);
    setPdfUrl(null);
    setIsEditing(false);

    // Allow viewing details using the record id even when branch/section/subject IDs
    // are not present (open electives or legacy records may omit them).

    getAttendanceRecordDetails(record.id)
      .then((res) => {
        if (res.success && res.data) {
          setPresentList(res.data.present);
          setAbsentList(res.data.absent);
        } else {
          setDetailsError(res.message || "Failed to fetch details");
        }
      })
      .catch((e) => setDetailsError(e.message || "Failed to fetch details"))
      .finally(() => setLoadingDetails(false));
  };

  const handleSaveEdit = async () => {
    if (!selectedRecord) return;
    setSavingEdit(true);
    setDetailsError("");

    const updates = [
      ...presentList.map(s => ({ id: s.id, status: true })),
      ...absentList.map(s => ({ id: s.id, status: false }))
    ];

    try {
      const res = await updateAttendanceRecord(selectedRecord.id, updates);
      if (res.success) {
        toast({ title: "Success", description: "Attendance updated successfully.", variant: "default" });
        setIsEditing(false);
        // Optimistically update the record summary locally
        setRecords(prev => prev.map(r => r.id === selectedRecord.id ? {
          ...r,
          summary: {
            ...r.summary,
            present_count: presentList.length,
            absent_count: absentList.length,
            present_percentage: Math.round((presentList.length / (presentList.length + absentList.length)) * 100)
          }
        } : r));
        setSelectedRecord(prev => prev ? {
          ...prev,
          summary: {
            ...prev.summary,
            present_count: presentList.length,
            absent_count: absentList.length,
            present_percentage: Math.round((presentList.length / (presentList.length + absentList.length)) * 100)
          }
        } : null);
      } else {
        setDetailsError(res.message || "Failed to update attendance");
        toast({ title: "Error", description: res.message || "Failed to update attendance", variant: "destructive" });
      }
    } catch (error) {
      setDetailsError("An error occurred while saving");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleExportExcel = async () => {
    if (!selectedRecord) return;
    setExporting(true);
    setDetailsError("");

    try {
      const response = await fetchWithTokenRefresh(
        `${API_ENDPOINT}/faculty/export-session-excel/?file_id=${selectedRecord.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
          },
        }
      );
      if (response.ok) {
        const blob = await response.blob();
        const localUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = localUrl;
        const safeSubject = (selectedRecord.subject || "Attendance").replace(/\s+/g, "_");
        a.download = `attendance_${safeSubject}_${selectedRecord.date}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(localUrl);
      } else {
        generateClientCsv();
      }
    } catch (e: unknown) {
      generateClientCsv();
    } finally {
      setExporting(false);
    }
  };

  const generateClientCsv = () => {
    if (!selectedRecord) return;
    const rows = [
      ["Attendance Details Report"],
      ["Subject", selectedRecord.subject || "--"],
      ["Date", selectedRecord.date],
      ["Class", `Sem ${selectedRecord.semester || ''}, ${selectedRecord.branch || ''} ${selectedRecord.section || ''}`],
      ["Total Present", presentList.length.toString()],
      ["Total Absent", absentList.length.toString()],
      ["Total Strength", (presentList.length + absentList.length).toString()],
      [],
      ["Sl No", "USN", "Student Name", "Status"]
    ];

    let sl = 1;
    presentList.forEach(s => {
      rows.push([sl.toString(), s.usn, s.name, "PRESENT"]);
      sl++;
    });
    absentList.forEach(s => {
      rows.push([sl.toString(), s.usn, s.name, "ABSENT"]);
      sl++;
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const safeSubject = (selectedRecord.subject || "Attendance").replace(/\s+/g, "_");
    link.setAttribute("download", `attendance_${safeSubject}_${selectedRecord.date}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className={`space-y-3 md:space-y-3 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card id="attendance-records-card" className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
        <CardHeader id="attendance-records-header" className="px-4 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-4 md:py-5 flex flex-row items-start justify-between gap-3 sm:gap-4 border-b mb-3">
          <div className="flex-1 min-w-0">
            <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Attendance Records</CardTitle>
            <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'} mt-1`}>
              Track and manage history of all student attendance submissions.
            </p>
          </div>
          <div className="flex-shrink-0">
            {selectedSubject ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleSubjectChange("");
                }}
                className={`flex items-center gap-0.5 sm:gap-1 transition-all duration-200 ease-in-out shadow-md text-xs sm:text-sm h-7 sm:h-8 lg:h-9 px-1.5 sm:px-2 lg:px-3 whitespace-nowrap ${
                  theme === 'dark'
                    ? 'text-red-400 border-red-400 hover:bg-red-900/20 hover:text-red-400'
                    : 'text-red-700 border-red-600 hover:bg-red-100 hover:text-red-700'
                }`}
              >
                <XCircle className="w-4 h-4" />
                <span>Clear Filter</span>
              </Button>
            ) : (
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center justify-center bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md h-10 w-10 sm:w-auto p-0 sm:px-3"
                  >
                    <Filter className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Filter</span>
                  </Button>
                </PopoverTrigger>

                <PopoverContent className={`w-56 sm:w-64 p-2 sm:p-3 lg:p-4 ${theme === 'dark' ?
                  'bg-card text-foreground border-border' :
                  'bg-white text-gray-900 border-gray-200'}`
                }>
                  <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 px-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Filter Subject</p>
                  <div className="max-h-[240px] overflow-y-auto custom-scrollbar space-y-1 sm:space-y-2 p-1">
                    <Button
                      variant={!selectedSubject ? "default" : "ghost"}
                      className={`w-full justify-start text-xs h-8 px-2 transition-all duration-200 ${!selectedSubject ?
                        'bg-primary text-white hover:bg-primary/90' :
                        'hover:bg-primary/10 hover:text-primary'}`
                      }
                      onClick={() => {
                        handleSubjectChange("");
                        setFilterOpen(false);
                      }}
                    >
                      All Subjects
                    </Button>
                    {subjects.map((subj) => (
                      <Button
                        key={subj.subject_id}
                        variant={selectedSubject === subj.subject_id.toString() ? "default" : "ghost"}
                        className={`w-full justify-start text-xs h-8 px-2 transition-all duration-200 ${selectedSubject === subj.subject_id.toString() ?
                          'bg-primary text-white hover:bg-primary/90' :
                          'hover:bg-primary/10 hover:text-primary'}`
                        }
                        onClick={() => {
                          handleSubjectChange(subj.subject_id.toString());
                          setFilterOpen(false);
                        }}
                      >
                        <span className="truncate">{subj.subject_name} ({subj.subject_code})</span>
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </CardHeader>
        <CardContent>

          {loading ? (
            <SkeletonTable rows={5} columns={8} />
          ) : error ? (
            <div className={`p-4 ${theme === 'dark' ? 'text-destructive' : 'text-red-600'}`}>{error}</div>
          ) : records.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'
              }`}>
              <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                <CheckCircle className="w-12 h-12 opacity-80" />
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Records Found</h3>
              <p className="max-w-xs text-base leading-relaxed">
                You haven't submitted any attendance records yet. Your history will appear here once you start marking attendance.
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto custom-scrollbar w-full overscroll-contain min-h-0 md:overflow-visible border rounded-md" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
              <div>
                <Table>
                  <TableHeader className={theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}>
                    <TableRow>
                      <TableHead className={`text-sm md:text-sm lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Date</TableHead>
                      <TableHead className={`text-sm md:text-sm lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Subject</TableHead>
                      <TableHead className={`text-sm md:text-sm lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Section</TableHead>
                      <TableHead className={`text-sm md:text-sm lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{translateTerminology("Semester")}</TableHead>
                      <TableHead className={`text-sm md:text-sm lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{translateTerminology("Branch")}</TableHead>
                      <TableHead className={`hidden lg:table-cell text-sm md:text-sm lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Present</TableHead>
                      <TableHead className={`hidden lg:table-cell text-sm md:text-sm lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Absent</TableHead>
                      <TableHead className={`text-sm md:text-sm lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Attendance</TableHead>
                      <TableHead className={`hidden lg:table-cell text-sm md:text-sm lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Status</TableHead>
                      <TableHead className={`text-sm md:text-sm lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id} className={theme === 'dark' ? 'hover:bg-muted' : 'hover:bg-gray-50'}>
                        <TableCell className="text-sm md:text-sm lg:text-sm whitespace-nowrap">{formatDateToDDMMYYYY(record.date)}</TableCell>
                        <TableCell className="text-sm md:text-sm lg:text-sm whitespace-nowrap">{record.subject}</TableCell>
                        <TableCell className="text-sm md:text-sm lg:text-sm whitespace-nowrap">{record.section}</TableCell>
                        <TableCell className="text-sm md:text-sm lg:text-sm whitespace-nowrap">{record.semester}</TableCell>
                        <TableCell className="text-sm md:text-sm lg:text-sm whitespace-nowrap">{record.branch}</TableCell>
                        <TableCell className={`hidden lg:table-cell text-sm md:text-sm lg:text-sm font-semibold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>{record.summary.present_count}</TableCell>
                        <TableCell className={`hidden lg:table-cell text-sm md:text-sm lg:text-sm font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{record.summary.absent_count}</TableCell>
                        <TableCell className="text-sm md:text-sm lg:text-sm font-semibold">{record.summary.present_percentage}%</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm md:text-sm lg:text-sm">{record.status}</TableCell>
                        <TableCell className="text-sm md:text-sm lg:text-sm">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                className="text-xs md:text-sm px-2 md:px-2 py-1 whitespace-nowrap bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
                                onClick={() => handleViewDetails(record)}
                              >
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className={`w-[90%] md:w-[90vw] md:max-w-xl h-[80vh] md:h-[90vh] rounded-2xl p-0 overflow-hidden border-none shadow-2xl ${theme === 'dark' ? 'bg-[#0f172a] text-slate-100' : 'bg-white text-slate-900'}`}>
                              <div className={`p-6 border-b ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'} flex justify-between items-start`}>
                                <DialogHeader className="flex-1 min-w-0">
                                  <DialogTitle className="text-xl font-semibold tracking-tight">Attendance Details</DialogTitle>
                                  <DialogDescription className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                                    Comprehensive record for this session
                                  </DialogDescription>
                                </DialogHeader>
                                

                              </div>

                              <div className="px-6 pt-4">
                                <div className="relative mb-4">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                  <Input 
                                    placeholder="Search by name or USN..." 
                                    className="pl-9 bg-slate-50 border-slate-200 focus:bg-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                  />
                                </div>
                                {isEditing && (
                                  <div className={`mb-2 p-3 rounded-md text-sm space-y-2 border ${theme === 'dark' ? 'bg-amber-950/30 border-amber-900/50 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                                    <div className="flex items-start gap-2">
                                      <span className="text-lg leading-none">⚠️</span>
                                      <p className="font-medium leading-tight">
                                        Institutional Policy Compliance
                                        <span className="block mt-1 text-xs opacity-90 font-normal">
                                          Modifying attendance records must strictly reflect accurate session participation. Discrepancies may be subject to administrative review.
                                        </span>
                                      </p>
                                    </div>
                                    <div className={`pt-2 mt-2 text-xs flex items-center gap-4 border-t ${theme === 'dark' ? 'border-amber-900/50' : 'border-amber-200/50'}`}>
                                      <span className="font-semibold uppercase tracking-wider opacity-80">Quick Actions:</span>
                                      <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center bg-white/50 dark:bg-black/20 px-2 py-1 rounded">
                                          <XCircle className="w-3.5 h-3.5 text-red-500 mr-1.5"/> Mark Absent
                                        </span>
                                        <span className="inline-flex items-center bg-white/50 dark:bg-black/20 px-2 py-1 rounded">
                                          <CheckCircle className="w-3.5 h-3.5 text-green-500 mr-1.5"/> Mark Present
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="p-4 md:p-6 pt-0 space-y-4 md:space-y-6 max-h-[60vh] md:max-h-[70vh] overflow-y-auto custom-scrollbar">

                                {detailsError && (
                                  <div className="p-3 text-sm text-red-600 bg-red-100 rounded-md">
                                    {detailsError}
                                  </div>
                                )}

                                {selectedRecord && (() => {
                                  const currentTotal = presentList.length + absentList.length;
                                  const currentPercentage = currentTotal > 0 ? (presentList.length / currentTotal * 100).toFixed(1) : "0";
                                  return (

                                  <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="space-y-1">
                                      <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Date</p>
                                      <p className="text-sm font-semibold">{formatDateToDDMMYYYY(selectedRecord.date)}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Subject</p>
                                      <p className="text-sm font-semibold break-words" title={selectedRecord.subject}>{selectedRecord.subject}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Class</p>
                                      <p className="text-sm font-semibold">Sem {selectedRecord.semester}, {selectedRecord.branch}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Percentage</p>
                                      <p className={`text-sm font-semibold ${Number(currentPercentage) >= 75 ? 'text-green-500' : 'text-orange-500'}`}>
                                        {currentPercentage}%
                                      </p>
                                    </div>
                                    <div className="space-y-1 pt-2 border-t border-slate-800/10 dark:border-slate-100/10 col-span-2">
                                      <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Attendance Ratio</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-semibold text-green-500">{presentList.length} Present</span>
                                        <span className="text-slate-300 dark:text-slate-700">|</span>
                                        <span className="text-xs font-semibold text-red-500">{absentList.length} Absent</span>
                                      </div>
                                    </div>
                                  </div>
                                  );
                                })()}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-sm font-semibold flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        Present Students
                                      </h4>
                                      <span className="text-[10px] font-semibold bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full">{presentList.length}</span>
                                    </div>
                                    <div className={`space-y-2 max-h-48 md:max-h-64 overflow-y-auto pr-2 custom-scrollbar`}>
                                      {presentList.filter(s => s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || s.usn.toLowerCase().includes(debouncedSearch.toLowerCase())).length > 0 ? (
                                        presentList.filter(s => s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || s.usn.toLowerCase().includes(debouncedSearch.toLowerCase())).map((s) => (
                                          <div key={s.usn} className={`p-3 rounded-lg border flex justify-between items-center transition-all hover:translate-x-1 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'}`}>
                                            <div className="flex flex-col">
                                              <span className="text-xs font-medium">{s.name}</span>
                                              <span className="text-[10px] font-mono opacity-60">{s.usn}</span>
                                            </div>
                                            {isEditing && (
                                              <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="h-6 w-6 p-0 rounded-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                                                onClick={() => {
                                                  setPresentList(prev => prev.filter(p => p.id !== s.id));
                                                  setAbsentList(prev => [...prev, s]);
                                                }}
                                              >
                                                <XCircle className="w-4 h-4" />
                                              </Button>
                                            )}
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-center py-8 opacity-40 text-xs italic">No students present</div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-sm font-semibold flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                        Absent Students
                                      </h4>
                                      <span className="text-[10px] font-semibold bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full">{absentList.length}</span>
                                    </div>
                                    <div className={`space-y-2 max-h-48 md:max-h-64 overflow-y-auto pr-2 custom-scrollbar`}>
                                      {absentList.filter(s => s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || s.usn.toLowerCase().includes(debouncedSearch.toLowerCase())).length > 0 ? (
                                        absentList.filter(s => s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || s.usn.toLowerCase().includes(debouncedSearch.toLowerCase())).map((s) => (
                                          <div key={s.usn} className={`p-3 rounded-lg border flex justify-between items-center transition-all hover:translate-x-1 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'}`}>
                                            <div className="flex flex-col">
                                              <span className="text-xs font-medium">{s.name}</span>
                                              <span className="text-[10px] font-mono opacity-60">{s.usn}</span>
                                            </div>
                                            {isEditing && (
                                              <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="h-6 w-6 p-0 rounded-full border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                                                onClick={() => {
                                                  setAbsentList(prev => prev.filter(p => p.id !== s.id));
                                                  setPresentList(prev => [...prev, s]);
                                                }}
                                              >
                                                <CheckCircle className="w-4 h-4" />
                                              </Button>
                                            )}
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-center py-8 opacity-40 text-xs italic">No students absent</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className={`p-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
                                <div className="text-xs font-medium text-slate-500">
                                  Total strength: {presentList.length + absentList.length} students
                                </div>
                                
                                <div className="flex gap-2 w-full sm:w-auto">
                                    {isEditing ? (
                                      <>
                                        <Button
                                          variant="outline"
                                          className="flex-1 sm:flex-none"
                                          onClick={() => setIsEditing(false)}
                                          disabled={savingEdit}
                                        >
                                          Cancel Edit
                                        </Button>
                                        <Button
                                          className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white font-semibold px-6 shadow-lg shadow-green-500/20 transition-all active:scale-95"
                                          onClick={handleSaveEdit}
                                          disabled={savingEdit}
                                        >
                                          {savingEdit ? (
                                            <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Saving...</>
                                          ) : (
                                            "Save Changes"
                                          )}
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button 
                                          variant="outline" 
                                          className="flex-1 sm:flex-none"
                                          onClick={() => setIsEditing(true)}
                                          disabled={loadingDetails}
                                        >
                                          Edit Attendance
                                        </Button>
                                        {selectedRecord && selectedRecord.summary && selectedRecord.summary.total_count > 0 && (
                                          <Button
                                            className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-white font-semibold px-6 shadow-lg shadow-purple-500/20 transition-all active:scale-95"
                                            onClick={handleExportExcel}
                                            disabled={exporting}
                                          >
                                            {exporting ? (
                                              <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Processing</>
                                            ) : (
                                              <><FileSpreadsheet className="mr-2 h-4 w-4" /> Export Report</>
                                            )}
                                          </Button>
                                        )}
                                      </>
                                    )}
                                  </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
        {pagination.paginationState.totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {pagination.paginationState.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.paginationState.totalItems)} of {pagination.paginationState.totalItems} records
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.goToPage(Math.max(1, pagination.page - 1))}
                disabled={pagination.page === 1 || loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Previous
              </Button>

              <div className="flex items-center justify-center min-w-[2rem]">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {pagination.page}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.goToPage(Math.min(pagination.paginationState.totalPages, pagination.page + 1))}
                disabled={pagination.page >= pagination.paginationState.totalPages || loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default AttendanceRecords;