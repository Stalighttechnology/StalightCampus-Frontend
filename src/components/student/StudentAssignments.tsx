import React, { useState, useEffect, useMemo } from 'react';
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
  X,
  Eye,
  RefreshCw } from
'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
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
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  // true when modal is opened from Details dialog for re-submit
  const [isResubmit, setIsResubmit] = useState(false);

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
        const normalized = normalizePaginatedResponse(res, 'assignments');
        setAssignments(normalized.items && normalized.items.length ? normalized.items : res.assignments || []);
        setPagination({
          current_page: normalized.meta.currentPage ?? res.pagination?.current_page ?? page,
          page_size: res.page_size || res.pagination?.page_size || 10,
          total_items: normalized.meta.totalItems ?? res.pagination?.total_items ?? 0,
          total_pages: normalized.meta.totalPages ?? res.pagination?.total_pages ?? 1,
          has_next: Boolean(normalized.meta.next ?? res.pagination?.has_next ?? res.pagination?.next),
          has_previous: Boolean(normalized.meta.previous ?? res.pagination?.has_prev ?? res.pagination?.previous)
        });
        if (page !== currentPage) setCurrentPage(page);
      }
    } catch (error) {
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

  /** Open submit modal — handles both first submit and re-submit */
  const openSubmitModal = (assignment: any, resubmit = false) => {
    setSelectedAssignment(assignment);
    setIsResubmit(resubmit);
    setSubmissionFile(null);
    setShowSubmitModal(true);
    // Close details modal if open
    if (resubmit) setShowDetailsModal(false);
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !submissionFile) return;

    setSubmitting(true);
    try {
      const res = await submitAssignment(selectedAssignment.id, submissionFile);
      if (res.success && res.assignment) {
        toast({
          title: isResubmit ? "Re-submitted!" : "Submitted!",
          description: isResubmit
            ? "Your assignment has been re-submitted successfully."
            : "Assignment submitted successfully!"
        });
        setShowSubmitModal(false);
        setSubmissionFile(null);
        setIsResubmit(false);
        // Update local state so UI refreshes immediately
        setAssignments((prev) => prev.map((a) => a.id === res.assignment.id ? res.assignment : a));
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
    return assignments.filter((a) => {
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
      pending: assignments.filter((a) => !a.is_submitted && new Date(a.due_date) > now).length,
      submitted: assignments.filter((a) => a.is_submitted).length,
      overdue: assignments.filter((a) => !a.is_submitted && new Date(a.due_date) < now).length
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
        </Badge>);

    }

    if (dueDate < now) {
      return (
        <Badge className={theme === 'dark' ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700 border-red-200"}>
          <AlertCircle size={12} className="mr-1" />
          Overdue
        </Badge>);

    }

    return (
      <Badge className={theme === 'dark' ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700 border-blue-200"}>
        <Clock size={12} className="mr-1" />
        Pending
      </Badge>);

  };

  /** True if the deadline has NOT yet passed (re-submit still allowed) */
  const isWithinDeadline = (assignment: any) => new Date(assignment.due_date) > new Date();

  return (
    <div className={`w-full ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
      <Card className={`${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
        <CardHeader className="p-3 sm:p-4 lg:p-6 border-b">
          <h1 className={`text-lg sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Assignments</h1>
          <p className={`text-xs sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
            Track, view, and submit your academic assignments and projects.
          </p>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
            {[
            { label: 'Total', value: stats.total, icon: FileText, color: 'text-gray-400', bg: 'bg-gray-400/10' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Submitted', value: stats.submitted, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
            { label: 'Overdue', value: stats.overdue, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' }].
            map((stat, i) =>
            <div key={i} className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} flex items-center gap-4 border ${theme === 'dark' ? 'border-white/5' : 'border-gray-100'}`}>
                <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} shrink-0`}>
                  <stat.icon size={20} />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-muted-foreground">{stat.label}</p>
                  <p className="text-xl sm:text-2xl font-semibold mt-0.5">{stat.value}</p>
                </div>
              </div>
            )}
          </div>

          {/* Search & Filter Toolbar */}
          <div className={`p-4 rounded-xl border border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50/50'}`}>
            <h2 className="text-base sm:text-lg font-semibold">Assignment List</h2>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  placeholder="Search assignments..."
                  className={`pl-10 w-full md:w-72 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-200 shadow-sm'}`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} />
                
              </div>
              <Button variant="outline" size="icon" className={theme === 'dark' ? 'border-border' : 'border-gray-200'}>
                <Filter size={18} />
              </Button>
            </div>
          </div>

          {/* List Content */}
          <div className="min-h-[400px] pt-4 border-t border-border/50">
            {loading ?
            <div className="p-8 space-y-4">
                {[1, 2, 3, 4].map((i) =>
              <div key={i} className={`h-28 w-full ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'} animate-pulse rounded-2xl`} />
              )}
              </div> :
            filteredAssignments.length > 0 ?
            <div className="divide-y divide-border/50">
                {filteredAssignments.map((assignment) => {
                const withinDeadline = isWithinDeadline(assignment);
                return (
                  <div
                    key={assignment.id}
                    className="p-6 hover:bg-primary/5 transition-all duration-300 group">
                    
                      <div className="flex flex-col lg:flex-row justify-between gap-6">
                        <div className="flex gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${theme === 'dark' ? 'bg-primary/20 text-primary shadow-primary/5' : 'bg-primary/10 text-primary shadow-primary/10'}`}>
                            <FileText size={28} />
                          </div>
                          <div className="space-y-1.5">
                            <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                              {assignment.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                              <span className={`font-semibold px-2 py-0.5 rounded-lg ${theme === 'dark' ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                {assignment.subject}
                              </span>
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Clock size={15} />
                                Due {new Date(assignment.due_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                              </span>
                            </div>
                            <p className={`text-sm mt-3 line-clamp-2 max-w-2xl leading-relaxed ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {assignment.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-4 shrink-0">
                          {getStatusBadge(assignment)}
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            {/* View assignment questions if faculty uploaded one */}
                            {assignment.file_url &&
                        <Button variant="outline" size="sm" asChild className="rounded-xl">
                                <a href={assignment.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                                  <Download size={14} />
                                  Questions
                                </a>
                              </Button>
                        }

                            {!assignment.is_submitted ? (
                              /* Not yet submitted → Submit button */
                              <Button
                                size="sm"
                                className="bg-primary text-white gap-2 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30"
                                onClick={() => openSubmitModal(assignment, false)}>
                                
                                  <Upload size={14} />
                                  Submit
                                </Button>
                            ) : (
                              /* Already submitted → View + Details + Re-submit (if within deadline) */
                              <>
                                {/* View submitted file */}
                                {assignment.submission_file_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                    className="gap-2 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                                    <a href={assignment.submission_file_url} target="_blank" rel="noreferrer">
                                      <Eye size={14} />
                                      View
                                    </a>
                                  </Button>
                                )}

                                {/* Details modal trigger */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                                  onClick={() => {
                                    setSelectedAssignment(assignment);
                                    setShowDetailsModal(true);
                                  }}>
                                  
                                    <Info size={14} />
                                    Details
                                  </Button>

                                {/* Re-submit button — only within deadline */}
                                {withinDeadline && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className={`gap-2 rounded-xl border transition-all ${
                                      theme === 'dark'
                                        ? 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
                                        : 'border-amber-400 text-amber-600 hover:bg-amber-50'
                                    }`}
                                    onClick={() => openSubmitModal(assignment, true)}>
                                    
                                      <RefreshCw size={14} />
                                      Re-submit
                                    </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Inline submission summary for submitted assignments */}
                      {assignment.is_submitted &&
                  <div className={`mt-5 p-5 rounded-2xl border border-dashed ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50/80 border-gray-200'}`}>
                          <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Submission Date</p>
                              <p className="text-sm font-medium">{new Date(assignment.submission_date).toLocaleString()}</p>
                            </div>
                            <div className="md:text-right">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Grade Status</p>
                              <p className={`text-xl font-semibold ${assignment.marks_obtained !== null ? 'text-indigo-500' : 'text-amber-500'}`}>
                                {assignment.marks_obtained !== null ?
                          `${assignment.marks_obtained} / ${assignment.max_marks}` :
                          'Awaiting Grade'}
                              </p>
                            </div>
                          </div>
                          {assignment.feedback &&
                    <div className="mt-4 pt-4 border-t border-border/50">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Instructor Feedback</p>
                              <p className={`text-sm italic leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                "{assignment.feedback}"
                              </p>
                            </div>
                    }
                        </div>
                  }
                    </div>
                  );
              })}
              </div> :

            <div className="flex flex-col items-center justify-center py-16 px-4 animate-in fade-in duration-700">
                <div className={`p-6 rounded-full ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} mb-4 shadow-sm`}>
                  <FileText className="h-12 w-12 text-indigo-500/50" />
                </div>
                <div className="text-center max-w-sm">
                  <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>No Assignments Found</h3>
                  <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    You're all caught up! We couldn't find any assignments matching your current search or filters.
                  </p>
                </div>
              </div>
            }
          </div>
        </CardContent>

        {pagination && pagination.total_pages > 0 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {Math.min((pagination.current_page - 1) * pagination.page_size + 1, pagination.total_items)} to {Math.min(pagination.current_page * pagination.page_size, pagination.total_items)} of {pagination.total_items} assignments
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.has_previous || loading}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                
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
                disabled={!pagination.has_next || loading}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* ── Details Modal ──────────────────────────────────────────────── */}
      {showDetailsModal && selectedAssignment &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
          onClick={() => setShowDetailsModal(false)}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        
          <div
          className={`relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-[#1c1c1e] border border-white/10' : 'bg-white'}`}>
          
            <div className="p-6 border-b border-border/50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Submission Details</h2>
                <p className="text-sm text-muted-foreground">{selectedAssignment.title}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowDetailsModal(false)} className="rounded-full">
                <X size={20} />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Submission Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-500" />
                    <span className="font-semibold text-green-500">Submitted</span>
                  </div>
                </div>
                <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Grade</p>
                  <p className={`text-lg font-semibold ${selectedAssignment.marks_obtained !== null ? 'text-indigo-500' : 'text-amber-500'}`}>
                    {selectedAssignment.marks_obtained !== null ?
                  `${selectedAssignment.marks_obtained} / ${selectedAssignment.max_marks}` :
                  'Awaiting Grading'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Submitted on</span>
                  <span className="font-medium">{new Date(selectedAssignment.submission_date).toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Deadline</span>
                  <span className={`font-medium ${isWithinDeadline(selectedAssignment) ? 'text-green-500' : 'text-red-400'}`}>
                    {new Date(selectedAssignment.due_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    {isWithinDeadline(selectedAssignment) ? ' (Open)' : ' (Closed)'}
                  </span>
                </div>

                {/* Submitted file */}
                {selectedAssignment.submission_file_url &&
              <div className={`flex items-center justify-between p-4 rounded-2xl border border-dashed ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50/50 border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold truncate max-w-[200px]">submitted_assignment.pdf</p>
                        <p className="text-[10px] text-muted-foreground">Your Submission</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild className="rounded-xl">
                        <a href={selectedAssignment.submission_file_url} target="_blank" rel="noreferrer">
                          <Eye size={14} className="mr-2" />
                          View
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" asChild className="rounded-xl">
                        <a href={selectedAssignment.submission_file_url} download>
                          <Download size={14} />
                        </a>
                      </Button>
                    </div>
                  </div>
              }

                {selectedAssignment.feedback &&
              <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-indigo-500/5' : 'bg-indigo-50'} border ${theme === 'dark' ? 'border-indigo-500/10' : 'border-indigo-100'}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500 mb-1.5">Instructor Feedback</p>
                    <p className={`text-sm italic leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      "{selectedAssignment.feedback}"
                    </p>
                  </div>
              }
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              {/* Re-submit button inside Details modal — only if deadline not passed */}
              {isWithinDeadline(selectedAssignment) && (
                <Button
                  className={`flex-1 gap-2 rounded-xl ${
                    theme === 'dark'
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      : 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                  variant="outline"
                  onClick={() => openSubmitModal(selectedAssignment, true)}>
                  <RefreshCw size={16} />
                  Re-submit Assignment
                </Button>
              )}
              <Button className="flex-1 rounded-xl" onClick={() => setShowDetailsModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      }

      {/* ── Submit / Re-submit Modal ────────────────────────────────────── */}
      {showSubmitModal &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
          onClick={() => {
            setShowSubmitModal(false);
            setIsResubmit(false);
          }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        
          <div
          className={`relative w-full max-w-lg rounded-2xl shadow-2xl p-6 ${theme === 'dark' ? 'bg-background border border-border' : 'bg-white'}`}>
          
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="text-xl font-semibold">
                  {isResubmit ? 'Re-submit Assignment' : 'Submit Assignment'}
                </h2>
                <p className="text-sm text-muted-foreground">{selectedAssignment?.title}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowSubmitModal(false);
                  setIsResubmit(false);
                }}>
                <X size={20} />
              </Button>
            </div>

            {/* Re-submit warning banner */}
            {isResubmit && (
              <div className={`mb-5 p-3 rounded-xl flex items-start gap-3 text-sm border ${
                theme === 'dark'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}>
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>
                  Uploading a new file will <strong>replace your previous submission</strong>. This action cannot be undone.
                </span>
              </div>
            )}

            {/* Show existing submission file when re-submitting */}
            {isResubmit && selectedAssignment?.submission_file_url && (
              <div className={`mb-5 flex items-center justify-between p-3 rounded-xl border ${
                theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <FileText size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Current submission</p>
                    <p className="text-[10px] text-muted-foreground">Will be replaced on submit</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="h-7 rounded-lg gap-1.5 text-xs">
                  <a href={selectedAssignment.submission_file_url} target="_blank" rel="noreferrer">
                    <Eye size={12} />
                    View
                  </a>
                </Button>
              </div>
            )}

            <form onSubmit={handleSubmitAssignment} className="space-y-6">
              <div
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-colors ${submissionFile ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
              
                <input
                type="file"
                id="submit-file"
                className="hidden"
                onChange={handleFileChange}
                required />
              
                <label htmlFor="submit-file" className="cursor-pointer flex flex-col items-center">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${submissionFile ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                    {isResubmit ? <RefreshCw size={28} /> : <Upload size={28} />}
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
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowSubmitModal(false);
                    setIsResubmit(false);
                  }}>
                  Cancel
                </Button>
                <Button
                type="submit"
                className="flex-[2] bg-primary text-white"
                disabled={submitting || !submissionFile}>
                
                  {submitting
                    ? (isResubmit ? 'Re-uploading...' : 'Uploading...')
                    : (isResubmit ? 'Re-submit Now' : 'Submit Now')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>);

};

export default StudentAssignments;