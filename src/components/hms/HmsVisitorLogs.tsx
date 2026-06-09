import React, { useState, useEffect } from 'react';
import { getHmsVisitorLogs, exportHmsVisitorLogsPdf, checkoutHmsVisitorLog } from '../../utils/hms_api';
import { useToast } from '../../hooks/use-toast';
import { useTheme } from '../../context/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Users, Download, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface VisitorLog {
  id: number;
  student: number;
  student_name: string;
  student_usn: string;
  visitor_name: string;
  mobile_number: string;
  purpose: string;
  check_in_time: string;
  check_out_time: string | null;
  hostel: number;
  hostel_name: string;
}

const HmsVisitorLogs = () => {
  const { toast } = useToast();
  const { theme } = useTheme();
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [viewPurpose, setViewPurpose] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState<number | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchLogs();
  }, [page, debouncedSearch]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await getHmsVisitorLogs(page, debouncedSearch);
      setLogs(response.results || []);
      setTotalCount(response.count || 0);
      setTotalPages(Math.ceil((response.count || 0) / 10) || 1);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load visitor logs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const blob = await exportHmsVisitorLogsPdf(debouncedSearch);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Visitor_Logs_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Success',
        description: 'Visitor logs PDF downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export visitor logs PDF',
        variant: 'destructive'
      });
    } finally {
      setExporting(false);
    }
  };

  const handleCheckout = async (logId: number) => {
    setIsCheckingOut(logId);
    try {
      const response = await checkoutHmsVisitorLog(logId);
      if (response.success || !response.error) {
        toast({
          title: 'Success',
          description: 'Visitor checked out successfully',
        });
        fetchLogs();
      } else {
        throw new Error(response.message || 'Failed to check out visitor');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to check out visitor',
        variant: 'destructive'
      });
    } finally {
      setIsCheckingOut(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card/50 backdrop-blur-sm shadow-sm">
        <CardHeader id="hms-visitor-logs-header" className="pb-4 border-b bg-muted/30">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">Visitor Logs</CardTitle>
                <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-semibold text-xs py-1 px-2.5 rounded-lg border-none shadow-none hover:bg-blue-50">
                  Total: {totalCount}
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  disabled={exporting || totalCount === 0}
                  className="flex items-center justify-center gap-1.5 h-9 text-xs bg-primary hover:bg-primary/90 text-white border-primary transition-all px-3 whitespace-nowrap w-full sm:w-auto shadow-sm"
                >
                  {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Export PDF
                </Button>
              </div>
            </div>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
              <Input
                type="text"
                placeholder="Search visitors, students, or hostels..."
                className="pl-10 pr-12 h-10 bg-background border-primary/10 hover:border-primary/30 transition-colors"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="animate-pulse space-y-4 p-4">
              {/* Mobile skeleton cards */}
              <div className="md:hidden space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 rounded-xl border border-border/60 bg-muted/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1.5 w-1/3">
                        <div className="h-4 bg-muted-foreground/15 rounded w-full"></div>
                        <div className="h-3 bg-muted-foreground/15 rounded w-2/3"></div>
                      </div>
                      <div className="space-y-1.5 w-1/4 flex flex-col items-end">
                        <div className="h-4 bg-muted-foreground/15 rounded w-16"></div>
                        <div className="h-4 bg-muted-foreground/15 rounded w-20"></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/20">
                      <div className="space-y-1">
                        <div className="h-3 bg-muted-foreground/15 rounded w-1/2"></div>
                        <div className="h-4 bg-muted-foreground/15 rounded w-3/4"></div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-3 bg-muted-foreground/15 rounded w-1/2"></div>
                        <div className="h-4 bg-muted-foreground/15 rounded w-3/4"></div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 pt-3 border-t border-border/20">
                      <div className="space-y-1">
                        <div className="h-3 bg-muted-foreground/15 rounded w-12"></div>
                        <div className="h-4 bg-muted-foreground/15 rounded w-1/2"></div>
                        <div className="h-3 bg-muted-foreground/15 rounded w-1/3"></div>
                      </div>
                      <div className="flex gap-2 w-full mt-1">
                        <div className="h-8 bg-muted-foreground/15 rounded-xl flex-1"></div>
                        <div className="h-8 bg-muted-foreground/15 rounded-xl flex-1"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop skeleton table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <th key={i} className="py-3.5 px-4"><div className="h-4 bg-muted-foreground/15 rounded w-16"></div></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i}>
                        <td className="py-4 px-4"><div className="h-4 bg-muted-foreground/15 rounded w-20"></div></td>
                        <td className="py-4 px-4"><div className="h-4 bg-muted-foreground/15 rounded w-24"></div></td>
                        <td className="py-4 px-4"><div className="h-5 bg-muted-foreground/15 rounded w-16"></div></td>
                        <td className="py-4 px-4">
                          <div className="space-y-1.5">
                            <div className="h-4 bg-muted-foreground/15 rounded w-28"></div>
                            <div className="h-3 bg-muted-foreground/15 rounded w-20"></div>
                          </div>
                        </td>
                        <td className="py-4 px-4"><div className="h-8 bg-muted-foreground/15 rounded-xl w-14"></div></td>
                        <td className="py-4 px-4"><div className="h-4 bg-muted-foreground/15 rounded w-24"></div></td>
                        <td className="py-4 px-4"><div className="h-4 bg-muted-foreground/15 rounded w-24"></div></td>
                        <td className="py-4 px-4"><div className="h-8 bg-muted-foreground/15 rounded-xl w-28 mx-auto"></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground opacity-70">
              <Users className="w-12 h-12 mb-4" />
              <p className="font-semibold text-lg">No visitor logs found</p>
            </div>
          ) : (
            <div>
              {/* Mobile View: Stacked Cards */}
              <div className="md:hidden space-y-3 p-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-4 rounded-xl border ${
                      theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'
                    } flex flex-col gap-2 shadow-sm`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-lg leading-tight">{log.visitor_name}</h4>
                        <p className="text-sm text-muted-foreground mt-0.5">{log.mobile_number}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge variant="secondary" className="text-[11px] font-semibold bg-primary/5 text-primary border-none">
                          {log.hostel_name || '-'}
                        </Badge>
                        {log.check_out_time ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-none font-semibold text-[11px]">
                            Checked Out
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none font-semibold text-[10px] animate-pulse">
                            Checked In
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/30 text-xs">
                      <div>
                        <span className="text-xs font-bold text-muted-foreground uppercase">Check-In</span>
                        <div className="font-medium mt-0.5 text-sm">{formatDate(log.check_in_time)}</div>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-muted-foreground uppercase">Check-Out</span>
                        <div className="font-medium mt-0.5 text-sm">{formatDate(log.check_out_time)}</div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-border/30">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Student</div>
                        <div className="text-base font-semibold truncate">{log.student_name || '-'}</div>
                        <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider truncate">{log.student_usn || '-'}</div>
                      </div>
                      <div className="flex items-center gap-2 w-full mt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewPurpose(log.purpose)}
                          className={`flex-1 text-xs font-semibold px-2 py-1 rounded-xl h-8 transition-all flex items-center justify-center gap-1 ${
                            theme === 'dark' ? 'bg-muted/10 text-foreground border border-border hover:bg-muted/20' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          View Purpose
                        </Button>
                        {!log.check_out_time && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCheckout(log.id)}
                            disabled={isCheckingOut === log.id}
                            className="flex-1 text-xs font-semibold px-2 py-1 rounded-xl h-8 transition-all flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white"
                          >
                            {isCheckingOut === log.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <LogOut className="w-3.5 h-3.5" />
                            )}
                            Check Out
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className={`border-b ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-gray-50'}`}>
                    <tr>
                      <th className="py-3.5 px-4 font-semibold text-muted-foreground">Visitor</th>
                      <th className="py-3.5 px-4 font-semibold text-muted-foreground">Contact</th>
                      <th className="py-3.5 px-4 font-semibold text-muted-foreground">Hostel</th>
                      <th className="py-3.5 px-4 font-semibold text-muted-foreground">Student Info</th>
                      <th className="py-3.5 px-4 font-semibold text-muted-foreground">Purpose</th>
                      <th className="py-3.5 px-4 font-semibold text-muted-foreground">Check-In</th>
                      <th className="py-3.5 px-4 font-semibold text-muted-foreground">Check-Out</th>
                      <th className="py-3.5 px-4 font-semibold text-muted-foreground text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-md">{log.visitor_name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{log.mobile_number}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="bg-primary/5 font-semibold text-xs border-none text-primary">
                            {log.hostel_name || '-'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold">{log.student_name || '-'}</div>
                          <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{log.student_usn || '-'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewPurpose(log.purpose)}
                            className={`text-xs font-semibold px-3 py-1 rounded-xl h-8 transition-all ${theme === 'dark' ? 'bg-muted/10 text-foreground border border-border hover:bg-muted/20' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                          >
                            View
                          </Button>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-xs text-muted-foreground">{formatDate(log.check_in_time)}</span>
                        </td>
                        <td className="py-3 px-4">
                          {log.check_out_time ? (
                            <span className="font-medium text-xs text-muted-foreground">{formatDate(log.check_out_time)}</span>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none font-semibold text-[10px] animate-pulse">
                              Checked In
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {!log.check_out_time ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCheckout(log.id)}
                              disabled={isCheckingOut === log.id}
                              className="text-xs font-semibold px-3 py-1 rounded-xl h-8 transition-all inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white"
                            >
                              {isCheckingOut === log.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <LogOut className="w-3.5 h-3.5" />
                              )}
                              Check Out
                            </Button>
                          ) : (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-none font-semibold text-[10px] py-1 px-2.5">
                              Completed
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
        {!loading && totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing page {page} of {totalPages} ({totalCount} records)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all rounded-xl"
              >
                Previous
              </Button>
              <div className="flex items-center justify-center min-w-[2rem]">
                <span className="text-sm font-semibold">{page}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all rounded-xl"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* View Purpose Dialog */}
      <Dialog open={!!viewPurpose} onOpenChange={() => setViewPurpose(null)}>
        <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6 shadow-2xl [&>button]:hidden' : 'bg-white text-gray-900 border border-gray-200 max-w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6 shadow-2xl [&>button]:hidden'}>
          <DialogHeader>
            <DialogTitle className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Visit Purpose</DialogTitle>
          </DialogHeader>

          <div
            className={`p-3 text-base leading-relaxed whitespace-pre-wrap break-words 
                      max-h-64 overflow-y-auto rounded-md ${theme === 'dark' ? 'text-foreground bg-muted/20' : 'text-gray-900 bg-gray-50'}`}
          >
            {viewPurpose}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="bg-primary hover:bg-primary/90 text-white hover:text-white border-primary rounded-xl text-xs h-9 w-full sm:w-auto"
              onClick={() => setViewPurpose(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HmsVisitorLogs;
