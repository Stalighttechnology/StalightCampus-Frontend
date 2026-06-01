import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  FileText,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  MoreVertical,
  ChevronRight,
  Download,
  Upload,
  Trash2,
  Edit,
  X,
  Loader2,
  FileDown,
  Eye,
  ExternalLink
} from
  'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from
  "../ui/select";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle
} from
  "../ui/alert-dialog";
import { useTheme } from "../../context/ThemeContext";
import {
  getAssignedSubjectsGrouped,
  manageAssignments,
  getAssignmentDetail,
  getAssignmentSubmissions,
  gradeSubmission,
  AssignedSubject
} from
  "../../utils/faculty_api";
import { normalizePaginatedResponse } from '../../utils/normalizePagination';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { Calendar as ShadcnCalendar } from "../ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";


const FacultyAssignments = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<AssignedSubject[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<any>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isSectionOpen, setIsSectionOpen] = useState(false);

  const branchOpenRef = React.useRef(false);
  const subjectOpenRef = React.useRef(false);
  const semesterOpenRef = React.useRef(false);

  // Create Assignment Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    branch_id: '',
    semester_id: '',
    section_id: '',
    due_date: '',
    max_marks: '',
    weightage: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Submissions State
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [activeTab, setActiveTab] = useState<'submitted' | 'pending'>('submitted');
  const [exportingPDF, setExportingPDF] = useState(false);

  // Grade-and-view modal state
  const [gradeModal, setGradeModal] = useState<{ open: boolean; submission: any | null }>({
    open: false,
    submission: null
  });
  const [gradeMarks, setGradeMarks] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [gradingSaving, setGradingSaving] = useState(false);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');

  const handleExportPDF = async () => {
    if (!selectedAssignment) return;
    setExportingPDF(true);
    try {
      const url = `${API_ENDPOINT}/faculty/assignments/${selectedAssignment.id}/export-pdf/`;
      const response = await fetchWithTokenRefresh(url);
      if (!response.ok) {
        throw new Error("Failed to download PDF from backend");
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `Assignment_Submissions_${selectedAssignment.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to download submissions PDF report.",
        variant: "destructive",
      });
    } finally {
      setExportingPDF(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(currentPage);
    }, 500);
    return () => clearTimeout(timer);
  }, [currentPage, searchTerm]);

  const fetchData = async (page = currentPage) => {
    setLoading(true);
    try {
      const res = await manageAssignments(null, 'GET', undefined, {
        search: searchTerm,
        page: page,
        page_size: 10
      });
      if (res.success) {
        const normalized = normalizePaginatedResponse(res, 'data');
        let items = res.data || [];
        if (normalized && normalized.items && normalized.items.length) items = normalized.items;
        setAssignments(items);
        const totalItems = normalized && normalized.meta && normalized.meta.totalItems ? normalized.meta.totalItems : res.count || 0;
        const totalPages = normalized && normalized.meta && normalized.meta.totalPages ? normalized.meta.totalPages : res.total_pages || Math.max(1, Math.ceil((totalItems || 0) / 10));
        setPagination({
          count: totalItems,
          total_pages: totalPages,
          current_page: normalized && normalized.meta && normalized.meta.currentPage ? normalized.meta.currentPage : res.current_page || 1,
          next: normalized && normalized.meta && normalized.meta.next ? normalized.meta.next : res.next || null,
          previous: normalized && normalized.meta && normalized.meta.previous ? normalized.meta.previous : res.previous || null
        });
      }
    } catch (error) {

      toast({
        title: "Error",
        description: "Failed to load assignments. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async () => {
    try {
      const res = await getAssignedSubjectsGrouped();
      if (res.success && res.grouped) {
        // Normalize IDs to strings for robust comparison with form state
        const normalized = res.grouped.map((s: any) => ({
          ...s,
          subject_id: String(s.subject_id),
          sections: s.sections.map((sec: any) => ({
            ...sec,
            section_id: String(sec.section_id),
            semester_id: String(sec.semester_id),
            branch_id: String(sec.branch_id),
            subject_id: String(s.subject_id)
          }))
        }));
        setAssignedSubjects(normalized);
      }
    } catch (error) {

    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          submitData.append(key, String(value));
        }
      });
      if (selectedFile) submitData.append('file', selectedFile);

      const method = editingAssignment ? "PUT" : "POST";
      const id = editingAssignment ? editingAssignment.id : null;

      const res = await manageAssignments(submitData, method, id);

      if (res.success) {
        toast({
          title: "Success",
          description: editingAssignment ? "Assignment updated successfully" : "Assignment created successfully"
        });
        setShowCreateModal(false);
        setEditingAssignment(null);
        resetForm();

        if (editingAssignment) {
          setAssignments((prev) => prev.map((a) => a.id === res.assignment.id ? res.assignment : a));
        } else {
          setAssignments((prev) => [res.assignment, ...prev]);
        }
      } else {
        toast({
          title: "Error",
          description: res.message || "Failed to process assignment",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      subject_id: '',
      branch_id: '',
      semester_id: '',
      section_id: '',
      due_date: '',
      max_marks: '',
      weightage: ''
    });
    setSelectedFile(null);
  };

  const handleEditClick = (assignment: any) => {
    setEditingAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description,
      subject_id: String(assignment.subject_id || ''),
      branch_id: String(assignment.branch_id || ''),
      semester_id: String(assignment.semester_id || ''),
      section_id: String(assignment.section_id || ''),
      due_date: assignment.due_date ? assignment.due_date.substring(0, 16) : '',
      max_marks: String(assignment.max_marks || '100'),
      weightage: String(assignment.weightage || '10'),
      is_published: assignment.is_published
    });
    // Load subjects if needed
    if (assignedSubjects.length === 0) {
      loadSubjects();
    }
    setShowCreateModal(true);
  };

  const handleViewSubmissions = async (assignment: any) => {
    setSelectedAssignment(assignment);
    setShowSubmissionsModal(true);
    setLoadingSubmissions(true);
    setActiveTab('submitted');
    try {
      const res = await getAssignmentSubmissions(assignment.id);
      if (res.success) {
        setSubmissionsList(res.submissions || []);
        setPendingList(res.pending || []);
      }
    } catch (error) {

      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive"
      });
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const openGradeModal = (sub: any) => {
    setGradeModal({ open: true, submission: sub });
    setGradeMarks(sub.marks_obtained !== null && sub.marks_obtained !== undefined ? String(sub.marks_obtained) : '');
    setGradeFeedback(sub.feedback || '');
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeModal.submission || !selectedAssignment) return;

    const maxMarks = Number(selectedAssignment.max_marks);
    const marks = Number(gradeMarks);

    if (isNaN(marks) || gradeMarks.trim() === '') {
      toast({ title: 'Validation Error', description: 'Please enter a valid marks value.', variant: 'destructive' });
      return;
    }
    if (marks < 0 || marks > maxMarks) {
      toast({ title: 'Out of Range', description: `Marks must be between 0 and ${maxMarks}.`, variant: 'destructive' });
      return;
    }

    setGradingSaving(true);
    try {
      const res = await gradeSubmission(gradeModal.submission.id, {
        marks_obtained: gradeMarks,
        feedback: gradeFeedback
      });
      if (res.success) {
        toast({ title: 'Graded!', description: 'Marks saved successfully.' });
        // Update in-place so the table refreshes without a full reload
        setSubmissionsList(prev =>
          prev.map(s =>
            s.id === gradeModal.submission.id
              ? { ...s, marks_obtained: marks, feedback: gradeFeedback }
              : s
          )
        );
        setGradeModal({ open: false, submission: null });
      } else {
        toast({ title: 'Error', description: res.message || 'Failed to save grade.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error.', variant: 'destructive' });
    } finally {
      setGradingSaving(false);
    }
  };

  const handleDeleteAssignment = (assignment: any) => {
    setAssignmentToDelete(assignment);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!assignmentToDelete) return;

    try {
      setSubmitting(true);
      const res = await manageAssignments(null, 'DELETE', assignmentToDelete.id);
      if (res.success) {
        toast({
          title: "Success",
          description: "Assignment deleted successfully",
          variant: "default"
        });
        fetchData(currentPage);
      } else {
        toast({
          title: "Error",
          description: res.message || "Failed to delete assignment",
          variant: "destructive"
        });
      }
    } catch (error) {

      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
      setDeleteConfirmOpen(false);
      setAssignmentToDelete(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Maximum file size allowed is 5MB.",
          variant: "destructive"
        });
        e.target.value = '';
        return;
      }

      setSelectedFile(file);
    }
  };

  // Cascaded Selection Helpers & Auto-selection Logic

  const handleBranchChange = (branchId: string) => {
    let newFormData = {
      ...formData,
      branch_id: branchId,
      subject_id: '',
      semester_id: '',
      section_id: ''
    };

    setFormData(newFormData);

    // Auto-open next unfilled dropdown based on the selection flow: Branch -> Subject -> Semester -> Section
    if (!newFormData.subject_id) {
      setTimeout(() => setIsSubjectOpen(true), 150);
    } else if (!newFormData.semester_id) {
      setTimeout(() => setIsSemesterOpen(true), 150);
    } else if (!newFormData.section_id) {
      setTimeout(() => setIsSectionOpen(true), 150);
    }
  };

  const handleSubjectChange = (subjectId: string) => {
    let newFormData = {
      ...formData,
      subject_id: subjectId,
      semester_id: '',
      section_id: ''
    };

    setFormData(newFormData);

    // Auto-open next unfilled dropdown based on the selection flow: Subject -> Semester -> Section
    if (!newFormData.semester_id) {
      setTimeout(() => setIsSemesterOpen(true), 150);
    } else if (!newFormData.section_id) {
      setTimeout(() => setIsSectionOpen(true), 150);
    }
  };

  const handleSemesterChange = (semesterId: string) => {
    let newFormData = {
      ...formData,
      semester_id: semesterId,
      section_id: ''
    };

    setFormData(newFormData);

    // Auto-open next unfilled dropdown based on the selection flow: Semester -> Section
    if (!newFormData.section_id) {
      setTimeout(() => setIsSectionOpen(true), 150);
    }
  };

  const uniqueBranches = useMemo(() => {
    const branchesMap = new Map();
    assignedSubjects.forEach((sub) => {
      sub.sections.forEach((sec) => {
        branchesMap.set(String(sec.branch_id), { id: String(sec.branch_id), name: sec.branch });
      });
    });
    return Array.from(branchesMap.values());
  }, [assignedSubjects]);

  const uniqueSubjects = useMemo(() => {
    if (!formData.branch_id) return [];
    return assignedSubjects.filter((sub) =>
      sub.sections.some((sec) => String(sec.branch_id) === String(formData.branch_id))
    );
  }, [assignedSubjects, formData.branch_id]);

  const uniqueSemesters = useMemo(() => {
    if (!formData.branch_id || !formData.subject_id) return [];
    const selectedSubject = assignedSubjects.find((s) => String(s.subject_id) === String(formData.subject_id));
    if (!selectedSubject) return [];
    const semestersMap = new Map();
    selectedSubject.sections
      .filter((sec) => String(sec.branch_id) === String(formData.branch_id))
      .forEach((sec) => {
        semestersMap.set(String(sec.semester_id), { id: String(sec.semester_id), number: sec.semester });
      });
    return Array.from(semestersMap.values());
  }, [assignedSubjects, formData.branch_id, formData.subject_id]);

  const uniqueSections = useMemo(() => {
    if (!formData.branch_id || !formData.subject_id || !formData.semester_id) return [];
    const selectedSubject = assignedSubjects.find((s) => String(s.subject_id) === String(formData.subject_id));
    if (!selectedSubject) return [];
    return selectedSubject.sections
      .filter((sec) =>
        String(sec.branch_id) === String(formData.branch_id) &&
        String(sec.semester_id) === String(formData.semester_id)
      )
      .map((sec) => ({ id: String(sec.section_id), name: sec.section }));
  }, [assignedSubjects, formData.branch_id, formData.subject_id, formData.semester_id]);

  const filteredAssignments = useMemo(() => {
    if (filterSubject === 'all') {
      return assignments;
    }
    return assignments.filter((a) => a.subject === filterSubject);
  }, [assignments, filterSubject]);

  const stats = {
    total: assignments.length,
    active: assignments.filter((a) => new Date(a.due_date) > new Date()).length,
    pendingGrading: assignments.reduce((acc, a) => acc + (a.submission_count - a.graded_count), 0)
  };

  return (
    <div>
      <Card>
        <CardHeader id="faculty-assignments-header" className="border-b border-border/50 pb-6 pt-8 px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <CardTitle>Assignment Management</CardTitle>
              <CardDescription className="text-base">Create, track, and grade student assignments with a unified view.</CardDescription>
            </div>
            <Button
              onClick={() => {
                loadSubjects();
                setShowCreateModal(true);
              }}
              className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 flex items-center gap-2 h-11 px-6 rounded-lgl transition-all">

              <Plus size={20} />
              <span className="font-semibold">Create Assignment</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-8 space-y-10">
          {/* Stats Overview - Now more integrated */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Total Assignments', value: stats.total, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Active Assignments', value: stats.active, icon: Clock, color: 'text-green-500', bg: 'bg-green-500/10' },
              { label: 'Pending Grading', value: stats.pendingGrading, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' }].
              map((stat, i) =>
                <div key={i} className={`p-6 rounded-xl flex items-center justify-between transition-all hover:shadow-md ${theme === 'dark' ? 'bg-muted/10 border border-border/40' : 'bg-gray-50 border border-gray-200'}`}>
                  <div>
                    <p className="text-sm font-semibold tracking-wider text-muted-foreground mb-1">{stat.label}</p>
                    <h3 className="text-3xl font-semibold">{stat.value}</h3>
                  </div>
                  <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
                    <stat.icon size={28} />
                  </div>
                </div>
              )}
          </div>

          {/* List Section Container */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">All Assignments</h2>
              <div className="flex items-center gap-3 flex-nowrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    placeholder="Search assignments..."
                    className="pl-10 pr-12 w-full md:w-64 rounded-xl h-10"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }} />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger className="bg-primary hover:bg-primary/90 text-white border-0 rounded-full h-10 px-5 flex items-center gap-2 font-semibold shadow-md shadow-primary/20 transition-all cursor-pointer [&>svg]:text-white [&>svg:last-child]:hidden">
                    <Filter size={16} />
                    <span>{filterSubject === 'all' ? 'Filter' : filterSubject}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {Array.from(new Set(assignments.map((a) => a.subject))).map((subj) =>
                      <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>


            {loading ?
              <div className="space-y-4">
                {[1, 2, 3].map((i) =>
                  <div key={i} className="h-24 w-full bg-muted animate-pulse rounded-lg" />
                )}
              </div> :
              filteredAssignments.length > 0 ?
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-border text-sm font-semibold text-muted-foreground">
                          <th className="pb-4 pt-2">Assignment</th>
                          <th className="pb-4 pt-2">Subject & Class</th>
                          <th className="pb-4 pt-2">Submissions</th>
                          <th className="pb-4 pt-2">Due Date</th>
                          <th className="pb-4 pt-2">Status</th>
                          <th className="pb-4 pt-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredAssignments.map((assignment) => {
                          const isOverdue = new Date(assignment.due_date) < new Date();
                          return (
                            <motion.tr
                              key={assignment.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="group hover:bg-muted/50 transition-colors">

                              <td className="py-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <FileText size={20} />
                                  </div>
                                  <div>
                                    <p className="font-semibold">{assignment.title}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-1">{assignment.description}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4">
                                <div className="text-sm">
                                  <p className="font-semibold">{assignment.subject}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {assignment.branch_name} • Sem {assignment.semester_number} • {assignment.section_name || 'All Sections'}
                                  </p>
                                </div>
                              </td>
                              <td className="py-4">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between text-xs w-24">
                                    <span>{assignment.submission_count} Submitted</span>
                                  </div>
                                  <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary"
                                      style={{ width: `${Math.min(assignment.submission_count / 100 * 100, 100)}%` }} />

                                  </div>
                                  <p className="text-[12px] text-muted-foreground">{assignment.graded_count} Graded</p>
                                </div>
                              </td>
                              <td className="py-4">
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar size={14} className="text-muted-foreground" />
                                  <span>{new Date(assignment.due_date).toLocaleDateString()}</span>
                                </div>
                              </td>
                              <td className="py-4">
                                <span className={`px-2 py-1 rounded-full text-[12px] font-semibold uppercase ${isOverdue ?
                                  'bg-red-500/10 text-red-500' :
                                  'bg-green-500/10 text-green-500'}`
                                }>
                                  {isOverdue ? 'Overdue' : 'Active'}
                                </span>
                              </td>
                              <td className="py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleEditClick(assignment)}>

                                    <Edit size={16} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => handleDeleteAssignment(assignment)}
                                    disabled={submitting}>

                                    <Trash2 size={16} />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-2"
                                    onClick={() => handleViewSubmissions(assignment)}>

                                    View
                                    <ChevronRight size={14} />
                                  </Button>
                                </div>
                              </td>
                            </motion.tr>);

                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden grid grid-cols-1 gap-4">
                    {filteredAssignments.map((assignment) => {
                      const isOverdue = new Date(assignment.due_date) < new Date();
                      return (
                        <motion.div
                          key={assignment.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-5 rounded-2xl border transition-all ${theme === 'dark' ?
                            'bg-muted/10 border-border/40 hover:bg-muted/20' :
                            'bg-white border-gray-100 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5'}`
                          }>

                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                <FileText size={22} />
                              </div>
                              <div>
                                <h3 className="font-semibold text-base leading-none mb-1">{assignment.title}</h3>
                                <p className="text-xs text-muted-foreground line-clamp-1">{assignment.description}</p>
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[12px] font-bold uppercase tracking-wider ${isOverdue ?
                              'bg-red-500/10 text-red-500' :
                              'bg-green-500/10 text-green-500'}`
                            }>
                              {isOverdue ? 'Overdue' : 'Active'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-5 p-3 rounded-xl bg-muted/30">
                            <div>
                              <p className="text-[12px] uppercase font-bold text-muted-foreground mb-1 tracking-tight">Subject</p>
                              <p className="text-xs font-semibold break-words">{assignment.subject}</p>
                            </div>
                            <div>
                              <p className="text-[12px] uppercase font-bold text-muted-foreground mb-1 tracking-tight">Due Date</p>
                              <div className="flex items-center gap-1.5">
                                <Calendar size={12} className="text-primary" />
                                <p className="text-xs font-semibold">{new Date(assignment.due_date).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[12px] uppercase font-bold text-muted-foreground mb-1 tracking-tight">Class Info</p>
                              <p className="text-xs font-medium text-muted-foreground">
                                {assignment.branch_name} • Sem {assignment.semester_number} • {assignment.section_name || 'All Sections'}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2 mb-5">
                            <div className="flex items-center justify-between text-xs font-medium">
                              <span className="text-muted-foreground">Submissions</span>
                              <span className="text-primary font-bold">{assignment.submission_count}</span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(assignment.submission_count / 100 * 100, 100)}%` }}
                                className="h-full bg-primary" />

                            </div>
                            <p className="text-[12px] text-muted-foreground text-right">{assignment.graded_count} Graded</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              className="flex-1 h-10 rounded-xl gap-2 font-semibold"
                              onClick={() => handleViewSubmissions(assignment)}>

                              View Details
                              <ChevronRight size={16} />
                            </Button>
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl hover:bg-primary/5"
                                onClick={() => handleEditClick(assignment)}>

                                <Edit size={18} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600"
                                onClick={() => handleDeleteAssignment(assignment)}
                                disabled={submitting}>

                                <Trash2 size={18} />
                              </Button>
                            </div>
                          </div>
                        </motion.div>);

                    })}
                  </div>
                </> :

                <div className={`flex flex-col items-center justify-center py-20 px-4 text-center rounded-3xl border-2 border-dashed shadow-sm ${theme === 'dark' ? 'bg-muted/10 border-border/60' : 'bg-gray-50 border-gray-200/60'}`}>
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-inner ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                    <FileText size={36} />
                  </div>
                  <h3 className={`text-xl font-semibold mb-2 tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    No Assignments Found
                  </h3>
                  <p className={`text-base max-w-[320px] mx-auto leading-relaxed mb-8 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    Start by creating your first assignment. You can track submissions and grade them all in one place.
                  </p>
                  <Button
                    onClick={() => {
                      loadSubjects();
                      setShowCreateModal(true);
                    }}
                    className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 flex items-center gap-2 h-11 px-8 rounded-xl transition-all hover:scale-105 active:scale-95">

                    <Plus size={20} />
                    <span className="font-semibold">Create New Assignment</span>
                  </Button>
                </div>
            }
          </div>
        </CardContent>
        {pagination && pagination.total_items > 0 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing <span className="font-semibold">{pagination.total_items === 0 ? 0 : (pagination.current_page - 1) * pagination.page_size + 1}</span> to <span className="font-semibold">{Math.min(pagination.current_page * pagination.page_size, pagination.total_items)}</span> of <span className="font-semibold">{pagination.total_items}</span> results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.has_previous}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Previous
              </Button>
              <div className="flex items-center justify-center min-w-[2rem]">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {pagination.current_page}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.has_next}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>


      {/* Create Assignment Modal */}
      {showCreateModal &&
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowCreateModal(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <div
            className={`relative w-[90%] max-w-xl max-h-[80vh] overflow-y-auto rounded-3xl shadow-xl ${theme === 'dark' ? 'bg-background border border-border custom-scrollbar' : 'bg-white custom-scrollbar'}`}>

            <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-inherit z-10">
              <div>
                <h2 className="text-xl font-semibold">{editingAssignment ? 'Edit Assignment' : 'New Assignment'}</h2>
                <p className="text-sm text-muted-foreground">
                  {editingAssignment ? 'Update the assignment details' : 'Fill in the details to publish a new assignment'}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </Button>
            </div>

            <form onSubmit={handleCreateAssignment} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold">Assignment Title</label>
                  <Input
                    required
                    placeholder="e.g. Introduction to Data Structures"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })} />

                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold">Description / Instructions</label>
                  <Textarea
                    required
                    placeholder="Enter assignment details, rules, and guidelines..."
                    className="min-h-[80px] max-h-[200px] resize-none overflow-y-auto custom-scrollbar"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} />

                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Branch</label>
                  <Select
                    required
                    value={formData.branch_id}
                    onValueChange={handleBranchChange}
                    open={isBranchOpen}
                    onOpenChange={(open) => {
                      setIsBranchOpen(open);
                      if (open) {
                        branchOpenRef.current = true;
                      } else {
                        setTimeout(() => { branchOpenRef.current = false; }, 300);
                      }
                    }}
                    disabled={assignedSubjects.length === 0 || uniqueBranches.length === 0}>

                    <SelectTrigger>
                      <SelectValue placeholder={assignedSubjects.length === 0 ? "No branches assigned" : "Select Branch"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {uniqueBranches.length === 0 ? (
                        <SelectItem value="none" disabled>No branches assigned</SelectItem>
                      ) : (
                        uniqueBranches.map((b: any) =>
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Subject</label>
                  <Select
                    required
                    value={formData.subject_id}
                    onValueChange={handleSubjectChange}
                    open={isSubjectOpen}
                    onOpenChange={(open) => {
                      setIsSubjectOpen(open);
                      if (open) {
                        subjectOpenRef.current = true;
                      } else {
                        setTimeout(() => { subjectOpenRef.current = false; }, 300);
                      }
                    }}
                    disabled={!formData.branch_id || uniqueSubjects.length === 0}>

                    <SelectTrigger>
                      <SelectValue placeholder={!formData.branch_id ? "Select Branch first" : uniqueSubjects.length === 0 ? "No subjects assigned" : "Select Subject"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {uniqueSubjects.length === 0 ? (
                        <SelectItem value="none" disabled>No subjects assigned</SelectItem>
                      ) : (
                        uniqueSubjects.map((s) =>
                          <SelectItem key={s.subject_id} value={s.subject_id}>{s.subject_name}</SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Semester</label>
                  <Select
                    required
                    value={formData.semester_id}
                    onValueChange={handleSemesterChange}
                    open={isSemesterOpen}
                    onOpenChange={(open) => {
                      setIsSemesterOpen(open);
                      if (open) {
                        semesterOpenRef.current = true;
                      } else {
                        setTimeout(() => { semesterOpenRef.current = false; }, 300);
                      }
                    }}
                    disabled={!formData.subject_id || uniqueSemesters.length === 0}>

                    <SelectTrigger>
                      <SelectValue placeholder={!formData.subject_id ? "Select Subject first" : uniqueSemesters.length === 0 ? "No semesters assigned" : "Select Semester"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {uniqueSemesters.length === 0 ? (
                        <SelectItem value="none" disabled>No semesters assigned</SelectItem>
                      ) : (
                        uniqueSemesters.map((s: any) =>
                          <SelectItem key={s.id} value={s.id}>Semester {s.number}</SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Section</label>
                  <Select
                    required
                    value={formData.section_id}
                    onValueChange={(v) => setFormData({ ...formData, section_id: v })}
                    open={isSectionOpen}
                    onOpenChange={setIsSectionOpen}
                    disabled={!formData.semester_id || uniqueSections.length === 0}>

                    <SelectTrigger>
                      <SelectValue placeholder={!formData.semester_id ? "Select Semester first" : uniqueSections.length === 0 ? "No sections assigned" : "Select Section"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {uniqueSections.length === 0 ? (
                        <SelectItem value="none" disabled>No sections assigned</SelectItem>
                      ) : (
                        uniqueSections.map((s: any) =>
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Due Date</label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-10 px-3 relative pl-10",
                          !formData.due_date && "text-muted-foreground",
                          theme === 'dark' ?
                            'bg-background border-border text-foreground hover:bg-muted/50' :
                            'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                        )}
                      >
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <span className="truncate">
                          {formData.due_date ?
                            format(new Date(formData.due_date), "PPP") :
                            "Pick a date"
                          }
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-xl shadow-xl" align="start">
                      <ShadcnCalendar
                        mode="single"
                        selected={formData.due_date ? new Date(formData.due_date) : undefined}
                        onSelect={(date) => {
                          setFormData({
                            ...formData,
                            due_date: date ? format(date, "yyyy-MM-dd") + "T23:59" : ""
                          });
                          setIsCalendarOpen(false);
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Max Marks</label>
                  <Input
                    required
                    type="number"
                    placeholder="e.g. 50"
                    value={formData.max_marks}
                    onChange={(e) => setFormData({ ...formData, max_marks: e.target.value })} />

                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Weightage (%)</label>
                  <Input
                    required
                    type="number"
                    placeholder="e.g. 10"
                    value={formData.weightage}
                    onChange={(e) => setFormData({ ...formData, weightage: e.target.value })} />

                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Attachment (PDF/DOC, Max 5MB)</label>

                  {/* Show existing attachment when editing */}
                  {editingAssignment && editingAssignment.file_url && (
                    <div className={`flex items-center gap-3 px-3 py-2 rounded-md border mb-2 ${theme === 'dark' ? 'bg-muted/30 border-border' : 'bg-gray-50 border-gray-200'
                      }`}>
                      <FileText size={16} className="text-primary flex-shrink-0" />
                      <span className="text-sm text-muted-foreground flex-1 truncate">
                        {selectedFile ? 'New file selected — will replace existing' : 'Current attachment'}
                      </span>
                      {!selectedFile && (
                        <a
                          href={editingAssignment.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-shrink-0"
                        >
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 text-xs border-primary/50 text-primary hover:bg-primary hover:text-white transition-colors"
                          >
                            <Eye size={13} />
                            View
                          </Button>
                        </a>
                      )}
                    </div>
                  )}

                  <div className="relative">
                    <input
                      type="file"
                      id="assignment-file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileChange} />

                    <label
                      htmlFor="assignment-file"
                      className={`flex items-center gap-3 px-3 py-2 rounded-md border border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors ${selectedFile ? 'border-primary bg-primary/5' : ''}`}>

                      <Upload size={16} className="text-muted-foreground" />
                      <span className="text-sm truncate">
                        {selectedFile
                          ? selectedFile.name
                          : editingAssignment?.file_url
                            ? 'Upload a new file to replace existing...'
                            : 'Upload assignment questions...'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCreateModal(false)}>

                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-[2] bg-primary text-white"
                  disabled={submitting}>

                  {submitting ?
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {editingAssignment ? 'Updating...' : 'Publishing...'}
                    </div> :
                    editingAssignment ? 'Update Assignment' : 'Publish Assignment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      }


      {/* View Submissions Modal */}
      <AnimatePresence>
        {showSubmissionsModal &&
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSubmissionsModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl ${theme === 'dark' ? 'bg-background border border-border' : 'bg-white'}`}>

              <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-inherit z-10">
                <div>
                  <h2 className="text-xl font-semibold">{selectedAssignment?.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedAssignment?.subject} • {selectedAssignment?.branch_name} • Sem {selectedAssignment?.semester_number} {selectedAssignment?.section_name ? `• ${selectedAssignment?.section_name}` : ''}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowSubmissionsModal(false)}>
                  <X size={20} />
                </Button>
              </div>

              <div className="p-4 bg-muted/30 border-b border-border flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('submitted')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'submitted' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-muted'}`}>

                  Submitted ({submissionsList.length})
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'pending' ? 'bg-amber-500 text-white shadow-md' : 'text-muted-foreground hover:bg-muted'}`}>

                  Not Submitted ({pendingList.length})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-0">
                {loadingSubmissions ?
                  <div className="p-12 text-center">
                    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading roster...</p>
                  </div> :
                  activeTab === 'submitted' ?
                    submissionsList.length > 0 ?
                      <table className="w-full text-left">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr className="text-xs font-semibold text-muted-foreground border-b border-border">
                            <th className="px-6 py-3">USN</th>
                            <th className="px-6 py-3">Student Name</th>
                            <th className="px-6 py-3">Submitted At</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {submissionsList.map((sub: any) =>
                            <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-6 py-4 text-sm font-mono">{sub.student.usn}</td>
                              <td className="px-6 py-4 text-sm font-semibold">{sub.student.name}</td>
                              <td className="px-6 py-4 text-xs text-muted-foreground">
                                {new Date(sub.submitted_at).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {sub.file_url ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 gap-2 bg-primary hover:bg-primary/90 text-white hover:text-white"
                                      onClick={() => openGradeModal(sub)}>
                                      <Eye size={14} />
                                      View
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">No File</span>
                                  )}
                                  {sub.marks_obtained !== null && sub.marks_obtained !== undefined ? (
                                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${theme === 'dark' ? 'bg-green-500/15 text-green-400' : 'bg-green-100 text-green-700'
                                      }`}>
                                      {sub.marks_obtained}/{selectedAssignment?.max_marks}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-amber-500 font-semibold">Ungraded</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table> :

                      <div className="p-12 text-center text-muted-foreground">
                        No submissions yet.
                      </div> :


                    pendingList.length > 0 ?
                      <table className="w-full text-left">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr className="text-xs font-semibold text-muted-foreground border-b border-border">
                            <th className="px-6 py-3">USN</th>
                            <th className="px-6 py-3">Student Name</th>
                            <th className="px-6 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {pendingList.map((student: any) =>
                            <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-6 py-4 text-sm font-mono">{student.usn}</td>
                              <td className="px-6 py-4 text-sm font-semibold">{student.name}</td>
                              <td className="px-6 py-4">
                                <span className="text-[12px] font-semibold uppercase px-2 py-1 rounded-full bg-amber-500/10 text-amber-500">
                                  Pending
                                </span>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table> :

                      <div className="p-12 text-center text-muted-foreground">
                        All students have submitted!
                      </div>

                }
              </div>

              <div className="p-4 border-t border-border flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleExportPDF}
                  disabled={exportingPDF}
                  className="bg-primary hover:bg-primary/90 text-white hover:text-white">
                  {exportingPDF ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4 mr-2" />
                  )}
                  {exportingPDF ? "Exporting..." : "Export PDF"}
                </Button>
                <Button variant="outline" onClick={() => setShowSubmissionsModal(false)} className="border-border">
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        }
      </AnimatePresence>

      {/* ── Grade & View Submission Modal ─────────────────────────────── */}
      <AnimatePresence>
        {gradeModal.open && gradeModal.submission && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGradeModal({ open: false, submission: null })}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Modal panel */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              className={`relative w-full max-w-md m-4 flex flex-col rounded-3xl overflow-hidden shadow-2xl ${theme === 'dark' ? 'bg-[#18181b] border border-white/10' : 'bg-white'
                }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                <div>
                  <h2 className="text-lg font-semibold">{gradeModal.submission.student?.name}</h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    {gradeModal.submission.student?.usn} &bull; Submitted {new Date(gradeModal.submission.submitted_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={gradeModal.submission.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs bg-primary rounded-2xl px-2 py-1 text-white  hover:bg-primary/90 transition-colors flex items-center gap-1 "
                  >
                    <ExternalLink size={13} /> View Document
                  </a>
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setGradeModal({ open: false, submission: null })}>
                    <X size={20} />
                  </Button>
                </div>
              </div>

              {/* Document Viewer removed as per request */}

              {/* Sticky Grade Footer */}
              <form
                onSubmit={handleGradeSubmit}
                className={`shrink-0 px-6 py-6 ${theme === 'dark' ? 'bg-[#18181b]' : 'bg-white'
                  }`}
              >
                <div className="flex flex-col gap-5">
                  {/* Marks input */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Marks
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={selectedAssignment?.max_marks ?? 100}
                        step={1}
                        required
                        value={gradeMarks}
                        onChange={e => setGradeMarks(e.target.value)}
                        placeholder="0"
                        className={`w-24 rounded-xl border px-3 py-2 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary ${theme === 'dark'
                          ? 'bg-white/5 border-border text-foreground'
                          : 'bg-gray-50 border-gray-200 text-gray-900'
                          }`}
                      />
                      <span className="text-muted-foreground font-semibold text-sm">/ {selectedAssignment?.max_marks ?? '—'}</span>
                      {/* Live validation indicator */}
                      {gradeMarks !== '' && (
                        Number(gradeMarks) >= 0 && Number(gradeMarks) <= (selectedAssignment?.max_marks ?? 100)
                          ? <CheckCircle size={18} className="text-green-500" />
                          : <AlertCircle size={18} className="text-red-500" />
                      )}
                    </div>
                    {gradeMarks !== '' && (Number(gradeMarks) < 0 || Number(gradeMarks) > (selectedAssignment?.max_marks ?? 100)) && (
                      <p className="text-xs text-red-500">Must be 0 – {selectedAssignment?.max_marks}</p>
                    )}
                  </div>

                  {/* Feedback textarea */}
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Feedback <span className="normal-case font-normal">(optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={gradeFeedback}
                      onChange={e => setGradeFeedback(e.target.value)}
                      placeholder="Write comments for the student..."
                      className={`w-full rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary ${theme === 'dark'
                        ? 'bg-white/5 border-border text-foreground placeholder:text-muted-foreground'
                        : 'bg-gray-50 border-gray-200 text-gray-900'
                        }`}
                    />
                  </div>

                  {/* Save button */}
                  <Button
                    type="submit"
                    disabled={gradingSaving || gradeMarks.trim() === ''}
                    className="w-full h-11 bg-primary text-white hover:bg-primary/90 rounded-xl gap-2 font-semibold mt-2"
                  >
                    {gradingSaving ? (
                      <><Loader2 size={18} className="animate-spin" /> Saving...</>
                    ) : (
                      <><CheckCircle size={18} /> Save Grade</>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "<strong>{assignmentToDelete?.title}</strong>"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={submitting}
              className="bg-red-500 hover:bg-red-600 text-white">

              {submitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

};

export default FacultyAssignments;