import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Loader2, UserCheck, FileText, CheckCircle, XCircle } from 'lucide-react';
import { SkeletonTable } from '../ui/skeleton';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Swal from 'sweetalert2';
import { downloadFile } from '../../utils/downloadHelper';

export default function AdmissionApplications() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/`);
      if (response.ok) {
        const data = await response.json();
        setApplications(data);
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

  const handleEnroll = async (id: number) => {
    const result = await Swal.fire({
      title: 'Enroll Student?',
      text: 'Are you sure you want to enroll this student into the institution?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, enroll!',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#10b981',
    });
    if (!result.isConfirmed) return;

    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/${id}/enroll/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        toast.success("Student Enrolled Successfully!");
        setApplications(apps => apps.map(app => 
          app.id === id ? { ...app, enquiry_details: { ...app.enquiry_details, status: 'enrolled' } } : app
        ));
        if (selectedApp?.id === id) {
          setSelectedApp((prev: any) => prev ? ({ ...prev, enquiry_details: { ...prev.enquiry_details, status: 'enrolled' } }) : null);
        }
      } else {
        const errData = await response.json();
        toast.error(errData.error || "Failed to enroll");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to enroll");
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
        <SkeletonTable rows={5} cols={5} />
      </div>
    );
  }

  return (
    <div id="admission-applications-container" className="space-y-6 w-full max-w-full overflow-hidden">
      <Card className="overflow-hidden w-full border-border">
        <CardHeader id="admission-applications-header">
          <CardTitle className="text-lg">Submitted Applications</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {applications.length === 0 ? (
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
                  {applications.map(app => (
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
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground pb-2">Uploaded Documents</h3>
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
                    if (!fileUrl) return null;
                    return (
                      <div key={doc.key} className="flex items-center justify-between p-2.5 border border-border rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                        <span className="text-xs font-medium truncate max-w-[130px]" title={doc.label}>{doc.label}</span>
                        <a 
                          href={fileUrl} 
                          onClick={(e) => handlePreview(e, fileUrl)}
                          className="text-xs text-primary font-semibold hover:underline shrink-0 cursor-pointer"
                        >
                          View File
                        </a>
                      </div>
                    );
                  })}
                  {!['photo', 'signature', 'marks_card_10th', 'marks_card_12th', 'transfer_certificate', 'aadhaar_card'].some(k => selectedApp[k]) && (
                    <p className="text-xs text-muted-foreground col-span-full">No documents uploaded.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground pb-2">Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  <Button 
                    onClick={() => handleUpdateStatus(selectedApp.id, 'documents_verified')}
                    variant="outline" size="sm" className="w-full text-blue-500 hover:text-blue-600 hover:bg-blue-50 justify-center whitespace-nowrap"
                    disabled={selectedApp.enquiry_details?.status === 'documents_verified'}
                  >
                    <FileText className="w-4 h-4 mr-2 shrink-0" /> Verify Documents
                  </Button>
                  
                  <Button 
                    onClick={() => handleUpdateStatus(selectedApp.id, 'admission_confirmed')}
                    variant="outline" size="sm" className="w-full text-green-500 hover:text-green-600 hover:bg-green-50 justify-center whitespace-nowrap"
                    disabled={selectedApp.enquiry_details?.status === 'admission_confirmed'}
                  >
                    <CheckCircle className="w-4 h-4 mr-2 shrink-0" /> Confirm Admission
                  </Button>
                  
                  <Button 
                    onClick={() => handleEnroll(selectedApp.id)}
                    size="sm"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 justify-center whitespace-nowrap"
                    disabled={selectedApp.enquiry_details?.status === 'enrolled'}
                  >
                    <UserCheck className="w-4 h-4 mr-2 shrink-0" /> Enroll as Student
                  </Button>
                  
                  <Button 
                    onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}
                    variant="outline" size="sm" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 justify-center whitespace-nowrap"
                    disabled={selectedApp.enquiry_details?.status === 'rejected'}
                  >
                    <XCircle className="w-4 h-4 mr-2 shrink-0" /> Reject
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
