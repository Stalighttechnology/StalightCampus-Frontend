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

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/`);
      if (response.ok) {
        const data = await response.json();
        // Show applications that need fee payment or just completed it
        setApplications(data.filter((app: any) => 
          ['documents_verified', 'fee_pending', 'admission_confirmed'].includes(app.enquiry_details?.status)
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

  return (
    <div id="admission-fees-container" className="space-y-6">
      <Card>
        <CardHeader id="admission-fees-header">
          <CardTitle className="text-lg">Pending & Recent Fee Payments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {applications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No students are currently pending fee collection.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Applicant Name</th>
                    <th className="px-6 py-4 font-semibold">Course</th>
                    <th className="px-6 py-4 font-semibold">Payment Status</th>
                    <th className="px-6 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {applications.map(app => {
                    const isPaid = app.enquiry_details?.status === 'admission_confirmed';
                    return (
                      <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{app.enquiry_details?.name}</td>
                        <td className="px-6 py-4 text-muted-foreground">{app.enquiry_details?.course_name}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {isPaid ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
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
