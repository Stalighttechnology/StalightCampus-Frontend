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
          {applicants.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">No applicants found.</p>
            </div>
          ) : (
            <>
              {/* Mobile View: Stacked Cards (Hidden on Desktop) */}
              <div className="block md:hidden divide-y divide-border p-3 space-y-3">
                {applicants.map((applicant: any) => (
                  <div
                    key={applicant.id}
                    className="p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-3 hover:border-primary/30 transition-all duration-200"
                  >
                    {/* Header: Name, City & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground tracking-tight">
                          {applicant.name}
                        </h4>
                        {applicant.city && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {applicant.city}
                          </p>
                        )}
                      </div>
                      <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase shrink-0">
                        {applicant.status ? applicant.status.replace(/_/g, ' ') : 'N/A'}
                      </span>
                    </div>

                    {/* Details Box */}
                    <div className="space-y-1.5 text-xs bg-muted/30 p-2.5 rounded-lg border border-border/40">
                      {applicant.phone && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Phone:</span>
                          <span className="font-mono font-medium text-foreground">{applicant.phone}</span>
                        </div>
                      )}
                      {applicant.email && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Email:</span>
                          <span className="text-foreground truncate max-w-[200px]">{applicant.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons: 2 Equal Columns */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button size="sm" variant="outline" asChild className="w-full h-8 text-xs shadow-sm justify-center">
                        <a href={`tel:${applicant.phone}`}>
                          <Phone className="w-3.5 h-3.5 mr-1 shrink-0" /> Call
                        </a>
                      </Button>
                      <Button size="sm" asChild className="w-full h-8 text-xs shadow-sm bg-primary text-white justify-center">
                        <a href={`mailto:${applicant.email}`}>
                          <Mail className="w-3.5 h-3.5 mr-1 shrink-0" /> Mail
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Table (Hidden on Mobile) */}
              <div className="hidden md:block overflow-x-auto">
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
              </div>
            </>
          )}
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
