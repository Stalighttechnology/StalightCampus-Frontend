import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Loader2, UserCheck, FileText, CheckCircle, XCircle, Search, Upload, Plus } from 'lucide-react';
import { SkeletonTable } from '../ui/skeleton';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Swal from 'sweetalert2';
import { downloadFile } from '../../utils/downloadHelper';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getR2PresignedUrl, uploadFileToR2 } from '../../utils/common_api';

export default function AdmissionApplications() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollAppId, setEnrollAppId] = useState<number | null>(null);
  const [optionsData, setOptionsData] = useState<{ branches: any[], batches: any[], semesters: any[], sections: any[] }>({ branches: [], batches: [], semesters: [], sections: [] });
  const [enrollBranchId, setEnrollBranchId] = useState("");
  const [enrollBatchId, setEnrollBatchId] = useState("");
  const [enrollSemesterId, setEnrollSemesterId] = useState("");
  const [enrollSectionId, setEnrollSectionId] = useState("");
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [uploadingDocKey, setUploadingDocKey] = useState<string | null>(null);

  const handleDocumentUpload = async (docKey: string, file: File, appId: number) => {
    const isPhotoOrSign = docKey === 'photo' || docKey === 'signature';
    const maxSizeBytes = isPhotoOrSign ? 2 * 1024 * 1024 : 5 * 1024 * 1024; // 2MB for photo/sign, 5MB for certificates
    const maxSizeStr = isPhotoOrSign ? "2MB" : "5MB";

    if (file.size > maxSizeBytes) {
      toast.error(`File "${file.name}" exceeds the maximum allowed size of ${maxSizeStr}. Please select a smaller file.`);
      return;
    }

    try {
      setUploadingDocKey(docKey);
      const res = await getR2PresignedUrl(file.name, file.type, 'admission_documents');
      let finalFileUrl = "";
      if (res.success && res.data?.url) {
        const uploaded = await uploadFileToR2(file, res.data.url, file.type);
        if (!uploaded) {
          toast.error(`Failed to upload ${file.name}`);
          setUploadingDocKey(null);
          return;
        }
        finalFileUrl = res.data.file_url;
      } else {
        toast.error(res.message || "Failed to generate upload URL");
        setUploadingDocKey(null);
        return;
      }

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/${appId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [docKey]: finalFileUrl })
      });

      if (response.ok) {
        toast.success("Document uploaded successfully!");
        setSelectedApp((prev: any) => prev ? ({ ...prev, [docKey]: finalFileUrl }) : null);
        setApplications(apps => apps.map(app => app.id === appId ? { ...app, [docKey]: finalFileUrl } : app));
      } else {
        toast.error("Failed to update application with uploaded document.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error uploading document.");
    } finally {
      setUploadingDocKey(null);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchApplications();
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    if (enrollModalOpen && enrollBranchId) {
      fetchEnrollmentOptions(enrollBranchId, enrollSemesterId);
    }
  }, [enrollBranchId, enrollSemesterId]);

  const fetchEnrollmentOptions = async (branchId?: string, semesterId?: string) => {
    setOptionsLoading(true);
    try {
      let url = `${API_ENDPOINT}/admission/manager/enrollment-options/?`;
      if (branchId) url += `branch_id=${branchId}&`;
      if (semesterId) url += `semester_id=${semesterId}&`;
      const response = await fetchWithTokenRefresh(url);
      if (response.ok) {
        const data = await response.json();
        setOptionsData(prev => ({
          branches: branchId ? prev.branches : data.branches,
          batches: branchId ? prev.batches : data.batches,
          semesters: data.semesters,
          sections: data.sections
        }));
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load enrollment options");
    } finally {
      setOptionsLoading(false);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : "";
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/?page=${currentPage}&page_size=20${searchParam}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.results) {
          setApplications(data.results);
          setTotalCount(data.count);
        } else {
          setApplications(data || []);
          setTotalCount(data ? data.length : 0);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    if (status === 'documents_verified') {
      const result = await Swal.fire({
        title: 'Verify Documents?',
        text: 'Are you sure you want to mark these documents as verified?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, verify!',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#3b82f6',
      });
      if (!result.isConfirmed) return;
    } else if (status === 'admission_confirmed') {
      const result = await Swal.fire({
        title: 'Confirm Admission?',
        text: 'Are you sure you want to confirm this student admission?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, confirm!',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#10b981',
      });
      if (!result.isConfirmed) return;
    } else if (status === 'rejected') {
      const result = await Swal.fire({
        title: 'Reject Application?',
        text: 'Are you sure you want to reject this student application?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, reject!',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444',
      });
      if (!result.isConfirmed) return;
    }

    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/${id}/update_status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        toast.success(`Status updated to ${status.replace('_', ' ')}`);
        setApplications(apps => apps.map(app => 
          app.id === id ? { ...app, enquiry_details: { ...app.enquiry_details, status } } : app
        ));
        if (selectedApp?.id === id) {
          setSelectedApp((prev: any) => prev ? ({ ...prev, enquiry_details: { ...prev.enquiry_details, status } }) : null);
        }
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const handleEnroll = (id: number) => {
    setEnrollAppId(id);
    setEnrollBranchId("");
    setEnrollBatchId("");
    setEnrollSemesterId("");
    setEnrollSectionId("");
    setEnrollModalOpen(true);
    fetchEnrollmentOptions();
  };

  const submitEnrollment = async () => {
    if (!enrollBranchId || !enrollBatchId || !enrollSemesterId || !enrollSectionId) {
      toast.error("Please select Branch, Batch, Semester, and Section.");
      return;
    }
    try {
      setIsEnrolling(true);
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/${enrollAppId}/enroll/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: enrollBranchId,
          batch_id: enrollBatchId,
          semester_id: enrollSemesterId,
          section_id: enrollSectionId
        })
      });
      if (response.ok) {
        toast.success("Student Enrolled Successfully!");
        setApplications(apps => apps.map(app => 
          app.id === enrollAppId ? { ...app, enquiry_details: { ...app.enquiry_details, status: 'enrolled' } } : app
        ));
        if (selectedApp?.id === enrollAppId) {
          setSelectedApp((prev: any) => prev ? ({ ...prev, enquiry_details: { ...prev.enquiry_details, status: 'enrolled' } }) : null);
        }
        setEnrollModalOpen(false);
      } else {
        const errData = await response.json();
        toast.error(errData.error || "Failed to enroll");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to enroll");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handlePreview = async (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    try {
      let targetUrl = url;
      if (url.includes('/api/r2/download/')) {
        try {
          const parsedUrl = new URL(url);
          const paramUrl = parsedUrl.searchParams.get('file_url');
          if (paramUrl) {
            targetUrl = paramUrl;
          }
        } catch (parseErr) {
          console.warn("Failed to parse URL, using original:", parseErr);
        }
      }

      // Check if it's already using backend domain
      let finalUrl = targetUrl;
      const isExternal = targetUrl.startsWith('http') && !targetUrl.includes(window.location.origin) && !targetUrl.includes('127.0.0.1') && !targetUrl.includes('localhost');
      if (isExternal) {
        finalUrl = `${API_ENDPOINT}/r2/download/?file_url=${encodeURIComponent(targetUrl)}`;
      } else if (targetUrl.startsWith('/')) {
        finalUrl = `${window.location.origin}${targetUrl}`;
      }

      const response = await fetchWithTokenRefresh(finalUrl);
      if (!response.ok) {
        throw new Error("Failed to load file preview");
      }

      const blob = await response.blob();
      
      // Determine correct MIME type
      let mimeType = blob.type;
      if (targetUrl.toLowerCase().endsWith('.pdf')) {
        mimeType = 'application/pdf';
      } else if (targetUrl.toLowerCase().endsWith('.png')) {
        mimeType = 'image/png';
      } else if (targetUrl.toLowerCase().endsWith('.jpg') || targetUrl.toLowerCase().endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      }

      const file = new Blob([blob], { type: mimeType });
      const previewUrl = window.URL.createObjectURL(file);
      window.open(previewUrl, '_blank');
    } catch (error) {
      console.error("Error previewing file:", error);
      toast.error("Failed to preview file");
    }
  };

  if (loading && applications.length === 0) {
    return (
      <div className="space-y-6">
        <SkeletonTable rows={5} cols={5} />
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / 20);
  const paginatedApplications = applications;

  return (
    <div id="admission-applications-container" className="space-y-6 w-full max-w-full overflow-hidden">
      <Card className="flex flex-col w-full border-border shadow-sm">
        <CardHeader id="admission-applications-header" className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="sm:text-2xl text-xl font-semibold">Submitted Applications</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Review and manage student admission applications.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, email..." 
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-grow">
          {paginatedApplications.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No applications found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Applicant Name</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Course</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">12th Marks</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 text-right font-semibold whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedApplications.map(app => (
                    <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">
                        <div className="font-semibold">{app.enquiry_details?.name}</div>
                        {app.enquiry_details?.email && (
                          <div className="text-xs text-muted-foreground font-normal mt-0.5">{app.enquiry_details?.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{app.enquiry_details?.course_name || 'N/A'}</td>
                      <td className="px-6 py-4 text-muted-foreground font-mono whitespace-nowrap">{app.marks_12th}%</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">
                          {app.enquiry_details?.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Button variant="outline" className='bg-primary hover:bg-primary/90 text-white hover:text-white' size="sm" onClick={() => setSelectedApp(app)}>
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {Math.min((currentPage - 1) * 20 + 1, totalCount)} to {Math.min(currentPage * 20, totalCount)} of {totalCount} applications
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                Previous
              </Button>

              <div className="flex items-center justify-center min-w-[2rem]">
                <span className="text-sm font-semibold text-foreground">
                  {currentPage}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="w-[90vw] rounded-xl sm:max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-lg font-semibold">Application Review: {selectedApp?.enquiry_details?.name}</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5">Personal Info</h3>
                  <p className="text-sm"><strong className="text-muted-foreground">Email:</strong> {selectedApp.enquiry_details?.email}</p>
                  <p className="text-sm"><strong className="text-muted-foreground">Phone:</strong> {selectedApp.enquiry_details?.phone}</p>
                  <p className="text-sm"><strong className="text-muted-foreground">City:</strong> {selectedApp.enquiry_details?.city}</p>
                  <p className="text-sm"><strong className="text-muted-foreground">Gender:</strong> {selectedApp.gender}</p>
                  <p className="text-sm"><strong className="text-muted-foreground">Address:</strong> {selectedApp.address}</p>
                  <p className="text-sm"><strong className="text-muted-foreground">Course:</strong> {selectedApp.enquiry_details?.course_name}</p>
                </div>
                
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5">Academic Info</h3>
                  <p className="text-sm"><strong className="text-muted-foreground">10th Marks:</strong> {selectedApp.marks_10th}%</p>
                  <p className="text-sm"><strong className="text-muted-foreground">12th Marks:</strong> {selectedApp.marks_12th}%</p>
                  {selectedApp.previous_degree_marks && <p className="text-sm"><strong className="text-muted-foreground">Degree Marks:</strong> {selectedApp.previous_degree_marks}%</p>}
                </div>
              </div>
              
              {/* Uploaded Documents Section */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Uploaded Documents</h3>
                  <span className="text-xs text-muted-foreground">Counselor/Manager can upload missing documents below</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Passport Photo', key: 'photo' },
                    { label: 'Signature', key: 'signature' },
                    { label: '10th Marks Card', key: 'marks_card_10th' },
                    { label: '12th Marks Card', key: 'marks_card_12th' },
                    { label: 'Transfer Certificate', key: 'transfer_certificate' },
                    { label: 'Aadhaar Card', key: 'aadhaar_card' },
                  ].map((doc) => {
                    const fileUrl = selectedApp[doc.key];
                    const isUploading = uploadingDocKey === doc.key;

                    return (
                      <div key={doc.key} className="flex flex-col justify-between p-2.5 border border-border rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors gap-2">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-semibold truncate max-w-[140px]" title={doc.label}>{doc.label}</span>
                          {fileUrl ? (
                            <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 font-semibold px-1.5 py-0.5 rounded">Uploaded</span>
                          ) : (
                            <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 font-semibold px-1.5 py-0.5 rounded">Missing</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between w-full pt-1 border-t border-border/50 text-xs">
                          {fileUrl ? (
                            <a 
                              href={fileUrl} 
                              onClick={(e) => handlePreview(e, fileUrl)}
                              className="text-xs text-primary font-semibold hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" /> View File
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No file</span>
                          )}

                          <label className={`cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            {isUploading ? (
                              <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</span>
                            ) : (
                              <span className="flex items-center gap-1"><Upload className="w-3 h-3" /> {fileUrl ? 'Replace' : 'Upload'}</span>
                            )}
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              disabled={isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleDocumentUpload(doc.key, file, selectedApp.id);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground pb-2">Actions</h3>
                {(() => {
                  const appStages = ['new', 'contacted', 'interested', 'application_started', 'documents_pending', 'documents_verified', 'fee_pending', 'admission_confirmed', 'enrolled', 'rejected'];
                  const currentStatus = selectedApp?.enquiry_details?.status;
                  const isRejected = currentStatus === 'rejected';
                  const currentIndex = appStages.indexOf(currentStatus);
                  
                  const verifyDisabled = isRejected || currentIndex >= appStages.indexOf('documents_verified');
                  const confirmDisabled = isRejected || currentIndex >= appStages.indexOf('admission_confirmed');
                  const enrollDisabled = isRejected || currentIndex >= appStages.indexOf('enrolled');

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                      <Button 
                        onClick={() => handleUpdateStatus(selectedApp.id, 'documents_verified')}
                        variant="outline" size="sm" className="w-full text-blue-500 hover:text-blue-600 hover:bg-blue-50 justify-center whitespace-nowrap"
                        disabled={verifyDisabled}
                      >
                        <FileText className="w-4 h-4 mr-2 shrink-0" /> Verify Documents
                      </Button>
                      
                      <Button 
                        onClick={() => handleUpdateStatus(selectedApp.id, 'admission_confirmed')}
                        variant="outline" size="sm" className="w-full text-green-500 hover:text-green-600 hover:bg-green-50 justify-center whitespace-nowrap"
                        disabled={confirmDisabled}
                      >
                        <CheckCircle className="w-4 h-4 mr-2 shrink-0" /> Confirm Admission
                      </Button>
                      
                      <Button 
                        onClick={() => handleEnroll(selectedApp.id)}
                        size="sm"
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 justify-center whitespace-nowrap"
                        disabled={enrollDisabled}
                      >
                        <UserCheck className="w-4 h-4 mr-2 shrink-0" /> Enroll as Student
                      </Button>
                      
                      <Button 
                        onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}
                        variant="outline" size="sm" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 justify-center whitespace-nowrap"
                        disabled={isRejected}
                      >
                        <XCircle className="w-4 h-4 mr-2 shrink-0" /> Reject
                      </Button>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={enrollModalOpen} onOpenChange={setEnrollModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Enrollment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Please assign the student to their respective batch, branch, semester, and section to finalize enrollment.</p>
            
            <div className="space-y-2">
              <Label>Batch *</Label>
              <Select value={enrollBatchId} onValueChange={setEnrollBatchId}>
                <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                <SelectContent>
                  {optionsData.batches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Branch *</Label>
              <Select value={enrollBranchId} onValueChange={(val) => { setEnrollBranchId(val); setEnrollSemesterId(""); setEnrollSectionId(""); }}>
                <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                <SelectContent>
                  {optionsData.branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Semester *</Label>
              <Select value={enrollSemesterId} onValueChange={(val) => { setEnrollSemesterId(val); setEnrollSectionId(""); }} disabled={!enrollBranchId}>
                <SelectTrigger><SelectValue placeholder="Select Semester" /></SelectTrigger>
                <SelectContent>
                  {optionsData.semesters.map((s: any) => (
                    <SelectItem key={s.id} value={s.id.toString()}>Semester {s.number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Section *</Label>
              <Select value={enrollSectionId} onValueChange={setEnrollSectionId} disabled={!enrollSemesterId}>
                <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
                <SelectContent>
                  {optionsData.sections.map((s: any) => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setEnrollModalOpen(false)} disabled={isEnrolling}>Cancel</Button>
            <Button onClick={submitEnrollment} disabled={!enrollBranchId || !enrollBatchId || !enrollSemesterId || !enrollSectionId || isEnrolling}>
              {isEnrolling ? <><Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" /> Enrolling...</> : 'Enroll Student'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
