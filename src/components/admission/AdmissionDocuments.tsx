import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Loader2, FileText, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function AdmissionDocuments() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/`);
      if (response.ok) {
        const data = await response.json();
        // Only show those with documents pending or newly submitted that need review
        setApplications(data.filter((app: any) => !app.is_verified));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: number) => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/${id}/update_status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'documents_verified' })
      });
      if (response.ok) {
        toast.success("Documents verified successfully!");
        setApplications(apps => apps.filter(app => app.id !== id));
      } else {
        toast.error("Failed to verify documents.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to verify documents.");
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-lg font-semibold">Document Verification</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Review and verify documents uploaded by applicants.</p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6">
            {applications.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4 opacity-50" />
                <p>All applicant documents have been verified.</p>
              </div>
            ) : (
              applications.map(app => (
                <Card key={app.id} className="border-border shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border mb-4">
                    <div>
                      <CardTitle className="text-base font-semibold">{app.enquiry_details?.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">App ID: #{app.id} • Course: {app.enquiry_details?.course_name}</p>
                    </div>
                    <Button 
                      onClick={() => handleVerify(app.id)}
                      className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                      size="sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Mark as Verified
                    </Button>
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
