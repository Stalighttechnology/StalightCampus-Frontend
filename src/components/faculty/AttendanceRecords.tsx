import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import { Loader2, FileDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "../ui/dialog";
import { getAttendanceRecordsWithSummary, getAttendanceRecordDetails } from "@/utils/faculty_api";
import { API_BASE_URL } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/useOptimizations";

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

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const res = await getAttendanceRecordsWithSummary({
          page: pagination.page,
          page_size: pagination.pageSize,
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
  }, [pagination.page, pagination.pageSize]);

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
        `${API_BASE_URL}/faculty/generate-statistics/?file_id=${selectedRecord.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await res.json();
      if (data.success && data.data && data.data.pdf_url) {
        setPdfUrl(data.data.pdf_url);
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
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
        <CardHeader>
          <CardTitle className={`text-2xl font-semibold leading-none tracking-tight text-gray-900`}>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonTable rows={5} columns={8} />
          ) : error ? (
            <div className={`p-4 ${theme === 'dark' ? 'text-destructive' : 'text-red-600'}`}>{error}</div>
          ) : (
            <div className="overflow-y-auto w-full overscroll-contain min-h-0 max-h-[60vh] md:max-h-none md:overflow-visible border rounded-md" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader className={theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}>
                    <TableRow>
                      <TableHead className={`text-xs md:text-xs lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Date</TableHead>
                      <TableHead className={`text-xs md:text-xs lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Subject</TableHead>
                      <TableHead className={`text-xs md:text-xs lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Section</TableHead>
                      <TableHead className={`text-xs md:text-xs lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Semester</TableHead>
                      <TableHead className={`text-xs md:text-xs lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Branch</TableHead>
                      <TableHead className={`hidden lg:table-cell text-xs md:text-xs lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Present</TableHead>
                      <TableHead className={`hidden lg:table-cell text-xs md:text-xs lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Absent</TableHead>
                      <TableHead className={`text-xs md:text-xs lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Attendance</TableHead>
                      <TableHead className={`hidden lg:table-cell text-xs md:text-xs lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Status</TableHead>
                      <TableHead className={`text-xs md:text-xs lg:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id} className={theme === 'dark' ? 'hover:bg-muted' : 'hover:bg-gray-50'}>
                        <TableCell className="text-xs md:text-xs lg:text-sm">{record.date}</TableCell>
                        <TableCell className="text-xs md:text-xs lg:text-sm">{record.subject}</TableCell>
                        <TableCell className="text-xs md:text-xs lg:text-sm">{record.section}</TableCell>
                        <TableCell className="text-xs md:text-xs lg:text-sm">{record.semester}</TableCell>
                        <TableCell className="text-xs md:text-xs lg:text-sm">{record.branch}</TableCell>
                        <TableCell className={`hidden lg:table-cell text-xs md:text-xs lg:text-sm font-semibold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>{record.summary.present_count}</TableCell>
                        <TableCell className={`hidden lg:table-cell text-xs md:text-xs lg:text-sm font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{record.summary.absent_count}</TableCell>
                        <TableCell className="text-xs md:text-xs lg:text-sm font-semibold">{record.summary.present_percentage}%</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs md:text-xs lg:text-sm">{record.status}</TableCell>
                        <TableCell className="text-xs md:text-xs lg:text-sm">
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
                            <DialogContent className={`w-[95vw] max-w-2xl rounded-2xl p-0 overflow-hidden border-none shadow-2xl ${theme === 'dark' ? 'bg-[#0f172a] text-slate-100' : 'bg-white text-slate-900'}`}>
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
                                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Date</p>
                                      <p className="text-sm font-semibold">{selectedRecord.date}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Subject</p>
                                      <p className="text-sm font-semibold truncate" title={selectedRecord.subject}>{selectedRecord.subject}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Class</p>
                                      <p className="text-sm font-semibold">Sem {selectedRecord.semester}, {selectedRecord.branch}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Percentage</p>
                                      <p className={`text-sm font-bold ${Number(selectedRecord.summary.present_percentage) >= 75 ? 'text-green-500' : 'text-orange-500'}`}>
                                        {selectedRecord.summary.present_percentage}%
                                      </p>
                                    </div>
                                    <div className="space-y-1 pt-2 border-t border-slate-800/10 dark:border-slate-100/10 col-span-2">
                                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Attendance Ratio</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-bold text-green-500">{selectedRecord.summary.present_count} Present</span>
                                        <span className="text-slate-300 dark:text-slate-700">|</span>
                                        <span className="text-xs font-bold text-red-500">{selectedRecord.summary.absent_count} Absent</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-sm font-bold flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        Present Students
                                      </h4>
                                      <span className="text-[10px] font-bold bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full">{presentList.length}</span>
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
                                      <h4 className="text-sm font-bold flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                        Absent Students
                                      </h4>
                                      <span className="text-[10px] font-bold bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full">{absentList.length}</span>
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
                                      className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-white font-bold px-6 shadow-lg shadow-purple-500/20 transition-all active:scale-95"
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
      </Card>

      {/* Pagination Controls */}
      {pagination.paginationState.totalPages > 1 && (
        <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
          <CardContent className="pt-3 md:pt-4">
            <div className="flex justify-between items-center gap-2 md:gap-2">
              <div className={`text-xs md:text-xs lg:text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                Showing {records.length} of {pagination.paginationState.totalItems} records
              </div>
              <div className="flex items-center gap-1 md:gap-1">
                <Button
                  variant="outline"
                  onClick={() => pagination.goToPage(1)}
                  disabled={pagination.page === 1}
                  aria-label="First page"
                  className="text-xs md:text-xs px-1.5 md:px-2 py-0.5 md:py-0.5 whitespace-nowrap bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out shadow-md"
                >
                  First
                </Button>

                <Button
                  variant="outline"
                  onClick={() => pagination.goToPage(pagination.page - 1)}
                  disabled={!pagination.paginationState.hasPrev}
                  aria-label="Previous page"
                  className="text-xs md:text-xs px-1.5 md:px-2 py-0.5 md:py-0.5 whitespace-nowrap bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out shadow-md"
                >
                  Prev
                </Button>

                {/* Numeric page buttons (windowed) */}
                <div className="flex items-center space-x-0.5 md:space-x-0.5">
                  {(() => {
                    const total = pagination.paginationState.totalPages || 1;
                    const current = pagination.page || 1;
                    const maxButtons = 5;
                    let start = Math.max(1, current - Math.floor(maxButtons / 2));
                    let end = Math.min(total, start + maxButtons - 1);
                    if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);
                    const buttons = [];
                    for (let p = start; p <= end; p++) {
                      buttons.push(
                        <Button
                          key={p}
                          variant={p === current ? undefined : 'ghost'}
                          onClick={() => pagination.goToPage(p)}
                          aria-current={p === current ? 'page' : undefined}
                          aria-label={`Page ${p}`}
                          className={`px-1.5 md:px-2 py-0.5 md:py-0.5 text-xs md:text-xs lg:text-sm ${p === current ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border border-gray-200'} rounded-md`}
                        >
                          {p}
                        </Button>
                      );
                    }
                    return buttons;
                  })()}
                </div>

                <Button
                  variant="outline"
                  onClick={() => pagination.goToPage(pagination.page + 1)}
                  disabled={!pagination.paginationState.hasNext}
                  aria-label="Next page"
                  className="text-xs md:text-xs px-1.5 md:px-2 py-0.5 md:py-0.5 whitespace-nowrap bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out shadow-md"
                >
                  Next
                </Button>

                <Button
                  variant="outline"
                  onClick={() => pagination.goToPage(pagination.paginationState.totalPages)}
                  disabled={pagination.page === pagination.paginationState.totalPages}
                  aria-label="Last page"
                  className="text-xs md:text-xs px-1.5 md:px-2 py-0.5 md:py-0.5 whitespace-nowrap bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out shadow-md"
                >
                  Last
                </Button>

                <span className={`text-xs md:text-xs lg:text-sm px-1.5 md:px-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  Page {pagination.page} of {pagination.paginationState.totalPages}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AttendanceRecords;