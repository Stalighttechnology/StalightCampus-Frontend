import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import { ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";



const MakeupExam = () => {
  const role = typeof globalThis !== 'undefined' && globalThis.window ? globalThis.window.localStorage.getItem('role') : null;
  const { theme } = useTheme();
  const [filters, setFilters] = useState({ batch_id: "", branch_id: "", semester_id: "", section_id: "", exam_period: "" });
  const [usn, setUsn] = useState("");
  const [messageModal, setMessageModal] = useState<{ open: boolean; title?: string; message?: string }>({ open: false });
  const [students, setStudents] = useState<Array<{ usn: string; name: string; student_id: number; subjects: Array<{ subject_id: number; subject_name: string; cie_marks?: number; see_marks?: number; total_marks?: number; status: string; applied: boolean; request_details?: any }> }>>([]);
  const [loading, setLoading] = useState(false);
  const [selectionMap, setSelectionMap] = useState<Record<number, boolean>>({});
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [confirmMakeup, setConfirmMakeup] = useState<{ open: boolean; student_id?: number; subject_id?: number; subject_name?: string }>({ open: false });
  const [viewModal, setViewModal] = useState<{ open: boolean; request?: any }>({ open: false });

  const loadStudents = async () => {
    if (loading) return; // Prevent duplicate calls
    setLoading(true);
    const qs = new URLSearchParams();
    if (usn.trim()) {
      qs.set('usn', usn.trim());
      qs.set('exam_period', filters.exam_period);
    } else {
      qs.set("batch_id", filters.batch_id);
      qs.set("branch_id", filters.branch_id);
      qs.set("semester_id", filters.semester_id);
      qs.set("exam_period", filters.exam_period);
    }

    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/makeup/students/?${qs.toString()}`, { method: 'GET' });
      const json = (await res.json()) as Record<string, unknown>;
      const payload = (json.results && typeof json.results === 'object') ? (json.results as Record<string, unknown>) : json;
      const success = payload.success as boolean | undefined;
      const studentsData = payload.students as Array<{ usn: string; name: string; student_id: number; subjects: Array<{ subject_id: number; subject_name: string; cie_marks?: number; see_marks?: number; total_marks?: number; status: string; applied?: boolean }> }> | undefined;
      const message = payload.message as string | undefined;

      if (success) {
        const safeStudents = (studentsData || []).map((st) => ({
          ...st,
          subjects: (st.subjects || []).map((sb) => ({ ...sb, applied: !!sb.applied }))
        }));
        setStudents(safeStudents);
      } else {
        setStudents([]);
        console.error('Load students error response:', payload);
        setMessageModal({ open: true, title: 'Error', message: message || 'Failed to load students' });
      }
    } catch (err) {
      console.error('Error loading students:', err);
      setStudents([]);
      setMessageModal({ open: true, title: 'Error', message: 'Failed to load students (network or auth error)' });
    }
    setLoading(false);
  };

  const applyMakeup = async () => {
    if (!selectedStudent || !selectedSubject) {
      setMessageModal({ open: true, title: 'Error', message: 'Select student and subject' });
      return;
    }
    const form = new FormData();
    form.append("student_id", String(selectedStudent));
    form.append("subject_id", String(selectedSubject));
    form.append("batch_id", filters.batch_id);
    form.append("branch_id", filters.branch_id);
    form.append("semester_id", filters.semester_id);
    form.append("exam_period", filters.exam_period);
    form.append("reason", reason);

    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/makeup/request/`, { method: "POST", body: form });
      const json = (await res.json()) as Record<string, unknown>;
      const success = json.success as boolean | undefined;
      const makeup_request = json.makeup_request as boolean | undefined;
      const message = json.message as string | undefined;

      if (success) {
        setMessageModal({ open: true, title: 'Success', message: 'Makeup request submitted' });
        setSelectedStudent(null);
        setSelectedSubject(null);
        setReason("");
      } else if (makeup_request) {
        setMessageModal({ open: true, title: 'Success', message: 'Makeup request submitted' });
      } else {
        setMessageModal({ open: true, title: 'Error', message: message || 'Error' });
      }
    } catch (err) {
      console.error('Error applying makeup:', err);
      setMessageModal({ open: true, title: 'Error', message: 'Network error' });
    }
  };

  const getStatusBadge = (status: string, applied: boolean) => {
    if (applied) {
      return <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Applied</span>;
    }
    return status === 'pass' ? (
      <span className="text-green-600">Pass</span>
    ) : (
      <span className="text-red-600">Fail</span>
    );
  };

  const handleApplyClick = (studentId: number, subjectId: number, subjectName: string) => {
    setSelectedStudent(studentId);
    setSelectedSubject(subjectId);
    setConfirmMakeup({ open: true, student_id: studentId, subject_id: subjectId, subject_name: subjectName });
  };

  const markSubjectAsApplied = (subjectId: number) => {
    const updateSubjectInStudent = (st: typeof students[0]) => {
      const newSubjects = st.subjects.map((sb) =>
        sb.subject_id === subjectId ? { ...sb, applied: true } : sb
      );
      return { ...st, subjects: newSubjects };
    };
    setStudents(prev => prev.map(updateSubjectInStudent));
  };

  const handleViewRequest = (subjectId: number) => {
    // Find the request details from the current search results
    for (const student of students) {
      const subject = student.subjects.find((s: any) => s.subject_id === subjectId && s.applied && s.request_details);
      if (subject) {
        // Transform the request_details to match the expected format for the modal
        const request = {
          subject: subjectId,
          subject_name: subject.subject_name,
          status: subject.request_details.status,
          exam_period: filters.exam_period, // Use the current exam period from filters
          requested_at: subject.request_details.requested_at,
          processed_by_name: subject.request_details.processed_by,
          processed_at: subject.request_details.processed_at,
          reason: '', // Not available in the search results
          response_note: subject.request_details.response_note,
        };
        setViewModal({ open: true, request });
        return;
      }
    }
  };

  const handleApplyMakeup = async () => {
    await applyMakeup();
    if (selectedSubject) {
      markSubjectAsApplied(selectedSubject);
    }
  };

  const handleSelectionChange = (subjectId: number, checked: boolean) => {
    setSelectionMap(prev => ({ ...prev, [subjectId]: checked }));
  };

  const renderApplyButton = (applied: boolean, studentId: number, subjectId: number, subjectName: string) => (
    applied ? (
      <Button
        onClick={() => handleViewRequest(subjectId)}
        variant="outline"
        className="text-xs sm:text-sm h-auto px-2 py-1 border-blue-500 text-blue-600 hover:bg-blue-50"
      >
        View
      </Button>
    ) : (
      <Button
        disabled={loading}
        onClick={() => handleApplyClick(studentId, subjectId, subjectName)}
        variant="default"
        className="text-xs sm:text-sm h-auto px-2 py-1 bg-primary hover:bg-primary/90 text-white"
      >
        Apply
      </Button>
    )
  );

  const renderActionCell = (sub: { subject_id: number; subject_name: string; applied: boolean; request_details?: any }, studentId: number, isStudentRole: boolean) => {
    if (!sub.subject_id) {
      return 'N/A';
    }
    if (isStudentRole) {
      // If the student has already applied for this subject, show a View button
      if (sub.applied) {
        return (
          <Button
            onClick={() => handleViewRequest(sub.subject_id)}
            variant="outline"
            className="text-xs sm:text-sm h-auto px-2 py-1 border-blue-500 text-blue-600 hover:bg-blue-50"
          >
            View
          </Button>
        );
      }

      // Otherwise allow selecting the subject for applying
      return (
        <label className="text-xs flex items-center gap-1">
          <input
            type="checkbox"
            checked={!!selectionMap[sub.subject_id]}
            onChange={(e) => handleSelectionChange(sub.subject_id, e.target.checked)}
          />
          <span>Select</span>
        </label>
      );
    }

    return renderApplyButton(sub.applied, studentId, sub.subject_id, sub.subject_name);
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <div className="w-full mx-auto">
        <Card className={`${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
          <CardHeader className="p-3 sm:p-4 lg:p-6 border-b">
            <CardTitle className={`text-2xl font-semibold leading-none tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Makeup Exam Requests</CardTitle>
            <p className={`text-xs sm:text-sm mt-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
              Submit makeup exam requests for students — search by USN or select batch/branch and exam period.
            </p>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 space-y-6">
            {/* Filter Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 items-end">
              <div className="sm:col-span-1">
                <label htmlFor="usn-input" className="text-xs sm:text-sm block mb-1 font-medium">USN</label>
                <input
                  id="usn-input"
                  value={usn}
                  onChange={e => setUsn(e.target.value)}
                  placeholder="Enter student USN"
                  className={`w-full px-2 sm:px-3 py-2 text-xs sm:text-sm rounded border ${theme === 'dark'
                      ? 'bg-input border-border text-foreground'
                      : 'bg-white border-gray-300 text-gray-900'
                    }`}
                />
              </div>

              <div className="sm:col-span-1">
                <label className="text-xs sm:text-sm block mb-1 font-medium">Exam Period</label>
                <Select
                  value={filters.exam_period}
                  onValueChange={(value) => setFilters({ ...filters, exam_period: value })}
                >
                  <SelectTrigger className={theme === 'dark' ? 'bg-input border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}>
                    <SelectValue placeholder="Select Exam Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="june_july">June/July</SelectItem>
                    <SelectItem value="nov_dec">Nov/Dec</SelectItem>
                    <SelectItem value="jan_feb">Jan/Feb</SelectItem>
                    <SelectItem value="apr_may">Apr/May</SelectItem>
                    <SelectItem value="supplementary">Supplementary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-1 lg:col-span-1">
                <Button
                  onClick={loadStudents}
                  disabled={loading}
                  className="w-full px-3 py-2 text-xs sm:text-sm h-auto bg-primary hover:bg-primary/90 text-white"
                >
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>

            {/* Results Section */}
            {!loading && students.length > 0 ? (
              <div className="space-y-6 pt-4 border-t">
                {students.map(s => (
                  <div key={s.student_id} className={`rounded-xl border ${theme === 'dark' ? 'bg-background/50 border-border' : 'bg-gray-50 border-gray-200'} overflow-hidden`}>
                    <div className="p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div>
                          <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Student</p>
                          <h3 className="text-sm sm:text-base lg:text-lg font-semibold">{s.usn} - {s.name}</h3>
                        </div>
                        <div className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                          Exam: {filters.exam_period ? filters.exam_period.replace('_', ' / ') : '-'}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 sm:p-4 lg:p-6 pt-0">
                      {/* Desktop Table */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm">
                          <thead>
                            <tr className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                              <th className="text-left p-2 sm:p-3">Subject</th>
                              <th className="text-right p-2 sm:p-3">CIE</th>
                              <th className="text-right p-2 sm:p-3">SEE</th>
                              <th className="text-right p-2 sm:p-3">Total</th>
                              <th className="text-left p-2 sm:p-3">Status</th>
                              <th className="text-left p-2 sm:p-3">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.subjects.map((sub) => (
                              <tr key={sub.subject_id} className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-100'}`}>
                                <td className="p-2 sm:p-3">{sub.subject_name}</td>
                                <td className="text-right p-2 sm:p-3">{sub.cie_marks ?? '-'}</td>
                                <td className="text-right p-2 sm:p-3">{sub.see_marks ?? '-'}</td>
                                <td className="text-right p-2 sm:p-3">{sub.total_marks ?? '-'}</td>
                                <td className="p-2 sm:p-3">
                                  {getStatusBadge(sub.status, sub.applied)}
                                </td>
                                <td className="p-2 sm:p-3">
                                  {renderActionCell(sub, s.student_id, role === 'student')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Cards */}
                      <div className="sm:hidden space-y-2">
                        {s.subjects.map((sub) => (
                          <div
                            key={sub.subject_id}
                            className={`p-2 rounded border ${theme === 'dark' ? 'bg-background border-border' : 'bg-gray-50 border-gray-200'}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <p className="text-xs font-medium">{sub.subject_name}</p>
                                <div className="flex gap-2 mt-1 text-xs">
                                  <span>CIE: {sub.cie_marks ?? '-'}</span>
                                  <span>SEE: {sub.see_marks ?? '-'}</span>
                                </div>
                              </div>
                              <div className="text-right ml-2">
                                {getStatusBadge(sub.status, sub.applied)}
                              </div>
                            </div>

                            {renderActionCell(sub, s.student_id, role === 'student')}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !loading && (
                <div className={`text-center p-6 sm:p-8 rounded-lg border border-dashed ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                  <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                    No students found. Try different search criteria.
                  </p>
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Student Payment Section */}
        {role === 'student' && students.length > 0 && (
          <Card className={`${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs sm:text-sm">
                  <p>Selected: {Object.keys(selectionMap).filter(k => selectionMap[Number(k)]).length}</p>
                  <p className="font-semibold">
                    Total: ₹{Object.keys(selectionMap).reduce((acc, k) => acc + (selectionMap[Number(k)] ? 300 : 0), 0)}
                  </p>
                </div>
                <Button
                  onClick={async () => {
                    const items = Object.entries(selectionMap).map(([k]) => ({ subject_id: Number(k) })).filter((it) => selectionMap[it.subject_id]);
                    if (items.length === 0) {
                      return setMessageModal({ open: true, title: 'Error', message: 'Select at least one subject to pay' });
                    }
                    if (!filters.exam_period) {
                      return setMessageModal({ open: true, title: 'Error', message: 'Select exam period' });
                    }

                    setLoading(true);
                    try {
                      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/makeup/initiate-payment/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ items, exam_period: filters.exam_period })
                      });
                      const json = (await res.json()) as Record<string, unknown>;
                      const success = json.success as boolean | undefined;
                      const checkoutUrl = json.checkout_url as string | undefined;
                      const message = json.message as string | undefined;

                      if (success && checkoutUrl && globalThis.window) {
                        globalThis.window.location.href = checkoutUrl;
                      } else {
                        setMessageModal({ open: true, title: 'Error', message: message || 'Failed to initiate payment' });
                      }
                    } catch (err) {
                      console.error(err);
                      setMessageModal({ open: true, title: 'Error', message: 'Network error' });
                    }
                    setLoading(false);
                  }}
                  disabled={loading}
                  className="text-xs sm:text-sm h-auto px-3 py-2 bg-primary hover:bg-primary/90 text-white"
                >
                  {loading ? 'Processing...' : 'Pay & Apply'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmMakeup.open} onOpenChange={open => !open && setConfirmMakeup({ open: false })}>
        <DialogContent className={`max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-lg ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">Confirm Makeup Application</DialogTitle>
          </DialogHeader>
          <p className="text-xs sm:text-sm">
            Apply makeup for <strong>{confirmMakeup.student_id}</strong> — <strong>{confirmMakeup.subject_name}</strong>?
          </p>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmMakeup({ open: false })} className="text-xs sm:text-sm h-auto px-3 py-1">
              Cancel
            </Button>
            <Button onClick={() => { setConfirmMakeup({ open: false }); handleApplyMakeup(); }} className="text-xs sm:text-sm h-auto px-3 py-1 bg-primary hover:bg-primary/90 text-white">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={messageModal.open} onOpenChange={open => !open && setMessageModal({ open: false })}>
        <DialogContent className={`max-w-[95vw] sm:max-w-[90vw] md:max-w-md ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">{messageModal.title}</DialogTitle>
          </DialogHeader>
          <p className="text-xs sm:text-sm">{messageModal.message}</p>
          <DialogFooter>
            <Button onClick={() => setMessageModal({ open: false })} className="text-xs sm:text-sm h-auto px-3 py-1 bg-primary hover:bg-primary/90 text-white">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Request Details Dialog */}
      <Dialog open={viewModal.open} onOpenChange={open => !open && setViewModal({ open: false })}>
        <DialogContent className={`max-w-[95vw] sm:max-w-[90vw] md:max-w-lg ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">Makeup Request Details</DialogTitle>
          </DialogHeader>
          {viewModal.request && (
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <strong>Subject:</strong> {viewModal.request.subject_name}
                </div>
                <div>
                  <strong>Status:</strong>
                  <span className={`ml-1 px-2 py-1 rounded text-xs ${viewModal.request.status === 'approved' ? 'bg-green-100 text-green-800' :
                      viewModal.request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                    }`}>
                    {viewModal.request.status}
                  </span>
                </div>
                <div>
                  <strong>Exam Period:</strong> {viewModal.request.exam_period}
                </div>
                <div>
                  <strong>Requested At:</strong> {new Date(viewModal.request.requested_at).toLocaleDateString()}
                </div>
                {viewModal.request.processed_by_name && (
                  <div>
                    <strong>Processed By:</strong> {viewModal.request.processed_by_name}
                  </div>
                )}
                {viewModal.request.processed_at && (
                  <div>
                    <strong>Processed At:</strong> {new Date(viewModal.request.processed_at).toLocaleDateString()}
                  </div>
                )}
              </div>
              {viewModal.request.reason && (
                <div>
                  <strong>Reason:</strong>
                  <p className="mt-1 text-xs">{viewModal.request.reason}</p>
                </div>
              )}
              {viewModal.request.response_note && (
                <div>
                  <strong>Response Note:</strong>
                  <p className="mt-1 text-xs">{viewModal.request.response_note}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewModal({ open: false })} className="text-xs sm:text-sm h-auto px-3 py-1 bg-primary hover:bg-primary/90 text-white">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MakeupExam;
