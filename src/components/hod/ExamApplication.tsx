import React, { useEffect, useState, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useTheme } from "@/context/ThemeContext";
import { API_ENDPOINT, API_BASE_URL } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { SkeletonList, SkeletonTable } from "@/components/ui/skeleton";
import { useDebouncedSearch } from "@/hooks/useOptimizations";
import { FileDown, Loader2, Users } from "lucide-react";

const ExamApplication: React.FC = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement | null>(null);
  
  const [examPeriod, setExamPeriod] = useState("");
  const [batchId, setBatchId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isSemOpen, setIsSemOpen] = useState(false);
  const [isSecOpen, setIsSecOpen] = useState(false);
  
  const [dropdownData, setDropdownData] = useState<{
    batches: any[];
    semesters: any[];
  }>({ batches: [], semesters: [] });

  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  
  const [sections, setSections] = useState<any[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);

  // Pagination and Student Data
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);

  const [open, setOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [semesterSubjects, setSemesterSubjects] = useState<Array<any>>([]);
  const [appliedSubjects, setAppliedSubjects] = useState<Record<string, boolean>>({});
  const [studentStatuses, setStudentStatuses] = useState<Record<string, string>>({});
  const [subjectStatuses, setSubjectStatuses] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingApplications, setExistingApplications] = useState<Array<any>>([]);
  const [editingApplication, setEditingApplication] = useState<any>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingHallTicketId, setDownloadingHallTicketId] = useState<string | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const exportPDF = async () => {
    if (!batchId || !semesterId || !sectionId) {
      toast({ title: "Error", description: "Please select all filters before exporting.", variant: "destructive" });
      return;
    }
    setDownloadingPDF(true);
    try {
      const response = await fetchWithTokenRefresh(
        `${API_ENDPOINT}/hod/exam-applications/export-pdf/?batch_id=${batchId}&semester_id=${semesterId}&section_id=${sectionId}&exam_period=${examPeriod}`
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Exam_Applications_${examPeriod || "Report"}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const errorData = await response.json();
        toast({ title: "Error", description: errorData.message || "Failed to export PDF", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to export PDF", variant: "destructive" });
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Fetch dropdowns on mount
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/student-bootstrap/?include=batches,semesters`);
        const json = await response.json();
        if (json.success && json.data) {
          setDropdownData({
            batches: json.data.batches || [],
            semesters: json.data.semesters || []
          });
        }
      } catch (err) {
        console.error("Failed to load bootstrap data", err);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchDropdowns();
  }, []);

  useEffect(() => {
    const fetchSections = async () => {
      if (!semesterId) {
        setSections([]);
        return;
      }
      setLoadingSections(true);
      try {
        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/sections/?semester_id=${semesterId}`);
        const json = await response.json();
        if (json.success) {
          setSections(json.data || []);
        }
      } catch (err) {
        console.error("Failed to load sections", err);
      } finally {
        setLoadingSections(false);
      }
    };
    fetchSections();
  }, [semesterId]);

  // Fetch students when filters change
  const fetchStudents = async (page = 1) => {
    if (!batchId || !semesterId || !sectionId) {
      setStudents([]);
      return;
    }
    
    setLoadingStudents(true);
    try {
      let url = `${API_ENDPOINT}/hod/exam-applications/students/?batch_id=${batchId}&semester_id=${semesterId}&exam_period=${examPeriod}&page=${page}&page_size=50`;
      if (sectionId && sectionId !== "all") {
        url += `&section_id=${sectionId}`;
      }
      
      const response = await fetchWithTokenRefresh(url);
      const json = await response.json();
      if (json.success) {
        setStudents(json.data);
        setCurrentPage(json.pagination.page);
        setTotalPages(json.pagination.total_pages);
        setTotalStudentsCount(json.pagination.count);
        
        // Update statuses
        const statusMap: Record<string, string> = {};
        json.data.forEach((student: any) => {
          statusMap[student.usn] = student.status || 'Not Applied';
        });
        setStudentStatuses(statusMap);
      } else {
        toast({ title: "Error", description: json.message || "Failed to load students", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to load students", variant: "destructive" });
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchStudents(1);
  }, [batchId, semesterId, sectionId, examPeriod]);

  const fetchInProgressRef = useRef<string | null>(null);
  const subjectsCache = useRef<Record<string, any>>({});

  const downloadHallTicket = async (student: any) => {
    setDownloadingHallTicketId(student.usn);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/hall-ticket/${student.user_id || student.id}/?exam_period=${examPeriod}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to download hall ticket');
      }

      const blob = await response.blob();
      let filename = `hall_ticket_${student.usn}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download hall ticket",
        variant: "destructive"
      });
    } finally {
      setDownloadingHallTicketId(null);
    }
  };

  const openFor = async (student: any) => {
    setSelectedStudent(student);
    setStudentDetails(null);
    setSemesterSubjects([]);
    setAppliedSubjects({});
    setSubjectStatuses({});
    setIsEditMode(false);
    setExistingApplications([]);
    setEditingApplication(null);
    setOpen(true);
  };

  useEffect(() => {
    if (!open || !selectedStudent) return;

    const token = `${selectedStudent.user_id || selectedStudent.id}:${examPeriod}`;
    if (fetchInProgressRef.current === token) return;
    fetchInProgressRef.current = token;

    const fetchDetails = async () => {
      try {
        setStudentDetails(null);
        let regularSubjects: any[] = [];
        let registeredElectives: any[] = [];
        let registeredOpenElectives: any[] = [];
        let resJson: any = null;

        const cacheKey = token;

        if (subjectsCache.current[cacheKey]) {
          resJson = subjectsCache.current[cacheKey];
        } else {
          const url = `${API_ENDPOINT}/hod/exam-student-subjects/?student_id=${selectedStudent.user_id || selectedStudent.id}&exam_period=${examPeriod}`;
          const resp = await fetchWithTokenRefresh(url, { method: 'GET' });
          resJson = await resp.json();
          if (resp.ok && resJson.success) {
            subjectsCache.current[cacheKey] = resJson;
          }
        }

        if (resJson && resJson.success && resJson.data) {
          regularSubjects = resJson.data.regular_subjects || [];
          registeredElectives = resJson.data.registered_electives || [];
          registeredOpenElectives = resJson.data.registered_open_electives || [];
        }

        setSemesterSubjects(regularSubjects);

        const combinedRegistered = [...registeredElectives.map((r: any) => ({
          subject_id: r.subject_id,
          subject_name: r.subject_name,
          subject_code: r.subject_code,
          subject_type: r.subject_type,
          status: r.status
        })), ...registeredOpenElectives.map((r: any) => ({
          subject_id: r.subject_id,
          subject_name: r.subject_name,
          subject_code: r.subject_code,
          subject_type: r.subject_type,
          status: r.status
        }))];

        setStudentDetails({ subjects_registered: combinedRegistered, student: resJson?.data?.student_meta || null, org_logo: resJson?.data?.org_logo || null });

        if (resJson && resJson.data && resJson.data.student_meta) {
          const meta = resJson.data.student_meta;
          setSelectedStudent((prev: any) => {
            if (!prev) return prev;
            if (prev.semester_id === meta.semester_id && prev.batch_id === meta.batch_id) return prev;
            return { ...prev, semester_id: meta.semester_id, batch_id: meta.batch_id };
          });
        }

        const subjectStatusMap: Record<string, string> = {};
        const initialApplied: Record<string, boolean> = {};

        regularSubjects.forEach((sub: any) => {
          if (sub.subject_code) {
            subjectStatusMap[sub.subject_code] = sub.status === 'Applied' ? 'Applied' : 'Not Applied';
            initialApplied[sub.subject_code] = sub.status === 'Applied';
          }
        });

        combinedRegistered.forEach((sub: any) => {
          if (sub.subject_code) {
            subjectStatusMap[sub.subject_code] = sub.status === 'Applied' ? 'Applied' : 'Not Applied';
            initialApplied[sub.subject_code] = sub.status === 'Applied';
          }
        });

        setSubjectStatuses(subjectStatusMap);
        setAppliedSubjects(initialApplied);

      } catch (err) {
        console.error("Error fetching details", err);
      } finally {
        fetchInProgressRef.current = null;
      }
    };

    fetchDetails();
  }, [open]);

  const handleApplyToggle = (subjectCode: string) => {
    setAppliedSubjects((s) => ({ ...s, [subjectCode]: !s[subjectCode] }));
  };

  const submitApplications = async () => {
    try {
      // Collect all subjects that the user has checked
      const checkedSubjects: number[] = [];
      
      const processSubjectList = (list: any[]) => {
        list.forEach(subj => {
          if (appliedSubjects[subj.subject_code]) {
            checkedSubjects.push(subj.id || subj.subject_id);
          }
        });
      };
      
      processSubjectList(semesterSubjects);
      if (studentDetails?.subjects_registered) {
        processSubjectList(studentDetails.subjects_registered);
      }
      
      if (checkedSubjects.length === 0) {
        toast({ title: "Validation Error", description: "Please select at least one subject", variant: "destructive" });
        return;
      }
      
      const payload = {
        student_id: selectedStudent.user_id || selectedStudent.id,
        subjects: checkedSubjects,
        exam_period: examPeriod,
        semester: selectedStudent.semester_id,
        batch: selectedStudent.batch_id
      };
      
      const resp = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/exam-applications/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const json = await resp.json();
      if (resp.ok && json.success) {
        toast({ title: "Success", description: "Applications submitted successfully" });
        
        // Update local subjectsCache for modal reopening
        const cacheKey = `${selectedStudent.user_id || selectedStudent.id}:${examPeriod}`;
        if (subjectsCache.current[cacheKey] && subjectsCache.current[cacheKey].data) {
          const cacheData = subjectsCache.current[cacheKey].data;
          const updateStatus = (list: any[]) => {
            if (list) {
              list.forEach(subj => {
                if (appliedSubjects[subj.subject_code]) {
                  subj.status = 'Applied';
                  subj.applied_count = 1;
                }
              });
            }
          };
          updateStatus(cacheData.regular_subjects);
          updateStatus(cacheData.registered_electives);
          updateStatus(cacheData.registered_open_electives);
        }

        // update local status
        if (json.updated_student) {
          setStudentStatuses(prev => ({...prev, [json.updated_student.usn]: json.updated_student.status}));
        }
        setOpen(false);
      } else {
        toast({ title: "Error", description: json.message || "Failed to submit applications", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "An error occurred", variant: "destructive" });
    }
  };


  return (
    <Card className={theme === 'dark' ? 'bg-card text-foreground shadow-md' : 'bg-white text-gray-900 shadow-md'}>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 space-y-0 pb-4">
        <CardTitle className="text-2xl font-semibold leading-none tracking-tight text-gray-900">Exam Applications</CardTitle>
        <Button
          onClick={exportPDF}
          disabled={!batchId || !semesterId || !sectionId || students.length === 0 || downloadingPDF}
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-2"
        >
          {downloadingPDF ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4" />
              <span>Export PDF</span>
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <div id="exam-applications-filters" className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Exam Period</label>
            <Select 
              value={examPeriod} 
              onValueChange={(v) => {
                setExamPeriod(v);
                setTimeout(() => setIsBatchOpen(true), 150);
              }}
            >
              <SelectTrigger className={theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}>
                <SelectValue placeholder="Select exam period" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                <SelectItem value="june_july">June/July</SelectItem>
                <SelectItem value="nov_dec">November/December</SelectItem>
                <SelectItem value="jan_feb">January/February</SelectItem>
                <SelectItem value="apr_may">April/May</SelectItem>
                <SelectItem value="supplementary">Supplementary</SelectItem>
                <SelectItem value="revaluation">Revaluation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Batch</label>
            <Select 
              value={batchId} 
              onValueChange={(v) => {
                setBatchId(v);
                setTimeout(() => setIsSemOpen(true), 150);
              }} 
              disabled={loadingDropdowns || !examPeriod}
              open={isBatchOpen}
              onOpenChange={setIsBatchOpen}
            >
              <SelectTrigger className={theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}>
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {dropdownData.batches.length === 0 ? (
                  <SelectItem value="no_batches" disabled>No batches available</SelectItem>
                ) : (
                  dropdownData.batches.map(b => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Semester</label>
            <Select 
              value={semesterId} 
              onValueChange={(v) => { 
                setSemesterId(v); 
                setSectionId(""); 
                setTimeout(() => setIsSecOpen(true), 150);
              }} 
              disabled={loadingDropdowns || !batchId}
              open={isSemOpen}
              onOpenChange={setIsSemOpen}
            >
              <SelectTrigger className={theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}>
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {dropdownData.semesters.length === 0 ? (
                  <SelectItem value="no_semesters" disabled>No semesters available</SelectItem>
                ) : (
                  dropdownData.semesters.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>Semester {s.number}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Section</label>
            <Select 
              value={sectionId} 
              onValueChange={setSectionId} 
              disabled={loadingDropdowns || !semesterId || loadingSections}
              open={isSecOpen}
              onOpenChange={setIsSecOpen}
            >
              <SelectTrigger className={theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}>
                <SelectValue placeholder={loadingSections ? "Loading sections..." : "Select section"} />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {sections.length === 0 && !loadingSections ? (
                  <SelectItem value="no_sections" disabled>No sections available</SelectItem>
                ) : (
                  sections.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          {loadingStudents ?
          <div className="space-y-4">
              <div className="hidden md:block"><SkeletonTable rows={5} cols={5} /></div>
          </div> :
          <>
              {!batchId || !semesterId || !sectionId ? (
                <div className={`flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 mt-4 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                  <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-accent/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                    <Users className="w-12 h-12 opacity-80" />
                  </div>
                  <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Select Filters</h3>
                  <p className="max-w-xs text-base leading-relaxed">
                    Please select Batch, Semester, and Section to view students.
                  </p>
                </div>
              ) : students.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 mt-4 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                  <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-accent/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                    <Users className="w-12 h-12 opacity-80" />
                  </div>
                  <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Students Found</h3>
                  <p className="max-w-xs text-base leading-relaxed">
                    No students were found matching your criteria. Try adjusting your filters.
                  </p>
                </div>
              ) : (
                <table className={`hidden md:table w-full rounded-md ${theme === 'dark' ? 'border border-border' : 'border border-gray-200'} border-collapse`}>
                  <thead className={theme === 'dark' ? 'bg-muted text-foreground' : 'bg-gray-100 text-gray-900'}>
                    <tr>
                      <th className="px-4 py-3 text-center text-sm font-semibold">USN</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Name</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Semester</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className={theme === 'dark' ? 'divide-border' : 'divide-gray-200'}>
                    {students.map((student: any) =>
                  <tr key={student.usn} className={`border-b ${theme === 'dark' ? 'border-border hover:bg-muted' : 'border-gray-100 hover:bg-gray-50'} transition-colors`}>
                        <td className="px-4 py-3 text-sm font-medium text-center">{student.usn}</td>
                        <td className="px-4 py-3 text-sm text-center">{student.name}</td>
                        <td className="px-4 py-3 text-sm text-center">{student.semester}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-block ${studentStatuses[student.usn] === 'Applied' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {studentStatuses[student.usn] || 'Not Applied'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm flex gap-2 justify-center">
                          <Button onClick={() => openFor(student)} className="bg-primary hover:bg-primary/90 text-white h-8 px-3">
                            Apply / View
                          </Button>
                          {studentStatuses[student.usn] === 'Applied' &&
                            <Button
                              onClick={() => downloadHallTicket(student)}
                              className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 flex items-center gap-2"
                              disabled={downloadingHallTicketId === student.usn}>
                              {downloadingHallTicketId === student.usn ?
                                <Loader2 className="h-4 w-4 animate-spin" /> :
                                <FileDown className="h-4 w-4" />
                              }
                              Hall Ticket
                            </Button>
                          }
                        </td>
                      </tr>
                  )}
                  </tbody>
                </table>
              )}
            </>
          }
        </div>
      </CardContent>

      {totalPages > 1 && (
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
          <div>
            Showing {Math.min((currentPage - 1) * 50 + 1, totalStudentsCount)} to {Math.min(currentPage * 50, totalStudentsCount)} of {totalStudentsCount} records
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchStudents(currentPage - 1)}
              disabled={currentPage <= 1 || loadingStudents}
              className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
            >
              Previous
            </Button>

            <div className="flex items-center justify-center min-w-[2rem]">
              <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                {currentPage}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchStudents(currentPage + 1)}
              disabled={currentPage >= totalPages || loadingStudents}
              className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
            >
              Next
            </Button>
          </div>
        </CardFooter>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[70vw] max-h-[90vh] sm:max-h-[85vh] overflow-y-auto custom-scrollbar">
            <DialogTitle className="sr-only">Exam Application</DialogTitle>
            <div className="p-1 md:p-2 lg:p-4">
              <div ref={printRef} className="mt-4">
                <div id="exam-application-printable" className="p-3 md:p-4 lg:p-6 bg-white text-black" style={{ minWidth: '100%', maxWidth: '800px', margin: '0 auto' }}>
                  <div className="flex items-center justify-between mb-2 border-b pb-2">
                    <div>
                      <img
                        src={studentDetails?.org_logo || JSON.parse(sessionStorage.getItem("user") || '{}').org_logo || "/logo.jpeg"}
                        alt="Logo"
                        style={{ height: 96, width: 96, objectFit: 'contain', borderRadius: 6 }} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div className="font-bold text-lg uppercase" style={{ letterSpacing: '0.6px' }}>
                        {JSON.parse(sessionStorage.getItem("user") || '{}').org_name || "STALIGHT CAMPUS"}
                      </div>
                      <div className="text-xs text-muted-foreground">Official Campus Portal</div>
                    </div>
                    <div style={{ width: 120, textAlign: 'right' }}>
                      <div className="text-sm font-medium">Exam Application</div>
                      <div className="text-xs text-muted-foreground">{new Date().toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div className="text-center my-4">
                    <div className="font-bold text-lg">Exam Application Form</div>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="w-20 h-20 rounded-md">
                      {studentDetails?.student?.profile_picture_url && (
                        <AvatarImage src={studentDetails.student.profile_picture_url} alt={selectedStudent?.name} className="object-cover" />
                      )}
                      <AvatarFallback className="text-2xl font-medium">{(selectedStudent?.name || 'U')[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Name</div>
                        <div className="font-semibold text-base">{selectedStudent?.name || ''}</div>
                        <div className="text-xs text-muted-foreground">USN</div>
                        <div className="font-semibold text-base">{selectedStudent?.usn || ''}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Department</div>
                        <div className="font-semibold text-base">{selectedStudent?.branch || ''}</div>
                        <div className="text-xs text-muted-foreground">Semester</div>
                        <div className="font-semibold text-base">{selectedStudent?.semester || ''}</div>
                      </div>
                    </div>
                  </div>

                  <h4 className="font-medium mb-2">Regular Courses</h4>
                  <table className="w-full border-collapse" style={{ border: '1px solid #ddd' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Select</th>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Course Code</th>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Course Name</th>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {semesterSubjects.length > 0 ? semesterSubjects.map((sub) =>
                      <tr key={sub.subject_code}>
                          <td style={{ border: '1px solid #ddd', padding: 8 }}>
                            <input type="checkbox" checked={appliedSubjects[sub.subject_code] || false} onChange={() => handleApplyToggle(sub.subject_code)} className="w-4 h-4" />
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: 8 }}>{sub.subject_code}</td>
                          <td style={{ border: '1px solid #ddd', padding: 8 }}>{sub.name}</td>
                          <td style={{ border: '1px solid #ddd', padding: 8 }}>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${subjectStatuses[sub.subject_code] === 'Applied' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {subjectStatuses[sub.subject_code] || 'Not Applied'}
                            </span>
                          </td>
                        </tr>
                      ) : <tr><td colSpan={4} style={{ padding: 12 }}>No subjects available.</td></tr>}
                    </tbody>
                  </table>

                  <h4 className="font-medium mt-6 mb-2">Elective Courses (Registered)</h4>
                  <table className="w-full border-collapse mb-4" style={{ border: '1px solid #ddd' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Select</th>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Course Code</th>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Course Name</th>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(studentDetails?.subjects_registered || []).filter((x: any) => x.subject_type === 'elective').length > 0 ?
                      (studentDetails?.subjects_registered || []).filter((x: any) => x.subject_type === 'elective').map((r: any) =>
                      <tr key={r.subject_code}>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>
                              <input type="checkbox" checked={appliedSubjects[r.subject_code] || false} onChange={() => handleApplyToggle(r.subject_code)} className="w-4 h-4" />
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.subject_code}</td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.subject_name}</td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${subjectStatuses[r.subject_code] === 'Applied' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {subjectStatuses[r.subject_code] || 'Not Applied'}
                              </span>
                            </td>
                          </tr>
                      ) : <tr><td colSpan={4} style={{ padding: 12 }}>No elective subjects registered.</td></tr>}
                    </tbody>
                  </table>
                  
                  <div className="mt-6 flex justify-end">
                    <Button onClick={submitApplications} className="bg-primary text-white">Save / Apply Applications</Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </Card>
  );
};

export default ExamApplication;
