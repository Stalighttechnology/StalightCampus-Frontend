import React, { useState, useEffect } from 'react';
import { getWardenVisitorLogs } from '../../utils/warden_api';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, ChevronLeft, ChevronRight, Users, Plus } from 'lucide-react';
import DashboardCard from '../common/DashboardCard';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { createWardenVisitorLog, getWardenStudents } from '../../utils/warden_api';
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
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardCard
          title="Total Visitors"
          value={totalCount}
          description="Recorded visits"
          icon={<Users className="w-5 h-5 text-blue-500" />} 
        />
      </div>

      <Card className="border-border bg-card/50 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-4 border-b bg-muted/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-xl">Visitor Logs</CardTitle>
            <div className="flex items-center gap-3 w-full md:w-auto">
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
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button className="shrink-0 gap-2">
                    <Plus className="w-4 h-4" /> Add Visitor
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
                        <select
                          className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                          value={selectedBatch}
                          onChange={(e) => {
                            setSelectedBatch(e.target.value);
                            setFormData({...formData, student: ''});
                          }}
                        >
                          <option value="">All Batches</option>
                          {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Branch</Label>
                        <select
                          className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                          value={selectedBranch}
                          onChange={(e) => {
                            setSelectedBranch(e.target.value);
                            setSelectedSemester('');
                            setFormData({...formData, student: ''});
                          }}
                        >
                          <option value="">All Branches</option>
                          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Semester</Label>
                        <select
                          className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                          value={selectedSemester}
                          onChange={(e) => {
                            setSelectedSemester(e.target.value);
                            setFormData({...formData, student: ''});
                          }}
                          disabled={!selectedBranch}
                        >
                          <option value="">All Semesters</option>
                          {selectedBranch && semestersByBranch[selectedBranch]?.map((s: any) => (
                            <option key={s.id} value={s.id}>Sem {s.number}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border">
                      <Label>Student</Label>
                      <select
                        className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                        value={formData.student}
                        onChange={(e) => setFormData({ ...formData, student: e.target.value })}
                        onScroll={loadMoreStudents}
                        required
                      >
                        <option value="">Select a student...</option>
                        {students.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.usn}) - Room {s.room_number || s.room}
                          </option>
                        ))}
                      </select>
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
            <ScrollArea className="h-[500px]">
              <div className="divide-y divide-border/30">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-lg">{log.visitor_name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span className="font-medium text-foreground">{log.student_name} ({log.student_usn})</span>
                          <span>•</span>
                          <span>{log.contact_details}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-primary/5">
                        {formatDate(log.visit_time)}
                      </Badge>
                    </div>
                    <p className="text-sm bg-muted/40 p-2 rounded border border-border/50 inline-block mt-2">
                      <span className="font-semibold mr-2 opacity-70">Purpose:</span>
                      {log.purpose}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Pagination */}
          {!loading && logs.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t bg-muted/10">
              <span className="text-sm text-muted-foreground">
                Showing page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WardenVisitorLogs;
