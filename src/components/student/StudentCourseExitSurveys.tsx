import React, { useState, useEffect } from "react";
import {
  Star,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  FlaskConical,
  HelpCircle,
  MessageSquare,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import {
  getStudentCourseExitSurveys,
  submitCourseExitSurvey,
  getSubjectQuestionnaire,
} from "@/utils/faculty_api";
import { useToast } from "@/components/ui/use-toast";
import { useTheme } from "@/context/ThemeContext";

interface SurveySubject {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  subject_type: string;
  semester: number | null;
  feedback_cycle?: number;
  questionnaire_type?: "theory" | "lab";
  is_submitted: boolean;
}

const DEFAULT_THEORY_QUESTIONS = [
  { id: "Q1", text: "The faculty member explains the prescribed course concepts clearly and systematically." },
  { id: "Q2", text: "The faculty member is well-prepared, follows a logical sequence and completes the course content as planned." },
  { id: "Q3", text: "The pace of teaching is appropriate and sufficient time is given to understand difficult concepts." },
  { id: "Q4", text: "The faculty member uses effective teaching methods, examples, illustrations or teaching aids to make the topics understandable." },
  { id: "Q5", text: "The faculty member encourages questions, discussion and active participation during class." },
  { id: "Q6", text: "The faculty member relates course concepts to practical, industrial or real-life applications." },
  { id: "Q7", text: "The faculty member provides appropriate learning resources, practice questions or references to support learning beyond class hours." },
  { id: "Q8", text: "The faculty member is accessible for course-related doubts and provides clarification outside regular classroom sessions when required." },
  { id: "Q9", text: "Internal assessment tests, assignments and quizzes are relevant to the prescribed course content and test understanding and application." },
  { id: "Q10", text: "Internal assessment answer scripts / assignments are evaluated fairly, returned or discussed in a reasonable time, and mistakes are explained." },
  { id: "Q11", text: "The faculty member provides useful feedback and guidance on how to improve performance in subsequent assessments." },
  { id: "Q12", text: "Remedial / additional classes or learning support are provided for difficult topics, and the sessions help improve my understanding." },
  { id: "Q13", text: "The faculty member introduces relevant knowledge, current developments or applications beyond the prescribed syllabus to enrich learning." },
];

const DEFAULT_LAB_QUESTIONS = [
  { id: "Q1", text: "The faculty member explains the objective, principle, procedure and expected outcome of each experiment before the laboratory session." },
  { id: "Q2", text: "The faculty member demonstrates the correct use of instruments, equipment, software, tools and safety procedures." },
  { id: "Q3", text: "Every student gets adequate opportunity to perform the experiments personally rather than only observe demonstrations." },
  { id: "Q4", text: "The laboratory sessions provide sufficient hands-on practice and meaningful time for students to complete the experiments." },
  { id: "Q5", text: "The faculty member guides students when required while allowing them to perform tasks independently." },
  { id: "Q6", text: "The faculty member encourages students to understand results, analyse errors, troubleshoot problems and explain observations." },
  { id: "Q7", text: "Students are encouraged to explore alternative methods, vary parameters and learn through experimentation." },
  { id: "Q8", text: "The faculty member provides opportunities for self-learning through manuals, reference material, simulation tools, software or independent tasks." },
  { id: "Q9", text: "Laboratory exercises include open-ended problems or design / application tasks that require students to think, investigate and develop their own solutions." },
  { id: "Q10", text: "The experiments are connected to real-world, industrial, research or practical engineering applications." },
  { id: "Q11", text: "The faculty member assesses individual practical understanding and skills through observation, viva, records, demonstrations or performance—not only completion of the record." },
  { id: "Q12", text: "Feedback on laboratory performance, errors and reports is timely, fair and helps me improve my practical skills." },
  { id: "Q13", text: "The laboratory sessions provide opportunities to use relevant advanced tools, equipment, software or techniques beyond routine prescribed experiments." },
];

const RATING_LABELS: Record<number, string> = {
  5: "Strongly Agree",
  4: "Agree",
  3: "Neither Agree nor Disagree",
  2: "Disagree",
  1: "Strongly Disagree",
};

export const StudentCourseExitSurveys = ({
  isOpen,
  onClose,
  onRefreshCount,
}: {
  isOpen: boolean;
  onClose: () => void;
  onRefreshCount?: () => void;
}) => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [surveys, setSurveys] = useState<SurveySubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SurveySubject | null>(null);

  // Active questionnaire data
  const [activeQuestionnaire, setActiveQuestionnaire] = useState<{
    type: "theory" | "lab";
    title: string;
    instructions: string;
    questions: Array<{ id: string; text: string }>;
  } | null>(null);
  const [loadingQuestionnaire, setLoadingQuestionnaire] = useState(false);

  // Ratings state mapping e.g. Q1-Q13 to numbers 1-5
  const [ratings, setRatings] = useState<{ [key: string]: number }>({});
  const [hoveredRatings, setHoveredRatings] = useState<{ [key: string]: number }>({});
  const [suggestions, setSuggestions] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [surveyTab, setSurveyTab] = useState<"pending" | "completed">("pending");

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const res = await getStudentCourseExitSurveys();
      if (res.success && res.data) {
        setSurveys(res.data);
      }
    } catch {
      console.error("Failed to load surveys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSurveys();
    }
  }, [isOpen]);

  const handleSelectSubject = async (subj: SurveySubject) => {
    setSelectedSubject(subj);
    setRatings({});
    setHoveredRatings({});
    setSuggestions("");
    setLoadingQuestionnaire(true);

    const isLab =
      subj.subject_type === "lab" ||
      (subj.subject_name || "").toLowerCase().includes("lab") ||
      subj.questionnaire_type === "lab";

    const defaultQs = isLab ? DEFAULT_LAB_QUESTIONS : DEFAULT_THEORY_QUESTIONS;
    const defaultTitle = isLab
      ? "LABORATORY TEACHING FEEDBACK QUESTIONNAIRE"
      : "COURSE TEACHING FEEDBACK QUESTIONNAIRE";
    const defaultInst = isLab
      ? "Rate only the laboratory experience of the faculty member handling this lab course. Select one response for each statement."
      : "Rate only the teaching experience of the faculty member handling the course named above. Select one response for each statement.";

    try {
      const res = await getSubjectQuestionnaire(subj.subject_id);
      if (
        res.success &&
        res.questionnaire &&
        Array.isArray(res.questionnaire.questions) &&
        res.questionnaire.questions.length > 0
      ) {
        setActiveQuestionnaire({
          type: res.questionnaire_type || (isLab ? "lab" : "theory"),
          title: res.questionnaire.title || defaultTitle,
          instructions: res.questionnaire.instructions || defaultInst,
          questions: res.questionnaire.questions,
        });
      } else {
        setActiveQuestionnaire({
          type: isLab ? "lab" : "theory",
          title: defaultTitle,
          instructions: defaultInst,
          questions: defaultQs,
        });
      }
    } catch {
      setActiveQuestionnaire({
        type: isLab ? "lab" : "theory",
        title: defaultTitle,
        instructions: defaultInst,
        questions: defaultQs,
      });
    } finally {
      setLoadingQuestionnaire(false);
    }
  };

  const handleRate = (qId: string, value: number) => {
    setRatings((prev) => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedSubject) return;

    const questions = activeQuestionnaire?.questions || [];
    // Validate that all questions are answered (rate 1-5 stars)
    const unanswered = questions.filter(
      (q) => !ratings[q.id] || Number(ratings[q.id]) < 1 || Number(ratings[q.id]) > 5
    );
    if (unanswered.length > 0) {
      toast({
        variant: "destructive",
        title: "Incomplete Survey",
        description: `Please rate all ${questions.length} questions (1–5 stars) before submitting (${unanswered.length} remaining).`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitCourseExitSurvey(
        selectedSubject.subject_id.toString(),
        ratings,
        selectedSubject.feedback_cycle || 1,
        suggestions.trim()
      );
      if (res.success) {
        toast({
          title: "Feedback Submitted",
          description: `Thank you for completing Feedback ${selectedSubject.feedback_cycle || 1} for ${selectedSubject.subject_name}!`,
        });
        setSelectedSubject(null);
        setActiveQuestionnaire(null);
        fetchSurveys();
        if (onRefreshCount) onRefreshCount();
      } else {
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: res.message || "Failed to submit survey feedback.",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error occurred. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const activeSurveys = surveys.filter((s) => !s.is_submitted);
  const completedSurveys = surveys.filter((s) => s.is_submitted);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedSubject(null);
          setActiveQuestionnaire(null);
          onClose();
        }
      }}
    >
      <DialogContent
        className={`w-[95vw] sm:max-w-3xl overflow-y-auto max-h-[90vh] p-4 sm:p-6 rounded-2xl ${
          theme === "dark" ? "bg-background text-foreground border-border" : "bg-white text-gray-900 border-gray-200"
        }`}
      >
        <DialogHeader className="border-b pb-4 pr-6">
          <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary shrink-0" />
            <span>Student Faculty Feedback</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading feedback forms...</p>
          </div>
        ) : !selectedSubject ? (
          <div className="space-y-4 pt-4">
            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-800 dark:text-blue-200 text-sm flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
              <span>
                Please share your constructive feedback for your registered courses. Your anonymous input helps faculty
                and department improve instructional delivery.
              </span>
            </div>

            {/* Tab Navigation: Pending vs Submitted */}
            <div className="flex items-center gap-2 border-b pb-2">
              <Button
                variant={surveyTab === "pending" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSurveyTab("pending")}
                className="h-8 text-xs font-semibold"
              >
                Pending Forms ({activeSurveys.length})
              </Button>
              <Button
                variant={surveyTab === "completed" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSurveyTab("completed")}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                Submitted ({completedSurveys.length})
              </Button>
            </div>

            {surveyTab === "pending" ? (
              activeSurveys.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                  <h3 className="font-semibold text-lg">No Pending Feedback Forms</h3>
                  <p className="text-sm text-muted-foreground">
                    You are all caught up! All active feedback surveys have been submitted.
                  </p>
                </div>
              ) : (
                <div className="max-h-[50vh] overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeSurveys.map((subj) => {
                      const isLab =
                        subj.subject_type === "lab" ||
                        (subj.subject_name || "").toLowerCase().includes("lab") ||
                        subj.questionnaire_type === "lab";
                      return (
                        <Card
                          key={`${subj.subject_id}-${subj.feedback_cycle || 1}`}
                          className={`hover:border-primary/50 cursor-pointer transition-all duration-300 ${
                            theme === "dark" ? "bg-muted/10 border-border" : "bg-gray-50/50 border-gray-100"
                          }`}
                          onClick={() => handleSelectSubject(subj)}
                        >
                          <CardHeader className="pb-3 flex flex-row justify-between items-start">
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CardTitle className="text-base font-semibold truncate">
                                  {subj.subject_name}
                                </CardTitle>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                  Feedback {subj.feedback_cycle === 2 ? "2 (End-Term)" : "1 (Mid-Term)"}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1.5 py-0 ${
                                    isLab
                                      ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20"
                                      : "border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/20"
                                  }`}
                                >
                                  {isLab ? "🔬 Laboratory Course" : "📘 Theory Course"}
                                </Badge>
                              </div>
                              <CardDescription className="text-xs">
                                {subj.subject_code} | Sem {subj.semester}
                              </CardDescription>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
                          </CardHeader>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )
            ) : completedSurveys.length === 0 ? (
              <div className="text-center py-8 space-y-2 text-muted-foreground">
                <p className="text-sm">No feedback forms have been submitted yet.</p>
              </div>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedSurveys.map((subj) => (
                    <Card
                      key={`completed-${subj.subject_id}-${subj.feedback_cycle || 1}`}
                      className={`opacity-85 ${
                        theme === "dark" ? "bg-muted/5 border-border" : "bg-gray-50/30 border-gray-200"
                      }`}
                    >
                      <CardHeader className="pb-3 flex flex-row justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-semibold">{subj.subject_name}</CardTitle>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              Feedback {subj.feedback_cycle === 2 ? "2 (End-Term)" : "1 (Mid-Term)"}
                            </span>
                          </div>
                          <CardDescription className="text-xs">
                            {subj.subject_code} | Sem {subj.semester}
                          </CardDescription>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Submitted
                        </span>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : loadingQuestionnaire ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading questionnaire questions...</p>
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {/* Top Navigation & Course Title Header */}
            <div className="border-b pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base sm:text-lg text-primary">{selectedSubject.subject_name}</h3>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Feedback {selectedSubject.feedback_cycle === 2 ? "2 (End-Term)" : "1 (Mid-Term)"}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      activeQuestionnaire?.type === "lab"
                        ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20"
                        : "border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/20"
                    }`}
                  >
                    {activeQuestionnaire?.type === "lab"
                      ? "🔬 Laboratory Teaching Questionnaire"
                      : "📘 Course Teaching Questionnaire"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeQuestionnaire?.title || "Course Teaching Feedback"} • {activeQuestionnaire?.questions?.length || 13} Statements
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedSubject(null);
                  setActiveQuestionnaire(null);
                }}
                className="gap-1 text-xs self-start sm:self-center"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to courses</span>
              </Button>
            </div>

            {/* Instruction Banner */}
            <div className="p-3.5 rounded-xl border bg-muted/30 text-xs text-muted-foreground space-y-1.5">
              <p className="font-medium text-foreground">
                {activeQuestionnaire?.instructions ||
                  "Rate only the teaching / laboratory experience of the faculty member handling this course. Select one response for each statement."}
              </p>
              <p className="opacity-85 text-[11px] flex items-center gap-1.5 flex-wrap">
                <strong className="text-foreground">Scale:</strong>
                <span>5 Stars (Strongly Agree)</span>
                <span>•</span>
                <span>4 Stars (Agree)</span>
                <span>•</span>
                <span>3 Stars (Neutral)</span>
                <span>•</span>
                <span>2 Stars (Disagree)</span>
                <span>•</span>
                <span>1 Star (Strongly Disagree)</span>
              </p>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {(activeQuestionnaire?.questions || DEFAULT_THEORY_QUESTIONS).map((q, idx) => {
                const currentRating = ratings[q.id] || 0;
                const activeHover = hoveredRatings[q.id] || 0;
                const displayVal = activeHover || currentRating;

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-xl border flex flex-col gap-3 transition-all duration-200 ${
                      currentRating > 0
                        ? "border-amber-300/40 bg-amber-50/15 dark:bg-amber-950/10"
                        : theme === "dark"
                        ? "bg-muted/10 border-border"
                        : "bg-gray-50/40 border-gray-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <span className="text-[11px] font-bold text-primary uppercase tracking-wide">
                          Question {idx + 1} of {(activeQuestionnaire?.questions || DEFAULT_THEORY_QUESTIONS).length}
                        </span>
                        <p className="text-xs sm:text-sm font-medium leading-relaxed text-foreground">{q.text}</p>
                      </div>
                      {currentRating > 0 && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 shrink-0">
                          Rated {currentRating} / 5
                        </span>
                      )}
                    </div>

                    {/* Interactive 5-Star Golden Rating */}
                    <div className="flex items-center gap-3 flex-wrap pt-1">
                      <div
                        className="flex items-center gap-1 bg-background/80 dark:bg-muted/30 p-1.5 rounded-xl border border-border/60 shadow-2xs"
                        onMouseLeave={() => setHoveredRatings((prev) => ({ ...prev, [q.id]: 0 }))}
                      >
                        {[1, 2, 3, 4, 5].map((starVal) => {
                          const isFilled = starVal <= displayVal;
                          return (
                            <button
                              key={starVal}
                              type="button"
                              onClick={() => handleRate(q.id, starVal)}
                              onMouseEnter={() => setHoveredRatings((prev) => ({ ...prev, [q.id]: starVal }))}
                              className="p-1 focus:outline-hidden transition-all duration-150 hover:scale-125 active:scale-95 rounded-md cursor-pointer group"
                              aria-label={`Rate ${starVal} Star${starVal > 1 ? "s" : ""}`}
                            >
                              <Star
                                className={`w-7 h-7 sm:w-8 sm:h-8 transition-all duration-150 ${
                                  isFilled
                                    ? "text-amber-400 fill-amber-400 drop-shadow-[0_2px_7px_rgba(251,191,36,0.55)] scale-105"
                                    : "text-muted-foreground/30 fill-transparent group-hover:text-amber-300/70"
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>

                      {/* Descriptive Rating Feedback */}
                      {displayVal > 0 ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-xs font-semibold animate-in fade-in duration-150">
                          <span className="font-bold">{displayVal} / 5</span>
                          <span>•</span>
                          <span>{RATING_LABELS[displayVal]}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic select-none">
                          Click a star to rate (1 to 5)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Specific Suggestion (Optional) */}
            <div className="p-4 rounded-xl border bg-card space-y-2">
              <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span>
                  Specific suggestion for improving this {activeQuestionnaire?.type === "lab" ? "laboratory" : "course"}{" "}
                  (optional):
                </span>
              </label>
              <Textarea
                rows={3}
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
                placeholder="Share your thoughts on lecture pacing, lab instruments, examples, or study material to improve learning..."
                className="text-xs sm:text-sm rounded-lg resize-none"
              />
              <p className="text-[11px] text-muted-foreground italic">
                Feedback is confidential and will be used to improve the delivery and learning experience of this course.
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="border-t pt-4 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedSubject(null);
                  setActiveQuestionnaire(null);
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-primary hover:bg-primary/95 text-white gap-2 px-6 h-10 font-medium"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  "Submit Survey"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
