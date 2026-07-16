import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "../ui/dialog";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { useTheme } from "@/context/ThemeContext";
import { API_ENDPOINT, API_BASE_URL } from "@/utils/config";

import { fetchWithTokenRefresh } from "@/utils/authService";
import { useToast } from "@/hooks/use-toast";
import { useProctorStudentsQuery } from "@/hooks/useApiQueries";
import type { ProctorStudent } from "@/utils/faculty_api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { SkeletonList, SkeletonTable } from "@/components/ui/skeleton";
import { useDebouncedSearch } from "@/hooks/useOptimizations";
import { FileDown, Loader2, ClipboardList } from "lucide-react";
import { showWarningAlert } from "@/utils/sweetalert";

interface ExamApplicationProps {
  proctorStudents?: ProctorStudent[];
  proctorStudentsLoading?: boolean;
}

const ExamApplication: React.FC<ExamApplicationProps> = ({ proctorStudents: initialProctorStudents = [], proctorStudentsLoading = false }) => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);

  const { value: search, debouncedValue: debouncedSearch, setValue: setSearch } = useDebouncedSearch('', 500);
  // Normalize debounced search for API: trim and uppercase USN queries
  const processedSearch = useMemo(() => (debouncedSearch || '').toString().trim().toUpperCase(), [debouncedSearch]);
  const [examPeriod, setExamPeriod] = useState("june_july");

  // Track the last search/examPeriod we invalidated for to avoid redundant cache clears
  const lastInvalidatedRef = useRef<{search: string;examPeriod: string;} | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<ProctorStudent | null>(null);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [semesterSubjects, setSemesterSubjects] = useState<Array<any>>([]);
  const [appliedSubjects, setAppliedSubjects] = useState<Record<string, boolean>>({});
  const [studentStatuses, setStudentStatuses] = useState<Record<string, string>>({});
  const [subjectStatuses, setSubjectStatuses] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingApplications, setExistingApplications] = useState<Array<any>>([]);
  const [editingApplication, setEditingApplication] = useState<any>(null);
  const [isDirectDownload, setIsDirectDownload] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingHallTicketId, setDownloadingHallTicketId] = useState<string | null>(null);
  const [downloadingAllPDF, setDownloadingAllPDF] = useState(false);

  // Use hooks for fetching - requesting only essential fields to optimize payload
  const includeFields = 'id,user_id,name,usn,branch,semester,section';
  const {
    data: proctorData,
    isLoading: isProctorLoading,
    pagination: proctorPagination,
    refetch: refetchProctor
  } = useProctorStudentsQuery(true, includeFields, examPeriod, false, processedSearch);

  const students = proctorData?.data || [];
  const totalPages = proctorPagination?.paginationState.totalPages || 1;
  const totalStudentsCount = proctorPagination?.paginationState.totalItems || 0;

  // Reset to first page and invalidate cache when search or exam period actually changes
  useEffect(() => {
    const hasChanged = !lastInvalidatedRef.current ||
    lastInvalidatedRef.current.search !== processedSearch ||
    lastInvalidatedRef.current.examPeriod !== examPeriod;

    if (hasChanged) {
      // Mark that we've invalidated for this search/examPeriod combo
      lastInvalidatedRef.current = { search: processedSearch, examPeriod };

      // Invalidate the cache to force a fresh fetch
      queryClient.invalidateQueries({
        queryKey: ['proctorStudents']
      });
    }
  }, [processedSearch, examPeriod, queryClient]);

  // Track pagination ref for page resets
  const paginationRef = useRef(proctorPagination);
  useEffect(() => {
    paginationRef.current = proctorPagination;
  }, [proctorPagination]);

  // Reset pagination to page 1 when search or exam period changes (separate from cache invalidation)
  useEffect(() => {
    if (paginationRef.current && typeof paginationRef.current.goToPage === 'function') {
      paginationRef.current.goToPage(1);
    }
  }, [processedSearch, examPeriod]);

  // Sync status map from the consolidated proctor students response
  useEffect(() => {
    const entries = proctorData?.data || [];
    if (entries && Array.isArray(entries)) {
      const statusMap: Record<string, string> = {};
      entries.forEach((student: any) => {
        statusMap[student.usn] = student.status || 'Not Applied';
      });
      setStudentStatuses(statusMap);
    }
  }, [proctorData]);

  // Prevent duplicate fetches when dialog opens (React StrictMode may double-invoke effects)
  const fetchInProgressRef = useRef<string | null>(null);

  const downloadHallTicket = async (student: any) => {
    setDownloadingHallTicketId(student.usn);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/hall-ticket/${student.id}/?exam_period=${examPeriod}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to download hall ticket');
      }

      const blob = await response.blob();
      // try to read filename from content-disposition header
      let filename = `hall_ticket_${student.usn}.pdf`;
      try {
        const cd = response.headers.get('content-disposition') || response.headers.get('Content-Disposition');
        if (cd) {
          const m = cd.match(/filename\*?=(?:UTF-8'')?["']?([^;"']+)/i);
          if (m && m[1]) filename = decodeURIComponent(m[1]);
        }
      } catch (e) {

        // ignore and use fallback filename
      }
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

  const openFor = async (student: ProctorStudent) => {
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

  const handleDirectDownload = async (student: ProctorStudent) => {
    setDownloadingId(student.usn);
    try {
      await exportPdf(student);
    } finally {
      setDownloadingId(null);
    }
  };


  useEffect(() => {
    if (!open || !selectedStudent) return;

    const token = `${selectedStudent.id}:${examPeriod}`;
    if (fetchInProgressRef.current === token) return; // already fetching for this student+period
    fetchInProgressRef.current = token;

    const usn = selectedStudent.usn;

    const fetchDetails = async () => {
      try {
        setStudentDetails(null);

        // First try the new consolidated exam-student-subjects endpoint
        let regularSubjects: any[] = [];
        let registeredElectives: any[] = [];
        let registeredOpenElectives: any[] = [];

        let resJson: any = null;
        try {
          const url = `${API_ENDPOINT}/faculty/exam-student-subjects/?student_id=${selectedStudent.id}&exam_period=${examPeriod}`;
          const resp = await fetchWithTokenRefresh(url, { method: 'GET' });
          resJson = await resp.json();
          if (resp.ok && resJson.success && resJson.data) {
            regularSubjects = resJson.data.regular_subjects || [];
            registeredElectives = resJson.data.registered_electives || [];
            registeredOpenElectives = resJson.data.registered_open_electives || [];
          } else {

          }
        } catch (e) {

        }

        // Fallback to common subjects if regularSubjects empty
        if (regularSubjects.length === 0 && selectedStudent.branch_id && selectedStudent.semester_id) {
          try {
            const url = `${API_ENDPOINT}/common/subjects/?branch_id=${selectedStudent.branch_id}&semester_id=${selectedStudent.semester_id}`;
            const resp = await fetchWithTokenRefresh(url, { method: 'GET' });
            const subjResp = await resp.json();
            if (subjResp.success && subjResp.data) {
              regularSubjects = subjResp.data;
            }
          } catch (e) {

          }
        }

        setSemesterSubjects(regularSubjects);

        // Compose a combined registered subjects list for the UI (used earlier as studentDetails.subjects_registered)
        const combinedRegistered = [...registeredElectives.map((r: any) => ({
          subject_id: r.subject_id,
          subject_name: r.subject_name || r.subject_name,
          subject_code: r.subject_code,
          subject_type: r.subject_type,
          status: r.status
        })), ...registeredOpenElectives.map((r: any) => ({
          subject_id: r.subject_id,
          subject_name: r.subject_name || r.subject_name,
          subject_code: r.subject_code,
          subject_type: r.subject_type,
          status: r.status
        }))];

        // Defensive guard: if the server returned a student meta with a different semester
        // than the currently selected student's semester, the student was likely promoted.
        // In that case, drop any open-elective entries from the combined list to avoid
        // showing previous-semester open electives in the application UI.
        const metaSemester = resJson?.data?.student?.semester_id;
        const prevSemester = selectedStudent?.semester_id;
        let combinedFiltered = combinedRegistered;
        if (metaSemester && prevSemester && String(metaSemester) !== String(prevSemester)) {
          combinedFiltered = combinedRegistered.filter((it: any) => it.subject_type !== 'open_elective');
        }

        setStudentDetails({ subjects_registered: combinedFiltered, student: resJson?.data?.student || null, org_logo: resJson?.data?.org_logo || null });

        // Merge returned student meta (semester_id/batch_id) into selectedStudent for validation
        if (resJson && resJson.data && resJson.data.student) {
          const meta = resJson.data.student;
          setSelectedStudent((prev) => {
            if (!prev) return prev;
            const newSemester = meta.semester_id ?? prev.semester_id;
            const newBatch = meta.batch_id ?? prev.batch_id;
            if (prev.semester_id === newSemester && prev.batch_id === newBatch) return prev;
            return { ...prev, semester_id: newSemester, batch_id: newBatch };
          });
          // also merge batch info into studentDetails if helpful
          setStudentDetails((sd) => ({ ...(sd || {}), batch_name: meta.batch_name || sd && sd.batch_name }));
        }

        // Use applications returned by exam-student-subjects (if present)
        if (resJson && Array.isArray(resJson.data?.applications)) {
          setExistingApplications(resJson.data.applications);
          const subjectStatusMap: Record<string, string> = {};
          resJson.data.applications.forEach((app: any) => {
            if (app.subject_code) {
              subjectStatusMap[app.subject_code] = app.status === 'applied' ? 'Applied' : 'Not Applied';
            }
          });
          setSubjectStatuses(subjectStatusMap);
          // Initialize checkbox state: mark checked for applied subjects
          const initialApplied: Record<string, boolean> = {};
          Object.keys(subjectStatusMap).forEach((code) => {
            initialApplied[code] = subjectStatusMap[code] === 'Applied';
          });
          setAppliedSubjects(initialApplied);
        }

      } catch (err) {

      } finally {
        // clear the in-progress token so future opens/fetches are allowed
        fetchInProgressRef.current = null;
      }
    };

    fetchDetails();
  }, [open]);

  const handleApplyToggle = (subjectCode: string) => {
    setAppliedSubjects((s) => ({ ...s, [subjectCode]: !s[subjectCode] }));
  };

  const handleEditApplication = (application: any) => {
    setIsEditMode(true);
    setEditingApplication(application);
    // Pre-populate the form with existing data - checked if status is 'applied'
    setAppliedSubjects({ [application.subject_code]: application.status === 'applied' });
  };

  const handleUpdateApplication = async () => {
    if (!editingApplication || !selectedStudent) return;

    try {
      // Determine the new status based on whether the subject is checked
      const isSubjectChecked = appliedSubjects[editingApplication.subject_code] || false;
      const newStatus = isSubjectChecked ? 'applied' : 'not_applied';

      const updateData = {
        application_id: editingApplication.id,
        subject: editingApplication.subject,
        exam_period: editingApplication.exam_period,
        status: newStatus, // Use the new status based on checkbox
        semester: editingApplication.semester,
        batch: editingApplication.batch
      };

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/exam-applications/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update application');
      }

      toast({
        title: "Success",
        description: "Exam application updated successfully!"
      });

      // Reset edit mode and refresh data
      setIsEditMode(false);
      setEditingApplication(null);
      setAppliedSubjects({});

      // Refresh the dialog data
      if (selectedStudent) {
        // Re-trigger the useEffect by closing and reopening
        // If server returned updated_student, update local status map instead of full refetch
        if (result && result.updated_student) {
          const usn = result.updated_student.usn;
          const newStatus = result.updated_student.status || 'Not Applied';
          setStudentStatuses((prev) => ({ ...prev, [usn]: newStatus }));
          // Re-open to refresh dialog details
          setOpen(false);
          setTimeout(() => openFor(selectedStudent), 100);
        } else {
          setOpen(false);
          setTimeout(() => openFor(selectedStudent), 100);
        }
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to update application. Please try again.";
      if (errorMsg.toLowerCase().includes("window") && errorMsg.toLowerCase().includes("closed")) {
         showWarningAlert("Application Blocked", "Exam application is not opened for this selected batch, semester and exam period. COE is not configured in the student status page in COE.");
      } else {
         toast({
          title: "Update Failed",
          description: errorMsg,
          variant: "destructive"
        });
      }
    }
  };

  const exportPdf = async (studentToExport?: ProctorStudent) => {
    const student = studentToExport || selectedStudent;
    if (!student) return;
    setExporting(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/exam-applications/${student.id}/export-pdf/?exam_period=${examPeriod}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to export exam application PDF');
      }

      const blob = await response.blob();
      let filename = `exam-application-${student.usn}.pdf`;
      try {
        const cd = response.headers.get('content-disposition') || response.headers.get('Content-Disposition');
        if (cd) {
          const m = cd.match(/filename\*?=(?:UTF-8'')?["']?([^;"']+)/i);
          if (m && m[1]) filename = decodeURIComponent(m[1]);
        }
      } catch (e) {
        // ignore and use fallback filename
      }
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
        description: error instanceof Error ? error.message : "Failed to export PDF",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const exportAllPDF = async () => {
    setDownloadingAllPDF(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/exam-applications/export-pdf/?exam_period=${examPeriod}&search=${processedSearch}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to export exam application PDF');
      }

      const blob = await response.blob();
      let filename = `Exam_Applications_${examPeriod}.pdf`;
      try {
        const cd = response.headers.get('content-disposition') || response.headers.get('Content-Disposition');
        if (cd) {
          const m = cd.match(/filename\*?=(?:UTF-8'')?["']?([^;"']+)/i);
          if (m && m[1]) filename = decodeURIComponent(m[1]);
        }
      } catch (e) {
        // ignore and use fallback filename
      }
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
        description: error instanceof Error ? error.message : "Failed to export PDF",
        variant: "destructive"
      });
    } finally {
      setDownloadingAllPDF(false);
    }
  };


  return (
    <Card className={theme === 'dark' ? 'bg-card text-foreground shadow-md' : 'bg-white text-gray-900 shadow-md'}>
      <CardHeader id="exam-applications-header" className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 border-b mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
          <div className="flex justify-between items-start w-full">
            <div className="flex-1 min-w-0">
              <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Exam Applications</CardTitle>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                Manage and approve exam registration requests for your proctored students
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Desktop Export PDF Button */}
              <Button
                onClick={exportAllPDF}
                disabled={students.length === 0 || downloadingAllPDF}
                className="hidden sm:flex bg-primary hover:bg-primary/90 text-white font-medium px-4 h-10 rounded-xl items-center justify-center gap-2"
              >
                {downloadingAllPDF ? (
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
              {/* Mobile Download PDF Icon Button */}
              <Button
                onClick={exportAllPDF}
                disabled={students.length === 0 || downloadingAllPDF}
                size="icon"
                variant="outline"
                className="flex sm:hidden h-10 w-10 items-center justify-center border border-input bg-background"
              >
                {downloadingAllPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-full sm:w-64">
            <Select value={examPeriod} onValueChange={setExamPeriod}>
              <SelectTrigger className={theme === 'dark' ? 'bg-background border border-input text-foreground h-10 rounded-xl' : 'bg-white border border-gray-300 text-gray-900 h-10 rounded-xl'}>
                <SelectValue placeholder="Select exam period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="june_july">June/July</SelectItem>
                <SelectItem value="nov_dec">November/December</SelectItem>
                <SelectItem value="jan_feb">January/February</SelectItem>
                <SelectItem value="apr_may">April/May</SelectItem>
                <SelectItem value="sept_oct">September/October</SelectItem>
                <SelectItem value="feb_mar">February/March</SelectItem>
                <SelectItem value="supplementary">Supplementary</SelectItem>
                <SelectItem value="revaluation">Revaluation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-grow">
            <Input
              placeholder="Search proctor students by USN or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={theme === 'dark' ? 'bg-background border border-input text-foreground h-10 rounded-xl' : 'bg-white border border-gray-300 text-gray-900 h-10 rounded-xl'} />
          </div>
        </div>
        

        <div>
          {isProctorLoading || proctorStudentsLoading ?
          <div className="space-y-4">
              <div className="md:hidden">
                <SkeletonList items={3} />
              </div>
              <div className="hidden md:block">
                <SkeletonTable rows={5} cols={5} />
              </div>
            </div> :
          students.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'
              }`}>
              <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                <ClipboardList className="w-12 h-12 opacity-80" />
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Students Found</h3>
              <p className="max-w-md text-sm leading-relaxed">
                {(() => {
                  let periodLabel = examPeriod;
                  if (examPeriod === 'june_july') periodLabel = 'June/July';
                  else if (examPeriod === 'nov_dec') periodLabel = 'November/December';
                  else if (examPeriod === 'jan_feb') periodLabel = 'January/February';
                  else if (examPeriod === 'apr_may') periodLabel = 'April/May';
                  else if (examPeriod === 'sept_oct') periodLabel = 'September/October';
                  else if (examPeriod === 'feb_mar') periodLabel = 'February/March';
                  else if (examPeriod === 'supplementary') periodLabel = 'Supplementary';
                  else if (examPeriod === 'revaluation') periodLabel = 'Revaluation';
                  return `No students found with exam applications for the ${periodLabel} period.`;
                })()}
              </p>
            </div>
          ) : (
          <>
              {/* Mobile view: Stacked cards */}
              <div className="md:hidden space-y-3">
                {students.map((student: any) =>
              <div key={student.usn} className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'} shadow-sm`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm break-words">{student.name}</p>
                        <p className="text-xs text-muted-foreground break-all">{student.usn}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${studentStatuses[student.usn] === 'Applied' ?
                  'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'}`
                  }>
                        {studentStatuses[student.usn] || 'Not Applied'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mb-4 text-xs">
                      <div className="px-2 py-1 bg-muted rounded">
                        <span className="text-muted-foreground mr-1">{translateTerminology("Semester")}:</span>
                        <span className="font-medium">{student.semester}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {!(studentStatuses[student.usn] === 'Applied' && !student.is_window_open) && (
                        <Button
                          onClick={() => openFor(student)}
                          className={`w-full h-9 font-medium ${
                            studentStatuses[student.usn] === 'Applied'
                              ? theme === 'dark' ? 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20' : 'bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 hover:text-primary'
                              : 'bg-primary hover:bg-[#9147e0] text-white border-0'
                          } ${!student.is_window_open && studentStatuses[student.usn] !== 'Applied' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          variant={studentStatuses[student.usn] === 'Applied' ? 'outline' : 'default'}
                          disabled={!student.is_window_open && studentStatuses[student.usn] !== 'Applied'}
                          title={!student.is_window_open && studentStatuses[student.usn] !== 'Applied' ? "Exam application is closed for this period" : ""}
                        >
                          {!student.is_window_open && studentStatuses[student.usn] !== 'Applied'
                            ? 'Closed'
                            : studentStatuses[student.usn] === 'Applied' ? 'Edit Application' : 'Apply'}
                        </Button>
                      )}
                      {studentStatuses[student.usn] === 'Applied' && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => handleDirectDownload(student)}
                            className={`w-full h-9 flex items-center justify-center gap-1.5 font-medium text-xs ${
                              theme === 'dark'
                                ? 'bg-blue-950/20 text-blue-400 border border-blue-500/30 hover:bg-blue-950/40'
                                : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                            }`}
                            variant="outline"
                            disabled={downloadingId === student.usn}>
                            {downloadingId === student.usn ?
                              <Loader2 className="h-4 w-4 animate-spin" /> :
                              <FileDown className="h-4 w-4" />
                            }
                            Export PDF
                          </Button>
                          <Button
                            onClick={() => downloadHallTicket(student)}
                            className={`w-full h-9 flex items-center justify-center gap-1.5 font-medium text-xs ${
                              theme === 'dark'
                                ? 'bg-green-950/20 text-green-400 border-green-500/30 hover:bg-green-950/40'
                                : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            }`}
                            variant="outline"
                            disabled={downloadingHallTicketId === student.usn}>
                            {downloadingHallTicketId === student.usn ?
                              <Loader2 className="h-4 w-4 animate-spin" /> :
                              <FileDown className="h-4 w-4" />
                            }
                            Hall Ticket
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop view: Table */}
              <table className={`hidden md:table w-full rounded-md ${theme === 'dark' ? 'border border-border' : 'border border-gray-200'} border-collapse`}>
                <thead className={theme === 'dark' ? 'bg-muted text-foreground' : 'bg-gray-100 text-gray-900'}>
                  <tr>
                    <th className="px-4 py-3 text-center text-sm font-semibold">USN</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Name</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">{translateTerminology("Semester")}</th>
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
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-block ${studentStatuses[student.usn] === 'Applied' ?
                    'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'}`
                    }>
                          {studentStatuses[student.usn] || 'Not Applied'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm flex gap-2 justify-center">
                        {!(studentStatuses[student.usn] === 'Applied' && !student.is_window_open) && (
                          <Button
                            onClick={() => openFor(student)}
                            className={`h-8 px-3 font-semibold transition-colors ${
                              studentStatuses[student.usn] === 'Applied'
                                ? theme === 'dark' ? 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20' : 'bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 hover:text-primary'
                                : 'bg-primary hover:bg-[#9147e0] text-white border-0'
                            } ${!student.is_window_open && studentStatuses[student.usn] !== 'Applied' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            variant={studentStatuses[student.usn] === 'Applied' ? 'outline' : 'default'}
                            disabled={!student.is_window_open && studentStatuses[student.usn] !== 'Applied'}
                            title={!student.is_window_open && studentStatuses[student.usn] !== 'Applied' ? "Exam application is closed for this period" : ""}
                          >
                            {!student.is_window_open && studentStatuses[student.usn] !== 'Applied'
                              ? 'Closed'
                              : studentStatuses[student.usn] === 'Applied' ? 'Edit Application' : 'Apply'}
                          </Button>
                        )}
                        {studentStatuses[student.usn] === 'Applied' && (
                          <Button
                            onClick={() => handleDirectDownload(student)}
                            className={`h-8 px-3 flex items-center gap-2 font-semibold transition-colors ${
                              theme === 'dark'
                                ? 'bg-blue-950/20 text-blue-400 border border-blue-500/30 hover:bg-blue-950/40'
                                : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                            }`}
                            variant="outline"
                            disabled={downloadingId === student.usn}>
                            {downloadingId === student.usn ?
                              <Loader2 className="h-4 w-4 animate-spin" /> :
                              <FileDown className="h-4 w-4" />
                            }
                            Export PDF
                          </Button>
                        )}
                        {studentStatuses[student.usn] === 'Applied' && (
                          <Button
                            onClick={() => downloadHallTicket(student)}
                            className={`h-8 px-3 flex items-center gap-2 font-semibold transition-colors ${
                              theme === 'dark'
                                ? 'bg-green-950/20 text-green-400 border-green-500/30 hover:bg-green-950/40'
                                : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            }`}
                            variant="outline"
                            disabled={downloadingHallTicketId === student.usn}>
                            {downloadingHallTicketId === student.usn ?
                              <Loader2 className="h-4 w-4 animate-spin" /> :
                              <FileDown className="h-4 w-4" />
                            }
                            Hall Ticket
                          </Button>
                        )}
                      </td>
                    </tr>
                )}
                </tbody>
              </table>
            </>
          )}
        </div>
      </CardContent>

      {proctorPagination?.paginationState && proctorPagination.paginationState.totalPages > 1 && (
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
          <div>
            Showing {Math.min((proctorPagination.paginationState.page - 1) * proctorPagination.paginationState.pageSize + 1, proctorPagination.paginationState.totalItems)} to {Math.min(proctorPagination.paginationState.page * proctorPagination.paginationState.pageSize, proctorPagination.paginationState.totalItems)} of {proctorPagination.paginationState.totalItems} records
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => proctorPagination.goToPage(Math.max(1, proctorPagination.paginationState.page - 1))}
              disabled={proctorPagination.paginationState.page <= 1}
              className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
            >
              Previous
            </Button>

            <div className="flex items-center justify-center min-w-[2rem]">
              <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                {proctorPagination.paginationState.page}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => proctorPagination.goToPage(Math.min(proctorPagination.paginationState.totalPages, proctorPagination.paginationState.page + 1))}
              disabled={proctorPagination.paginationState.page >= proctorPagination.paginationState.totalPages}
              className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
            >
              Next
            </Button>
          </div>
        </CardFooter>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-[90vw] sm:max-w-[650px] h-[80vh] sm:max-h-[85vh] overflow-y-auto custom-scrollbar rounded-lg">
            <DialogTitle className="sr-only">
              Exam Application — {selectedStudent?.name || 'Student'}
            </DialogTitle>
            <div className="p-1 md:p-2 lg:p-4">
              {isEditMode && editingApplication &&
                <div className="mb-4 md:mb-5 lg:mb-6 p-2 md:p-3 lg:p-4 border rounded-lg bg-blue-50 border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-800">Editing Application</h3>
                      <p className="text-blue-600">
                        Subject: {editingApplication.subject_name} ({editingApplication.subject_code})
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setIsEditMode(false);
                        setEditingApplication(null);
                        setAppliedSubjects({});
                      }}
                      variant="outline"
                      size="sm">
                      Cancel Edit
                    </Button>
                  </div>
                </div>
              }

              <div ref={printRef} className="mt-2">
                <div className={`space-y-6 p-4 rounded-xl border transition-all ${
                  theme === 'dark' 
                    ? 'text-foreground bg-zinc-950 border-zinc-800 shadow-xl' 
                    : 'text-gray-900 bg-white border-gray-100 shadow-sm'
                }`}>
                  <div className={`border-b pb-4 ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-100'}`}>
                    <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>Student Info</h3>
                  </div>

                  {/* Student Details Stack */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={`border-b pb-2 ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-100'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>Name</span>
                      <div className={`text-sm font-semibold mt-0.5 ${theme === 'dark' ? 'text-zinc-200' : 'text-gray-900'}`}>
                        {selectedStudent?.name || ''}
                      </div>
                    </div>
                    <div className={`border-b pb-2 ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-100'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>USN</span>
                      <div className={`text-sm font-semibold mt-0.5 font-mono ${theme === 'dark' ? 'text-zinc-200' : 'text-gray-900'}`}>{selectedStudent?.usn || ''}</div>
                    </div>
                    <div className={`border-b pb-2 ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-100'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>Department</span>
                      <div className={`text-sm font-semibold mt-0.5 ${theme === 'dark' ? 'text-zinc-200' : 'text-gray-900'}`}>{selectedStudent?.branch || 'Computer Science'}</div>
                    </div>
                    <div className={`border-b pb-2 ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-100'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>Semester</span>
                      <div className={`text-sm font-semibold mt-0.5 ${theme === 'dark' ? 'text-zinc-200' : 'text-gray-900'}`}>{selectedStudent?.semester || ''}</div>
                    </div>
                  </div>

                  {/* Regular Courses */}
                  <div>
                    <h4 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-900'}`}>Regular Courses</h4>
                    <div className="space-y-3">
                      {semesterSubjects.length > 0 ? (
                        semesterSubjects.map((sub) => (
                          <div
                            key={sub.subject_code}
                            onClick={() => handleApplyToggle(sub.subject_code)}
                            className={`p-3 border rounded-xl flex items-center justify-between gap-3 shadow-sm hover:border-primary/40 transition-all cursor-pointer select-none ${
                              theme === 'dark' 
                                ? 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60' 
                                : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={appliedSubjects[sub.subject_code] || false}
                                onChange={() => handleApplyToggle(sub.subject_code)}
                                onClick={(e) => e.stopPropagation()}
                                className={`w-5 h-5 rounded text-primary focus:ring-primary accent-primary shrink-0 cursor-pointer ${
                                  theme === 'dark' ? 'border-zinc-700 bg-zinc-800' : 'border-gray-300'
                                }`}
                              />
                              <div>
                                <div className={`text-[10px] font-mono uppercase tracking-wider ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'}`}>{sub.subject_code}</div>
                                <div className={`font-semibold text-sm ${theme === 'dark' ? 'text-zinc-200' : 'text-gray-800'}`}>{sub.name}</div>
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
                              subjectStatuses[sub.subject_code] === 'Applied' 
                                ? theme === 'dark' ? 'bg-green-950/40 text-green-400 border border-green-900/30' : 'bg-green-100 text-green-800' 
                                : theme === 'dark' ? 'bg-zinc-900 text-zinc-400 border border-zinc-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {subjectStatuses[sub.subject_code] || 'Not Applied'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className={`text-center py-4 text-xs border border-dashed rounded-xl ${
                          theme === 'dark' ? 'text-zinc-500 border-zinc-800' : 'text-gray-500 border-gray-200'
                        }`}>
                          No subjects available.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Elective Courses */}
                  <div>
                    <h4 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-900'}`}>Elective Courses (Registered)</h4>
                    <div className="space-y-3">
                      {(studentDetails?.subjects_registered || []).filter((x: any) => x.subject_type === 'elective').length > 0 ? (
                        (studentDetails?.subjects_registered || []).filter((x: any) => x.subject_type === 'elective').map((r: any) => (
                          <div
                            key={r.subject_code}
                            onClick={() => handleApplyToggle(r.subject_code)}
                            className={`p-3 border rounded-xl flex items-center justify-between gap-3 shadow-sm hover:border-primary/40 transition-all cursor-pointer select-none ${
                              theme === 'dark' 
                                ? 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60' 
                                : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={appliedSubjects[r.subject_code] || false}
                                onChange={() => handleApplyToggle(r.subject_code)}
                                onClick={(e) => e.stopPropagation()}
                                className={`w-5 h-5 rounded text-primary focus:ring-primary accent-primary shrink-0 cursor-pointer ${
                                  theme === 'dark' ? 'border-zinc-700 bg-zinc-800' : 'border-gray-300'
                                }`}
                              />
                              <div>
                                <div className={`text-[10px] font-mono uppercase tracking-wider ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'}`}>{r.subject_code}</div>
                                <div className={`font-semibold text-sm ${theme === 'dark' ? 'text-zinc-200' : 'text-gray-800'}`}>{r.subject_name}</div>
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
                              subjectStatuses[r.subject_code] === 'Applied' 
                                ? theme === 'dark' ? 'bg-green-950/40 text-green-400 border border-green-900/30' : 'bg-green-100 text-green-800' 
                                : theme === 'dark' ? 'bg-zinc-900 text-zinc-400 border border-zinc-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {subjectStatuses[r.subject_code] || 'Not Applied'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className={`text-center py-4 text-xs border border-dashed rounded-xl ${
                          theme === 'dark' ? 'text-zinc-500 border-zinc-800' : 'text-gray-500 border-gray-200'
                        }`}>
                          No elective subjects registered.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Open Elective Courses */}
                  <div>
                    <h4 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-900'}`}>Open Elective Courses (Registered)</h4>
                    <div className="space-y-3">
                      {(studentDetails?.subjects_registered || []).filter((x: any) => x.subject_type === 'open_elective').length > 0 ? (
                        (studentDetails?.subjects_registered || []).filter((x: any) => x.subject_type === 'open_elective').map((r: any) => (
                          <div
                            key={r.subject_code}
                            onClick={() => handleApplyToggle(r.subject_code)}
                            className={`p-3 border rounded-xl flex items-center justify-between gap-3 shadow-sm hover:border-primary/40 transition-all cursor-pointer select-none ${
                              theme === 'dark' 
                                ? 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60' 
                                : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={appliedSubjects[r.subject_code] || false}
                                onChange={() => handleApplyToggle(r.subject_code)}
                                onClick={(e) => e.stopPropagation()}
                                className={`w-5 h-5 rounded text-primary focus:ring-primary accent-primary shrink-0 cursor-pointer ${
                                  theme === 'dark' ? 'border-zinc-700 bg-zinc-800' : 'border-gray-300'
                                }`}
                              />
                              <div>
                                <div className={`text-[10px] font-mono uppercase tracking-wider ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'}`}>{r.subject_code}</div>
                                <div className={`font-semibold text-sm ${theme === 'dark' ? 'text-zinc-200' : 'text-gray-800'}`}>{r.subject_name}</div>
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
                              subjectStatuses[r.subject_code] === 'Applied' 
                                ? theme === 'dark' ? 'bg-green-950/40 text-green-400 border border-green-900/30' : 'bg-green-100 text-green-800' 
                                : theme === 'dark' ? 'bg-zinc-900 text-zinc-400 border border-zinc-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {subjectStatuses[r.subject_code] || 'Not Applied'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className={`text-center py-4 text-xs border border-dashed rounded-xl ${
                          theme === 'dark' ? 'text-zinc-500 border-zinc-800' : 'text-gray-500 border-gray-200'
                        }`}>
                          No open elective subjects registered.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`pt-4 border-t flex flex-col sm:flex-row gap-3 justify-end ${
                    theme === 'dark' ? 'border-zinc-800' : 'border-gray-100'
                  }`}>
                    {isEditMode ? (
                      <Button onClick={handleUpdateApplication} className="bg-blue-500 hover:bg-blue-600 text-white h-10 rounded-xl font-semibold w-full sm:w-auto border-0">
                        Update Application
                      </Button>
                    ) : (
                      <Button onClick={async () => {
                        if (!selectedStudent) return;

                        if (!selectedStudent.semester_id || !selectedStudent.batch_id) {
                          toast({
                            title: "Invalid student data",
                            description: "Student must have semester and batch information to apply for exams.",
                            variant: "destructive"
                          });
                          return;
                        }

                        const selectedSubjectCodes = Object.entries(appliedSubjects).
                          filter(([_, applied]) => applied).
                          map(([subjectCode, _]) => subjectCode);

                        if (selectedSubjectCodes.length === 0) {
                          toast({
                            title: "No subjects selected",
                            description: "Please select at least one subject to apply for.",
                            variant: "destructive"
                          });
                          return;
                        }

                        try {
                          const existingMap: Record<string, any> = {};
                          (existingApplications || []).forEach((app: any) => {
                            if (app.subject_code) existingMap[app.subject_code] = app;
                          });

                          const previouslyAppliedCodes = Object.keys(existingMap).filter((code) => existingMap[code].status === 'applied');
                          const toCancelCodes = previouslyAppliedCodes.filter((code) => !selectedSubjectCodes.includes(code));
                          const subjectIdsSet = new Set<number>();

                          for (const subjectCode of selectedSubjectCodes) {
                            if (existingMap[subjectCode] && existingMap[subjectCode].status === 'applied') continue;
                            const subject = semesterSubjects.find((s) => s.subject_code === subjectCode);
                            if (subject) subjectIdsSet.add(subject.id);
                          }

                          const registeredSubjects = studentDetails?.subjects_registered || [];
                          for (const sub of registeredSubjects) {
                            if (!selectedSubjectCodes.includes(sub.subject_code)) continue;
                            if (existingMap[sub.subject_code] && existingMap[sub.subject_code].status === 'applied') continue;
                            subjectIdsSet.add(sub.subject_id);
                          }

                          const subjectIdsToCreate = Array.from(subjectIdsSet);
                          let cancelResults: Array<any> = [];

                          if (toCancelCodes.length > 0) {
                            const cancelPromises = toCancelCodes.map(async (code) => {
                              const app = existingMap[code];
                              if (!app) return null;
                              try {
                                const updateData = {
                                  application_id: app.id,
                                  subject: app.subject,
                                  exam_period: examPeriod,
                                  status: 'not_applied',
                                  semester: selectedStudent.semester_id,
                                  batch: selectedStudent.batch_id
                                };
                                const resp = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/exam-applications/`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(updateData)
                                });
                                const resJson = await resp.json();
                                if (!resp.ok) throw new Error(resJson.message || 'Failed to update application');
                                return resJson;
                              } catch (e) {
                                return null;
                              }
                            });
                            cancelResults = await Promise.all(cancelPromises);
                            cancelResults.forEach((r) => {
                              if (r && r.data) {
                                const app = r.data;
                                const subjCode = app.subject_code;
                                if (subjCode) {
                                  setSubjectStatuses((prev) => ({ ...prev, [subjCode]: app.status === 'applied' ? 'Applied' : 'Not Applied' }));
                                  setAppliedSubjects((prev) => ({ ...prev, [subjCode]: app.status === 'applied' }));
                                  if (app.status !== 'applied') {
                                    setExistingApplications((prev) => prev.filter((x: any) => x.id !== app.id));
                                  }
                                }
                              }
                            });
                          }

                          if (subjectIdsToCreate.length > 0) {
                            const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/exam-applications/`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                student_id: selectedStudent.id,
                                subjects: subjectIdsToCreate,
                                exam_period: examPeriod,
                                semester: selectedStudent.semester_id,
                                batch: selectedStudent.batch_id
                              })
                            });
                            const result = await response.json();
                            if (!response.ok && response.status !== 200 && response.status !== 207) {
                              throw new Error(result.message || 'Failed to submit applications');
                            }

                            if (result && Array.isArray(result.data)) {
                              const createdApps = result.data;
                              createdApps.forEach((app: any) => {
                                const subjCode = app.subject_code;
                                if (subjCode) {
                                  setSubjectStatuses((prev) => ({ ...prev, [subjCode]: app.status === 'applied' ? 'Applied' : 'Not Applied' }));
                                  setAppliedSubjects((prev) => ({ ...prev, [subjCode]: app.status === 'applied' }));
                                  setExistingApplications((prev) => {
                                    if (prev.find((p: any) => p.id === app.id)) return prev;
                                    return [...prev, app];
                                  });
                                }
                              });
                            }

                            if (result && result.updated_student) {
                              const usn = result.updated_student.usn;
                              const newStatus = result.updated_student.status || 'Not Applied';
                              setStudentStatuses((prev) => ({ ...prev, [usn]: newStatus }));
                            }
                          }

                          toast({
                            title: "Success",
                            description: `Applications updated successfully.`
                          });

                          setOpen(false);
                        } catch (error) {
                          const errorMsg = error instanceof Error ? error.message : "Failed to submit applications. Please try again.";
                          if (errorMsg.toLowerCase().includes("window") && errorMsg.toLowerCase().includes("closed")) {
                             showWarningAlert("Application Blocked", "Exam application is not opened for this selected batch, semester and exam period. COE is not configured in the student status page in COE.");
                          } else {
                             toast({
                              title: "Application Failed",
                              description: errorMsg,
                              variant: "destructive"
                            });
                          }
                        }
                      }} className="bg-primary hover:bg-[#9147e0] text-white h-10 rounded-xl font-semibold w-full sm:w-auto border-0">
                        Save / Apply Applications
                      </Button>
                    )}
                    <Button onClick={() => setOpen(false)} className={`h-10 rounded-xl font-semibold w-full sm:w-auto border transition-colors ${
                      theme === 'dark' 
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white' 
                        : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                    }`}>Close</Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </Card>);

};

export default ExamApplication;