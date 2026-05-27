import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Loader2, DollarSign, CheckCircle } from 'lucide-react';

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
        fetchApplications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Fee Collection</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Pending & Recent Fee Payments</CardTitle>
        </CardHeader>
        <CardContent>
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
                    <th className="px-4 py-3">Applicant Name</th>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Payment Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map(app => {
                    const isPaid = app.enquiry_details?.status === 'admission_confirmed';
                    return (
                      <tr key={app.id} className="border-b border-border hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{app.enquiry_details?.name}</td>
                        <td className="px-4 py-3">{app.enquiry_details?.course_name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {isPaid ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
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
