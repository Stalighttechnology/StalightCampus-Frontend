import React, { useState, useEffect } from "react";
import { Star, AlertCircle, CheckCircle2, Clock, Send, User, Award, FileText, ArrowRight, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useTheme } from "@/context/ThemeContext";
import {
  getFacultyFeedbackReviews,
  getHODFeedbackReviews,
  getPrincipalFeedbackOverview,
  submitFacultyFeedbackRemarks,
  submitHODFeedbackRemarks,
  acknowledgePrincipalFeedback
} from "@/utils/faculty_api";

export const SURVEY_QUESTIONS = [
  { id: "Q1", text: "The faculty explains concepts clearly and effectively." },
  { id: "Q2", text: "The course content is delivered at an appropriate pace." },
  { id: "Q3", text: "The faculty engages students and encourages class participation." },
  { id: "Q4", text: "The teaching methods (lectures, presentations, examples) are effective." },
  { id: "Q5", text: "The faculty is approachable for doubts and clarifications." },
  { id: "Q6", text: "The course materials provided (notes, slides, resources) are helpful for understanding." },
  { id: "Q7", text: "The assessment methods (tests, quizzes, assignments) are fair and appropriate." },
  { id: "Q8", text: "The faculty integrates real-world examples or practical applications." },
  { id: "Q9", text: "I am able to understand the subject and apply the concepts learned." },
  { id: "Q10", text: "Overall, I am satisfied with the faculty's teaching and course delivery." },
];

export interface FeedbackReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: number;
  subjectName: string;
  subjectCode?: string;
  sectionId?: number | null;
  sectionName?: string;
  facultyName?: string;
  role: 'teacher' | 'hod' | 'principal';
  initialCycle?: number;
  onWorkflowUpdated?: () => void;
}

export const FeedbackReviewModal: React.FC<FeedbackReviewModalProps> = ({
  isOpen,
  onClose,
  subjectId,
  subjectName,
  subjectCode = "",
  sectionId = null,
  sectionName = "All",
  facultyName = "",
  role,
  initialCycle = 1,
  onWorkflowUpdated,
}) => {
  const { theme } = useTheme();
  const { toast } = useToast();

  const [cycle, setCycle] = useState<number>(initialCycle);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Workflow data state
  const [workflow, setWorkflow] = useState<any | null>(null);

  // Form remarks state
  const [facultyRemarksInput, setFacultyRemarksInput] = useState<string>("");
  const [hodRemarksInput, setHodRemarksInput] = useState<string>("");
  const [principalRemarksInput, setPrincipalRemarksInput] = useState<string>("");

  const loadWorkflowData = async () => {
    setLoading(true);
    try {
      let res: any = null;
      if (role === 'teacher') {
        res = await getFacultyFeedbackReviews(cycle, subjectId, sectionId);
      } else if (role === 'hod') {
        res = await getHODFeedbackReviews(cycle, subjectId, sectionId);
      } else {
        res = await getPrincipalFeedbackOverview({ cycle, subject_id: subjectId, section_id: sectionId });
      }

      if (res && res.success && Array.isArray(res.data)) {
        // Find matching workflow by subject and section
        const targetSubId = String(subjectId);
        const targetSecId = sectionId ? String(sectionId) : null;

        let matched = null;
        if (targetSecId) {
          matched = res.data.find(
            (item: any) => String(item.subject_id) === targetSubId && String(item.section_id) === targetSecId
          );
        }
        if (!matched) {
          // Look for subject-level ("All" / section_id === null)
          matched = res.data.find(
            (item: any) => String(item.subject_id) === targetSubId && (item.section_id === null || item.section_name === 'All' || item.section_name === 'All Sections')
          );
        }

        // Prioritize entries for this subject that have actual student responses
        const subjectEntriesWithResponses = res.data
          .filter((item: any) => String(item.subject_id) === targetSubId)
          .sort((a: any, b: any) => (b.total_responses || 0) - (a.total_responses || 0));

        if (!matched || (matched.total_responses === 0 && subjectEntriesWithResponses.length > 0 && subjectEntriesWithResponses[0].total_responses > 0)) {
          matched = subjectEntriesWithResponses[0];
        }

        if (matched) {
          setWorkflow(matched);
          setFacultyRemarksInput(matched.faculty_remarks || "");
          setHodRemarksInput(matched.hod_remarks || "");
          setPrincipalRemarksInput(matched.principal_remarks || "");
        } else {
          setWorkflow(null);
        }
      }
    } catch (err) {
      console.error("Error loading feedback workflow:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadWorkflowData();
    }
  }, [isOpen, subjectId, sectionId, cycle]);

  const handleFacultySubmit = async () => {
    if (!workflow?.workflow_id) return;
    if (!facultyRemarksInput.trim()) {
      toast({
        variant: "destructive",
        title: "Remarks Required",
        description: "Please enter your action plan / remarks before forwarding to HOD."
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitFacultyFeedbackRemarks(workflow.workflow_id, facultyRemarksInput.trim());
      if (res.success) {
        toast({
          title: "Remarks Forwarded",
          description: "Your remarks have been recorded and forwarded to the HOD for review."
        });
        loadWorkflowData();
        if (onWorkflowUpdated) onWorkflowUpdated();
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Forward",
          description: res.message || "Failed to submit remarks."
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error occurred."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleHODSubmit = async () => {
    if (!workflow?.workflow_id) return;
    if (!hodRemarksInput.trim()) {
      toast({
        variant: "destructive",
        title: "HOD Remarks Required",
        description: "Please enter your departmental recommendations before forwarding to Principal."
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitHODFeedbackRemarks(workflow.workflow_id, hodRemarksInput.trim());
      if (res.success) {
        toast({
          title: "Forwarded to Principal",
          description: "Department remarks recorded and forwarded to Principal successfully."
        });
        loadWorkflowData();
        if (onWorkflowUpdated) onWorkflowUpdated();
      } else {
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: res.message || "Failed to submit HOD remarks."
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error occurred."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrincipalAcknowledge = async () => {
    if (!workflow?.workflow_id) return;
    setSubmitting(true);
    try {
      const res = await acknowledgePrincipalFeedback(workflow.workflow_id, principalRemarksInput.trim());
      if (res.success) {
        toast({
          title: "Review Completed",
          description: "Institutional feedback reviewed and signed off by Principal."
        });
        loadWorkflowData();
        if (onWorkflowUpdated) onWorkflowUpdated();
      } else {
        toast({
          variant: "destructive",
          title: "Action Failed",
          description: res.message || "Failed to acknowledge feedback."
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error occurred."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'COLLECTING':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Student Submissions Active</Badge>;
      case 'PENDING_STAFF':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pending Staff Remarks</Badge>;
      case 'FORWARDED_TO_HOD':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">Under HOD Review</Badge>;
      case 'FORWARDED_TO_PRINCIPAL':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">Under Principal Review</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Completed & Acknowledged</Badge>;
      default:
        return <Badge variant="outline">Pending Actions</Badge>;
    }
  };

  const isTeacher = role === 'teacher';
  const isHOD = role === 'hod';
  const isPrincipal = role === 'principal';

  const currentStatus = workflow?.status || 'COLLECTING';
  const totalResponses = workflow?.total_responses || 0;
  const averageScore = workflow?.average_score || 0.0;
  const questionAverages = workflow?.question_averages || {};

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={`w-[95vw] sm:max-w-4xl max-h-[92vh] flex flex-col p-0 rounded-2xl overflow-hidden ${theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
        
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 border-b shrink-0 bg-background/95 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-primary">
                  <Star className="w-6 h-6 fill-current text-yellow-500 shrink-0" />
                  {subjectName}
                </DialogTitle>
                {subjectCode && <span className="text-xs px-2 py-0.5 rounded-md bg-muted font-mono">{subjectCode}</span>}
                {sectionName && <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold">Sec {sectionName}</span>}
                {getStatusBadge(currentStatus)}
              </div>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                <span>Faculty: <strong>{workflow?.faculty_name || facultyName || "Assigned Faculty"}</strong></span>
                <span>•</span>
                <span>Role View: <strong className="capitalize">{role}</strong></span>
              </DialogDescription>
            </div>

            {/* Cycle Selector Buttons */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-border shrink-0 self-start sm:self-auto">
              <Button
                type="button"
                size="sm"
                variant={cycle === 1 ? "default" : "ghost"}
                className={`h-7 px-3 text-xs font-semibold rounded-lg ${cycle === 1 ? "shadow-xs" : ""}`}
                onClick={() => setCycle(1)}
              >
                Feedback 1 (Mid-Term)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={cycle === 2 ? "default" : "ghost"}
                className={`h-7 px-3 text-xs font-semibold rounded-lg ${cycle === 2 ? "shadow-xs" : ""}`}
                onClick={() => setCycle(2)}
              >
                Feedback 2 (End-Term)
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading feedback metrics and remarks...</p>
            </div>
          ) : (
            <>
              {/* Score KPI Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Average Score</span>
                    <div className="text-2xl font-black text-yellow-600 dark:text-yellow-400 mt-0.5">
                      {averageScore.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">/ 5.0</span>
                    </div>
                  </div>
                  <Star className="w-8 h-8 fill-current text-yellow-500/30" />
                </div>

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Total Submissions</span>
                    <div className="text-2xl font-black text-primary mt-0.5">
                      {totalResponses} <span className="text-xs font-normal text-muted-foreground">Students</span>
                    </div>
                  </div>
                  <User className="w-8 h-8 text-primary/30" />
                </div>

                <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Current Stage</span>
                    <div className="text-sm font-bold text-foreground mt-1">
                      {currentStatus === 'FORWARDED_TO_HOD' ? 'Under HOD Evaluation' :
                       currentStatus === 'FORWARDED_TO_PRINCIPAL' ? 'Under Principal Review' :
                       currentStatus === 'COMPLETED' ? 'Reviewed & Completed' : 'Staff Action Pending'}
                    </div>
                  </div>
                  <Clock className="w-8 h-8 text-muted-foreground/30" />
                </div>
              </div>

              {/* 10 Questions Rating Breakdown */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  10-Point Student Evaluation Breakdown
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SURVEY_QUESTIONS.map((q, idx) => {
                    const rating = questionAverages[q.id] || 0.0;
                    const percentage = (rating / 5) * 100;
                    return (
                      <div
                        key={q.id}
                        className={`p-3 rounded-xl border space-y-2 transition-all ${theme === 'dark' ? 'bg-muted/10 border-border' : 'bg-gray-50/50 border-gray-100'}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-0.5 text-left flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-primary uppercase">Q{idx + 1}</span>
                            <p className="text-xs font-medium leading-snug line-clamp-2">{q.text}</p>
                          </div>
                          <span className="text-xs font-bold shrink-0 text-yellow-600 dark:text-yellow-400 flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-current" />
                            {rating.toFixed(2)}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-yellow-500 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sequential Remarks Pipeline */}
              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  Institutional Remarks & Forwarding Chain
                </h4>

                {/* Tier 1: Staff / Concerned Faculty Remarks */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-primary uppercase flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> 1. Staff Action Plan & Self-Reflection
                    </span>
                    {workflow?.faculty_submitted_at && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        Submitted on {new Date(workflow.faculty_submitted_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {isTeacher && (currentStatus === 'COLLECTING' || currentStatus === 'PENDING_STAFF') ? (
                    <div className="space-y-3">
                      <Textarea
                        value={facultyRemarksInput}
                        onChange={(e) => setFacultyRemarksInput(e.target.value)}
                        placeholder="Write your reflection on student feedback and proposed instructional improvements / action plan..."
                        rows={3}
                        className="text-xs sm:text-sm resize-none"
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          {facultyRemarksInput.length} characters
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          disabled={submitting}
                          onClick={handleFacultySubmit}
                          className="gap-1.5 text-xs font-semibold"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Submit Remarks & Forward to HOD
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-xs sm:text-sm">
                      {workflow?.faculty_remarks ? (
                        <p className="whitespace-pre-wrap italic">"{workflow.faculty_remarks}"</p>
                      ) : (
                        <p className="text-muted-foreground italic">Pending staff remarks submission.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Tier 2: HOD Remarks & Recommendations */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" /> 2. HOD Departmental Assessment & Guidance
                    </span>
                    {workflow?.hod_submitted_at && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        Forwarded by HOD on {new Date(workflow.hod_submitted_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {isHOD && currentStatus === 'FORWARDED_TO_HOD' ? (
                    <div className="space-y-3">
                      <Textarea
                        value={hodRemarksInput}
                        onChange={(e) => setHodRemarksInput(e.target.value)}
                        placeholder="Enter departmental remarks, suggestions for the faculty, and endorsement before forwarding to Principal..."
                        rows={3}
                        className="text-xs sm:text-sm resize-none"
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          {hodRemarksInput.length} characters
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          disabled={submitting}
                          onClick={handleHODSubmit}
                          className="gap-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Submit Remarks & Forward to Principal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-xs sm:text-sm">
                      {workflow?.hod_remarks ? (
                        <p className="whitespace-pre-wrap italic">"{workflow.hod_remarks}"</p>
                      ) : (
                        <p className="text-muted-foreground italic">
                          {currentStatus === 'COLLECTING' || currentStatus === 'PENDING_STAFF'
                            ? "Awaiting staff remarks before HOD evaluation."
                            : "Pending HOD remarks submission."}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Tier 3: Principal Institutional Review & Sign-Off */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 3. Principal Institutional Sign-Off
                    </span>
                    {workflow?.principal_reviewed_at && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        Signed off on {new Date(workflow.principal_reviewed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {isPrincipal && currentStatus === 'FORWARDED_TO_PRINCIPAL' ? (
                    <div className="space-y-3">
                      <Textarea
                        value={principalRemarksInput}
                        onChange={(e) => setPrincipalRemarksInput(e.target.value)}
                        placeholder="Enter optional Principal notes or institutional action directions..."
                        rows={2}
                        className="text-xs sm:text-sm resize-none"
                      />
                      <div className="flex justify-end items-center">
                        <Button
                          type="button"
                          size="sm"
                          disabled={submitting}
                          onClick={handlePrincipalAcknowledge}
                          className="gap-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Acknowledge & Complete Review
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-xs sm:text-sm">
                      {workflow?.principal_remarks ? (
                        <p className="whitespace-pre-wrap italic">"{workflow.principal_remarks}"</p>
                      ) : currentStatus === 'COMPLETED' ? (
                        <p className="text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Reviewed and acknowledged by Principal.
                        </p>
                      ) : (
                        <p className="text-muted-foreground italic">
                          Awaiting forward from HOD to Principal.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t shrink-0 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
