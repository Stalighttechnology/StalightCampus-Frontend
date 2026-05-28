import React, { useState, useEffect } from 'react';
import { getHmsVisitorLogs, exportHmsVisitorLogsPdf } from '../../utils/hms_api';
import { useToast } from '../../hooks/use-toast';
import { useTheme } from '../../context/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, ChevronLeft, ChevronRight, Users, Download } from 'lucide-react';
import DashboardCard from '../common/DashboardCard';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  contact_details: string;
  purpose: string;
  visit_time: string;
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

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardCard
          title="Total Visitors"
          value={totalCount}
          description="Recorded visits"
          icon={<Users className="w-5 h-5 text-blue-500" />} 
        />
      </div>

      <Card className="border-border bg-card/50 backdrop-blur-sm shadow-sm">
        <CardHeader id="hms-visitor-logs-header" className="pb-4 border-b bg-muted/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-xl">Visitor Logs</CardTitle>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search visitors or students..."
                  className="pl-9 bg-background"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={exporting || totalCount === 0}
                className="flex items-center gap-1.5 h-9 text-xs bg-primary hover:bg-primary/90 text-white border-primary transition-all px-3 whitespace-nowrap shadow-sm"
              >
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-4 h-4" />}
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-md leading-tight">{log.visitor_name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{log.contact_details}</p>
                      </div>
                      <Badge variant="outline" className="bg-primary/5 whitespace-nowrap text-[10px] py-0.5 px-2">
                        {formatDate(log.visit_time)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30 gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Student</div>
                        <div className="text-sm font-semibold truncate">{log.student_name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider truncate">{log.student_usn}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewPurpose(log.purpose)}
                        className={`text-xs font-semibold px-3 py-1 rounded-xl h-8 transition-all shrink-0 ${
                          theme === 'dark' ? 'bg-muted/10 text-foreground border border-border hover:bg-muted/20' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        View Purpose
                      </Button>
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
                      <th className="py-3.5 px-4 font-semibold text-muted-foreground">Student Info</th>
                      <th className="py-3.5 px-4 font-semibold text-muted-foreground">Purpose</th>
                      <th className="py-3.5 px-4 font-semibold text-muted-foreground">Visit Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-md">{log.visitor_name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{log.contact_details}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold">{log.student_name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{log.student_usn}</div>
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
                          <Badge variant="outline" className="bg-primary/5 whitespace-nowrap">
                            {formatDate(log.visit_time)}
                          </Badge>
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
        <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-w-[70%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6 shadow-2xl [&>button]:hidden' : 'bg-white text-gray-900 border border-gray-200 max-w-[70%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6 shadow-2xl [&>button]:hidden'}>
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
