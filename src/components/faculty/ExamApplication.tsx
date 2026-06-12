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
import { FileDown, Loader2 } from "lucide-react";

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

      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update application. Please try again.",
        variant: "destructive"
      });
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


  return (
    <Card className={theme === 'dark' ? 'bg-card text-foreground shadow-md' : 'bg-white text-gray-900 shadow-md'}>
      <CardHeader id="exam-applications-header">
        <CardTitle className="text-2xl font-semibold leading-none tracking-tight text-gray-900">Exam Applications</CardTitle>
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
          <div className="flex-1">
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
                        <span className="text-muted-foreground mr-1">Semester:</span>
                        <span className="font-medium">{student.semester}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => openFor(student)}
                        className={`w-full h-9 font-medium ${
                          studentStatuses[student.usn] === 'Applied'
                            ? theme === 'dark' ? 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20' : 'bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 hover:text-primary'
                            : 'bg-primary hover:bg-[#9147e0] text-white border-0'
                        }`}
                        variant={studentStatuses[student.usn] === 'Applied' ? 'outline' : 'default'}
                      >
                        {studentStatuses[student.usn] === 'Applied' ? 'Edit Application' : 'Apply'}
                      </Button>
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
                {students.length === 0 &&
              <div className="text-center py-10 text-muted-foreground">No students found.</div>
              }
              </div>

              {/* Desktop view: Table */}
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
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-block ${studentStatuses[student.usn] === 'Applied' ?
                    'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'}`
                    }>
                          {studentStatuses[student.usn] || 'Not Applied'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm flex gap-2 justify-center">
                        <Button
                          onClick={() => openFor(student)}
                          className={`h-8 px-3 font-semibold transition-colors ${
                            studentStatuses[student.usn] === 'Applied'
                              ? theme === 'dark' ? 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20' : 'bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 hover:text-primary'
                              : 'bg-primary hover:bg-[#9147e0] text-white border-0'
                          }`}
                          variant={studentStatuses[student.usn] === 'Applied' ? 'outline' : 'default'}
                        >
                          {studentStatuses[student.usn] === 'Applied' ? 'Edit Application' : 'Apply'}
                        </Button>
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
                  {students.length === 0 &&
                <tr>
                      <td colSpan={5} className="text-center py-6">
                        {examPeriod ? `No students found with exam applications for ${examPeriod === 'june_july' ? 'June/July' : 'January/February'} period.` : 'No students found.'}
                      </td>
                    </tr>
                }
                </tbody>
              </table>
            </>
          }
        </div>
      </CardContent>

      {proctorPagination?.paginationState && proctorPagination.paginationState.totalItems > 0 && (
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
          <DialogContent className="w-[90%] md:w-full md:max-w-[70vw] h-[80vh] md:h-auto md:max-h-[80vh] overflow-y-auto custom-scrollbar rounded-xl">
            <DialogTitle className="sr-only">
              Exam Application — {selectedStudent?.name || 'Student'}
            </DialogTitle>
            <div className="p-1 md:p-2 lg:p-4">
              {/* Existing Applications UI removed — statuses shown via checkboxes */}

              {/* Edit Mode Banner - NOT in PDF */}
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

              <div ref={printRef} className="mt-4">
                {/* Printable application form */}
                <div id="exam-application-printable" className="p-3 md:p-4 lg:p-6 bg-white text-black" style={{ minWidth: '100%', maxWidth: '800px', width: 'auto', margin: '0 auto' }}>
                  <div className="flex items-center justify-between mb-2">
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

                  <hr style={{ marginBottom: 12, borderColor: '#e5e7eb' }} />
                  <div className="text-center mb-4">
                    <div className="font-bold text-lg">Exam Application Form</div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-3 lg:gap-4 mb-3 md:mb-4 lg:mb-4">

                    <div>
                      {(() => {
                        // Resolve photo URL with priority chain:
                        // 1. student_meta.profile_picture (R2/Cloudinary/local, resolved by backend)
                        // 2. student_meta.profile_picture_url
                        // 3. student_meta.photo_url
                        // 4. selectedStudent photo fields
                        const photoUrl =
                          studentDetails?.student?.profile_picture ||
                          studentDetails?.student?.profile_picture_url ||
                          studentDetails?.student?.photo_url ||
                          studentDetails?.student_info?.photo_url ||
                          (selectedStudent as any)?.profile_picture ||
                          (selectedStudent as any)?.profile_picture_url ||
                          (selectedStudent as any)?.photo_url ||
                          (selectedStudent as any)?.photo;

                        return photoUrl ? (
                          <img
                            src={photoUrl.startsWith('http') ? photoUrl : `${API_BASE_URL}${photoUrl}`}
                            alt={selectedStudent?.name || 'Student'}
                            className="w-16 md:w-16 lg:w-20 h-16 md:h-16 lg:h-20 rounded-md overflow-hidden object-cover border border-gray-200"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <Avatar className="w-16 md:w-16 lg:w-20 h-16 md:h-16 lg:h-20 rounded-md overflow-hidden">
                            <AvatarFallback className="text-xl md:text-lg lg:text-2xl font-medium">
                              {(selectedStudent?.name || studentDetails?.name || 'U')[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        );
                      })()}
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-2 md:gap-3 lg:gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Name</div>
                        <div className="font-semibold text-sm md:text-sm lg:text-base">{selectedStudent?.name || studentDetails?.student_info?.name || ''}</div>
                        <div className="text-xs text-muted-foreground">USN</div>
                        <div className="font-semibold text-sm md:text-sm lg:text-base">{selectedStudent?.usn || ''}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Department</div>
                        <div className="font-semibold text-sm md:text-sm lg:text-base">{selectedStudent?.branch || ''}</div>
                        <div className="text-xs text-muted-foreground">Semester</div>
                        <div className="font-semibold text-sm md:text-sm lg:text-base">{selectedStudent?.semester || ''}</div>
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
                            <input
                            type="checkbox"
                            checked={appliedSubjects[sub.subject_code] || false}
                            onChange={() => handleApplyToggle(sub.subject_code)}
                            className="w-4 h-4" />
                          
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: 8 }}>{sub.subject_code}</td>
                          <td style={{ border: '1px solid #ddd', padding: 8 }}>{sub.name}</td>
                          <td style={{ border: '1px solid #ddd', padding: 8 }}>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${subjectStatuses[sub.subject_code] === 'Applied' ?
                          'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'}`
                          }>
                              {subjectStatuses[sub.subject_code] || 'Not Applied'}
                            </span>
                          </td>
                        </tr>
                      ) :
                      <tr><td colSpan={4} style={{ padding: 12 }}>No subjects available.</td></tr>
                      }
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
                              <input
                            type="checkbox"
                            checked={appliedSubjects[r.subject_code] || false}
                            onChange={() => handleApplyToggle(r.subject_code)}
                            className="w-4 h-4" />
                          
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.subject_code}</td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.subject_name}</td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${subjectStatuses[r.subject_code] === 'Applied' ?
                          'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'}`
                          }>
                                {subjectStatuses[r.subject_code] || 'Not Applied'}
                              </span>
                            </td>
                          </tr>
                      ) :
                      <tr><td colSpan={4} style={{ padding: 12 }}>No registered electives.</td></tr>
                      }
                    </tbody>
                  </table>

                  <h4 className="font-medium mt-6 mb-2">Open Elective Courses (Registered)</h4>
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
                      {(studentDetails?.subjects_registered || []).filter((x: any) => x.subject_type === 'open_elective').length > 0 ?
                      (studentDetails?.subjects_registered || []).filter((x: any) => x.subject_type === 'open_elective').map((r: any) =>
                      <tr key={r.subject_code}>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>
                              <input
                            type="checkbox"
                            checked={appliedSubjects[r.subject_code] || false}
                            onChange={() => handleApplyToggle(r.subject_code)}
                            className="w-4 h-4" />
                          
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.subject_code}</td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.subject_name}</td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${subjectStatuses[r.subject_code] === 'Applied' ?
                          'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'}`
                          }>
                                {subjectStatuses[r.subject_code] || 'Not Applied'}
                              </span>
                            </td>
                          </tr>
                      ) :
                      <tr><td colSpan={4} style={{ padding: 12 }}>No registered open electives.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4">
              {isEditMode ?
              <Button onClick={handleUpdateApplication} className="bg-blue-500 hover:bg-blue-600 text-white">
                  Update Application
                </Button> :

              <Button onClick={async () => {
                if (!selectedStudent) return;

                // Validate that student has required data
                if (!selectedStudent.semester_id || !selectedStudent.batch_id) {
                  toast({
                    title: "Invalid student data",
                    description: "Student must have semester and batch information to apply for exams.",
                    variant: "destructive"
                  });
                  return;
                }

                // Get selected subjects from all tables
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
                  // Build map of existing applications by subject_code
                  const existingMap: Record<string, any> = {};
                  (existingApplications || []).forEach((app: any) => {
                    if (app.subject_code) existingMap[app.subject_code] = app;
                  });

                  // Determine which previously-applied subjects were unchecked -> cancel them
                  const previouslyAppliedCodes = Object.keys(existingMap).filter((code) => existingMap[code].status === 'applied');
                  const toCancelCodes = previouslyAppliedCodes.filter((code) => !selectedSubjectCodes.includes(code));

                  // Collect subject IDs to create (only for checked subjects that are not already applied)
                  const subjectIdsSet = new Set<number>();

                  // Handle semester subjects
                  for (const subjectCode of selectedSubjectCodes) {
                    // Skip ones already applied
                    if (existingMap[subjectCode] && existingMap[subjectCode].status === 'applied') continue;
                    const subject = semesterSubjects.find((s) => s.subject_code === subjectCode);
                    if (subject) subjectIdsSet.add(subject.id);
                  }

                  // Handle registered subjects (electives and open electives)
                  const registeredSubjects = studentDetails?.subjects_registered || [];
                  for (const sub of registeredSubjects) {
                    if (!selectedSubjectCodes.includes(sub.subject_code)) continue;
                    if (existingMap[sub.subject_code] && existingMap[sub.subject_code].status === 'applied') continue;
                    subjectIdsSet.add(sub.subject_id);
                  }

                  const subjectIdsToCreate = Array.from(subjectIdsSet);

                  // First, cancel unchecked previously applied applications
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
                    // Apply cancellations locally
                    cancelResults.forEach((r) => {
                      if (r && r.data) {
                        const app = r.data;
                        const subjCode = app.subject_code;
                        if (subjCode) {
                          setSubjectStatuses((prev) => ({ ...prev, [subjCode]: app.status === 'applied' ? 'Applied' : 'Not Applied' }));
                          setAppliedSubjects((prev) => ({ ...prev, [subjCode]: app.status === 'applied' }));
                          // remove from existingApplications if status is not applied
                          if (app.status !== 'applied') {
                            setExistingApplications((prev) => prev.filter((x: any) => x.id !== app.id));
                          }
                        }
                      }
                    });
                  }

                  // Then, create new applications for newly checked subjects
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

                    // Update per-subject statuses and existingApplications from server response (POST returns created apps)
                    if (result && Array.isArray(result.data)) {
                      const createdApps = result.data;
                      createdApps.forEach((app: any) => {
                        const subjCode = app.subject_code;
                        if (subjCode) {
                          setSubjectStatuses((prev) => ({ ...prev, [subjCode]: app.status === 'applied' ? 'Applied' : 'Not Applied' }));
                          setAppliedSubjects((prev) => ({ ...prev, [subjCode]: app.status === 'applied' }));
                          setExistingApplications((prev) => {
                            // avoid duplicates
                            if (prev.find((p: any) => p.id === app.id)) return prev;
                            return [...prev, app];
                          });
                        }
                      });
                    }

                    // Also update student-level status if provided
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

                  // Close the dialog
                  setOpen(false);

                } catch (error) {

                  toast({
                    title: "Application Failed",
                    description: error instanceof Error ? error.message : "Failed to submit applications. Please try again.",
                    variant: "destructive"
                  });
                }
              }} className="bg-primary hover:bg-primary/90 text-white">
                  Apply
                </Button>
              }
              <Button onClick={() => setOpen(false)} className="bg-white border border-gray-300 text-gray-900 hover:bg-gray-50">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>);

};

export default ExamApplication;