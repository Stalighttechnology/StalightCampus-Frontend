import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle } from
"@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, parse } from "date-fns";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonStatsGrid, SkeletonTable, SkeletonCard } from "../ui/skeleton";
import { Button } from "../ui/button";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "../ui/alert";
import { RefreshCcw, BookOpen, Clock, Calendar, CheckCircle2, History, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import {
  getExamSchedule,
  scheduleExam,
  deleteExam,
  getFilterOptions,
  getSemesters,
  Batch,
  Branch,
  Semester } from
"../../utils/coe_api";
import { normalizePaginatedResponse } from '../../utils/normalizePagination';
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";

const EXAM_TYPES = [
{ value: 'internal_1', label: '1st Internal Assessment' },
{ value: 'internal_2', label: '2nd Internal Assessment' },
{ value: 'internal_3', label: '3rd Internal Assessment' },
{ value: 'semester_exam', label: 'Semester End Exam' },
{ value: 'revaluation', label: 'Revaluation Exam' },
{ value: 'makeup', label: 'Makeup Exam' },
{ value: 'supplementary', label: 'Supplementary Exam' }];


const EXAM_PERIODS = [
{ value: 'june_july', label: 'June/July' },
{ value: 'nov_dec', label: 'November/December' },
{ value: 'jan_feb', label: 'January/February' },
{ value: 'apr_may', label: 'April/May' }];


const ExamScheduling = React.forwardRef<HTMLDivElement>((_, ref) => {
  const { theme } = useTheme();
  const MySwal = withReactContent(Swal);
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<any[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    batch_id: '',
    semester_id: '',
    exam_type: '',
    exam_period: '',
    date: '',
    start_time: '09:00',
    end_time: '12:00',
    room: '',
    max_marks: '100',
    weightage: '30'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  });

  // Time conversion helpers
  const to24h = (h: string, m: string, p: string) => {
    let hours = parseInt(h);
    if (p === 'PM' && hours < 12) hours += 12;
    if (p === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${m}`;
  };

  const from24h = (time24: string) => {
    if (!time24) return { h: '09', m: '00', p: 'AM' };
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours);
    const p = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return { h: h.toString().padStart(2, '0'), m: minutes, p };
  };

  const formatTo12h = (time24: string) => {
    const { h, m, p } = from24h(time24);
    return `${h}:${m} ${p}`;
  };

  const loadData = async (page = 1) => {
    setLoading(true);
    try {
      const examRes = await getExamSchedule({ page, page_size: 10 });

      if (examRes.success) {
        const normalized = normalizePaginatedResponse(examRes, 'data');
        setExams(Array.isArray(normalized.items) ? normalized.items : []);
        const totalItems = normalized.meta.totalItems ?? examRes.count ?? 0;
        const totalPages = normalized.meta.totalPages ?? examRes.pagination?.total_pages ?? Math.max(1, Math.ceil((totalItems || 0) / 10));
        setPagination({
          currentPage: normalized.meta.currentPage ?? examRes.pagination?.current_page ?? page,
          totalPages,
          totalItems
        });
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadFilters = async () => {
    if (batches.length > 0 && semesters.length > 0) return; // already loaded
    try {
      const [filters, semRes] = await Promise.all([
      getFilterOptions(),
      fetchWithTokenRefresh(`${API_ENDPOINT}/coe/semesters/`)]
      );

      setBatches(filters.batches || []);
      setBranches(filters.branches || []);

      const semJson = await semRes.json();
      if (semJson.success) {
        setSemesters(semJson.data.semesters || []);
      }
    } catch (e) {

    }
  };

  useEffect(() => {
    loadData();
  }, []);



  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await scheduleExam(formData);
      if (res.success) {
        // Update state locally to avoid extra GET call
        const newExam = res.data; // Backend should return the created exam object
        if (newExam) {
          setExams((prev) => [newExam, ...prev].slice(0, 10)); // Add to top and keep page size
          setPagination((prev) => ({
            ...prev,
            totalItems: prev.totalItems + 1,
            totalPages: Math.ceil((prev.totalItems + 1) / 10)
          }));
        }
        setShowForm(false);
        setFormData({
          title: '', batch_id: '', semester_id: '',
          exam_type: '', exam_period: '',
          date: '', start_time: '', end_time: '', room: '',
          max_marks: '100', weightage: '30'
        });
      } else {
        toast.error(res.message || "Failed to schedule exam");
      }
    } catch (e: any) {
      toast.error(e.message || "Error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const result = await MySwal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
      color: theme === 'dark' ? '#ffffff' : '#000000'
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const res = await deleteExam(id);
      if (res.success) {
        setExams((prev) => prev.filter((ex) => ex.id !== id));
        setPagination((prev) => ({
          ...prev,
          totalItems: prev.totalItems - 1
        }));
        toast.success("Exam schedule deleted successfully");
      } else {
        toast.error(res.message || "Failed to delete");
      }
    } catch (e: any) {
      toast.error(e.message || "Error occurred");
    } finally {
      setLoading(false);
    }
  };

  const computeStatus = (ex: any) => {
    const now = new Date();
    const start = new Date(`${ex.date}T${ex.start_time}:00`);
    const end = new Date(`${ex.date}T${ex.end_time}:00`);
    if (now >= start && now <= end) return 'ongoing';
    if (now < start) return 'upcoming';
    return 'past';
  };

  return (
    <div ref={ref} className={`${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card className={`w-full ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b">
          <div className="flex-1 min-w-0">
            <CardTitle>Exam Scheduling</CardTitle>
            <p className={`text-xs sm:text-sm mt-1 line-clamp-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Manage and schedule examinations across batches and branches.
            </p>
          </div>
          <Button
            onClick={() => {
              loadFilters();
              setShowForm(true);
            }}
            className="flex items-center gap-2">
            
            <Plus className="w-4 h-4" />
            Schedule New Exam
          </Button>
        </CardHeader>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'} max-w-2xl w-[90vw] sm:w-full max-h-[80vh] overflow-y-auto rounded-xl custom-scrollbar`}>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Schedule New Exam
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSchedule} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 py-4">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[18px] sm:text-sm font-medium">Exam Title</label>
                <Input
                  placeholder="e.g. 1st Internal Assessment - Mathematics"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="h-12 sm:h-10 text-[18px] sm:text-sm" />
                
              </div>

              <div className="space-y-2">
                <label className="text-[18px] sm:text-sm font-medium">Batch</label>
                <Select value={formData.batch_id} onValueChange={(v) => setFormData({ ...formData, batch_id: v })}>
                  <SelectTrigger className="h-12 sm:h-10 text-[18px] sm:text-sm"><SelectValue placeholder="Select Batch" /></SelectTrigger>
                  <SelectContent>
                    {batches.map((b) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[18px] sm:text-sm font-medium">Semester</label>
                <Select value={formData.semester_id} onValueChange={(v) => setFormData({ ...formData, semester_id: v })}>
                  <SelectTrigger className="h-12 sm:h-10 text-[18px] sm:text-sm"><SelectValue placeholder="Select Semester" /></SelectTrigger>
                  <SelectContent>
                    {semesters.map((s) => <SelectItem key={s.id} value={s.id.toString()}>Sem {s.number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[18px] sm:text-sm font-medium">Exam Type</label>
                <Select value={formData.exam_type} onValueChange={(v) => setFormData({ ...formData, exam_type: v })}>
                  <SelectTrigger className="h-12 sm:h-10 text-[18px] sm:text-sm"><SelectValue placeholder="Select Type" /></SelectTrigger>
                  <SelectContent>
                    {EXAM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[18px] sm:text-sm font-medium">Exam Period</label>
                <Select value={formData.exam_period} onValueChange={(v) => setFormData({ ...formData, exam_period: v })}>
                  <SelectTrigger className="h-12 sm:h-10 text-[18px] sm:text-sm"><SelectValue placeholder="Select Period" /></SelectTrigger>
                  <SelectContent>
                    {EXAM_PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="text-[18px] sm:text-sm font-semibold">Exam Date</label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal h-12 px-4 rounded-xl border ${!formData.date && "text-muted-foreground"} ${theme === 'dark' ? 'bg-background border-border hover:bg-accent' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                      
                      <Calendar className="mr-3 h-5 w-5 text-primary" />
                      <span className="text-[18px] sm:text-sm">{formData.date ? format(new Date(formData.date), "PPP") : "Pick a date"}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className={theme === 'dark' ? 'w-auto p-0 bg-background text-foreground border-border shadow-2xl rounded-2xl' : 'w-auto p-0 bg-white text-gray-900 border-gray-200 shadow-2xl rounded-2xl'} align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formData.date ? new Date(formData.date) : undefined}
                      onSelect={(date) => {
                        setFormData({ ...formData, date: date ? format(date, "yyyy-MM-dd") : "" });
                        setDateOpen(false);
                      }}
                      initialFocus
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} />
                    
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-[18px] sm:text-sm font-semibold">Start Time</label>
                <div className="flex gap-2">
                  <Select
                    value={from24h(formData.start_time).h}
                    onValueChange={(v) => setFormData({ ...formData, start_time: to24h(v, from24h(formData.start_time).m, from24h(formData.start_time).p) })}>
                    
                    <SelectTrigger className="flex-1 h-12 rounded-xl px-3 text-[18px] sm:text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-48">
                      {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map((h) =>
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Select
                    value={from24h(formData.start_time).m}
                    onValueChange={(v) => setFormData({ ...formData, start_time: to24h(from24h(formData.start_time).h, v, from24h(formData.start_time).p) })}>
                    
                    <SelectTrigger className="flex-1 h-12 rounded-xl px-3 text-[18px] sm:text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-48">
                      {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) =>
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Select
                    value={from24h(formData.start_time).p}
                    onValueChange={(v) => setFormData({ ...formData, start_time: to24h(from24h(formData.start_time).h, from24h(formData.start_time).m, v) })}>
                    
                    <SelectTrigger className="w-[75px] sm:w-[70px] h-12 rounded-xl px-2 text-[18px] sm:text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[18px] sm:text-sm font-semibold">End Time</label>
                <div className="flex gap-2">
                  <Select
                    value={from24h(formData.end_time).h}
                    onValueChange={(v) => setFormData({ ...formData, end_time: to24h(v, from24h(formData.end_time).m, from24h(formData.end_time).p) })}>
                    
                    <SelectTrigger className="flex-1 h-12 rounded-xl px-3 text-[18px] sm:text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-48">
                      {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map((h) =>
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Select
                    value={from24h(formData.end_time).m}
                    onValueChange={(v) => setFormData({ ...formData, end_time: to24h(from24h(formData.end_time).h, v, from24h(formData.end_time).p) })}>
                    
                    <SelectTrigger className="flex-1 h-12 rounded-xl px-3 text-[18px] sm:text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-48">
                      {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) =>
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Select
                    value={from24h(formData.end_time).p}
                    onValueChange={(v) => setFormData({ ...formData, end_time: to24h(from24h(formData.end_time).h, from24h(formData.end_time).m, v) })}>
                    
                    <SelectTrigger className="w-[75px] sm:w-[70px] h-12 rounded-xl px-2 text-[18px] sm:text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[18px] sm:text-sm font-semibold">Venue / Room</label>
                <Input placeholder="e.g. Room 302" value={formData.room} onChange={(e) => setFormData({ ...formData, room: e.target.value })} className="h-12 text-[18px] sm:text-sm rounded-xl" />
              </div>

              <div className="space-y-2">
                <label className="text-[18px] sm:text-sm font-semibold">Max Marks</label>
                <Input type="number" value={formData.max_marks} onChange={(e) => setFormData({ ...formData, max_marks: e.target.value })} className="h-12 text-[18px] sm:text-sm rounded-xl" />
              </div>

              <div className="space-y-2">
                <label className="text-[18px] sm:text-sm font-semibold">Weightage (%)</label>
                <Input type="number" value={formData.weightage} onChange={(e) => setFormData({ ...formData, weightage: e.target.value })} className="h-12 text-[18px] sm:text-sm rounded-xl" />
              </div>

              <div className="sm:col-span-2 flex justify-end gap-3 pt-6 border-t mt-4">
                <Button type="button" variant="ghost" className="h-12 sm:h-10 text-[18px] sm:text-sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={loading} className="h-12 sm:h-10 px-8 text-[18px] sm:text-sm font-bold sm:font-semibold">
                  {loading ? "Scheduling..." : "Create Schedule"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <CardContent className="p-0">
          <div className="space-y-4">
            {loading ?
            <div className="p-6">
                <SkeletonTable rows={10} cols={6} />
              </div> :
            exams.length === 0 ?
            <div className="px-6 py-12">
                 <Card className="border-dashed border-2 shadow-none bg-transparent">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="bg-primary/5 p-6 rounded-full mb-4">
                        <Calendar className="w-12 h-12 text-primary/40" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">No exams scheduled yet</h3>
                      <p className="text-muted-foreground max-w-sm mx-auto">
                        There are currently no active exam schedules. Click the <strong>Schedule New Exam</strong> button above to create a new one.
                      </p>
                    </CardContent>
                 </Card>
               </div> :

            <>
              <div className="space-y-4">
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className={`border-b ${theme === 'dark' ? 'bg-muted/50 border-border text-muted-foreground' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                      <tr className="whitespace-nowrap">
                        <th className="px-6 py-4 font-semibold">Exam Details</th>
                        <th className="px-6 py-4 font-semibold text-center">Batch / Semester</th>
                        <th className="px-6 py-4 font-semibold text-center">Date & Time</th>
                        <th className="px-6 py-4 font-semibold text-center">Venue</th>
                        <th className="px-6 py-4 font-semibold text-center">Status</th>
                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`whitespace-nowrap divide-y ${theme === 'dark' ? 'divide-border' : 'divide-gray-200'}`}>
                      {Array.isArray(exams) && exams.map((ex) =>
                      <tr key={ex.id} className={`hover:${theme === 'dark' ? 'bg-muted/30' : 'bg-gray-50'} transition-colors`}>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-foreground">{ex.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {ex.subject?.name ? `${ex.subject.name}${ex.subject.code ? ` (${ex.subject.code})` : ''}` : 'General'}
                            </div>
                            <div className="mt-1 flex gap-1">
                              <Badge variant="outline" className="text-[10px] py-0">{ex.exam_type?.replace('_', ' ')}</Badge>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="font-medium">{ex.batch?.name}</div>
                            <div className="text-xs text-muted-foreground">{ex.semester?.number ? `Sem ${ex.semester.number}` : ''}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="font-medium">{new Date(ex.date).toLocaleDateString()}</div>
                            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {formatTo12h(ex.start_time)} - {formatTo12h(ex.end_time)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant="secondary" className="font-medium">{ex.room || 'TBD'}</Badge>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge className={`capitalize ${computeStatus(ex) === 'ongoing' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                          computeStatus(ex) === 'upcoming' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                          'bg-gray-500/10 text-gray-600 border-gray-500/20'}`
                          } variant="outline">
                              {computeStatus(ex)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(ex.id)}>
                            
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List */}
                <div className="sm:hidden space-y-4 px-4 py-2">
                  {Array.isArray(exams) && exams.map((ex) =>
                  <Card key={ex.id} className="p-4 sm:p-5">
                      <div className="flex flex-col gap-4">
                        <div className="w-full">
                          <div className="flex items-center flex-wrap gap-2 mb-2">
                            <h3 className="font-semibold text-[18px] sm:text-base">{ex.title}</h3>
                            <Badge className={`capitalize ${computeStatus(ex) === 'ongoing' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                          computeStatus(ex) === 'upcoming' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                          'bg-gray-500/10 text-gray-600 border-gray-500/20'}`
                          } variant="outline">
                              {computeStatus(ex)}
                            </Badge>
                          </div>
                          <div className="space-y-1 sm:space-y-0.5">
                            <div className="grid grid-cols-[110px_1fr] items-start">
                              <span className="text-[16px] sm:text-sm text-muted-foreground">Subject:</span>
                              <span className="text-[16px] sm:text-sm font-medium">{ex.subject?.name || 'General'}</span>
                            </div>
                            <div className="grid grid-cols-[110px_1fr] items-start">
                              <span className="text-[16px] sm:text-sm text-muted-foreground">Batch/Sem:</span>
                              <span className="text-[16px] sm:text-sm font-medium">{ex.batch?.name} / Sem {ex.semester?.number}</span>
                            </div>
                            <div className="grid grid-cols-[110px_1fr] items-start">
                              <span className="text-[16px] sm:text-sm text-muted-foreground">Date:</span>
                              <span className="text-[16px] sm:text-sm font-medium">{new Date(ex.date).toLocaleDateString()}</span>
                            </div>
                            <div className="grid grid-cols-[110px_1fr] items-start">
                              <span className="text-[16px] sm:text-sm text-muted-foreground">Time:</span>
                              <span className="text-[16px] sm:text-sm font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTo12h(ex.start_time)} - {formatTo12h(ex.end_time)}
                              </span>
                            </div>
                            <div className="grid grid-cols-[110px_1fr] items-start">
                              <span className="text-[16px] sm:text-sm text-muted-foreground">Venue:</span>
                              <span className="text-[16px] sm:text-sm font-medium">{ex.room || 'TBD'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex w-full gap-2">
                          <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(ex.id)}
                          className={`flex-1 flex items-center justify-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md transition border ${theme === 'dark' ? 'border-red-500 text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'border-red-500 text-red-700 bg-red-50 hover:bg-red-100'}`}>

                          
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Schedule
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between px-6 py-6 gap-4 border-t border-border">
                <div className="text-[16px] sm:text-sm text-muted-foreground text-center sm:text-left">
                  {pagination.totalItems > 0 ?
                  `Showing ${(pagination.currentPage - 1) * 10 + 1} to ${Math.min(pagination.currentPage * 10, pagination.totalItems)} of ${pagination.totalItems} exams` :
                  `Showing 0 exams`}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.currentPage === 1 || loading}
                    onClick={() => loadData(pagination.currentPage - 1)}
                    className="flex-1 sm:flex-none h-10 sm:h-9 px-4 sm:px-3 text-[16px] sm:text-sm font-semibold bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 disabled:opacity-50">
                    
                    Prev
                  </Button>
                  <div className="flex items-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 sm:h-9 px-4 sm:px-3 text-[18px] sm:text-sm font-semibold bg-white text-black border-2 cursor-default">
                      
                      {pagination.currentPage}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.currentPage === pagination.totalPages || loading}
                    onClick={() => loadData(pagination.currentPage + 1)}
                    className="flex-1 sm:flex-none h-10 sm:h-9 px-4 sm:px-3 text-[16px] sm:text-sm font-semibold bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 disabled:opacity-50">
                    
                    Next
                  </Button>
                </div>
              </div>
            </>
            }
          </div>
        </CardContent>
      </Card>
    </div>);

});

ExamScheduling.displayName = 'ExamScheduling';

export default ExamScheduling;