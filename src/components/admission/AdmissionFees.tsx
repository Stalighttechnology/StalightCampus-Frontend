import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Loader2, DollarSign, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdmissionFees() {
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
        // Show applications that need fee payment or have completed it (including enrolled)
        setApplications(data.filter((app: any) => 
          ['documents_verified', 'fee_pending', 'admission_confirmed', 'enrolled'].includes(app.enquiry_details?.status)
        ));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkFeePaid = async (id: number) => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/${id}/update_status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'admission_confirmed' })
      });
      if (response.ok) {
        toast.success("Fee marked as paid!");
        setApplications(apps => apps.map(app => 
          app.id === id ? { ...app, enquiry_details: { ...app.enquiry_details, status: 'admission_confirmed' } } : app
        ));
      } else {
        toast.error("Failed to update payment status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update payment status");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Card className="border-border">
          <CardHeader>
            <div className="h-6 w-56 bg-muted rounded" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    {[1, 2, 3, 4].map((i) => (
                      <th key={i} className="px-6 py-4">
                        <div className="h-4 w-20 bg-muted rounded" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[1, 2, 3, 4, 5].map((row) => (
                    <tr key={row}>
                      {[1, 2, 3, 4].map((col) => (
                        <td key={col} className="px-6 py-4">
                          <div className="h-4 bg-muted rounded w-24" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingApps = applications.filter((app: any) => 
    ['documents_verified', 'fee_pending'].includes(app.enquiry_details?.status)
  );

  const historyApps = applications.filter((app: any) => 
    ['admission_confirmed', 'enrolled'].includes(app.enquiry_details?.status)
  );

  const filteredApps = activeTab === 'pending' ? pendingApps : historyApps;

  return (
    <div id="admission-fees-container" className="space-y-6 w-full max-w-full overflow-hidden">
      <Card className="overflow-hidden w-full border-border">
        <CardHeader id="admission-fees-header" className="border-b pb-4">
          <CardTitle className="text-lg">Fee Payments Management</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Record and review fee payments for verified applicants.</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex border-b border-border mb-6">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
                activeTab === 'pending'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Pending Payments ({pendingApps.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
                activeTab === 'history'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Payment History ({historyApps.length})
            </button>
          </div>

          {filteredApps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-lg bg-muted/5">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>{activeTab === 'pending' ? 'No students are currently pending fee collection.' : 'No payment history found.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full min-w-[800px] text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Applicant Name</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Course</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Payment Status</th>
                    <th className="px-6 py-4 text-right font-semibold whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredApps.map(app => {
                    const status = app.enquiry_details?.status;
                    const isPaid = status === 'admission_confirmed' || status === 'enrolled';
                    return (
                      <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">
                          <div className="font-semibold">{app.enquiry_details?.name}</div>
                          <div className="text-xs text-muted-foreground font-normal">{app.enquiry_details?.email}</div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{app.enquiry_details?.course_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {isPaid ? (status === 'enrolled' ? 'Paid & Enrolled' : 'Paid') : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={isPaid}
                            onClick={() => handleMarkFeePaid(app.id)}
                            className={isPaid ? "opacity-50" : "text-green-600 hover:text-green-700"}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" /> Mark as Paid
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
