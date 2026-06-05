import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Loader2, UserCheck, FileText, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

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
          setSelectedApp((prev: any) => ({ ...prev, enquiry_details: { ...prev.enquiry_details, status } }));
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
          setSelectedApp((prev: any) => ({ ...prev, enquiry_details: { ...prev.enquiry_details, status: 'enrolled' } }));
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

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {!selectedApp ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submitted Applications</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {applications.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No applications found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Applicant Name</th>
                      <th className="px-6 py-4 font-semibold">Course</th>
                      <th className="px-6 py-4 font-semibold">12th Marks</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {applications.map(app => (
                      <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{app.enquiry_details?.name}</td>
                        <td className="px-6 py-4 text-muted-foreground">{app.enquiry_details?.course_name || 'N/A'}</td>
                        <td className="px-6 py-4 text-muted-foreground font-mono">{app.marks_12th}%</td>
                        <td className="px-6 py-4">
                          <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">
                            {app.enquiry_details?.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="outline" size="sm" onClick={() => setSelectedApp(app)}>
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
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div>
              <CardTitle className="text-lg">Application Review: {selectedApp.enquiry_details?.name}</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedApp(null)}>Back to List</Button>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-semibold text-base border-b border-border pb-2">Personal Info</h3>
                <p className="text-sm"><strong className="text-muted-foreground">Email:</strong> {selectedApp.enquiry_details?.email}</p>
                <p className="text-sm"><strong className="text-muted-foreground">Phone:</strong> {selectedApp.enquiry_details?.phone}</p>
                <p className="text-sm"><strong className="text-muted-foreground">City:</strong> {selectedApp.enquiry_details?.city}</p>
                <p className="text-sm"><strong className="text-muted-foreground">Gender:</strong> {selectedApp.gender}</p>
                <p className="text-sm"><strong className="text-muted-foreground">Address:</strong> {selectedApp.address}</p>
                <p className="text-sm"><strong className="text-muted-foreground">Course:</strong> {selectedApp.enquiry_details?.course_name}</p>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-base border-b border-border pb-2">Academic Info</h3>
                <p className="text-sm"><strong className="text-muted-foreground">10th Marks:</strong> {selectedApp.marks_10th}%</p>
                <p className="text-sm"><strong className="text-muted-foreground">12th Marks:</strong> {selectedApp.marks_12th}%</p>
                {selectedApp.previous_degree_marks && <p className="text-sm"><strong className="text-muted-foreground">Degree Marks:</strong> {selectedApp.previous_degree_marks}%</p>}
              </div>
            </div>
            
            <div className="space-y-4 pt-6 border-t border-border">
              <h3 className="font-semibold text-base pb-2">Actions</h3>
              <div className="flex gap-4 flex-wrap">
                <Button 
                  onClick={() => handleUpdateStatus(selectedApp.id, 'documents_verified')}
                  variant="outline" className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                  disabled={selectedApp.enquiry_details?.status === 'documents_verified'}
                >
                  <FileText className="w-4 h-4 mr-2" /> Verify Documents
                </Button>
                
                <Button 
                  onClick={() => handleUpdateStatus(selectedApp.id, 'admission_confirmed')}
                  variant="outline" className="text-green-500 hover:text-green-600 hover:bg-green-50"
                  disabled={selectedApp.enquiry_details?.status === 'admission_confirmed'}
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> Confirm Admission
                </Button>
                
                <Button 
                  onClick={() => handleEnroll(selectedApp.id)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={selectedApp.enquiry_details?.status === 'enrolled'}
                >
                  <UserCheck className="w-4 h-4 mr-2" /> Enroll as Student
                </Button>
                
                <Button 
                  onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}
                  variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  disabled={selectedApp.enquiry_details?.status === 'rejected'}
                >
                  <XCircle className="w-4 h-4 mr-2" /> Reject
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
