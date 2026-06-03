import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/use-toast';
import { useTheme } from '../../context/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, ChevronLeft, ChevronRight, Users, Plus, Download } from 'lucide-react';
import DashboardCard from '../common/DashboardCard';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createWardenVisitorLog, getWardenStudents, getWardenVisitorLogs, exportWardenVisitorLogsPdf } from '../../utils/warden_api';
import { getAcademicInit } from '../../utils/hms_api';

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

const WardenVisitorLogs = () => {
  const { toast } = useToast();
  const { theme } = useTheme();
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
  const [exporting, setExporting] = useState(false);
  const [viewPurpose, setViewPurpose] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  
  // Academic filters for modal
  const [batches, setBatches] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [semestersByBranch, setSemestersByBranch] = useState<any>({});
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [hasMoreStudents, setHasMoreStudents] = useState(false);

  const [formData, setFormData] = useState({
    student: '',
    visitor_name: '',
    contact_details: '',
    purpose: '',
  });

  useEffect(() => {
    fetchAcademicInit();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      setStudentPage(1);
      fetchStudents(1, selectedBatch, selectedBranch, selectedSemester);
    }
  }, [isModalOpen, selectedBatch, selectedBranch, selectedSemester]);

  const fetchAcademicInit = async () => {
    try {
      const response = await getAcademicInit();
      if (response.success || response.batches) {
        // Handle both standard and raw responses just in case
        setBatches(response.batches || response.data?.batches || []);
        setBranches(response.branches || response.data?.branches || []);
        setSemestersByBranch(response.semesters_by_branch || response.data?.semesters_by_branch || {});
      }
    } catch (error) {
      console.error("Failed to load academic data", error);
    }
  };

  const fetchStudents = async (
    page: number = 1,
    batch: string = '',
    branch: string = '',
    semester: string = ''
  ) => {
    try {
      const response = await getWardenStudents(undefined, undefined, batch, branch, semester, page);
      const newStudents = response.results || response.students || response.data || [];
      if (page === 1) {
        setStudents(newStudents);
      } else {
        setStudents(prev => [...prev, ...newStudents]);
      }
      setHasMoreStudents(!!response.next);
    } catch (error) {
      console.error("Failed to load students", error);
    }
  };

  const loadMoreStudents = (e: React.UIEvent<HTMLSelectElement>) => {
    const target = e.target as HTMLSelectElement;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 10 && hasMoreStudents) {
      const nextPage = studentPage + 1;
      setStudentPage(nextPage);
      fetchStudents(nextPage, selectedBatch, selectedBranch, selectedSemester);
    }
  };

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
      const response = await getWardenVisitorLogs(page, debouncedSearch);
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
      const blob = await exportWardenVisitorLogsPdf(debouncedSearch);
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

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student || !formData.visitor_name || !formData.contact_details) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await createWardenVisitorLog({
        student: parseInt(formData.student),
        visitor_name: formData.visitor_name,
        contact_details: formData.contact_details,
        purpose: formData.purpose,
      });
      toast({ title: 'Success', description: 'Visitor log added successfully' });
      setIsModalOpen(false);
      setFormData({ student: '', visitor_name: '', contact_details: '', purpose: '' });
      fetchLogs();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add visitor log', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card/50 backdrop-blur-sm shadow-sm">
        <CardHeader id="warden-visitor-logs-header" className="pb-4 border-b bg-muted/30">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">Visitor Logs</CardTitle>
                <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-semibold text-xs py-1 px-2.5 rounded-lg border-none shadow-none hover:bg-blue-50">
                  Total: {totalCount}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-1.5 h-9 text-xs bg-primary hover:bg-primary/90 text-white transition-all px-3 whitespace-nowrap">
                      <Plus className="w-3.5 h-3.5" /> Add Visitor
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Visitor</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Batch</Label>
                          <Select
                            value={selectedBatch || "all"}
                            onValueChange={(val) => {
                              setSelectedBatch(val === "all" ? "" : val);
                              setFormData({...formData, student: ''});
                            }}
                          >
                            <SelectTrigger className="w-full h-8 text-xs">
                              <SelectValue placeholder="All Batches" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Batches</SelectItem>
                              {batches.map((b) => (
                                <SelectItem key={b.id} value={b.id.toString()}>
                                  {b.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Branch</Label>
                          <Select
                            value={selectedBranch || "all"}
                            onValueChange={(val) => {
                              setSelectedBranch(val === "all" ? "" : val);
                              setSelectedSemester('');
                              setFormData({...formData, student: ''});
                            }}
                          >
                            <SelectTrigger className="w-full h-8 text-xs">
                              <SelectValue placeholder="All Branches" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Branches</SelectItem>
                              {branches.map((b) => (
                                <SelectItem key={b.id} value={b.id.toString()}>
                                  {b.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Semester</Label>
                          <Select
                            value={selectedSemester || "all"}
                            onValueChange={(val) => {
                              setSelectedSemester(val === "all" ? "" : val);
                              setFormData({...formData, student: ''});
                            }}
                            disabled={!selectedBranch}
                          >
                            <SelectTrigger className="w-full h-8 text-xs">
                              <SelectValue placeholder="All Semesters" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Semesters</SelectItem>
                              {selectedBranch && semestersByBranch[selectedBranch]?.map((s: any) => (
                                <SelectItem key={s.id} value={s.id.toString()}>
                                  Sem {s.number}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-border">
                        <Label>Student</Label>
                        <Select
                          value={formData.student}
                          onValueChange={(val) => setFormData({ ...formData, student: val })}
                        >
                          <SelectTrigger className="w-full h-10 text-sm">
                            <SelectValue placeholder="Select a student..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-56">
                            {students.map((s: any) => (
                              <SelectItem key={s.id} value={s.id.toString()}>
                                {s.name} ({s.usn}) - Room {s.room_number || s.room}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Visitor Name</Label>
                        <Input
                          value={formData.visitor_name}
                          onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
                          placeholder="E.g., John Doe"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Contact Details</Label>
                        <Input
                          value={formData.contact_details}
                          onChange={(e) => setFormData({ ...formData, contact_details: e.target.value })}
                          placeholder="Phone number or email"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Purpose</Label>
                        <Input
                          value={formData.purpose}
                          onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                          placeholder="E.g., Meeting, Delivery, etc."
                        />
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Save
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  disabled={exporting || totalCount === 0}
                  className="flex items-center gap-1.5 h-9 text-xs bg-primary hover:bg-primary/90 text-white border-primary transition-all px-3 whitespace-nowrap"
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
                placeholder="Search visitors or students..."
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

          {/* Pagination */}
          {!loading && logs.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
              <div>
                Showing {totalCount === 0 ? 0 : Math.min((page - 1) * 10 + 1, totalCount)} to {Math.min(page * 10, totalCount)} of {totalCount} logs
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
                  <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    {page}
                  </span>
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
            </div>
          )}
        </CardContent>
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

export default WardenVisitorLogs;
