import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import { Loader2, FileDown, ClipboardList, CalendarIcon, Filter, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "../ui/dialog";
import { getAttendanceRecordsWithSummary, getAttendanceRecordDetails, getAssignedSubjects } from "@/utils/faculty_api";
import { API_BASE_URL, API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/useOptimizations";
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
  const [presentList, setPresentList] = useState<{ name: string; usn: string }[]>([]);
  const [absentList, setAbsentList] = useState<{ name: string; usn: string }[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { theme } = useTheme();

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

  const handleExportPdf = async () => {
    if (!selectedRecord) return;
    setExporting(true);
    setPdfUrl(null);
    setDetailsError("");

    try {
      const res = await fetchWithTokenRefresh(
        `${API_ENDPOINT}/faculty/generate-statistics/?file_id=${selectedRecord.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await res.json();
      if (data.success && data.data && data.data.pdf_url) {
        setPdfUrl(data.data.pdf_url);
        let downloadUrl = data.data.pdf_url;
        if (!downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://')) {
          const domain = new URL(API_ENDPOINT).origin;
          downloadUrl = `${domain}${downloadUrl}`;
        }

        const pdfRes = await fetchWithTokenRefresh(downloadUrl);
        if (pdfRes.ok) {
          const blob = await pdfRes.blob();
          const localUrl = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = localUrl;
          a.download = `stats_${selectedRecord.subject || "Attendance"}_${selectedRecord.date}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(localUrl);
        } else {
          setDetailsError("Failed to download PDF file");
        }
      } else {
        setDetailsError(data.message || "Failed to generate PDF");
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setDetailsError(e.message || "Failed to generate PDF");
      } else {
        setDetailsError("Failed to generate PDF");
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={`space-y-3 md:space-y-3 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card id="attendance-records-card" className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
        <CardHeader id="attendance-records-header" className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 flex flex-row items-center justify-between gap-3 sm:gap-4 border-b mb-3">
          <div className="flex-1 min-w-0">
            <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Attendance Records</CardTitle>
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
                    size="sm"
                    className="flex items-center gap-0.5 sm:gap-1 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out shadow-md text-xs sm:text-sm h-7 sm:h-8 lg:h-9 px-1.5 sm:px-2 lg:px-3 whitespace-nowrap"
                  >
                    <Filter className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4" />
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
                <ClipboardList className="w-12 h-12 opacity-80" />
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Records Found</h3>
              <p className="max-w-xs text-base leading-relaxed">
                You haven't submitted any attendance records yet. Your history will appear here once you start marking attendance.
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto custom-scrollbar w-full overscroll-contain min-h-0 max-h-[60vh] md:max-h-none md:overflow-visible border rounded-md" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
              <div>
                <Table>
                  <TableHeader className={theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}>
                    <TableRow>
                      <TableHead className={`text-sm md:text-sm lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Date</TableHead>
                      <TableHead className={`text-sm md:text-sm lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Subject</TableHead>
                      <TableHead className={`text-sm md:text-sm lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Section</TableHead>
                      <TableHead className={`text-sm md:text-sm lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Semester</TableHead>
                      <TableHead className={`text-sm md:text-sm lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Branch</TableHead>
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
                        <TableCell className="text-sm md:text-sm lg:text-sm whitespace-nowrap">{record.date}</TableCell>
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
                              <div className={`p-6 border-b ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
                                <DialogHeader>
                                  <DialogTitle className="text-xl font-semibold tracking-tight">Attendance Details</DialogTitle>
                                  <DialogDescription className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                                    Comprehensive record for this session
                                  </DialogDescription>
                                </DialogHeader>
                              </div>

                              <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-h-[60vh] md:max-h-[70vh] overflow-y-auto custom-scrollbar">
                                {selectedRecord && (
                                  <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="space-y-1">
                                      <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Date</p>
                                      <p className="text-sm font-semibold">{selectedRecord.date}</p>
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
                                      <p className={`text-sm font-semibold ${Number(selectedRecord.summary.present_percentage) >= 75 ? 'text-green-500' : 'text-orange-500'}`}>
                                        {selectedRecord.summary.present_percentage}%
                                      </p>
                                    </div>
                                    <div className="space-y-1 pt-2 border-t border-slate-800/10 dark:border-slate-100/10 col-span-2">
                                      <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Attendance Ratio</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-semibold text-green-500">{selectedRecord.summary.present_count} Present</span>
                                        <span className="text-slate-300 dark:text-slate-700">|</span>
                                        <span className="text-xs font-semibold text-red-500">{selectedRecord.summary.absent_count} Absent</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
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
                                      {presentList.length > 0 ? (
                                        presentList.map((s) => (
                                          <div key={s.usn} className={`p-3 rounded-lg border flex justify-between items-center transition-all hover:translate-x-1 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'}`}>
                                            <span className="text-xs font-medium">{s.name}</span>
                                            <span className="text-[10px] font-mono opacity-60">{s.usn}</span>
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
                                      {absentList.length > 0 ? (
                                        absentList.map((s) => (
                                          <div key={s.usn} className={`p-3 rounded-lg border flex justify-between items-center transition-all hover:translate-x-1 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'}`}>
                                            <span className="text-xs font-medium">{s.name}</span>
                                            <span className="text-[10px] font-mono opacity-60">{s.usn}</span>
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
                                  {selectedRecord && selectedRecord.summary && selectedRecord.summary.total_count > 0 && (
                                    <Button
                                      className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-white font-semibold px-6 shadow-lg shadow-purple-500/20 transition-all active:scale-95"
                                      onClick={handleExportPdf}
                                      disabled={exporting}
                                    >
                                      {exporting ? (
                                        <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Processing</>
                                      ) : (
                                        <><FileDown className="mr-2 h-4 w-4" /> Export Report</>
                                      )}
                                    </Button>
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