import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Mail, Phone, Users } from 'lucide-react';
import { SkeletonList } from '../ui/skeleton';

export default function AdmissionCommunication() {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchApplicants();
  }, [currentPage]);

  const fetchApplicants = async () => {
    setLoading(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/enquiries/?minimal=true&page=${currentPage}&page_size=20`);
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.results)) {
          setApplicants(data.results);
          setTotalCount(data.count);
        } else {
          const list = Array.isArray(data) ? data : [];
          setApplicants(list);
          setTotalCount(list.length);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonList items={4} />
      </div>
    );
  }

  return (
    <div id="admission-communication-container" className="space-y-6">
      <Card>
        <CardHeader id="admission-communication-header" className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <div>
            <CardTitle className="sm:text-2xl text:xl font-semibold">Applicant Communication</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Connect with your applicants via phone or email.</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {applicants.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm">No applicants found.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Name</th>
                    <th className="px-6 py-4 font-semibold">Address / City</th>
                    <th className="px-6 py-4 font-semibold">Phone Number</th>
                    <th className="px-6 py-4 font-semibold">Mail Address</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 text-right font-semibold">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {applicants.map((applicant: any) => (
                    <tr key={applicant.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground">
                        {applicant.name}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {applicant.city || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {applicant.phone}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {applicant.email}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">
                          {applicant.status ? applicant.status.replace(/_/g, ' ') : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" asChild className="h-8 shadow-sm">
                            <a href={`tel:${applicant.phone}`}>
                              <Phone className="w-4 h-4 mr-1.5" /> Call
                            </a>
                          </Button>
                          <Button size="sm" asChild className="h-8 shadow-sm">
                            <a href={`mailto:${applicant.email}`}>
                              <Mail className="w-4 h-4 mr-1.5" /> Mail
                            </a>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>

        {Math.ceil(totalCount / 20) > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {Math.min((currentPage - 1) * 20 + 1, totalCount)} to {Math.min(currentPage * 20, totalCount)} of {totalCount} applicants
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
                onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / 20), currentPage + 1))}
                disabled={currentPage === Math.ceil(totalCount / 20) || loading}
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
