import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Upload, 
  Search, 
  Filter,
  ExternalLink,
  Info,
  X
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { useTheme } from "../../context/ThemeContext";
import { getStudentAssignments, submitAssignment } from "../../utils/student_api";
import { normalizePaginatedResponse } from "../../utils/normalizePagination";

const StudentAssignments = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAssignments(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchAssignments(currentPage);
  }, [currentPage]);

  const fetchAssignments = async (page = currentPage) => {
    setLoading(true);
    try {
      const res = await getStudentAssignments({
        search: searchTerm,
        page: page,
        page_size: 10
      });
      if (res.success) {
        // normalize different pagination shapes to a canonical shape
        const normalized = normalizePaginatedResponse(res, 'assignments');
        setAssignments((normalized.items && normalized.items.length) ? normalized.items : (res.assignments || []));
        setPagination({
          current_page: normalized.meta.currentPage ?? res.pagination?.current_page ?? page,
          page_size: res.page_size || res.pagination?.page_size || 10,
          total_items: normalized.meta.totalItems ?? res.pagination?.total_items ?? 0,
          total_pages: normalized.meta.totalPages ?? res.pagination?.total_pages ?? 1,
          has_next: Boolean(normalized.meta.next ?? res.pagination?.has_next ?? res.pagination?.next),
          has_previous: Boolean(normalized.meta.previous ?? res.pagination?.has_prev ?? res.pagination?.previous),
        });
        if (page !== currentPage) setCurrentPage(page);
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast({
        title: "Error",
        description: "Failed to load assignments.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSubmissionFile(e.target.files[0]);
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !submissionFile) return;

    setSubmitting(true);
    try {
      const res = await submitAssignment(selectedAssignment.id, submissionFile);
      if (res.success && res.assignment) {
        toast({
          title: "Success",
          description: "Assignment submitted successfully!",
        });
        setShowSubmitModal(false);
        setSubmissionFile(null);
        // Update local state instead of re-fetching
        setAssignments(prev => prev.map(a => a.id === res.assignment.id ? res.assignment : a));
      } else {
        toast({
          title: "Error",
          description: res.message || "Failed to submit assignment.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      const now = new Date();
      const dueDate = new Date(a.due_date);
      const isOverdue = !a.is_submitted && dueDate < now;

      let matchesStatus = true;
      if (filterStatus === 'pending') matchesStatus = !a.is_submitted && !isOverdue;
      if (filterStatus === 'submitted') matchesStatus = a.is_submitted;
      if (filterStatus === 'overdue') matchesStatus = isOverdue;

      return matchesStatus;
    });
  }, [assignments, filterStatus]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: assignments.length,
      pending: assignments.filter(a => !a.is_submitted && new Date(a.due_date) > now).length,
      submitted: assignments.filter(a => a.is_submitted).length,
      overdue: assignments.filter(a => !a.is_submitted && new Date(a.due_date) < now).length
    };
  }, [assignments]);

  const getStatusBadge = (assignment: any) => {
    const now = new Date();
    const dueDate = new Date(assignment.due_date);
    
    if (assignment.is_submitted) {
      return (
        <Badge className={theme === 'dark' ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700 border-green-200"}>
          <CheckCircle size={12} className="mr-1" />
          Submitted
        </Badge>
      );
    }
    
    if (dueDate < now) {
      return (
        <Badge className={theme === 'dark' ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700 border-red-200"}>
          <AlertCircle size={12} className="mr-1" />
          Overdue
        </Badge>
      );
    }

    return (
      <Badge className={theme === 'dark' ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700 border-blue-200"}>
        <Clock size={12} className="mr-1" />
        Pending
      </Badge>
    );
  };

  return (
    <div className={`p-6 space-y-6 min-h-screen ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
        <p className={`${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
          View and submit your academic assignments
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: FileText, color: 'text-gray-500', bg: 'bg-gray-500/10' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Submitted', value: stats.submitted, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'Overdue', value: stats.overdue, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' }
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">{stat.label}</p>
                <h3 className="text-xl font-bold mt-0.5">{stat.value}</h3>
              </div>
              <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content */}
      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>My Assignments</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input 
                  placeholder="Search..." 
                  className="pl-10 w-full md:w-64" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter size={18} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 w-full bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredAssignments.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredAssignments.map((assignment) => (
                <motion.div 
                  key={assignment.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-6 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                        <FileText size={24} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                          {assignment.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground/80">{assignment.subject}</span>
                          <span className="flex items-center gap-1.5">
                            <Clock size={14} />
                            Due {new Date(assignment.due_date).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm mt-2 line-clamp-2 max-w-2xl">{assignment.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 shrink-0">
                      {getStatusBadge(assignment)}
                      <div className="flex items-center gap-2">
                        {assignment.file_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={assignment.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                              <Download size={14} />
                              Questions
                            </a>
                          </Button>
                        )}
                        {!assignment.is_submitted ? (
                          <Button 
                            size="sm" 
                            className="bg-primary text-white gap-2"
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setShowSubmitModal(true);
                            }}
                          >
                            <Upload size={14} />
                            Submit
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="gap-2">
                            <Info size={14} />
                            View Submission
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {assignment.is_submitted && (
                    <div className={`mt-4 p-4 rounded-lg border border-dashed ${theme === 'dark' ? 'bg-muted/20 border-border' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Submission Info</p>
                          <p className="text-sm">Submitted on {new Date(assignment.submission_date).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Grade</p>
                          <p className="text-lg font-bold">
                            {assignment.marks_obtained !== null 
                              ? `${assignment.marks_obtained} / ${assignment.max_marks}` 
                              : 'Pending Grading'}
                          </p>
                        </div>
                      </div>
                      {assignment.feedback && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Feedback</p>
                          <p className="text-sm italic">"{assignment.feedback}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4 text-muted-foreground">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-lg font-semibold">All caught up!</h3>
              <p className="text-muted-foreground mt-1">No assignments matching your current filters.</p>
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
        </CardContent>
      </Card>

      {/* Submission Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSubmitModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-lg rounded-2xl shadow-2xl p-6 ${theme === 'dark' ? 'bg-background border border-border' : 'bg-white'}`}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold">Submit Assignment</h2>
                  <p className="text-sm text-muted-foreground">{selectedAssignment?.title}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowSubmitModal(false)}>
                  <X size={20} />
                </Button>
              </div>

              <form onSubmit={handleSubmitAssignment} className="space-y-6">
                <div 
                  className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-colors ${
                    submissionFile ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <input 
                    type="file" 
                    id="submit-file" 
                    className="hidden" 
                    onChange={handleFileChange}
                    required
                  />
                  <label htmlFor="submit-file" className="cursor-pointer flex flex-col items-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${submissionFile ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                      <Upload size={28} />
                    </div>
                    <p className="font-semibold text-center">
                      {submissionFile ? submissionFile.name : 'Click to select or drag and drop'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 text-center">
                      Maximum file size: 10MB (PDF, JPG, PNG, DOCX)
                    </p>
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowSubmitModal(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-[2] bg-primary text-white"
                    disabled={submitting || !submissionFile}
                  >
                    {submitting ? 'Uploading...' : 'Submit Now'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentAssignments;