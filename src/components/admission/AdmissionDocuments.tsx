import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Loader2, FileText, CheckCircle, ExternalLink, Upload, Phone, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { SkeletonCard } from '../ui/skeleton';
import Swal from 'sweetalert2';
import { useTheme } from '../../context/ThemeContext';
import { downloadFile } from '../../utils/downloadHelper';
import { getR2PresignedUrl, uploadFileToR2 } from '../../utils/common_api';

export default function AdmissionDocuments() {
  const { theme } = useTheme();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [uploadingDocState, setUploadingDocState] = useState<{ appId: number; docKey: string } | null>(null);
  const [expandedAppIds, setExpandedAppIds] = useState<number[]>([]);

  const toggleExpand = (appId: number) => {
    setExpandedAppIds(prev =>
      prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
    );
  };

  const handleDocumentUpload = async (docKey: string, file: File, appId: number) => {
    const isPhotoOrSign = docKey === 'photo' || docKey === 'signature';
    const maxSizeBytes = isPhotoOrSign ? 2 * 1024 * 1024 : 5 * 1024 * 1024; // 2MB for photo/sign, 5MB for certificates
    const maxSizeStr = isPhotoOrSign ? "2MB" : "5MB";

    if (file.size > maxSizeBytes) {
      toast.error(`File "${file.name}" exceeds the maximum allowed size of ${maxSizeStr}. Please select a smaller file.`);
      return;
    }

    try {
      setUploadingDocState({ appId, docKey });
      const res = await getR2PresignedUrl(file.name, file.type, 'admission_documents');
      let finalFileUrl = "";
      if (res.success && res.data?.url) {
        const uploaded = await uploadFileToR2(file, res.data.url, file.type);
        if (!uploaded) {
          toast.error(`Failed to upload ${file.name}`);
          setUploadingDocState(null);
          return;
        }
        finalFileUrl = res.data.file_url;
      } else {
        toast.error(res.message || "Failed to generate upload URL");
        setUploadingDocState(null);
        return;
      }

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/${appId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [docKey]: finalFileUrl })
      });

      if (response.ok) {
        toast.success("Document uploaded successfully!");
        setApplications(apps => apps.map(app => app.id === appId ? { ...app, [docKey]: finalFileUrl } : app));
      } else {
        toast.error("Failed to update application with uploaded document.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error uploading document.");
    } finally {
      setUploadingDocState(null);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/?page_size=50`);
      if (response.ok) {
        const data = await response.json();
        const list = data && Array.isArray(data.results) ? data.results
          : Array.isArray(data) ? data
            : [];
        setApplications(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: number) => {
    const app = applications.find(a => a.id === id);
    const hasDocs = app && (app.marks_card_10th || app.marks_card_12th || app.aadhaar_card || app.transfer_certificate || app.photo || app.signature);

    if (!hasDocs) {
      const warnResult = await Swal.fire({
        title: 'No Documents Uploaded',
        text: 'This applicant has no documents uploaded yet. Please use the "Upload Document" button on their card to upload their files, or confirm to mark as verified anyway.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Verify Anyway',
        cancelButtonText: 'Cancel & Upload First',
        confirmButtonColor: '#f59e0b',
      });
      if (!warnResult.isConfirmed) return;
    }

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

    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/${id}/update_status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'documents_verified' })
      });
      if (response.ok) {
        toast.success("Documents verified successfully!");
        setApplications(apps => apps.map(app =>
          app.id === id ? { ...app, is_verified: true, enquiry_details: { ...app.enquiry_details, status: 'documents_verified' } } : app
        ));
      } else {
        toast.error("Failed to verify documents.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to verify documents.");
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

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const renderDocumentLink = (url: string | null, label: string) => {
    if (!url) return <span className="text-muted-foreground text-sm flex items-center gap-2"><XCircle className="w-4 h-4" /> Missing {label}</span>;
    return (
      <a
        href={url}
        onClick={(e) => handlePreview(e, url)}
        className="text-blue-500 hover:underline flex items-center gap-2 text-sm font-medium cursor-pointer"
      >
        <FileText className="w-4 h-4" /> View {label} <ExternalLink className="w-3 h-3" />
      </a>
    );
  };

  // Temporary component for missing icon
  const XCircle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
  );

  const isAppVerified = (app: any) => {
    if (app.enquiry_details?.status === 'documents_pending') return false;
    const verifiedStatuses = ['documents_verified', 'fee_pending', 'admission_confirmed', 'enrolled'];
    if (app.enquiry_details?.status && verifiedStatuses.includes(app.enquiry_details.status)) return true;
    return app.is_verified;
  };

  const filteredApplications = (applications || []).filter((app: any) =>
    activeTab === 'pending' ? !isAppVerified(app) : isAppVerified(app)
  );

  const totalCount = filteredApplications.length;
  const totalPages = Math.ceil(totalCount / 10);
  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * 10,
    currentPage * 10
  );

  return (
    <div id="admission-documents-container" className="space-y-6">
      <Card className="flex flex-col w-full shadow-sm">
        <CardHeader id="admission-documents-header" className="border-b pb-4">
          <CardTitle className="text-xl sm:text-2xl font-semibold">Document Verification</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Review and verify documents uploaded by applicants.</p>
        </CardHeader>
        <CardContent className="pt-4 flex-grow">
          <div className="flex border-b border-border mb-6">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${activeTab === 'pending'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              Pending Verification ({(applications || []).filter(a => !isAppVerified(a)).length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'history'
                  ? 'border-primary text-primary'
                  : `border-transparent ${theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-500 hover:text-gray-700'}`
                }`}
            >
              Verification History ({(applications || []).filter(a => isAppVerified(a)).length})
            </button>
          </div>

          <div className="grid gap-6">
            {paginatedApplications.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4 opacity-50" />
                <p>{activeTab === 'pending' ? 'All applicant documents have been verified.' : 'No verified applications found.'}</p>
              </div>
            ) : (
              paginatedApplications.map(app => {
                const docKeys = ['marks_card_10th', 'marks_card_12th', 'transfer_certificate', 'aadhaar_card', 'photo', 'signature'];
                const uploadedCount = docKeys.filter(k => !!app[k]).length;
                const isExpanded = expandedAppIds.includes(app.id);

                return (
                  <Card key={app.id} className="border-border shadow-sm">
                    <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                      <div>
                        <CardTitle className="text-base font-semibold">{app.enquiry_details?.name}</CardTitle>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mt-1">
                          <span>App ID: #{app.id}</span>
                          <span>•</span>
                          <span>Course: <strong className="text-foreground">{app.enquiry_details?.course_name || 'N/A'}</strong></span>
                          {app.enquiry_details?.phone && (
                            <>
                              <span>•</span>
                              <a
                                href={`tel:${app.enquiry_details.phone}`}
                                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium hover:underline"
                                title="Call Phone Number"
                              >
                                <Phone className="w-3 h-3" /> {app.enquiry_details.phone}
                              </a>
                            </>
                          )}
                          {app.enquiry_details?.email && (
                            <>
                              <span>•</span>
                              <a
                                href={`mailto:${app.enquiry_details.email}`}
                                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium hover:underline"
                                title="Send Email"
                              >
                                <Mail className="w-3 h-3" /> {app.enquiry_details.email}
                              </a>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExpand(app.id)}
                          className="text-xs flex items-center justify-center gap-1.5 shadow-sm border-border"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4 text-primary" />
                              <span>Hide Documents</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 text-primary" />
                              <span>View & Upload Docs ({uploadedCount}/6)</span>
                            </>
                          )}
                        </Button>

                        {isAppVerified(app) ? (
                          <span className="text-xs bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 font-semibold px-3 py-1.5 rounded flex items-center justify-center gap-1.5">
                            <CheckCircle className="w-4 h-4" /> Verified
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => handleVerify(app.id)}
                            className={`shadow-sm w-full sm:w-auto ${theme === 'dark' ?
                              'text-green-400 border-green-400 hover:bg-green-900/20' :
                              'text-green-700 border-green-600 hover:bg-green-100'}`}
                            size="sm"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" /> Mark as Verified
                          </Button>
                        )}
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                          {[
                            { label: '10th Marks Card', key: 'marks_card_10th' },
                            { label: '12th Marks Card', key: 'marks_card_12th' },
                            { label: 'Transfer Certificate', key: 'transfer_certificate' },
                            { label: 'Aadhaar Card', key: 'aadhaar_card' },
                            { label: 'Applicant Photo', key: 'photo' },
                            { label: 'Applicant Signature', key: 'signature' },
                          ].map(docItem => {
                            const fileUrl = app[docItem.key];
                            const isUploading = uploadingDocState?.appId === app.id && uploadingDocState?.docKey === docItem.key;

                            return (
                              <div key={docItem.key} className="p-4 bg-muted/20 border border-border rounded-lg flex flex-col justify-between gap-3">
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-semibold uppercase text-muted-foreground">{docItem.label}</p>
                                    {fileUrl ? (
                                      <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 font-semibold px-1.5 py-0.5 rounded">Uploaded</span>
                                    ) : (
                                      <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 font-semibold px-1.5 py-0.5 rounded">Missing</span>
                                    )}
                                  </div>

                                  {fileUrl ? (
                                    <a
                                      href={fileUrl}
                                      onClick={(e) => handlePreview(e, fileUrl)}
                                      className="text-blue-500 hover:underline flex items-center gap-2 text-sm font-medium cursor-pointer"
                                    >
                                      <FileText className="w-4 h-4" /> View {docItem.label} <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground text-xs italic flex items-center gap-1">
                                      <XCircle className="w-3.5 h-3.5 text-amber-500" /> No document uploaded
                                    </span>
                                  )}
                                </div>

                                <div className="pt-2 border-t border-border/50 flex justify-end">
                                  <label className={`cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    {isUploading ? (
                                      <span className="flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</span>
                                    ) : (
                                      <span className="flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> {fileUrl ? 'Replace File' : 'Upload Document'}</span>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*,application/pdf"
                                      className="hidden"
                                      disabled={isUploading}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleDocumentUpload(docItem.key, file, app.id);
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>

        {totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {Math.min((currentPage - 1) * 10 + 1, totalCount)} to {Math.min(currentPage * 10, totalCount)} of {totalCount} applications
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
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
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
    </div>
  );
}
