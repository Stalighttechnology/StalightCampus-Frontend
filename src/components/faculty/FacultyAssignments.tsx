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
  X
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../ui/select";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { useTheme } from "../../context/ThemeContext";
import { 
  getAssignedSubjectsGrouped, 
  manageAssignments, 
  getAssignmentDetail,
  getAssignmentSubmissions,
  gradeSubmission,
  AssignedSubject
} from "../../utils/faculty_api";

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

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');

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
        setAssignments(res.data || []);
        setPagination({
          count: res.count || 0,
          total_pages: res.total_pages || 1,
          current_page: res.current_page || 1,
          next: res.next || null,
          previous: res.previous || null
        });
      }
    } catch (error) {
      console.error("Error fetching assignment data:", error);
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
      console.error("Error loading subjects:", error);
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
          setAssignments(prev => prev.map(a => a.id === res.assignment.id ? res.assignment : a));
        } else {
          setAssignments(prev => [res.assignment, ...prev]);
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
      console.error("Error fetching submissions:", error);
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive"
      });
    } finally {
      setLoadingSubmissions(false);
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
      console.error("Error deleting assignment:", error);
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
      setSelectedFile(e.target.files[0]);
    }
  };

  // Cascaded Selection Helpers & Auto-selection Logic
  const handleSubjectChange = (subjectId: string) => {
    const subject = assignedSubjects.find(s => String(s.subject_id) === String(subjectId));
    let newFormData = { 
      ...formData, 
      subject_id: subjectId, 
      branch_id: '', 
      semester_id: '', 
      section_id: '' 
    };

    if (subject) {
      const branches = Array.from(new Set(subject.sections.map(sec => String(sec.branch_id))));
      if (branches.length === 1) {
        newFormData.branch_id = branches[0];
        
        const semesters = Array.from(new Set(
          subject.sections
            .filter(sec => String(sec.branch_id) === String(newFormData.branch_id))
            .map(sec => String(sec.semester_id))
        ));
        if (semesters.length === 1) {
          newFormData.semester_id = semesters[0];
          
          const sections = subject.sections
            .filter(sec => 
              String(sec.branch_id) === String(newFormData.branch_id) && 
              String(sec.semester_id) === String(newFormData.semester_id)
            );
          if (sections.length === 1) {
            newFormData.section_id = String(sections[0].section_id);
          }
        }
      }
    }
    setFormData(newFormData);
  };

  const handleBranchChange = (branchId: string) => {
    const subject = assignedSubjects.find(s => String(s.subject_id) === String(formData.subject_id));
    let newFormData = { 
      ...formData, 
      branch_id: branchId, 
      semester_id: '', 
      section_id: '' 
    };

    if (subject) {
      const semesters = Array.from(new Set(
        subject.sections
          .filter(sec => String(sec.branch_id) === String(branchId))
          .map(sec => String(sec.semester_id))
      ));
      if (semesters.length === 1) {
        newFormData.semester_id = semesters[0];
        
        const sections = subject.sections
          .filter(sec => 
            String(sec.branch_id) === String(branchId) && 
            String(sec.semester_id) === String(newFormData.semester_id)
          );
        if (sections.length === 1) {
          newFormData.section_id = String(sections[0].section_id);
        }
      }
    }
    setFormData(newFormData);
  };

  const handleSemesterChange = (semesterId: string) => {
    const subject = assignedSubjects.find(s => String(s.subject_id) === String(formData.subject_id));
    let newFormData = { 
      ...formData, 
      semester_id: semesterId, 
      section_id: '' 
    };

    if (subject) {
      const sections = subject.sections
        .filter(sec => 
          String(sec.branch_id) === String(formData.branch_id) && 
          String(sec.semester_id) === String(semesterId)
        );
      if (sections.length === 1) {
        newFormData.section_id = String(sections[0].section_id);
      }
    }
    setFormData(newFormData);
  };

  const selectedSubject = assignedSubjects.find(s => String(s.subject_id) === String(formData.subject_id));
  const uniqueBranches = selectedSubject 
    ? Array.from(new Map(selectedSubject.sections.map(sec => [String(sec.branch_id), { id: String(sec.branch_id), name: sec.branch }])).values())
    : [];
  
  const uniqueSemesters = selectedSubject && formData.branch_id
    ? Array.from(new Map(selectedSubject.sections
        .filter(sec => String(sec.branch_id) === String(formData.branch_id))
        .map(sec => [String(sec.semester_id), { id: String(sec.semester_id), number: sec.semester }])).values())
    : [];

  const uniqueSections = selectedSubject && formData.branch_id && formData.semester_id
    ? selectedSubject.sections
        .filter(sec => 
          String(sec.branch_id) === String(formData.branch_id) && 
          String(sec.semester_id) === String(formData.semester_id)
        )
        .map(sec => ({ id: String(sec.section_id), name: sec.section }))
    : [];

  const filteredAssignments = useMemo(() => {
    // Backend now handles search filtering, we just filter by subject locally if needed
    // or we can remove this local filter entirely and rely on backend for all.
    return assignments;
  }, [assignments]);

  const stats = {
    total: assignments.length,
    active: assignments.filter(a => new Date(a.due_date) > new Date()).length,
    pendingGrading: assignments.reduce((acc, a) => acc + (a.submission_count - a.graded_count), 0)
  };

  return (
    <div>
      <Card>
        <CardHeader className="border-b border-border/50 pb-6 pt-8 px-8">
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
              className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 flex items-center gap-2 h-11 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-95"
            >
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
              { label: 'Pending Grading', value: stats.pendingGrading, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' }
            ].map((stat, i) => (
              <div key={i} className={`p-6 rounded-xl flex items-center justify-between transition-all hover:shadow-md ${theme === 'dark' ? 'bg-muted/10 border border-border/40' : 'bg-gray-50 border border-gray-200'}`}>
                <div>
                  <p className="text-sm font-semibold tracking-wider text-muted-foreground mb-1">{stat.label}</p>
                  <h3 className="text-3xl font-semibold">{stat.value}</h3>
                </div>
                <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
                  <stat.icon size={28} />
                </div>
              </div>
            ))}
          </div>

          {/* List Section Container */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">All Assignments</h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input 
                    placeholder="Search assignments..." 
                    className="pl-10 w-full md:w-64 rounded-xl h-10"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger className="w-[180px] rounded-xl h-10">
                    <Filter size={16} className="mr-2" />
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {Array.from(new Set(assignments.map(a => a.subject))).map(subj => (
                      <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>


          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 w-full bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredAssignments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border text-sm font-medium text-muted-foreground">
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
                        className="group hover:bg-muted/50 transition-colors"
                      >
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
                            <p className="font-medium">{assignment.subject}</p>
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
                                style={{ width: `${(assignment.submission_count / 100) * 100}%` }} // Simplified
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground">{assignment.graded_count} Graded</p>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar size={14} className="text-muted-foreground" />
                            <span>{new Date(assignment.due_date).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${
                            isOverdue 
                              ? 'bg-red-500/10 text-red-500' 
                              : 'bg-green-500/10 text-green-500'
                          }`}>
                            {isOverdue ? 'Overdue' : 'Active'}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditClick(assignment)}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteAssignment(assignment)}
                              disabled={submitting}
                            >
                              <Trash2 size={16} />
                            </Button>
                             <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 gap-2"
                              onClick={() => handleViewSubmissions(assignment)}
                            >
                              View
                              <ChevronRight size={14} />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
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
                className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 flex items-center gap-2 h-11 px-8 rounded-xl transition-all hover:scale-105 active:scale-95"
              >
                <Plus size={20} />
                <span className="font-semibold">Create New Assignment</span>
              </Button>
            </div>
          )}
           {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{(pagination.current_page - 1) * pagination.page_size + 1}</span> to <span className="font-medium">{Math.min(pagination.current_page * pagination.page_size, pagination.total_items)}</span> of <span className="font-medium">{pagination.total_items}</span> results
              </p>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={!pagination.has_previous}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map(p => (
                    <Button 
                      key={p} 
                      variant={pagination.current_page === p ? "default" : "outline"} 
                      size="sm" 
                      className="w-8 h-8 p-0"
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={!pagination.has_next}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
          </div>
        </CardContent>
      </Card>


      {/* Create Assignment Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-[90%] max-w-xl max-h-[80vh] overflow-y-auto rounded-xl shadow-xl ${theme === 'dark' ? 'bg-background border border-border custom-scrollbar' : 'bg-white custom-scrollbar'}`}
            >
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
                      onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold">Description / Instructions</label>
                    <Textarea 
                      required
                      placeholder="Enter assignment details, rules, and guidelines..." 
                      className="min-h-[80px] max-h-[200px] resize-none overflow-y-auto custom-scrollbar"
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Subject</label>
                    <Select 
                      required
                      value={formData.subject_id} 
                      onValueChange={handleSubjectChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignedSubjects.map(s => (
                          <SelectItem key={s.subject_id} value={s.subject_id}>{s.subject_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Branch</label>
                    <Select 
                      required
                      value={formData.branch_id} 
                      onValueChange={handleBranchChange}
                      disabled={!formData.subject_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueBranches.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Semester</label>
                    <Select 
                      required
                      value={formData.semester_id} 
                      onValueChange={handleSemesterChange}
                      disabled={!formData.branch_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Semester" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueSemesters.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>Semester {s.number}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Section</label>
                    <Select 
                      required
                      value={formData.section_id} 
                      onValueChange={v => setFormData({...formData, section_id: v})}
                      disabled={!formData.semester_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Section" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueSections.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Due Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                      <Input 
                        required
                        type="datetime-local" 
                        className="pl-10"
                        value={formData.due_date}
                        onChange={e => setFormData({...formData, due_date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Max Marks</label>
                    <Input 
                      required
                      type="number" 
                      placeholder="e.g. 50" 
                      value={formData.max_marks}
                      onChange={e => setFormData({...formData, max_marks: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Weightage (%)</label>
                    <Input 
                      required
                      type="number" 
                      placeholder="e.g. 10" 
                      value={formData.weightage}
                      onChange={e => setFormData({...formData, weightage: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Attachment (PDF/Image)</label>
                    <div className="relative">
                      <input 
                        type="file" 
                        id="assignment-file"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <label 
                        htmlFor="assignment-file"
                        className={`flex items-center gap-3 px-3 py-2 rounded-md border border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors ${selectedFile ? 'border-primary bg-primary/5' : ''}`}
                      >
                        <Upload size={16} className="text-muted-foreground" />
                        <span className="text-sm truncate">
                          {selectedFile ? selectedFile.name : 'Upload assignment questions...'}
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
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-[2] bg-primary text-white"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {editingAssignment ? 'Updating...' : 'Publishing...'}
                      </div>
                    ) : editingAssignment ? 'Update Assignment' : 'Publish Assignment'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Submissions Modal */}
      <AnimatePresence>
        {showSubmissionsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSubmissionsModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl ${theme === 'dark' ? 'bg-background border border-border' : 'bg-white'}`}
            >
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
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'submitted' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  Submitted ({submissionsList.length})
                </button>
                <button 
                  onClick={() => setActiveTab('pending')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'pending' ? 'bg-amber-500 text-white shadow-md' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  Not Submitted ({pendingList.length})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-0">
                {loadingSubmissions ? (
                  <div className="p-12 text-center">
                    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading roster...</p>
                  </div>
                ) : activeTab === 'submitted' ? (
                  submissionsList.length > 0 ? (
                    <table className="w-full text-left">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr className="text-xs font-semibold text-muted-foreground border-b border-border">
                          <th className="px-6 py-3">USN</th>
                          <th className="px-6 py-3">Student Name</th>
                          <th className="px-6 py-3">Submitted At</th>
                          <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {submissionsList.map((sub: any) => (
                          <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-4 text-sm font-mono">{sub.student.usn}</td>
                            <td className="px-6 py-4 text-sm font-medium">{sub.student.name}</td>
                            <td className="px-6 py-4 text-xs text-muted-foreground">
                              {new Date(sub.submitted_at).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {sub.file_url && (
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={sub.file_url} target="_blank" rel="noopener noreferrer">
                                    <Download size={14} className="mr-2" />
                                    View File
                                  </a>
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center text-muted-foreground">
                      No submissions yet.
                    </div>
                  )
                ) : (
                  pendingList.length > 0 ? (
                    <table className="w-full text-left">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr className="text-xs font-semibold text-muted-foreground border-b border-border">
                          <th className="px-6 py-3">USN</th>
                          <th className="px-6 py-3">Student Name</th>
                          <th className="px-6 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {pendingList.map((student: any) => (
                          <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-4 text-sm font-mono">{student.usn}</td>
                            <td className="px-6 py-4 text-sm font-medium">{student.name}</td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-semibold uppercase px-2 py-1 rounded-full bg-amber-500/10 text-amber-500">
                                Pending
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center text-muted-foreground">
                      All students have submitted!
                    </div>
                  )
                )}
              </div>

              <div className="p-4 border-t border-border flex justify-end">
                <Button variant="outline" onClick={() => setShowSubmissionsModal(false)}>
                  Close
                </Button>
              </div>
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
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {submitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FacultyAssignments;
