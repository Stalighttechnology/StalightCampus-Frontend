import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Loader2, FileText, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { SkeletonCard } from '../ui/skeleton';
import Swal from 'sweetalert2';

export default function AdmissionDocuments() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

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

  const handleVerify = async (id: number) => {
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
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-2 text-sm font-medium">
        <FileText className="w-4 h-4" /> View {label} <ExternalLink className="w-3 h-3" />
      </a>
    );
  };
  
  // Temporary component for missing icon
  const XCircle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
  );

  const filteredApplications = applications.filter((app: any) => 
    activeTab === 'pending' ? !app.is_verified : app.is_verified
  );

  return (
    <div id="admission-documents-container" className="space-y-6">
      <Card>
        <CardHeader id="admission-documents-header" className="border-b pb-4">
          <CardTitle className="text-lg font-semibold">Document Verification</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Review and verify documents uploaded by applicants.</p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex border-b border-border mb-6">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
                activeTab === 'pending'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Pending Verification ({applications.filter(a => !a.is_verified).length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
                activeTab === 'history'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Verification History ({applications.filter(a => a.is_verified).length})
            </button>
          </div>

          <div className="grid gap-6">
            {filteredApplications.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4 opacity-50" />
                <p>{activeTab === 'pending' ? 'All applicant documents have been verified.' : 'No verified applications found.'}</p>
              </div>
            ) : (
              filteredApplications.map(app => (
                <Card key={app.id} className="border-border shadow-sm">
                  <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border mb-4">
                    <div>
                      <CardTitle className="text-base font-semibold">{app.enquiry_details?.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">App ID: #{app.id} • Course: {app.enquiry_details?.course_name}</p>
                    </div>
                    {app.is_verified ? (
                      <span className="text-xs bg-green-100 text-green-700 font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" /> Verified
                      </span>
                    ) : (
                      <Button 
                        onClick={() => handleVerify(app.id)}
                        className="bg-green-600 hover:bg-green-700 text-white shadow-sm w-full sm:w-auto"
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Mark as Verified
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-2">
                      <div className="p-4 bg-muted/20 border border-border rounded-lg">
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">10th Marks Card</p>
                        {renderDocumentLink(app.marks_card_10th, "10th Certificate")}
                      </div>
                      <div className="p-4 bg-muted/20 border border-border rounded-lg">
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">12th Marks Card</p>
                        {renderDocumentLink(app.marks_card_12th, "12th Certificate")}
                      </div>
                      <div className="p-4 bg-muted/20 border border-border rounded-lg">
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Transfer Certificate</p>
                        {renderDocumentLink(app.transfer_certificate, "Transfer Cert.")}
                      </div>
                      <div className="p-4 bg-muted/20 border border-border rounded-lg">
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Aadhaar Card</p>
                        {renderDocumentLink(app.aadhaar_card, "Aadhaar Card")}
                      </div>
                      <div className="p-4 bg-muted/20 border border-border rounded-lg">
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Applicant Photo</p>
                        {renderDocumentLink(app.photo, "Photo")}
                      </div>
                      <div className="p-4 bg-muted/20 border border-border rounded-lg">
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Applicant Signature</p>
                        {renderDocumentLink(app.signature, "Signature")}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
