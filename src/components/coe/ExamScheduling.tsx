import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from
  "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from
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
import { RefreshCcw, BookOpen, Clock, Calendar, CheckCircle2, History, Plus, Trash2, MapPin, Edit2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import {
  getExamSchedule,
  scheduleExam,
  deleteExam,
  updateExamSchedule,
  getFilterOptions,
  getSemesters,
  getSubjects,
  Batch,
  Branch,
  Semester
} from
  "../../utils/coe_api";
import { normalizePaginatedResponse } from '../../utils/normalizePagination';
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";

const EXAM_TYPES = [
  { value: 'internal_1', label: '1st Internal Assessment' },
  { value: 'internal_2', label: '2nd Internal Assessment' },
  { value: 'internal_3', label: '3rd Internal Assessment' },
  { value: 'internal_4', label: '4th Internal Assessment' },
  { value: 'internal_5', label: '5th Internal Assessment' },
  { value: 'semester_exam', label: 'Semester End Exam' },
  { value: 'makeup', label: 'Makeup Exam' },
  { value: 'supplementary', label: 'Supplementary Exam' }];


const EXAM_PERIODS = [
  { value: 'june_july', label: 'June/July' },
  { value: 'nov_dec', label: 'November/December' },
  { value: 'jan_feb', label: 'January/February' },
  { value: 'apr_may', label: 'April/May' },
  { value: 'sept_oct', label: 'September/October' },
  { value: 'feb_mar', label: 'February/March' }];


const ExamScheduling = React.forwardRef<HTMLDivElement>((_, ref) => {
  const { theme } = useTheme();
  const MySwal = withReactContent(Swal);
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<any[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [listFilters, setListFilters] = useState({ batch_id: '', branch_id: '', semester_id: '' });
  const [filterSemesters, setFilterSemesters] = useState<Semester[]>([]);
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isFormBranchOpen, setIsFormBranchOpen] = useState(false);
  const [isFormSemesterOpen, setIsFormSemesterOpen] = useState(false);
  const [isFormExamTypeOpen, setIsFormExamTypeOpen] = useState(false);
  const [isFormExamPeriodOpen, setIsFormExamPeriodOpen] = useState(false);
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);
  const [subjectDateOpens, setSubjectDateOpens] = useState<Record<number, boolean>>({});

  // Category-based scheduling states
  const [schedulingMode, setSchedulingMode] = useState<'individual' | 'category'>('individual');
  const [selectedCategory, setSelectedCategory] = useState<'elective' | 'open_elective'>('elective');
  const [categoryDate, setCategoryDate] = useState<string>('');
  const [categoryStartTime, setCategoryStartTime] = useState<string>('09:00');
  const [categoryEndTime, setCategoryEndTime] = useState<string>('12:00');
  const [isCategoryDateOpen, setIsCategoryDateOpen] = useState(false);

  const displayDate = (dateStr: string) => {
    if (!dateStr) return "Pick a date";
    try {
      return format(parse(dateStr, 'yyyy-MM-dd', new Date()), 'PPP');
    } catch (e) {
      return dateStr;
    }
  };

  const handleModeChange = (mode: 'individual' | 'category') => {
    setSchedulingMode(mode);
  };

  const resetForm = () => {
    setShowForm(false);
    setFormData({
      title: '', batch_id: '', branch_id: '', semester_id: '',
      exam_type: '', exam_period: '',
      start_date: '', end_date: '', room: '',
      subjects: []
    });
    setRoomsList(['']);
    setRoomsSaved(false);
    setSubjectDateOpens({});
    setSchedulingMode('individual');
    setSelectedCategory('elective');
    setCategoryDate('');
    setCategoryStartTime('09:00');
    setCategoryEndTime('12:00');
    setIsCategoryDateOpen(false);
  };

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [roomsList, setRoomsList] = useState<string[]>(['']);
  const [roomsSaved, setRoomsSaved] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    batch_id: '',
    branch_id: '',
    semester_id: '',
    exam_type: '',
    exam_period: '',
    start_date: '',
    end_date: '',
    room: '',
    subjects: [] as { _id: string; subject_id: string; date: string; start_time: string; end_time: string }[]
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

  const loadData = async (page = 1, currentFilters = listFilters) => {
    if (!currentFilters.batch_id || currentFilters.batch_id === 'all' ||
        !currentFilters.branch_id || currentFilters.branch_id === 'all' ||
        !currentFilters.semester_id || currentFilters.semester_id === 'all') {
      setExams([]);
      setPagination({ currentPage: 1, totalPages: 1, totalItems: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const examRes = await getExamSchedule({
        page,
        page_size: 10,
        batch_id: currentFilters.batch_id !== 'all' ? currentFilters.batch_id : undefined,
        branch_id: currentFilters.branch_id !== 'all' ? currentFilters.branch_id : undefined,
        semester_id: currentFilters.semester_id !== 'all' ? currentFilters.semester_id : undefined
      });

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
    if (batches.length > 0) return; // already loaded
    try {
      const res = await getFilterOptions();
      setBatches(res.batches);
      setBranches(res.branches);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (listFilters.branch_id && listFilters.branch_id !== 'all') {
      const fetchSemesters = async () => {
        try {
          const sems = await getSemesters(Number(listFilters.branch_id));
          setFilterSemesters(sems);
        } catch (e) {
          console.error(e);
        }
      };
      fetchSemesters();
    } else {
      setFilterSemesters([]);
    }
  }, [listFilters.branch_id]);

  useEffect(() => {
    if (formData.branch_id) {
      const fetchSemesters = async () => {
        try {
          const sems = await getSemesters(Number(formData.branch_id));
          setSemesters(sems);
        } catch (e) {
          console.error(e);
        }
      };
      fetchSemesters();
    } else {
      setSemesters([]);
    }
  }, [formData.branch_id]);

  useEffect(() => {
    if (formData.branch_id && formData.semester_id) {
      const fetchSubjects = async () => {
        try {
          const subs = await getSubjects(
            formData.branch_id,
            formData.semester_id,
            formData.batch_id,
            formData.exam_type,
            formData.exam_period === 'none' ? '' : formData.exam_period
          );
          setSubjects(subs);
        } catch (e) {
          console.error(e);
        }
      };
      fetchSubjects();
    } else {
      setSubjects([]);
    }
  }, [formData.branch_id, formData.semester_id, formData.batch_id, formData.exam_type, formData.exam_period]);

  const addCategorySubjects = () => {
    const filtered = subjects.filter(s => s.subject_type === selectedCategory);
    if (filtered.length === 0) {
      toast.error("No subjects found for this category.");
      return;
    }
    
    const newSubjects = [...formData.subjects];
    let addedCount = 0;
    filtered.forEach(s => {
      if (!newSubjects.some(sub => sub.subject_id === s.id.toString())) {
        newSubjects.unshift({
          _id: Math.random().toString(36).substr(2, 9),
          subject_id: s.id.toString(),
          date: categoryDate || '',
          start_time: categoryStartTime,
          end_time: categoryEndTime
        });
        addedCount++;
      }
    });
    
    setFormData(prev => ({
      ...prev,
      subjects: newSubjects
    }));
    
    toast.success(`Added ${addedCount} subjects to the schedule list.`);
    setSchedulingMode('individual');
  };

  useEffect(() => {
    loadFilters();
    loadData();
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...listFilters, [key]: value };
    if (key === 'batch_id') {
      newFilters.branch_id = '';
      newFilters.semester_id = '';
    } else if (key === 'branch_id') {
      newFilters.semester_id = '';
    }
    setListFilters(newFilters);
    loadData(1, newFilters);
  };



  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    // Frontend validation
    if (formData.subjects.length > 0) {
      const invalidSubject = formData.subjects.find(s => !s.subject_id || !s.date);
      if (invalidSubject) {
        toast.error("Please ensure all subjects have a selected subject and date.");
        return;
      }
    }

    setLoading(true);
    const finalRooms = roomsList.map(r => r.trim()).filter(r => r).join(', ');
    const finalData = { 
      ...formData, 
      room: finalRooms,
      subjects: formData.subjects.map(({ _id, ...rest }) => rest)
    };
    try {
      const res = await scheduleExam(finalData);
      if (res.success) {
        // Update state locally to avoid extra GET call
        const newExams = res.data; // Backend returns array of created exams
        if (newExams) {
          if (Array.isArray(newExams)) {
            setExams((prev) => [...newExams, ...prev].slice(0, 10));
            setPagination((prev) => ({
              ...prev,
              totalItems: prev.totalItems + newExams.length,
              totalPages: Math.ceil((prev.totalItems + newExams.length) / 10)
            }));
          } else {
            setExams((prev) => [newExams, ...prev].slice(0, 10));
            setPagination((prev) => ({
              ...prev,
              totalItems: prev.totalItems + 1,
              totalPages: Math.ceil((prev.totalItems + 1) / 10)
            }));
          }
        }
        resetForm();
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

  const [editingExamId, setEditingExamId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({ date: '', start_time: '', end_time: '', room: '' });

  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExamId) return;
    setLoading(true);
    try {
      const res = await updateExamSchedule({
        exam_id: editingExamId,
        ...editFormData
      });
      if (res.success) {
        toast.success("Exam schedule updated successfully");
        setEditingExamId(null);
        loadData(pagination.currentPage, listFilters); // Reload current page
      } else {
        toast.error(res.message || "Failed to update exam");
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

  const [viewGroupId, setViewGroupId] = useState<string | null>(null);

  const groupExams = (examsList: any[]): any[] => {
    const groups: Record<string, any> = {};
    examsList.forEach(ex => {
      const batchName = ex.batch?.name || 'All Batches';
      const branchName = ex.subject?.branch || 'All Branches';
      const semNumber = ex.semester?.number ? `Sem ${ex.semester.number}` : '';
      const key = `${batchName}-${branchName}-${semNumber}-${ex.exam_type}-${ex.exam_period}-${ex.title}`;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          title: ex.title || ex.exam_type?.replace('_', ' ') || 'Exam',
          batch: batchName,
          branch: branchName,
          semester: semNumber,
          exam_type: ex.exam_type || '',
          exam_period: ex.exam_period || '',
          dateStr: '',
          status: 'upcoming',
          subjects: [],
        };
      }
      groups[key].subjects.push(ex);
    });

    return Object.values(groups).map(g => {
      let hasOngoing = false;
      let allPast = true;

      g.subjects.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      g.subjects.forEach((ex: any) => {
        const s = computeStatus(ex);
        if (s === 'ongoing') hasOngoing = true;
        if (s !== 'past') allPast = false;
      });

      g.status = hasOngoing ? 'ongoing' : allPast ? 'past' : 'upcoming';
      
      if (g.subjects.length > 0) {
        const firstD = new Date(g.subjects[0].date).toLocaleDateString();
        const lastD = new Date(g.subjects[g.subjects.length - 1].date).toLocaleDateString();
        if (firstD === lastD) {
          if (g.subjects[0].start_time && g.subjects[0].end_time) {
            const timeStr = `${formatTo12h(g.subjects[0].start_time)} - ${formatTo12h(g.subjects[0].end_time)}`;
            g.dateStr = `${firstD}, ${timeStr}`;
          } else {
            g.dateStr = firstD;
          }
        } else {
          g.dateStr = `${firstD} - ${lastD}`;
        }
      }
      
      return g;
    });
  };

  useEffect(() => {
    if (viewGroupId) {
      const g = groupExams(exams).find(x => x.id === viewGroupId);
      if (!g || g.subjects.length === 0) {
        setViewGroupId(null);
      }
    }
  }, [exams, viewGroupId]);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  return (
    <div ref={ref} id="coe-exam-scheduling-container" className={`${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card className={`w-full ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
        <CardHeader id="coe-exam-scheduling-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b">
          <div className="flex-1 min-w-0">
            <CardTitle>Exam Scheduling</CardTitle>
            <p className={`text-xs sm:text-sm mt-1 line-clamp-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Manage and schedule examinations across batches and branches.
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              loadFilters();
              setShowForm(true);
            }}
            className="flex items-center gap-2">

            <Plus className="w-4 h-4" />
            Schedule New Exam
          </Button>
        </CardHeader>

        <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); else setShowForm(true); }}>
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
                <Select value={formData.batch_id} onValueChange={(v) => {
                  setFormData({ ...formData, batch_id: v, branch_id: '', semester_id: '', exam_type: '', exam_period: '', subjects: [] });
                  setTimeout(() => setIsFormBranchOpen(true), 150);
                }}>
                  <SelectTrigger className="h-12 sm:h-10 text-[18px] sm:text-sm"><SelectValue placeholder="Select Batch" /></SelectTrigger>
                  <SelectContent>
                    {batches.length > 0 ? (
                      batches.map((b) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)
                    ) : (
                      <SelectItem value="none" disabled>No batches found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[18px] sm:text-sm font-medium">{translateTerminology("Branch")}</label>
                <Select value={formData.branch_id} onValueChange={(v) => {
                  setFormData({ ...formData, branch_id: v, semester_id: '', exam_type: '', exam_period: '', subjects: [] });
                  setTimeout(() => setIsFormSemesterOpen(true), 150);
                }} open={isFormBranchOpen} onOpenChange={setIsFormBranchOpen} disabled={!formData.batch_id}>
                  <SelectTrigger className="h-12 sm:h-10 text-[18px] sm:text-sm"><SelectValue placeholder={formData.batch_id ? "Select Branch" : "Select Batch First"} /></SelectTrigger>
                  <SelectContent>
                    {branches.length > 0 ? (
                      branches.map((b) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)
                    ) : (
                      <SelectItem value="none" disabled>No branches found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[18px] sm:text-sm font-medium">{translateTerminology("Semester")}</label>
                <Select value={formData.semester_id} onValueChange={(v) => {
                  setFormData({ ...formData, semester_id: v, exam_type: '', exam_period: '', subjects: [] });
                  setTimeout(() => setIsFormExamTypeOpen(true), 150);
                }} open={isFormSemesterOpen} onOpenChange={setIsFormSemesterOpen} disabled={!formData.branch_id}>
                  <SelectTrigger className="h-12 sm:h-10 text-[18px] sm:text-sm"><SelectValue placeholder={formData.branch_id ? "Select Semester" : "Select Branch First"} /></SelectTrigger>
                  <SelectContent>
                    {semesters.length > 0 ? (
                      semesters.map((s) => <SelectItem key={s.id} value={s.id.toString()}>Sem {s.number}</SelectItem>)
                    ) : (
                      <SelectItem value="none" disabled>No semesters found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[18px] sm:text-sm font-medium">Exam Type</label>
                <Select value={formData.exam_type} onValueChange={(v) => {
                  setFormData({ ...formData, exam_type: v, exam_period: '', subjects: [] });
                  setTimeout(() => setIsFormExamPeriodOpen(true), 150);
                }} open={isFormExamTypeOpen} onOpenChange={setIsFormExamTypeOpen} disabled={!formData.semester_id}>
                  <SelectTrigger className="h-12 sm:h-10 text-[18px] sm:text-sm"><SelectValue placeholder={formData.semester_id ? "Select Type" : "Select Semester First"} /></SelectTrigger>
                  <SelectContent>
                    {EXAM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[18px] sm:text-sm font-medium">Exam Period</label>
                <Select value={formData.exam_period} onValueChange={(v) => setFormData({ ...formData, exam_period: v === 'none' ? '' : v, subjects: [] })} open={isFormExamPeriodOpen} onOpenChange={setIsFormExamPeriodOpen} disabled={!formData.exam_type}>
                  <SelectTrigger className="h-12 sm:h-10 text-[18px] sm:text-sm">
                    <SelectValue placeholder={formData.exam_type ? "Select Period (Optional)" : "Select Exam Type First"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None / Optional</SelectItem>
                    {EXAM_PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex flex-col">
                <label className="text-[18px] sm:text-sm font-semibold">Start Date</label>
                <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!formData.exam_type}
                      className={`h-12 text-[18px] sm:text-sm rounded-xl justify-start text-left font-normal ${!formData.start_date && "text-muted-foreground disabled:text-muted-foreground"}`}
                    >
                      <Calendar className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      {formData.start_date ? displayDate(formData.start_date) : <span>Pick a start date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formData.start_date ? parse(formData.start_date, 'yyyy-MM-dd', new Date()) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setFormData({ ...formData, start_date: format(date, "yyyy-MM-dd"), end_date: '' });
                          setIsStartDateOpen(false);
                        }
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                      initialFocus
                      className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2 flex flex-col">
                <label className="text-[18px] sm:text-sm font-semibold">End Date</label>
                <Popover open={isEndDateOpen} onOpenChange={setIsEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!formData.start_date}
                      className={`h-12 text-[18px] sm:text-sm rounded-xl justify-start text-left font-normal ${!formData.end_date && "text-muted-foreground disabled:text-muted-foreground"}`}
                    >
                      <Calendar className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      {formData.end_date ? displayDate(formData.end_date) : <span>Pick an end date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formData.end_date ? parse(formData.end_date, 'yyyy-MM-dd', new Date()) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setFormData({ ...formData, end_date: format(date, "yyyy-MM-dd") });
                          setIsEndDateOpen(false);
                        }
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (formData.start_date) {
                          const startDate = parse(formData.start_date, 'yyyy-MM-dd', new Date());
                          startDate.setHours(0, 0, 0, 0);
                          return date < startDate;
                        }
                        return date < today;
                      }}
                      initialFocus
                      className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label className="text-[18px] sm:text-sm font-semibold">Venue / Room(s)</label>
                {!roomsSaved ? (
                  <div className="space-y-2 border p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    {roomsList.map((rm, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          placeholder="e.g. Room 302"
                          value={rm}
                          onChange={(e) => {
                            const newRooms = [...roomsList];
                            newRooms[idx] = e.target.value;
                            setRoomsList(newRooms);
                          }}
                          className="h-12 text-[18px] sm:text-sm rounded-xl flex-1 bg-white dark:bg-background"
                        />
                        {roomsList.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive h-12 w-12"
                            onClick={() => {
                              const newRooms = roomsList.filter((_, i) => i !== idx);
                              setRoomsList(newRooms);
                            }}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        )}
                        {idx === roomsList.length - 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-12 px-4 whitespace-nowrap bg-white dark:bg-background"
                            onClick={() => setRoomsList([...roomsList, ''])}
                          >
                            <Plus className="w-4 h-4 mr-2" /> Add
                          </Button>
                        )}
                      </div>
                    ))}
                    <div className="pt-2 flex justify-end w-full">
                      <Button
                        type="button"
                        className="w-full sm:w-auto h-12 sm:h-10"
                        onClick={() => {
                          const validRooms = roomsList.map(r => r.trim()).filter(r => r);
                          if (validRooms.length > 0) {
                            setRoomsSaved(true);
                            setRoomsList(validRooms);
                            setFormData({ ...formData, room: validRooms.join(', ') });
                          } else {
                            toast.error("Please add at least one valid room number");
                          }
                        }}
                      >
                        Save Rooms
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 border rounded-xl bg-secondary/10">
                    <div className="flex flex-wrap gap-2">
                      {roomsList.map((rm, idx) => (
                        <Badge key={idx} variant="outline" className="px-3 py-1.5 text-sm bg-background">
                          {rm}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRoomsSaved(false)}
                      className="text-primary hover:text-primary/80"
                    >
                      Edit Rooms
                    </Button>
                  </div>
                )}
              </div>

              {/* Scheduling Mode Selector */}
              <div className="sm:col-span-2 space-y-2 border-t pt-4">
                <label className="text-[18px] sm:text-sm font-medium">Scheduling Mode</label>
                <div className="grid grid-cols-2 gap-2 bg-muted/40 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleModeChange('individual')}
                    className={`py-2 text-sm font-semibold rounded-lg transition-all ${
                      schedulingMode === 'individual'
                        ? 'bg-background shadow text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Individual Subjects
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('category')}
                    className={`py-2 text-sm font-semibold rounded-lg transition-all ${
                      schedulingMode === 'category'
                        ? 'bg-background shadow text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Elective / Open Elective
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {schedulingMode === 'category' ? (
                  <motion.div
                    key="category"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border rounded-xl bg-secondary/5"
                  >
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-medium">Subject Category</label>
                      <Select
                        value={selectedCategory}
                        onValueChange={(v: any) => setSelectedCategory(v)}
                      >
                        <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Select Category" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="elective">Elective Subjects</SelectItem>
                          <SelectItem value="open_elective">Open Elective Subjects</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 flex flex-col">
                      <label className="text-sm font-medium">Exam Date</label>
                      <Popover open={isCategoryDateOpen} onOpenChange={isCategoryDateOpen => setIsCategoryDateOpen(isCategoryDateOpen)}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!formData.start_date || !formData.end_date}
                            className={`w-full justify-start text-left font-normal bg-background ${!categoryDate && "text-muted-foreground"}`}
                          >
                            <Calendar className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            {categoryDate ? displayDate(categoryDate) : <span>Pick date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={categoryDate ? parse(categoryDate, 'yyyy-MM-dd', new Date()) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                setCategoryDate(format(date, "yyyy-MM-dd"));
                                setIsCategoryDateOpen(false);
                              }
                            }}
                            disabled={(date) => {
                              if (formData.start_date && formData.end_date) {
                                const start = parse(formData.start_date, 'yyyy-MM-dd', new Date());
                                const end = parse(formData.end_date, 'yyyy-MM-dd', new Date());
                                start.setHours(0, 0, 0, 0);
                                end.setHours(0, 0, 0, 0);
                                return date < start || date > end;
                              }
                              return false;
                            }}
                            initialFocus
                            className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-medium">Time Slot (Start - End)</label>
                      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        <div className="flex gap-1 items-center">
                          <Select
                            value={from24h(categoryStartTime).h}
                            onValueChange={(hVal) => {
                              const current = from24h(categoryStartTime);
                              setCategoryStartTime(to24h(hVal, current.m, current.p));
                            }}
                          >
                            <SelectTrigger className="w-[65px] bg-background px-1.5"><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-muted-foreground font-bold">:</span>
                          <Select
                            value={from24h(categoryStartTime).m}
                            onValueChange={(mVal) => {
                              const current = from24h(categoryStartTime);
                              setCategoryStartTime(to24h(current.h, mVal, current.p));
                            }}
                          >
                            <SelectTrigger className="w-[65px] bg-background px-1.5"><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={from24h(categoryStartTime).p}
                            onValueChange={(pVal) => {
                              const current = from24h(categoryStartTime);
                              setCategoryStartTime(to24h(current.h, current.m, pVal));
                            }}
                          >
                            <SelectTrigger className="w-[70px] bg-background px-1.5"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <span className="text-muted-foreground font-semibold text-center sm:text-left">to</span>

                        <div className="flex gap-1 items-center">
                          <Select
                            value={from24h(categoryEndTime).h}
                            onValueChange={(hVal) => {
                              const current = from24h(categoryEndTime);
                              setCategoryEndTime(to24h(hVal, current.m, current.p));
                            }}
                          >
                            <SelectTrigger className="w-[65px] bg-background px-1.5"><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-muted-foreground font-bold">:</span>
                          <Select
                            value={from24h(categoryEndTime).m}
                            onValueChange={(mVal) => {
                              const current = from24h(categoryEndTime);
                              setCategoryEndTime(to24h(current.h, mVal, current.p));
                            }}
                          >
                            <SelectTrigger className="w-[65px] bg-background px-1.5"><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={from24h(categoryEndTime).p}
                            onValueChange={(pVal) => {
                              const current = from24h(categoryEndTime);
                              setCategoryEndTime(to24h(current.h, current.m, pVal));
                            }}
                          >
                            <SelectTrigger className="w-[70px] bg-background px-1.5"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-2 mt-2">
                      <label className="text-xs font-semibold text-muted-foreground block mb-2">
                        Subjects in this Category ({subjects.filter(s => s.subject_type === selectedCategory).length}):
                      </label>
                      {subjects.filter(s => s.subject_type === selectedCategory).length > 0 ? (
                        <>
                          <div className="max-h-[150px] overflow-y-auto border rounded-lg divide-y bg-background p-2">
                            {subjects.filter(s => s.subject_type === selectedCategory).map((sub, idx) => {
                              return (
                                <div key={idx} className="flex justify-between items-center py-1.5 px-2 text-sm">
                                  <div>
                                    <span className="font-semibold">{sub.name}</span>
                                    <span className="text-xs text-muted-foreground ml-2">({sub.subject_code || 'N/A'})</span>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {categoryDate ? displayDate(categoryDate) : 'No date set'} @ {formatTo12h(categoryStartTime)}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                          <Button
                            type="button"
                            onClick={addCategorySubjects}
                            className="w-full mt-3 h-11 bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add Electives to Schedule
                          </Button>
                        </>
                      ) : (
                        <div className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded-lg">
                          No subjects found for this category in the selected semester/branch.
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="individual"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="sm:col-span-2 mt-4 space-y-4"
                  >
                    <div className="flex justify-between items-center border-b pb-2">
                      <label className="text-lg font-semibold">Subjects Schedule</label>
                      <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, subjects: [{ _id: Math.random().toString(36).substr(2, 9), subject_id: '', date: '', start_time: '09:00', end_time: '12:00' }, ...formData.subjects] })} disabled={!formData.branch_id || !formData.semester_id}>
                        <Plus className="w-4 h-4 mr-2" /> Add Subject
                      </Button>
                    </div>
                    {formData.subjects.map((sub, index) => (
                      <div key={sub._id} className="grid grid-cols-1 sm:grid-cols-6 gap-4 p-4 border rounded-xl relative bg-secondary/10">
                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 text-destructive" onClick={() => { const newSubs = [...formData.subjects]; newSubs.splice(index, 1); setFormData({ ...formData, subjects: newSubs }); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <div className="space-y-2 sm:col-span-6 pr-8">
                          <label className="text-sm font-medium">Subject</label>
                          <Select value={sub.subject_id} onValueChange={(v) => { const newSubs = [...formData.subjects]; newSubs[index].subject_id = v; setFormData({ ...formData, subjects: newSubs }); }}>
                            <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                            <SelectContent>
                              {subjects.filter(s => (s.subject_type !== 'elective' && s.subject_type !== 'open_elective' || s.id.toString() === sub.subject_id) && !formData.subjects.some((subItem, i) => i !== index && subItem.subject_id === s.id.toString())).length > 0 ? (
                                subjects
                                  .filter(s => (s.subject_type !== 'elective' && s.subject_type !== 'open_elective' || s.id.toString() === sub.subject_id) && !formData.subjects.some((subItem, i) => i !== index && subItem.subject_id === s.id.toString()))
                                  .map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.subject_code})</SelectItem>)
                              ) : (
                                <SelectItem value="none" disabled>No standard subjects found</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 sm:col-span-2 flex flex-col">
                          <label className="text-sm font-medium">Date</label>
                          <Popover
                            open={!!subjectDateOpens[index]}
                            onOpenChange={(open) => setSubjectDateOpens(prev => ({ ...prev, [index]: open }))}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={!formData.start_date || !formData.end_date}
                                className={`w-full justify-start text-left font-normal bg-background ${!sub.date && "text-muted-foreground"}`}
                              >
                                <Calendar className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                {sub.date ? displayDate(sub.date) : <span>Pick subject date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={sub.date ? parse(sub.date, 'yyyy-MM-dd', new Date()) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    const newSubs = [...formData.subjects];
                                    newSubs[index].date = format(date, "yyyy-MM-dd");
                                    setFormData({ ...formData, subjects: newSubs });
                                    setSubjectDateOpens(prev => ({ ...prev, [index]: false }));
                                  }
                                }}
                                disabled={(date) => {
                                  if (formData.start_date && formData.end_date) {
                                    const start = parse(formData.start_date, 'yyyy-MM-dd', new Date());
                                    const end = parse(formData.end_date, 'yyyy-MM-dd', new Date());
                                    start.setHours(0, 0, 0, 0);
                                    end.setHours(0, 0, 0, 0);
                                    return date < start || date > end;
                                  }
                                  return false;
                                }}
                                initialFocus
                                className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <label className="text-sm font-medium">Start Time</label>
                          <div className="flex gap-1 items-center">
                            <Select
                              value={from24h(sub.start_time).h}
                              onValueChange={(hVal) => {
                                const current = from24h(sub.start_time);
                                const newSubs = [...formData.subjects];
                                newSubs[index].start_time = to24h(hVal, current.m, current.p);
                                setFormData({ ...formData, subjects: newSubs });
                              }}
                            >
                              <SelectTrigger className="w-[70px] bg-background px-2"><SelectValue /></SelectTrigger>
                              <SelectContent className="max-h-[200px]">
                                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                                  <SelectItem key={h} value={h}>{h}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-muted-foreground font-bold">:</span>
                            <Select
                              value={from24h(sub.start_time).m}
                              onValueChange={(mVal) => {
                                const current = from24h(sub.start_time);
                                const newSubs = [...formData.subjects];
                                newSubs[index].start_time = to24h(current.h, mVal, current.p);
                                setFormData({ ...formData, subjects: newSubs });
                              }}
                            >
                              <SelectTrigger className="w-[70px] bg-background px-2"><SelectValue /></SelectTrigger>
                              <SelectContent className="max-h-[200px]">
                                {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => (
                                  <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={from24h(sub.start_time).p}
                              onValueChange={(pVal) => {
                                const current = from24h(sub.start_time);
                                const newSubs = [...formData.subjects];
                                newSubs[index].start_time = to24h(current.h, current.m, pVal);
                                setFormData({ ...formData, subjects: newSubs });
                              }}
                            >
                              <SelectTrigger className="w-[75px] bg-background px-2"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AM">AM</SelectItem>
                                <SelectItem value="PM">PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <label className="text-sm font-medium">End Time</label>
                          <div className="flex gap-1 items-center">
                            <Select
                              value={from24h(sub.end_time).h}
                              onValueChange={(hVal) => {
                                const current = from24h(sub.end_time);
                                const newSubs = [...formData.subjects];
                                newSubs[index].end_time = to24h(hVal, current.m, current.p);
                                setFormData({ ...formData, subjects: newSubs });
                              }}
                            >
                              <SelectTrigger className="w-[70px] bg-background px-2"><SelectValue /></SelectTrigger>
                              <SelectContent className="max-h-[200px]">
                                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                                  <SelectItem key={h} value={h}>{h}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-muted-foreground font-bold">:</span>
                            <Select
                              value={from24h(sub.end_time).m}
                              onValueChange={(mVal) => {
                                const current = from24h(sub.end_time);
                                const newSubs = [...formData.subjects];
                                newSubs[index].end_time = to24h(current.h, mVal, current.p);
                                setFormData({ ...formData, subjects: newSubs });
                              }}
                            >
                              <SelectTrigger className="w-[70px] bg-background px-2"><SelectValue /></SelectTrigger>
                              <SelectContent className="max-h-[200px]">
                                {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => (
                                  <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={from24h(sub.end_time).p}
                              onValueChange={(pVal) => {
                                const current = from24h(sub.end_time);
                                const newSubs = [...formData.subjects];
                                newSubs[index].end_time = to24h(current.h, current.m, pVal);
                                setFormData({ ...formData, subjects: newSubs });
                              }}
                            >
                              <SelectTrigger className="w-[75px] bg-background px-2"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AM">AM</SelectItem>
                                <SelectItem value="PM">PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                    {formData.subjects.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                        No subjects added. Click 'Add Subject' to schedule.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="sm:col-span-2 flex flex-row items-center justify-end gap-3 pt-6 border-t mt-4 w-full">
                <Button type="button" variant="outline" className="flex-1 sm:flex-none h-12 sm:h-10 text-[18px] sm:text-sm" onClick={() => resetForm()}>Cancel</Button>
                <Button type="submit" disabled={loading} className="flex-1 sm:flex-none h-12 sm:h-10 text-[18px] sm:text-sm font-bold sm:font-semibold">
                  {loading ? "Scheduling..." : "Create Schedule"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <CardContent className="p-0">
          <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row gap-4 sm:items-center bg-muted/20">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Filter by Batch</label>
              <Select value={listFilters.batch_id} onValueChange={(v) => {
                handleFilterChange('batch_id', v);
                if (v && v !== 'all') {
                  setTimeout(() => setIsBranchOpen(true), 150);
                }
              }}>
                <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Select Batch" /></SelectTrigger>
                <SelectContent>
                  {batches.length > 0 ? (
                    batches.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled>No batches found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Filter by Branch</label>
              <Select value={listFilters.branch_id} onValueChange={(v) => {
                handleFilterChange('branch_id', v);
                if (v && v !== 'all') {
                  setTimeout(() => setIsSemesterOpen(true), 150);
                }
              }} disabled={!listFilters.batch_id || listFilters.batch_id === 'all'} open={isBranchOpen} onOpenChange={setIsBranchOpen}>
                <SelectTrigger className="h-10 bg-background"><SelectValue placeholder={!listFilters.batch_id || listFilters.batch_id === 'all' ? "Select Batch First" : "Select Branch"} /></SelectTrigger>
                <SelectContent>
                  {branches.length > 0 ? (
                    branches.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled>No branches found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Filter by Semester</label>
              <Select value={listFilters.semester_id} onValueChange={(v) => handleFilterChange('semester_id', v)} disabled={!listFilters.branch_id || listFilters.branch_id === 'all'} open={isSemesterOpen} onOpenChange={setIsSemesterOpen}>
                <SelectTrigger className="h-10 bg-background"><SelectValue placeholder={!listFilters.branch_id || listFilters.branch_id === 'all' ? "Select Branch First" : "Select Semester"} /></SelectTrigger>
                <SelectContent>
                  {filterSemesters.length > 0 ? (
                    filterSemesters.map(s => <SelectItem key={s.id} value={s.id.toString()}>Semester {s.number}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled>No semesters found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="p-6">
                <SkeletonTable rows={10} cols={6} />
              </div>
            ) : exams.length === 0 ? (
              <div className="px-6 py-12">
                <Card className="border-dashed border-2 shadow-none bg-transparent">
                  <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="bg-primary/5 p-6 rounded-full mb-4">
                      <Calendar className="w-12 h-12 text-primary/40" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      {!(listFilters.batch_id && listFilters.branch_id && listFilters.semester_id)
                        ? "Select Filters"
                        : "No exams scheduled yet"}
                    </h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      {!(listFilters.batch_id && listFilters.branch_id && listFilters.semester_id)
                        ? "Please select a Batch, Branch, and Semester above to view scheduled exams."
                        : "There are currently no active exam schedules for the selected filters. Click the Schedule New Exam button above to create one."}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className={`border-b ${theme === 'dark' ? 'bg-muted/50 border-border text-muted-foreground' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                      <tr className="whitespace-nowrap">
                        <th className="px-6 py-4 font-semibold">Exam Details</th>
                        <th className="px-6 py-4 font-semibold text-center">Batch / Branch / Sem</th>
                        <th className="px-6 py-4 font-semibold text-center">Date & Time</th>
                        <th className="px-6 py-4 font-semibold text-center">Venue</th>
                        <th className="px-6 py-4 font-semibold text-center">Status</th>
                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`whitespace-nowrap divide-y ${theme === 'dark' ? 'divide-border' : 'divide-gray-200'}`}>
                      {groupExams(exams).map((g) =>
                        <tr key={g.id} className={`hover:${theme === 'dark' ? 'bg-muted/30' : 'bg-gray-50'} transition-colors`}>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-foreground">{g.title}</div>
                            <div className="mt-1 flex gap-1">
                              {g.exam_type && <Badge variant="outline" className="text-[10px] py-0">{g.exam_type.replace('_', ' ')}</Badge>}
                              {g.exam_period && <Badge variant="outline" className="text-[10px] py-0">{g.exam_period.replace('_', '/')}</Badge>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="font-medium">{g.batch}</div>
                            <div className="text-xs text-muted-foreground">{g.branch} • {g.semester}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="font-medium">{g.dateStr}</div>
                            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                              <BookOpen className="w-3 h-3" />
                              {g.subjects.length} Subjects
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant="secondary" className="font-medium">{g.subjects[0]?.room || 'TBD'}</Badge>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge className={`capitalize ${g.status === 'ongoing' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                              g.status === 'upcoming' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                                'bg-gray-500/10 text-gray-600 border-gray-500/20'}`
                            } variant="outline">
                              {g.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setViewGroupId(g.id)}
                              className="h-8 text-xs font-semibold">
                              View
                            </Button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List */}
                <div className="sm:hidden space-y-4 px-4 py-2">
                  {groupExams(exams).map((g) => (
                    <Card key={g.id} className="p-5 border shadow-sm bg-card">
                      <div className="flex flex-col gap-4">
                        {/* Title Area */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="text-[10px] tracking-wider uppercase font-bold text-muted-foreground px-2 py-0.5 rounded-full bg-secondary border border-border">
                              {g.exam_type?.replace('_', ' ') || 'Exam'}
                            </span>
                            <h3 className="font-bold text-lg text-foreground mt-1.5 tracking-tight leading-snug">{g.title}</h3>
                          </div>

                          <Badge className={`capitalize font-semibold text-xs px-2.5 py-1 rounded-lg border ${
                            g.status === 'ongoing' 
                              ? 'bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/20 dark:text-green-400' 
                              : g.status === 'upcoming' 
                                ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400' 
                                : 'bg-gray-500/10 text-gray-600 border-gray-500/20 dark:bg-gray-800 dark:text-gray-400'
                          }`} variant="outline">
                            {g.status}
                          </Badge>
                        </div>

                        {/* Metadata Rows */}
                        <div className="grid grid-cols-1 gap-3.5 text-sm">
                          {/* Batch / Branch / Sem info */}
                          <div className="flex items-start gap-2">
                            <BookOpen className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <span className="block text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Class Info</span>
                              <span className="font-semibold text-foreground text-[13px] leading-snug break-words">
                                {g.batch} / {g.branch} / {g.semester}
                              </span>
                            </div>
                          </div>

                          {/* Date and Time info */}
                          <div className="flex items-start gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <span className="block text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Date & Time</span>
                              <span className="font-semibold text-foreground text-[13px]">{g.dateStr}</span>
                            </div>
                          </div>

                          {/* Subjects info */}
                          <div className="flex items-start gap-2">
                            <BookOpen className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <span className="block text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Subjects</span>
                              <span className="font-semibold text-foreground text-[13px]">{g.subjects.length} Subjects</span>
                            </div>
                          </div>

                          {/* Venue info */}
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <span className="block text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Venue / Room</span>
                              <span className="font-semibold text-foreground text-[13px]">{g.subjects[0]?.room || 'TBD'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Footer Action */}
                        <div className="pt-3 border-t border-border">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setViewGroupId(g.id)}
                            className="w-full h-10 flex items-center justify-center gap-2 text-sm font-semibold rounded-xl">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {!loading && exams.length > 0 && pagination.totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
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
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Prev
              </Button>
              <div className="flex items-center justify-center min-w-[2rem]">
                <span className="text-sm font-semibold text-primary">
                  {pagination.currentPage}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.currentPage === pagination.totalPages || loading}
                onClick={() => loadData(pagination.currentPage + 1)}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      <Dialog open={!!viewGroupId} onOpenChange={(open) => !open && setViewGroupId(null)}>
        <DialogContent 
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className={`${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'} w-[90vw] max-h-[80vh] md:max-w-2xl md:max-h-[90vh] overflow-y-auto custom-scrollbar rounded-xl`}>
          <DialogHeader>
            {(() => {
              const currentGroup = groupExams(exams).find(g => g.id === viewGroupId);
              return (
                <>
                  <DialogTitle>{currentGroup?.title} - Detailed Schedule</DialogTitle>
                  <div className="text-sm text-muted-foreground mt-1">
                    {currentGroup?.batch} • {currentGroup?.branch} • {currentGroup?.semester}
                  </div>
                </>
              );
            })()}
          </DialogHeader>
          <div className="mt-4 border rounded-md overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold">Subject</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold">Room</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(() => {
                  const currentGroup = groupExams(exams).find(g => g.id === viewGroupId);
                  return currentGroup?.subjects.map((ex: any) => (
                    <tr key={ex.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        {ex.subject?.name || 'General'} {ex.subject?.code ? `(${ex.subject.code})` : ''}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{new Date(ex.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatTo12h(ex.start_time)} - {formatTo12h(ex.end_time)}</td>
                      <td className="px-4 py-3">{ex.room || 'TBD'}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => {
                            setEditingExamId(ex.id);
                            setEditFormData({
                              date: ex.date,
                              start_time: ex.start_time,
                              end_time: ex.end_time,
                              room: ex.room || ''
                            });
                          }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="outline" className="bg-primary hover:bg-primary/90 text-white hover:text-white" onClick={() => setViewGroupId(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingExamId} onOpenChange={(open) => !open && setEditingExamId(null)}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'} max-w-md w-[90vw] sm:w-full rounded-xl`}>
          <DialogHeader>
            <DialogTitle>Edit Exam Schedule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateExam} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={editFormData.date}
                onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                required
                className="bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time</label>
                <Input
                  type="time"
                  value={editFormData.start_time}
                  onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
                  required
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Time</label>
                <Input
                  type="time"
                  value={editFormData.end_time}
                  onChange={(e) => setEditFormData({ ...editFormData, end_time: e.target.value })}
                  required
                  className="bg-background"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Room</label>
              <Input
                placeholder="e.g. 123"
                value={editFormData.room}
                onChange={(e) => setEditFormData({ ...editFormData, room: e.target.value })}
                required
                className="bg-background"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setEditingExamId(null)}>Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-primary text-white">
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>);

});

ExamScheduling.displayName = 'ExamScheduling';

export default ExamScheduling;