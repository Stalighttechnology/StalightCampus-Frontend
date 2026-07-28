import { useState, useEffect } from "react";
import { Star, AlertCircle, CheckCircle2, ChevronRight, BookOpen } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { getStudentCourseExitSurveys, submitCourseExitSurvey } from "@/utils/faculty_api";
import { useToast } from "@/components/ui/use-toast";
import { useTheme } from "@/context/ThemeContext";

interface SurveySubject {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  subject_type: string;
  semester: number | null;
  is_submitted: boolean;
}

const QUESTIONS = [
  { id: "Q1", text: "How clearly were the Course Outcomes (COs) and course syllabus communicated to you at the start of the semester?" },
  { id: "Q2", text: "To what extent did the course delivery cover the entire prescribed syllabus in a structured and timely manner?" },
  { id: "Q3", text: "How would you rate the instructor's effectiveness in explaining complex concepts and ensuring conceptual clarity?" },
  { id: "Q4", text: "How effectively did the instructor encourage interactive discussion, critical questioning, and classroom engagement?" },
  { id: "Q5", text: "Rate the relevance, quality, and accessibility of the study materials, references, and digital resources provided." },
  { id: "Q6", text: "How well did the internal assessments (IA tests, assignments) evaluate your actual understanding of the course?" },
  { id: "Q7", text: "How effectively did laboratory sessions, projects, or case studies assist in applying theoretical concepts to practical scenarios?" },
  { id: "Q8", text: "To what extent is the course content relevant to contemporary industry trends, placement preparation, and future applications?" },
  { id: "Q9", text: "How effectively did this course enhance your engineering problem-solving, analytical thinking, and design capabilities?" },
  { id: "Q10", text: "Overall, rate the learning value, academic growth, and professional benefit you gained from this course." },
];

export const StudentCourseExitSurveys = ({ isOpen, onClose, onRefreshCount }: { isOpen: boolean; onClose: () => void; onRefreshCount?: () => void }) => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [surveys, setSurveys] = useState<SurveySubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SurveySubject | null>(null);
  
  // Star rating state mapping Q1-Q10 to values 1-5
  const [ratings, setRatings] = useState<{ [key: string]: number }>({
    Q1: 0, Q2: 0, Q3: 0, Q4: 0, Q5: 0, Q6: 0, Q7: 0, Q8: 0, Q9: 0, Q10: 0
  });
  const [submitting, setSubmitting] = useState(false);

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

  const handleSelectSubject = (subj: SurveySubject) => {
    setSelectedSubject(subj);
    setRatings({
      Q1: 0, Q2: 0, Q3: 0, Q4: 0, Q5: 0, Q6: 0, Q7: 0, Q8: 0, Q9: 0, Q10: 0
    });
  };

  const handleRate = (qId: string, value: number) => {
    setRatings(prev => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedSubject) return;

    // Validate that all questions are answered
    const unanswered = QUESTIONS.some(q => !ratings[q.id]);
    if (unanswered) {
      toast({
        variant: "destructive",
        title: "Incomplete Survey",
        description: "Please rate all 10 questions before submitting."
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitCourseExitSurvey(selectedSubject.subject_id.toString(), ratings);
      if (res.success) {
        toast({
          title: "Feedback Submitted",
          description: `Thank you for completing the exit survey for ${selectedSubject.subject_name}!`
        });
        setSelectedSubject(null);
        fetchSurveys();
        if (onRefreshCount) onRefreshCount();
      } else {
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: res.message || "Failed to submit survey feedback."
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error occurred. Please try again."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const activeSurveys = surveys.filter(s => !s.is_submitted);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={`w-[95vw] sm:max-w-3xl overflow-y-auto max-h-[90vh] p-4 sm:p-6 rounded-2xl ${theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
        <DialogHeader className="border-b pb-4 pr-6">
          <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary shrink-0" />
            Course Exit Surveys
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading active surveys...</p>
          </div>
        ) : !selectedSubject ? (
          <div className="space-y-4 pt-4">
            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-800 dark:text-blue-200 text-sm flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
              <span>Please complete exit surveys for your registered courses. Your anonymous feedback helps us maintain high educational standards.</span>
            </div>

            {activeSurveys.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <h3 className="font-semibold text-lg">No Pending Surveys</h3>
                <p className="text-sm text-muted-foreground">You are up to date! All active course exit surveys have been submitted.</p>
              </div>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeSurveys.map((subj) => (
                    <Card key={subj.subject_id} className={`hover:border-primary/50 cursor-pointer transition-all duration-300 ${theme === 'dark' ? 'bg-muted/10 border-border' : 'bg-gray-50/50 border-gray-100'}`} onClick={() => handleSelectSubject(subj)}>
                      <CardHeader className="pb-3 flex flex-row justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-base font-semibold">{subj.subject_name}</CardTitle>
                          <CardDescription className="text-xs">{subj.subject_code} | Sem {subj.semester}</CardDescription>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            <div className="border-b pb-2 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-primary">{selectedSubject.subject_name}</h3>
                <p className="text-xs text-muted-foreground">Course Exit Questionnaire</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSubject(null)}>Back to list</Button>
            </div>

            <div className="space-y-6">
              {QUESTIONS.map((q, idx) => (
                <div key={q.id} className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${theme === 'dark' ? 'bg-muted/5 border-border' : 'bg-gray-50/30 border-gray-100'}`}>
                  <div className="space-y-1 flex-1">
                    <span className="text-xs font-semibold text-primary uppercase">Question {idx + 1}</span>
                    <p className="text-sm font-medium leading-relaxed">{q.text}</p>
                  </div>
                  
                  {/* Star rating selector */}
                  <div className="flex items-center gap-1 shrink-0">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = star <= (ratings[q.id] || 0);
                      return (
                        <button
                          key={star}
                          onClick={() => handleRate(q.id, star)}
                          className="focus:outline-none transition-transform duration-200 active:scale-95"
                        >
                          <Star
                            className={`w-6 h-6 ${isFilled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSelectedSubject(null)} disabled={submitting}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="bg-primary hover:bg-primary/95 text-white">
                {submitting ? "Submitting..." : "Submit Survey"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
