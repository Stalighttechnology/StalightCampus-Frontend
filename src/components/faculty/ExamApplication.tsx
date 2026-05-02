import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { useTheme } from "@/context/ThemeContext";
import { API_ENDPOINT, API_BASE_URL } from "@/utils/config";
import { manageSubjects } from "@/utils/hod_api";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { useToast } from "@/hooks/use-toast";
import { useProctorStudentsQuery } from "@/hooks/useApiQueries";
import type { ProctorStudent } from "@/utils/faculty_api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { SkeletonList, SkeletonTable } from "@/components/ui/skeleton";

interface ExamApplicationProps {
  proctorStudents?: ProctorStudent[];
  proctorStudentsLoading?: boolean;
}

const ExamApplication: React.FC<ExamApplicationProps> = ({ proctorStudents: initialProctorStudents = [], proctorStudentsLoading = false }) => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);

  const [search, setSearch] = useState("");
  const [examPeriod, setExamPeriod] = useState("june_july");
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

  // Pagination state aligned with system default (20) for better cache sharing
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Use hooks for fetching - requesting only essential fields to optimize payload
  const includeFields = 'id,user_id,name,usn,branch,semester,section';
  const {
    data: proctorData,
    isLoading: isProctorLoading,
    pagination: proctorPagination,
    refetch: refetchProctor
  } = useProctorStudentsQuery(true, includeFields, examPeriod);

  // Sync current page to pagination hook
  useEffect(() => {
    if (proctorPagination) proctorPagination.goToPage(currentPage);
  }, [currentPage, proctorPagination]);

  const students = proctorData?.data || initialProctorStudents;
  const totalPages = proctorPagination?.paginationState.totalPages || 1;
  const totalStudentsCount = proctorPagination?.paginationState.totalItems || 0;

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
  const fetchInProgressRef = useRef<number | null>(null);

  const downloadHallTicket = async (student: any) => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/hall-ticket/${student.id}/?exam_period=${examPeriod}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
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
      console.error('Error downloading hall ticket:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download hall ticket",
        variant: "destructive",
      });
    }
  };

  const filtered = students.filter((s: any) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (s.usn || "").toLowerCase().includes(q) || (s.name || "").toLowerCase().includes(q);
  });

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
            console.warn('exam-student-subjects returned no data, falling back to common/subjects');
          }
        } catch (e) {
          console.error('Failed to call exam-student-subjects', e);
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
            console.error('Failed to fetch common subjects', e);
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

        setStudentDetails({ subjects_registered: combinedFiltered, student: resJson?.data?.student || null });

        // Merge returned student meta (semester_id/batch_id) into selectedStudent for validation
        if (resJson && resJson.data && resJson.data.student) {
          const meta = resJson.data.student;
          setSelectedStudent(prev => {
            if (!prev) return prev;
            const newSemester = meta.semester_id ?? prev.semester_id;
            const newBatch = meta.batch_id ?? prev.batch_id;
            if (prev.semester_id === newSemester && prev.batch_id === newBatch) return prev;
            return { ...prev, semester_id: newSemester, batch_id: newBatch };
          });
          // also merge batch info into studentDetails if helpful
          setStudentDetails(sd => ({ ...(sd || {}), batch_name: meta.batch_name || (sd && sd.batch_name) }));
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
          Object.keys(subjectStatusMap).forEach(code => {
            initialApplied[code] = subjectStatusMap[code] === 'Applied';
          });
          setAppliedSubjects(initialApplied);
        }

      } catch (err) {
        console.error('Error in fetchDetails', err);
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
      console.error('Application update error:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update application. Please try again.",
        variant: "destructive"
      });
    }
  };

  const exportPdf = async () => {
    if (!printRef.current) return;
    setExporting(true);
    try {
      const [jspdfModule, html2canvasModule] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);

      // Resolve default vs named exports for html2canvas
      const html2canvasFn = (html2canvasModule && (html2canvasModule.default || html2canvasModule)) as any;

      // Resolve jsPDF constructor from various module shapes
      let jsPDFCtor: any = null;
      if (jspdfModule) {
        if ((jspdfModule as any).jsPDF) jsPDFCtor = (jspdfModule as any).jsPDF;
        else if (jspdfModule.default && (jspdfModule.default as any).jsPDF) jsPDFCtor = (jspdfModule.default as any).jsPDF;
        else if (jspdfModule.default) jsPDFCtor = jspdfModule.default;
        else jsPDFCtor = jspdfModule;
      }

      const element = printRef.current as HTMLElement;
      // Render element to canvas at higher scale for better quality
      const canvas = await html2canvasFn(element, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);

      const pdf = new jsPDFCtor('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10; // mm
      const contentWidth = pdfWidth - margin * 2;
      const imgWidth = contentWidth; // mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width; // mm
      const contentHeight = pdfHeight - margin * 2;

      // If content fits on one page
      if (imgHeight <= contentHeight) {
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
        pdf.save(`exam-application-${selectedStudent?.usn || 'student'}.pdf`);
      } else {
        // Split into pages
        const totalPages = Math.ceil(imgHeight / contentHeight);

        // compute page slice height in pixels
        const pxPerMm = canvas.width / imgWidth; // pixels per mm
        const sliceHeightPx = Math.floor(contentHeight * pxPerMm);

        for (let page = 0; page < totalPages; page++) {
          const sourceY = page * sliceHeightPx;
          const canvasPage = document.createElement('canvas');
          canvasPage.width = canvas.width;
          // last page may be shorter
          const remaining = canvas.height - sourceY;
          canvasPage.height = remaining < sliceHeightPx ? remaining : sliceHeightPx;

          const ctx = canvasPage.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvasPage.width, canvasPage.height);
            ctx.drawImage(canvas, 0, sourceY, canvas.width, canvasPage.height, 0, 0, canvasPage.width, canvasPage.height);
          }

          const pageData = canvasPage.toDataURL('image/jpeg', 1.0);
          const pageImgHeightMm = (canvasPage.height * imgWidth) / canvas.width;

          if (page > 0) pdf.addPage();
          pdf.addImage(pageData, 'JPEG', margin, margin, imgWidth, pageImgHeightMm);
        }

        pdf.save(`exam-application-${selectedStudent?.usn || 'student'}.pdf`);
      }
    } catch (err) {
      console.error('Export PDF failed', err);
      alert('Export failed. Please ensure jsPDF is installed (npm install jspdf)');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className={theme === 'dark' ? 'bg-card text-foreground shadow-md' : 'bg-white text-gray-900 shadow-md'}>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold leading-none tracking-tight text-gray-900">Exam Applications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className={`block text-lg font-medium mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Exam Period</label>
            <Select value={examPeriod} onValueChange={setExamPeriod}>
              <SelectTrigger className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                <SelectValue placeholder="Select exam period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="june_july">June/July</SelectItem>
                <SelectItem value="nov_dec">November/December</SelectItem>
                <SelectItem value="jan_feb">January/February</SelectItem>
                <SelectItem value="apr_may">April/May</SelectItem>
                <SelectItem value="supplementary">Supplementary</SelectItem>
                <SelectItem value="revaluation">Revaluation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Input
          placeholder="Search proctor students by USN or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}
        />

        <div className="max-h-[60vh] overflow-auto custom-scrollbar">
          {isProctorLoading || proctorStudentsLoading ? (
            <div className="space-y-4">
              <div className="md:hidden">
                <SkeletonList items={3} />
              </div>
              <div className="hidden md:block">
                <SkeletonTable rows={5} cols={5} />
              </div>
            </div>
          ) : (
            <>
              {/* Mobile view: Stacked cards */}
              <div className="md:hidden space-y-3">
                {filtered.map((student: any) => (
                  <div key={student.usn} className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'} shadow-sm`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{student.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{student.usn}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${studentStatuses[student.usn] === 'Applied'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                        }`}>
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
                      <Button onClick={() => openFor(student)} className="w-full bg-primary hover:bg-primary/90 text-white h-9">
                        Open Application
                      </Button>
                      {studentStatuses[student.usn] === 'Applied' && (
                        <Button
                          onClick={() => downloadHallTicket(student)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white h-9"
                        >
                          Download Hall Ticket
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">No students found.</div>
                )}
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
                  {filtered.map((student: any) => (
                    <tr key={student.usn} className={`border-b ${theme === 'dark' ? 'border-border hover:bg-muted' : 'border-gray-100 hover:bg-gray-50'} transition-colors`}>
                      <td className="px-4 py-3 text-sm font-medium text-center">{student.usn}</td>
                      <td className="px-4 py-3 text-sm text-center">{student.name}</td>
                      <td className="px-4 py-3 text-sm text-center">{student.semester}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-block ${studentStatuses[student.usn] === 'Applied'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                          }`}>
                          {studentStatuses[student.usn] || 'Not Applied'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm min-w-[400px]">
                        <div className="relative w-full flex justify-center items-center h-8">
                          <Button 
                            onClick={() => openFor(student)} 
                            className="bg-primary hover:bg-primary/90 text-white h-8 px-3 whitespace-nowrap z-10"
                          >
                            Open
                          </Button>
                          <div className="absolute left-[calc(50%+45px)] flex items-center">
                            {studentStatuses[student.usn] === 'Applied' && (
                              <Button
                                onClick={() => downloadHallTicket(student)}
                                className="bg-green-600 hover:bg-green-700 text-white h-8 px-2 whitespace-nowrap"
                              >
                                Download Hall Ticket
                              </Button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6">
                        {examPeriod ? `No students found with exam applications for ${examPeriod === 'june_july' ? 'June/July' : 'January/February'} period.` : 'No students found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between py-2 px-4 border rounded-md">
            <div className="text-sm text-gray-500">
              Showing {filtered.length} of {totalStudentsCount} students
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center px-2 text-sm font-medium">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[70vw] max-h-[90vh] sm:max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mt-5">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold leading-none tracking-tight text-gray-900">Exam Application</DialogTitle>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button onClick={async () => { await exportPdf(); }} className="bg-primary hover:bg-primary/90 text-white">
                  {exporting ? 'Exporting...' : 'Export PDF'}
                </Button>
              </div>
            </div>
            <div className="p-1 md:p-2 lg:p-4">
              {/* Existing Applications UI removed — statuses shown via checkboxes */}

              {/* Edit Mode Banner - NOT in PDF */}
              {isEditMode && editingApplication && (
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
                      size="sm"
                    >
                      Cancel Edit
                    </Button>
                  </div>
                </div>
              )}

              <div ref={printRef} className="mt-4">
                {/* Printable application form */}
                <div id="exam-application-printable" className="p-3 md:p-4 lg:p-6 bg-white text-black" style={{ minWidth: '100%', maxWidth: '800px', width: 'auto', margin: '0 auto' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <img 
                        src={JSON.parse(localStorage.getItem('user') || '{}').org_logo || "/logo.jpeg"} 
                        alt="Logo" 
                        style={{ height: 96, width: 96, objectFit: 'contain', borderRadius: 6 }} 
                      />
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div className="font-bold text-lg uppercase" style={{ letterSpacing: '0.6px' }}>
                        {JSON.parse(localStorage.getItem('user') || '{}').org_name || "NEURO CAMPUS"}
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
                      <Avatar className="w-16 md:w-16 lg:w-20 h-16 md:h-16 lg:h-20 rounded-md overflow-hidden">
                        {(
                            (studentDetails?.student_info && studentDetails.student_info.photo_url) ||
                            (studentDetails?.student && (studentDetails.student.profile_picture || studentDetails.student.photo_url)) ||
                            (selectedStudent && ((selectedStudent as any).photo || (selectedStudent as any).photo_url || (selectedStudent as any).profile_picture))
                          ) ? (
                            <img
                              src={
                                // Priority: studentDetails.student_info.photo_url -> studentDetails.student.profile_picture -> selectedStudent.profile_picture -> legacy photo/photo_url
                                studentDetails?.student_info?.photo_url
                                  ? (studentDetails.student_info.photo_url.startsWith('http')
                                    ? studentDetails.student_info.photo_url
                                    : `${API_BASE_URL}${studentDetails.student_info.photo_url}`)
                                  : (studentDetails?.student?.profile_picture ? studentDetails.student.profile_picture
                                    : (selectedStudent as any).profile_picture || (selectedStudent as any).photo || (selectedStudent as any).photo_url)
                              }
                              alt={selectedStudent?.name || studentDetails?.student_info?.name || 'Student'}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                          <AvatarFallback className="text-xl md:text-lg lg:text-2xl font-medium\">
                            {(selectedStudent?.name || studentDetails?.name || 'U')[0]?.toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
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
                      {semesterSubjects.length > 0 ? semesterSubjects.map((sub) => (
                        <tr key={sub.subject_code}>
                          <td style={{ border: '1px solid #ddd', padding: 8 }}>
                            <input
                              type="checkbox"
                              checked={appliedSubjects[sub.subject_code] || false}
                              onChange={() => handleApplyToggle(sub.subject_code)}
                              className="w-4 h-4"
                            />
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: 8 }}>{sub.subject_code}</td>
                          <td style={{ border: '1px solid #ddd', padding: 8 }}>{sub.name}</td>
                          <td style={{ border: '1px solid #ddd', padding: 8 }}>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${subjectStatuses[sub.subject_code] === 'Applied'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                              }`}>
                              {subjectStatuses[sub.subject_code] || 'Not Applied'}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={4} style={{ padding: 12 }}>No subjects available.</td></tr>
                      )}
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
                      {((studentDetails?.subjects_registered || []).filter((x: any) => x.subject_type === 'elective')).length > 0 ?
                        (studentDetails?.subjects_registered || []).filter((x: any) => x.subject_type === 'elective').map((r: any) => (
                          <tr key={r.subject_code}>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>
                              <input
                                type="checkbox"
                                checked={appliedSubjects[r.subject_code] || false}
                                onChange={() => handleApplyToggle(r.subject_code)}
                                className="w-4 h-4"
                              />
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.subject_code}</td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.subject_name}</td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${subjectStatuses[r.subject_code] === 'Applied'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                                }`}>
                                {subjectStatuses[r.subject_code] || 'Not Applied'}
                              </span>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={4} style={{ padding: 12 }}>No registered electives.</td></tr>
                        )}
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
                      {((studentDetails?.subjects_registered || []).filter((x: any) => x.subject_type === 'open_elective')).length > 0 ?
                        (studentDetails?.subjects_registered || []).filter((x: any) => x.subject_type === 'open_elective').map((r: any) => (
                          <tr key={r.subject_code}>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>
                              <input
                                type="checkbox"
                                checked={appliedSubjects[r.subject_code] || false}
                                onChange={() => handleApplyToggle(r.subject_code)}
                                className="w-4 h-4"
                              />
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.subject_code}</td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.subject_name}</td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${subjectStatuses[r.subject_code] === 'Applied'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                                }`}>
                                {subjectStatuses[r.subject_code] || 'Not Applied'}
                              </span>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={4} style={{ padding: 12 }}>No registered open electives.</td></tr>
                        )}
                    </tbody>
                  </table>

                  <h4 className="font-medium mt-6 mb-2">Fees Details</h4>
                  <table className="w-full border-collapse mb-4" style={{ border: '1px solid #ddd' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Fee Type</th>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ border: '1px solid #ddd', padding: 8 }}>Registration</td>
                        <td style={{ border: '1px solid #ddd', padding: 8 }}>100</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #ddd', padding: 8 }}>Exam fees for regular Courses</td>
                        <td style={{ border: '1px solid #ddd', padding: 8 }}>2000</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #ddd', padding: 8 }}>Marks card fees</td>
                        <td style={{ border: '1px solid #ddd', padding: 8 }}>300</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #ddd', padding: 8 }}>Arrear course fees</td>
                        <td style={{ border: '1px solid #ddd', padding: 8 }}>0</td>
                      </tr>
                      <tr style={{ background: '#f3f4f6', fontWeight: 'bold' }}>
                        <td style={{ border: '1px solid #ddd', padding: 8 }}>Total</td>
                        <td style={{ border: '1px solid #ddd', padding: 8 }}>2400</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4">
              {isEditMode ? (
                <Button onClick={handleUpdateApplication} className="bg-blue-500 hover:bg-blue-600 text-white">
                  Update Application
                </Button>
              ) : (
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
                  const selectedSubjectCodes = Object.entries(appliedSubjects)
                    .filter(([_, applied]) => applied)
                    .map(([subjectCode, _]) => subjectCode);

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
                    const previouslyAppliedCodes = Object.keys(existingMap).filter(code => existingMap[code].status === 'applied');
                    const toCancelCodes = previouslyAppliedCodes.filter(code => !selectedSubjectCodes.includes(code));

                    // Collect subject IDs to create (only for checked subjects that are not already applied)
                    const subjectIdsSet = new Set<number>();

                    // Handle semester subjects
                    for (const subjectCode of selectedSubjectCodes) {
                      // Skip ones already applied
                      if (existingMap[subjectCode] && existingMap[subjectCode].status === 'applied') continue;
                      const subject = semesterSubjects.find(s => s.subject_code === subjectCode);
                      if (subject) subjectIdsSet.add(subject.id);
                    }

                    // Handle registered subjects (electives and open electives)
                    const registeredSubjects = (studentDetails?.subjects_registered || []);
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
                          console.error('Failed to cancel application for', code, e);
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
                    console.error('Application submission error:', error);
                    toast({
                      title: "Application Failed",
                      description: error instanceof Error ? error.message : "Failed to submit applications. Please try again.",
                      variant: "destructive"
                    });
                  }
                }} className="bg-primary hover:bg-primary/90 text-white">
                  Apply
                </Button>
              )}
              <Button onClick={() => setOpen(false)} className="bg-white border border-gray-300 text-gray-900 hover:bg-gray-50">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ExamApplication;

