import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import { ChevronDown, UserX } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import { showSuccessAlert, showErrorAlert, showWarningAlert, showInfoAlert, showConfirmAlert } from "@/utils/sweetalert";
import { getCOEFeeSettings } from "@/utils/coe_api";



const MakeupExam = () => {
  const role = typeof globalThis !== 'undefined' && globalThis.window ? globalThis.window.sessionStorage.getItem("role") : null;
  const { theme } = useTheme();
  const [filters, setFilters] = useState({ batch_id: "", branch_id: "", semester_id: "", section_id: "", exam_period: "" });
  const [usn, setUsn] = useState("");
  const [students, setStudents] = useState<Array<{usn: string;name: string;student_id: number;subjects: Array<{subject_id: number;subject_name: string;cie_marks?: number;see_marks?: number;total_marks?: number;status: string;applied: boolean;request_details?: any;}>;}>>([]);
  const [loading, setLoading] = useState(false);
  const [selectionMap, setSelectionMap] = useState<Record<number, boolean>>({});
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [confirmMakeup, setConfirmMakeup] = useState<{open: boolean;student_id?: number;subject_id?: number;subject_name?: string;}>({ open: false });
  const [viewModal, setViewModal] = useState<{open: boolean;request?: any;}>({ open: false });
  const [makeupApplicationsOpen, setMakeupApplicationsOpen] = useState<boolean | null>(null);
  const [feeSettings, setFeeSettings] = useState<{revaluation_fee?: number;photocopy_fee?: number;makeup_fee?: number}>({});

  useEffect(() => {
    if (role === "student") {
      const user = typeof globalThis !== 'undefined' && globalThis.window ? JSON.parse(globalThis.window.sessionStorage.getItem("user") || '{}') : {};
      const studentUsn = user.usn || user.username || "";
      if (studentUsn) {
        setUsn(studentUsn);
      }
    }
  }, [role]);

  if (role !== "student") {
    return (
      <div className={`min-h-[400px] flex flex-col items-center justify-center text-center px-4 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
        <div className="bg-red-500/10 p-4 rounded-full mb-4">
          <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground max-w-md">This page is only accessible to students.</p>
      </div>
    );
  }

  const loadStudents = async () => {
    if (!usn.trim()) {
      showWarningAlert("Validation Error", "Please enter the USN");
      return;
    }
    if (loading) return; // Prevent duplicate calls
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set('usn', usn.trim());
    qs.set('exam_period', filters.exam_period);

    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/makeup/students/?${qs.toString()}`, { method: 'GET' });
      const json = (await res.json()) as Record<string, unknown>;
      const payload = json.results && typeof json.results === 'object' ? json.results as Record<string, unknown> : json;
      const success = payload.success as boolean | undefined;
      const studentsData = payload.students as Array<{usn: string;name: string;student_id: number;subjects: Array<{subject_id: number;subject_name: string;cie_marks?: number;see_marks?: number;total_marks?: number;status: string;applied?: boolean;}>;}> | undefined;
      const message = payload.message as string | undefined;

      if (success) {
        const safeStudents = (studentsData || []).map((st) => ({
          ...st,
          subjects: (st.subjects || []).map((sb) => ({ ...sb, applied: !!sb.applied }))
        }));
        setStudents(safeStudents);
        // Track makeup window state
        if (typeof (payload as any).makeup_applications_open === 'boolean') {
          setMakeupApplicationsOpen((payload as any).makeup_applications_open);
        }
        // fetch fee settings so totals reflect configured values
        try {
          const feeResp = await getCOEFeeSettings();
          if (feeResp && feeResp.success) {
            const data = feeResp.data || feeResp;
            setFeeSettings({
              revaluation_fee: Number(data.revaluation_fee) || Number(data.revaluation_fee_cents) / 100 || undefined,
              photocopy_fee: Number(data.photocopy_fee) || Number(data.photocopy_fee_cents) / 100 || undefined,
              makeup_fee: Number(data.makeup_fee) || Number(data.makeup_fee_cents) / 100 || undefined
            });
          }
        } catch (e) {
          // ignore fee fetch errors; UI will fallback to legacy values
        }
      } else {
        setStudents([]);

        showErrorAlert('Error', message || 'Failed to load students');
      }
    } catch (err) {

      setStudents([]);
      showErrorAlert('Error', 'Failed to load students (network or auth error)');
    }
    setLoading(false);
  };

  const applyMakeup = async () => {
    if (!selectedStudent || !selectedSubject) {
      showErrorAlert('Error', 'Select student and subject');
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
        showSuccessAlert('Success', 'Makeup request submitted');
        setSelectedStudent(null);
        setSelectedSubject(null);
        setReason("");
      } else if (makeup_request) {
        showSuccessAlert('Success', 'Makeup request submitted');
      } else {
        showErrorAlert('Error', message || 'Error');
      }
    } catch (err) {

      showErrorAlert('Error', 'Network error');
    }
  };

  const getStatusBadge = (status: string, applied: boolean) => {
    if (applied) {
      return <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Applied</span>;
    }
    return status === 'pass' ?
    <span className="text-green-600">Pass</span> :

    <span className="text-red-600">Fail</span>;

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
    setStudents((prev) => prev.map(updateSubjectInStudent));
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
          response_note: subject.request_details.response_note
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
    setSelectionMap((prev) => ({ ...prev, [subjectId]: checked }));
  };

  const renderApplyButton = (applied: boolean, studentId: number, subjectId: number, subjectName: string) =>
  applied ?
  <Button
    onClick={() => handleViewRequest(subjectId)}
    variant="outline"
    className="text-xs sm:text-sm h-auto px-2 py-1 border-blue-500 text-blue-600 hover:bg-blue-50">
    
        View
      </Button> :

  <Button
    disabled={loading || makeupApplicationsOpen === false}
    onClick={() => handleApplyClick(studentId, subjectId, subjectName)}
    variant="default"
    title={makeupApplicationsOpen === false ? 'Makeup applications are currently closed' : undefined}
    className="text-xs sm:text-sm h-auto px-2 py-1 bg-primary hover:bg-primary/90 text-white">
    
        Apply
      </Button>;



  const renderActionCell = (sub: {subject_id: number;subject_name: string;applied: boolean;request_details?: any;}, studentId: number, isStudentRole: boolean) => {
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
            className="text-xs sm:text-sm h-auto px-2 py-1 border-blue-500 text-blue-600 hover:bg-blue-50">
            
            View
          </Button>);

      }

      // Otherwise allow selecting the subject for applying
      if (makeupApplicationsOpen === false) {
        return <span className="text-xs text-muted-foreground italic px-2 py-1 bg-muted/50 rounded-lg">Closed</span>;
      }
      const isSelected = !!selectionMap[sub.subject_id];
      return (
        <label className={`cursor-pointer px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-2 text-xs font-medium w-fit
          ${isSelected ? 'bg-primary/10 border-primary text-primary' : 'bg-transparent border-border hover:border-primary/50'}`}>
          <input
            type="checkbox"
            className="accent-primary w-4 h-4 cursor-pointer"
            checked={isSelected}
            onChange={(e) => handleSelectionChange(sub.subject_id, e.target.checked)} />
          <span>{isSelected ? "Selected" : "Select"}</span>
        </label>
      );

    }

    return renderApplyButton(sub.applied, studentId, sub.subject_id, sub.subject_name);
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <div className="w-full mx-auto">
        {/* Closed banner */}
        {makeupApplicationsOpen === false && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800 px-4 py-3">
            <span className="text-orange-600 dark:text-orange-400 text-lg">🔒</span>
            <div>
              <p className="font-semibold text-orange-800 dark:text-orange-300 text-sm">Makeup applications are currently closed</p>
              <p className="text-xs text-orange-700 dark:text-orange-400">The COE has not opened the makeup exam window yet. You can view existing requests but cannot apply for new ones.</p>
            </div>
          </div>
        )}
        <Card className={`${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
          <CardHeader id="makeupexam-header" className="px-4 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-4 md:py-5 border-b">
            <CardTitle className={`text-xl sm:text-2xl font-semibold leading-none tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Makeup Exam Requests</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              Submit makeup exam requests for students — search by USN or select batch/branch and exam period.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 space-y-6">
            {/* Filter Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 items-end">
              <div className="sm:col-span-1">
                <label htmlFor="usn-input" className="text-xs sm:text-sm block mb-2 font-medium">USN</label>
                <input
                  id="usn-input"
                  value={usn}
                  onChange={(e) => setUsn(e.target.value)}
                  readOnly={role === 'student'}
                  placeholder="Enter student USN"
                  className={`w-full px-2 sm:px-3 py-2 text-xs sm:text-sm rounded border ${role === 'student' ? 'bg-muted opacity-80 cursor-not-allowed' : ''} ${theme === 'dark' ?
                  'bg-input border-border text-foreground' :
                  'bg-white border-gray-300 text-gray-900'}`
                  } />
                
              </div>

              <div className="sm:col-span-1">
                <label className="text-xs sm:text-sm block mb-2 font-medium">Exam Period</label>
                <Select
                  value={filters.exam_period}
                  onValueChange={(value) => setFilters({ ...filters, exam_period: value })}>
                  
                  <SelectTrigger className={theme === 'dark' ? 'bg-input border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}>
                    <SelectValue placeholder="Select Exam Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="june_july">June/July</SelectItem>
                    <SelectItem value="nov_dec">Nov/Dec</SelectItem>
                    <SelectItem value="jan_feb">Jan/Feb</SelectItem>
                    <SelectItem value="apr_may">Apr/May</SelectItem>
                    <SelectItem value="sept_oct">Sept/Oct</SelectItem>
                    <SelectItem value="feb_mar">Feb/Mar</SelectItem>
                    <SelectItem value="supplementary">Supplementary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-1 lg:col-span-1">
                <Button
                  onClick={loadStudents}
                  disabled={loading}
                  className="w-full px-3 py-2 text-xs sm:text-sm h-auto bg-primary hover:bg-primary/90 text-white">
                  
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>

            {/* Results Section */}
            {!loading && students.length > 0 ?
            <div className="space-y-6 pt-4 border-t">
                {students.map((s) =>
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
                            {s.subjects.map((sub) =>
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
                        )}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Cards */}
                      <div className="sm:hidden space-y-2">
                        {s.subjects.map((sub) =>
                    <div
                      key={sub.subject_id}
                      className={`p-3 rounded-lg border shadow-sm ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-200'}`}>
                      
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <p className="text-sm font-semibold">{sub.subject_name}</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                                  <span>CIE: <strong className={theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}>{sub.cie_marks ?? '-'}</strong></span>
                                  <span>SEE: <strong className={theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}>{sub.see_marks ?? '-'}</strong></span>
                                  <span>Total: <strong className={theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}>{sub.total_marks ?? '-'}</strong></span>
                                </div>
                              </div>
                              <div className="text-right ml-2 font-medium">
                                {getStatusBadge(sub.status, sub.applied)}
                              </div>
                            </div>

                            <div className={`mt-3 pt-3 border-t ${theme === 'dark' ? 'border-border/50' : 'border-gray-100'}`}>
                              {renderActionCell(sub, s.student_id, role === 'student')}
                            </div>
                          </div>
                    )}
                      </div>
                    </div>
                  </div>
              )}
              </div> :

            !loading &&
            <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center border border-dashed rounded-xl bg-muted/5 mt-4 ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-primary/10 ${theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}`}>
                    <UserX className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">No students found</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Try different search criteria.
                  </p>
                </div>

            }
          </CardContent>
        </Card>

        {/* Student Payment Section */}
        {role === 'student' && students.length > 0 &&
        <Card className={`mt-6 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs sm:text-sm">
                  <p>Selected: {Object.keys(selectionMap).filter((k) => selectionMap[Number(k)]).length}</p>
                  <p className="font-semibold">
                    Total: ₹{Object.keys(selectionMap).reduce((acc, k) => acc + (selectionMap[Number(k)] ? (feeSettings.makeup_fee ?? 300) : 0), 0)}
                  </p>
                </div>
                <Button
                onClick={async () => {
                  const items = Object.entries(selectionMap).map(([k]) => ({ subject_id: Number(k) })).filter((it) => selectionMap[it.subject_id]);
                  if (items.length === 0) {
                    showErrorAlert('Error', 'Select at least one subject to pay');
                    return;
                  }
                  if (!filters.exam_period) {
                    showErrorAlert('Error', 'Select exam period');
                    return;
                  }

                  const totalAmount = Object.keys(selectionMap).reduce((acc, k) => acc + (selectionMap[Number(k)] ? (feeSettings.makeup_fee ?? 300) : 0), 0);

                  const confirmResult = await showConfirmAlert(
                    'Confirm Application',
                    `You are about to apply for ${items.length} subject(s) with a total fee of ₹${totalAmount}. Do you want to proceed to payment?`,
                    'Pay & Apply',
                    'question'
                  );
                  if (!confirmResult.isConfirmed) return;

                  setLoading(true);
                  try {
                    const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/makeup/initiate-payment/`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ items, exam_period: filters.exam_period })
                    });
                    const json = (await res.json()) as Record<string, unknown>;
                    const success = json.success as boolean | undefined;
                    const order_id = json.order_id as string | undefined;
                    const razorpay_key_id = json.razorpay_key_id as string | undefined;
                    const message = json.message as string | undefined;

                    if (success && order_id) {
                      const keyId = razorpay_key_id || (import.meta.env.VITE_RAZORPAY_KEY_ID as string);

                      // Load Razorpay checkout script dynamically
                      await new Promise<void>((resolve, reject) => {
                        if ((window as any).Razorpay) return resolve();
                        const script = document.createElement('script');
                        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                        script.onload = () => resolve();
                        script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
                        document.body.appendChild(script);
                      });

                      const options: any = {
                        key: keyId,
                        order_id: order_id,
                        name: 'Stalight Campus',
                        description: `Payment for makeup exam`,
                        handler: async function (resp: any) {
                          try {
                            setLoading(true);
                            const verifyRes = await fetchWithTokenRefresh(`${API_ENDPOINT}/payments/verify/`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(resp)
                            });
                            const verifyJson = await verifyRes.json();
                            if (verifyJson.success) {
                               showSuccessAlert('Success', 'Payment successful! Makeup request applied.');
                              // Reload students to show the updated "Applied" status
                              loadStudents();
                              // Reset selection map
                              setSelectionMap({});
                            } else {
                              showErrorAlert('Error', 'Payment verification failed.');
                            }
                          } catch (e) {
                            showErrorAlert('Error', 'Verification error');
                          } finally {
                            setLoading(false);
                          }
                        },
                        theme: { color: '#3399cc' },
                        modal: {
                          ondismiss: function () {
                            showErrorAlert('Payment Cancelled', 'The payment process was cancelled.');
                            setLoading(false);
                          }
                        }
                      };

                      const rzp = new (window as any).Razorpay(options);
                      rzp.open();
                    } else {
                      showErrorAlert('Error', message || 'Failed to initiate payment');
                    }
                  } catch (err) {
                    showErrorAlert('Error', 'Network error');
                  }
                  setLoading(false);
                }}
                disabled={loading}
                className="text-xs sm:text-sm h-auto px-3 py-2 bg-primary hover:bg-primary/90 text-white">
                
                  {loading ? 'Processing...' : 'Pay & Apply'}
                </Button>
              </div>
            </CardContent>
          </Card>
        }
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmMakeup.open} onOpenChange={(open) => !open && setConfirmMakeup({ open: false })}>
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
            <Button onClick={() => {setConfirmMakeup({ open: false });handleApplyMakeup();}} className="text-xs sm:text-sm h-auto px-3 py-1 bg-primary hover:bg-primary/90 text-white">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* View Request Details Dialog */}
      <Dialog open={viewModal.open} onOpenChange={(open) => !open && setViewModal({ open: false })}>
        <DialogContent className={`max-w-[95vw] sm:max-w-[90vw] md:max-w-lg ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">Makeup Request Details</DialogTitle>
          </DialogHeader>
          {viewModal.request &&
          <div className="space-y-3 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <strong>Subject:</strong> {viewModal.request.subject_name}
                </div>
                <div>
                  <strong>Status:</strong>
                  <span className={`ml-1 px-2 py-1 rounded text-xs ${viewModal.request.status === 'approved' ? 'bg-green-100 text-green-800' :
                viewModal.request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'}`
                }>
                    {viewModal.request.status}
                  </span>
                </div>
                <div>
                  <strong>Exam Period:</strong> {viewModal.request.exam_period}
                </div>
                <div>
                  <strong>Requested At:</strong> {new Date(viewModal.request.requested_at).toLocaleDateString()}
                </div>
                {viewModal.request.processed_by_name &&
              <div>
                    <strong>Processed By:</strong> {viewModal.request.processed_by_name}
                  </div>
              }
                {viewModal.request.processed_at &&
              <div>
                    <strong>Processed At:</strong> {new Date(viewModal.request.processed_at).toLocaleDateString()}
                  </div>
              }
              </div>
              {viewModal.request.reason &&
            <div>
                  <strong>Reason:</strong>
                  <p className="mt-1 text-xs">{viewModal.request.reason}</p>
                </div>
            }
              {viewModal.request.response_note &&
            <div>
                  <strong>Response Note:</strong>
                  <p className="mt-1 text-xs">{viewModal.request.response_note}</p>
                </div>
            }
            </div>
          }
          <DialogFooter>
            <Button onClick={() => setViewModal({ open: false })} className="text-xs sm:text-sm h-auto px-3 py-1 bg-primary hover:bg-primary/90 text-white">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

};

export default MakeupExam;