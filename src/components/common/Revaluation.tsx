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

type Filters = { usn: string; exam_period: string };



const Revaluation = () => {
  const [filters, setFilters] = useState<Filters>({ usn: "", exam_period: "" });
  const [students, setStudents] = useState<Array<{ usn: string; name: string; student_id: number; subjects: Array<{ subject_id: number; subject_name: string; cie_marks?: number; see_marks?: number; total_marks?: number; status: string; applied: boolean; subject_mark_id: number }> }>>([]);
  const role = typeof globalThis !== 'undefined' && globalThis.window ? globalThis.window.localStorage.getItem('role') : null;
  const [selectionMap, setSelectionMap] = useState<Record<number, { revaluation: boolean; photocopy: boolean }>>({});
  const [viewModal, setViewModal] = useState<{ open: boolean; request?: any }>({ open: false });
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  const sanitizeMessage = (msg: string | object | null | undefined): string | null => {
    if (!msg) return null;
    let msgStr = '';
    if (typeof msg === 'string') {
      msgStr = msg;
    } else {
      msgStr = JSON.stringify(msg);
    }
    const lowered = msgStr.toLowerCase();
    const isBadError = lowered.includes('localhost') || lowered.includes('traceback') || lowered.includes('connection refused') || lowered.includes('err');
    return isBadError ? null : msgStr;
  };

  // confirmation modal state for revaluation
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; subject_mark_id?: number; subject_name?: string }>(
    { open: false }
  );

  const handleApply = (subject_mark_id: number, subject_name?: string) => {
    setConfirmModal({ open: true, subject_mark_id, subject_name });
  };

  // message modal state (replaces native alert())
  const [messageModal, setMessageModal] = useState<{ open: boolean; title?: string; message?: string }>({ open: false });

  const confirmApply = async (subject_mark_id?: number) => {
    if (!subject_mark_id) {
      setConfirmModal({ open: false });
      return;
    }
    setConfirmModal({ open: false });
    setLoading(true);
    try {
      const form = new FormData();
      form.append('subject_mark_id', String(subject_mark_id));
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/revaluation/request/`, { method: 'POST', body: form });
      const json = (await res.json()) as Record<string, unknown>;
      await handleRevaluationResponse(json, subject_mark_id);
    } catch (err) {
      console.error('submitReval error', err);
      setMessageModal({ open: true, title: 'Error', message: 'Network error contacting server' });
    } finally {
      setLoading(false);
    }
  };

  const updateSubjectInStudent = (st: typeof students[0], subjectMarkId: number) => {
    const newSubjects = st.subjects.map((sb) =>
      sb.subject_mark_id === subjectMarkId ? { ...sb, applied: true } : sb
    );
    return { ...st, subjects: newSubjects };
  };

  const markSubjectAsApplied = (subjectMarkId: number) => {
    setStudents(prev => prev.map(st => updateSubjectInStudent(st, subjectMarkId)));
  };

  const handleRevaluationResponse = async (json: Record<string, unknown>, subjectMarkId: number) => {
    const success = json.success as boolean | undefined;
    const applied = json.applied as boolean | undefined;
    const message = json.message as string | undefined;

    if (success) {
      markSubjectAsApplied(subjectMarkId);
      setMessageModal({ open: true, title: 'Success', message: 'Revaluation requested' });
    } else if (applied) {
      markSubjectAsApplied(subjectMarkId);
      const safe = sanitizeMessage(message) || 'Revaluation already applied';
      setMessageModal({ open: true, title: 'Info', message: safe });
    } else {
      const safe = sanitizeMessage(message) || 'Failed to submit revaluation request';
      setMessageModal({ open: true, title: 'Error', message: safe });
    }
  };

  const loadStudents = async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("usn", filters.usn.trim());
    qs.set("exam_period", filters.exam_period);

    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/revaluation/students/?${qs.toString()}`, { method: 'GET' });
      const json = (await res.json()) as Record<string, unknown>;
      const payload = (json.results && typeof json.results === 'object') ? (json.results as Record<string, unknown>) : json;
      const success = payload.success as boolean | undefined;
      const students = payload.students as Array<{ usn: string; name: string; student_id: number; subjects: Array<{ subject_id: number; subject_name: string; cie_marks?: number; see_marks?: number; total_marks?: number; status: string; applied?: boolean; subject_mark_id: number }> }> | undefined;
      const message = payload.message as string | undefined;

      if (success) {
        const safeStudents = (students || []).map((st) => ({
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

  const handleRevaluationCheckbox = (subjectMarkId: number, checked: boolean) => {
    setSelectionMap(prev => ({
      ...prev,
      [subjectMarkId]: {
        ...(prev[subjectMarkId] || { revaluation: false, photocopy: false }),
        revaluation: checked
      }
    }));
  };

  const handlePhotocopCheckbox = (subjectMarkId: number, checked: boolean) => {
    setSelectionMap(prev => ({
      ...prev,
      [subjectMarkId]: {
        ...(prev[subjectMarkId] || { revaluation: false, photocopy: false }),
        photocopy: checked
      }
    }));
  };

  const renderActionCell = (sub: { subject_mark_id: number; subject_name: string; applied: boolean }, isStudentRole: boolean) => {
    if (!sub.subject_mark_id) {
      return 'N/A';
    }
    if (isStudentRole) {
      // for students, if already applied show View button, else show checkboxes
      if (sub.applied) {
        return (
          <Button
            onClick={() => handleViewRequest(sub.subject_mark_id)}
            variant="outline"
            className="text-xs sm:text-sm h-auto px-2 py-1 border-blue-500 text-blue-600 hover:bg-blue-50"
          >
            View
          </Button>
        );
      }
      return renderStudentCheckboxes(sub.subject_mark_id);
    }
    return renderApproveButton(sub.subject_mark_id, sub.subject_name, sub.applied);
  };

  const handleViewRequest = (subjectMarkId: number) => {
    for (const st of students) {
      const subject = st.subjects.find((s) => s.subject_mark_id === subjectMarkId && s.request_details);
      if (subject) {
        const rd = subject.request_details;
        const request = {
          subject_mark_id: subjectMarkId,
          subject_name: subject.subject_name,
          status: rd.status,
          requested_at: rd.requested_at,
          processed_by_name: rd.processed_by,
          processed_at: rd.processed_at,
          response_note: rd.response_note,
          types: rd.types || [],
        };
        setViewModal({ open: true, request });
        return;
      }
    }
    // fallback: no request details available
    setMessageModal({ open: true, title: 'Info', message: 'No request details available' });
  };

  const renderStudentCheckboxes = (subjectMarkId: number) => (
    <div className="flex gap-2 items-center">
      <label className="text-xs flex items-center gap-1">
        <input
          type="checkbox"
          checked={!!selectionMap[subjectMarkId]?.revaluation}
          onChange={(e) => handleRevaluationCheckbox(subjectMarkId, e.target.checked)}
        />
        <span>Reval</span>
      </label>
      <label className="text-xs flex items-center gap-1">
        <input
          type="checkbox"
          checked={!!selectionMap[subjectMarkId]?.photocopy}
          onChange={(e) => handlePhotocopCheckbox(subjectMarkId, e.target.checked)}
        />
        <span>Copy</span>
      </label>
    </div>
  );

  const renderApproveButton = (subjectMarkId: number, subjectName: string, applied: boolean) => (
    <Button
      disabled={applied || loading}
      onClick={() => handleApply(subjectMarkId, subjectName)}
      variant={applied ? 'outline' : 'default'}
      className={`text-xs sm:text-sm h-auto px-2 py-1 ${applied ? '' : 'bg-primary hover:bg-primary/90 text-white'}`}
    >
      {applied ? 'Applied' : 'Apply'}
    </Button>
  );

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <div className="w-full mx-auto">
        <Card className={`${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
          <CardHeader className="p-3 sm:p-4 lg:p-6 border-b">
            <CardTitle className={`text-2xl font-semibold leading-none tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Exam Revaluation & Photocopy</CardTitle>
            <p className={`text-xs sm:text-sm mt-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
              Apply for revaluation of exam papers or request photocopies. Search by student USN and select the exam period.
            </p>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 space-y-6">
            {/* Filter Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 items-end">
              <div className="sm:col-span-1">
                <label htmlFor="usn-input" className="text-xs sm:text-sm block mb-1 font-medium">USN</label>
                <input
                  id="usn-input"
                  value={filters.usn}
                  onChange={e => setFilters({ ...filters, usn: e.target.value })}
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

              <div className="sm:col-span-2 md:col-span-1">
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
                                  {renderActionCell(sub, role === 'student')}
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

                            {sub.subject_mark_id ? (
                              renderActionCell(sub, role === 'student')
                            ) : null}
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
                  <p>Selected: {Object.keys(selectionMap).filter(k => selectionMap[Number(k)].revaluation || selectionMap[Number(k)].photocopy).length}</p>
                  <p className="font-semibold">
                    Total: ₹
                    {Object.keys(selectionMap).reduce((acc, k) => {
                      const s = selectionMap[Number(k)];
                      if (!s) return acc;
                      return acc + (s.revaluation ? 600 : 0) + (s.photocopy ? 400 : 0);
                    }, 0)}
                  </p>
                </div>
                <Button
                  onClick={async () => {
                    const items = Object.entries(selectionMap)
                      .map(([k, v]) => ({ subject_mark_id: Number(k), revaluation: !!v.revaluation, photocopy: !!v.photocopy }))
                      .filter(it => it.revaluation || it.photocopy);

                    if (items.length === 0) {
                      return setMessageModal({ open: true, title: 'Error', message: 'Select at least one item to pay' });
                    }

                    setLoading(true);
                    try {
                      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/revaluation/initiate-payment/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ items })
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
      <Dialog open={confirmModal.open} onOpenChange={open => !open && setConfirmModal({ open: false })}>
        <DialogContent className={`max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-lg ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">Confirm Revaluation</DialogTitle>
          </DialogHeader>
          <p className="text-xs sm:text-sm">
            Apply revaluation for <strong>{filters.usn}</strong> — <strong>{confirmModal.subject_name}</strong>?
          </p>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmModal({ open: false })} className="text-xs sm:text-sm h-auto px-3 py-1">
              Cancel
            </Button>
            <Button onClick={() => confirmApply(confirmModal.subject_mark_id)} className="text-xs sm:text-sm h-auto px-3 py-1 bg-primary hover:bg-primary/90 text-white">
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

      {/* View Request Dialog */}
      <Dialog open={viewModal.open} onOpenChange={open => !open && setViewModal({ open: false })}>
        <DialogContent className={`max-w-[95vw] sm:max-w-[90vw] md:max-w-md ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">Request Details</DialogTitle>
          </DialogHeader>
          {viewModal.request ? (
            <div className="text-xs sm:text-sm space-y-2">
              <div><strong>Subject:</strong> {viewModal.request.subject_name}</div>
              <div><strong>Status:</strong> {viewModal.request.status}</div>
              <div><strong>Types:</strong> {(viewModal.request.types || []).map((t: string) => t === 'photocopy' ? 'Photocopy' : 'Revaluation').join(', ') || '-'}</div>
              <div><strong>Requested At:</strong> {viewModal.request.requested_at || '-'}</div>
              <div><strong>Processed By:</strong> {viewModal.request.processed_by_name || '-'}</div>
              <div><strong>Processed At:</strong> {viewModal.request.processed_at || '-'}</div>
              <div><strong>Response:</strong> {viewModal.request.response_note || '-'}</div>
            </div>
          ) : (
            <p className="text-xs sm:text-sm">No details available</p>
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

export default Revaluation;
