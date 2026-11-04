import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  getFeedbackQuestionnaires,
  saveFeedbackQuestionnaire,
} from "@/utils/faculty_api";
import {
  BookOpen,
  FlaskConical,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  CheckCircle2,
  Loader2,
  HelpCircle,
  Sparkles,
} from "lucide-react";

export interface QuestionItem {
  id: string;
  text: string;
}

export interface FeedbackQuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId?: number | string | null;
}

const DEFAULT_THEORY_QUESTIONS: QuestionItem[] = [
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

const DEFAULT_LAB_QUESTIONS: QuestionItem[] = [
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

export const FeedbackQuestionnaireModal: React.FC<FeedbackQuestionnaireModalProps> = ({
  isOpen,
  onClose,
  branchId,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"theory" | "lab">("theory");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Theory Questionnaire State
  const [theoryTitle, setTheoryTitle] = useState("COURSE TEACHING FEEDBACK QUESTIONNAIRE");
  const [theoryInstructions, setTheoryInstructions] = useState(
    "Rate only the teaching experience of the faculty member handling the course named above. Select one response for each statement."
  );
  const [theoryQuestions, setTheoryQuestions] = useState<QuestionItem[]>(DEFAULT_THEORY_QUESTIONS);
  const [theoryIsCustom, setTheoryIsCustom] = useState(false);

  // Lab Questionnaire State
  const [labTitle, setLabTitle] = useState("LABORATORY TEACHING FEEDBACK QUESTIONNAIRE");
  const [labInstructions, setLabInstructions] = useState(
    "Rate only the laboratory experience of the faculty member handling this laboratory course. Select one response for each statement."
  );
  const [labQuestions, setLabQuestions] = useState<QuestionItem[]>(DEFAULT_LAB_QUESTIONS);
  const [labIsCustom, setLabIsCustom] = useState(false);

  const fetchQuestionnaires = async () => {
    setLoading(true);
    try {
      const res = await getFeedbackQuestionnaires(branchId);
      if (res.success && res.data) {
        if (res.data.theory) {
          setTheoryTitle(res.data.theory.title || "COURSE TEACHING FEEDBACK QUESTIONNAIRE");
          setTheoryInstructions(res.data.theory.instructions || "");
          if (Array.isArray(res.data.theory.questions) && res.data.theory.questions.length > 0) {
            setTheoryQuestions(res.data.theory.questions);
            setTheoryIsCustom(!!res.data.theory.is_custom);
          }
        }
        if (res.data.lab) {
          setLabTitle(res.data.lab.title || "LABORATORY TEACHING FEEDBACK QUESTIONNAIRE");
          setLabInstructions(res.data.lab.instructions || "");
          if (Array.isArray(res.data.lab.questions) && res.data.lab.questions.length > 0) {
            setLabQuestions(res.data.lab.questions);
            setLabIsCustom(!!res.data.lab.is_custom);
          }
        }
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Load Failed",
        description: "Could not load current questionnaire settings.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchQuestionnaires();
    }
  }, [isOpen, branchId]);

  // Question editing handlers
  const handleUpdateQuestion = (type: "theory" | "lab", index: number, text: string) => {
    if (type === "theory") {
      setTheoryQuestions((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], text };
        return updated;
      });
    } else {
      setLabQuestions((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], text };
        return updated;
      });
    }
  };

  const handleAddQuestion = (type: "theory" | "lab") => {
    if (type === "theory") {
      const nextId = `Q${theoryQuestions.length + 1}`;
      setTheoryQuestions((prev) => [
        ...prev,
        { id: nextId, text: "" },
      ]);
    } else {
      const nextId = `Q${labQuestions.length + 1}`;
      setLabQuestions((prev) => [
        ...prev,
        { id: nextId, text: "" },
      ]);
    }
  };

  const handleRemoveQuestion = (type: "theory" | "lab", index: number) => {
    if (type === "theory") {
      if (theoryQuestions.length <= 1) {
        toast({
          variant: "destructive",
          title: "Minimum 1 question required",
        });
        return;
      }
      setTheoryQuestions((prev) =>
        prev
          .filter((_, i) => i !== index)
          .map((q, idx) => ({ ...q, id: `Q${idx + 1}` }))
      );
    } else {
      if (labQuestions.length <= 1) {
        toast({
          variant: "destructive",
          title: "Minimum 1 question required",
        });
        return;
      }
      setLabQuestions((prev) =>
        prev
          .filter((_, i) => i !== index)
          .map((q, idx) => ({ ...q, id: `Q${idx + 1}` }))
      );
    }
  };

  const handleResetToDefault = (type: "theory" | "lab") => {
    if (type === "theory") {
      setTheoryQuestions([...DEFAULT_THEORY_QUESTIONS]);
      setTheoryTitle("COURSE TEACHING FEEDBACK QUESTIONNAIRE");
      toast({
        title: "Reset to Theory Defaults",
        description: "Restored the standard 13 Theory Teaching statements.",
      });
    } else {
      setLabQuestions([...DEFAULT_LAB_QUESTIONS]);
      setLabTitle("LABORATORY TEACHING FEEDBACK QUESTIONNAIRE");
      toast({
        title: "Reset to Lab Defaults",
        description: "Restored the standard 13 Laboratory Teaching statements.",
      });
    }
  };

  const handleSave = async (type: "theory" | "lab") => {
    const questions = type === "theory" ? theoryQuestions : labQuestions;
    const title = type === "theory" ? theoryTitle : labTitle;
    const instructions = type === "theory" ? theoryInstructions : labInstructions;

    // Validate that all questions have non-empty text
    const emptyIdx = questions.findIndex((q) => !q.text.trim());
    if (emptyIdx !== -1) {
      toast({
        variant: "destructive",
        title: "Empty Question Statement",
        description: `Question #${emptyIdx + 1} statement cannot be empty.`,
      });
      return;
    }

    setSaving(true);
    try {
      const res = await saveFeedbackQuestionnaire({
        questionnaire_type: type,
        title: title.trim(),
        instructions: instructions.trim(),
        questions: questions.map((q, idx) => ({ id: `Q${idx + 1}`, text: q.text.trim() })),
        branch_id: branchId || null,
      });

      if (res.success) {
        toast({
          title: "Questionnaire Saved",
          description: `Successfully updated ${type === "lab" ? "Laboratory" : "Course"} Teaching Feedback questions.`,
        });
        if (type === "theory") setTheoryIsCustom(true);
        if (type === "lab") setLabIsCustom(true);
      } else {
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: res.message || "Could not save questionnaire.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to save questionnaire.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 rounded-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between gap-2 pr-6">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary shrink-0" />
                <span>Course Feedback Questionnaires</span>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-1">
                Configure separate 13-point evaluation questionnaires for Theory and Laboratory courses in your department.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body with Tabs */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as "theory" | "lab")}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 w-full h-11 p-1 bg-muted/60 rounded-xl mb-4">
              <TabsTrigger
                value="theory"
                className="flex items-center gap-2 text-xs sm:text-sm font-medium rounded-lg"
              >
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Theory Courses ({theoryQuestions.length} Qs)</span>
                {theoryIsCustom && (
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 ml-1">
                    Customized
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="lab"
                className="flex items-center gap-2 text-xs sm:text-sm font-medium rounded-lg"
              >
                <FlaskConical className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Lab Courses ({labQuestions.length} Qs)</span>
                {labIsCustom && (
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 ml-1">
                    Customized
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: THEORY QUESTIONNAIRE */}
            <TabsContent value="theory" className="space-y-4 mt-0">
              <Card className="border bg-card/60 shadow-xs rounded-xl">
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Questionnaire Header / Title
                    </label>
                    <Input
                      value={theoryTitle}
                      onChange={(e) => setTheoryTitle(e.target.value)}
                      placeholder="e.g. COURSE TEACHING FEEDBACK QUESTIONNAIRE"
                      className="font-medium text-xs sm:text-sm h-9 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Student Instructions
                    </label>
                    <Input
                      value={theoryInstructions}
                      onChange={(e) => setTheoryInstructions(e.target.value)}
                      placeholder="Student instructions banner text"
                      className="text-xs h-9 rounded-lg"
                    />
                  </div>
                  {/* Rating Info Pill */}
                  <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-blue-900 dark:text-blue-300 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-medium">
                      <HelpCircle className="w-4 h-4 shrink-0 text-blue-600" />
                      <span>Rating Scale: 5 (Strongly Agree) &rarr; 1 (Strongly Disagree) [5-Star Golden Rating]</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono border-blue-300">
                      Auto-Includes Suggestion Box
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Questions List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Theory Feedback Statements ({theoryQuestions.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResetToDefault("theory")}
                      className="text-xs h-8 gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset to 13 Defaults</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddQuestion("theory")}
                      className="text-xs h-8 gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Statement</span>
                    </Button>
                  </div>
                </div>

                {theoryQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl border bg-card/40 hover:bg-card transition-colors shadow-2xs"
                  >
                    <Badge
                      variant="secondary"
                      className="h-6 w-9 shrink-0 flex items-center justify-center font-mono text-[11px] font-bold mt-1"
                    >
                      #{idx + 1}
                    </Badge>
                    <Textarea
                      rows={2}
                      value={q.text}
                      onChange={(e) => handleUpdateQuestion("theory", idx, e.target.value)}
                      placeholder={`Statement #${idx + 1}`}
                      className="text-xs sm:text-sm rounded-lg resize-none min-h-[52px]"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveQuestion("theory", idx)}
                      title="Remove question"
                      className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0 mt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Action row */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => handleSave("theory")}
                  disabled={saving || loading}
                  className="gap-2 h-10 px-6 font-medium shadow-sm rounded-lg"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Theory Questionnaire
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: LAB QUESTIONNAIRE */}
            <TabsContent value="lab" className="space-y-4 mt-0">
              <Card className="border bg-card/60 shadow-xs rounded-xl">
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Questionnaire Header / Title
                    </label>
                    <Input
                      value={labTitle}
                      onChange={(e) => setLabTitle(e.target.value)}
                      placeholder="e.g. LABORATORY TEACHING FEEDBACK QUESTIONNAIRE"
                      className="font-medium text-xs sm:text-sm h-9 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Student Instructions
                    </label>
                    <Input
                      value={labInstructions}
                      onChange={(e) => setLabInstructions(e.target.value)}
                      placeholder="Student laboratory instructions banner text"
                      className="text-xs h-9 rounded-lg"
                    />
                  </div>
                  {/* Rating Info Pill */}
                  <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-medium">
                      <HelpCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>Rating Scale: 5 (Strongly Agree) &rarr; 1 (Strongly Disagree) [5-Star Golden Rating]</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono border-emerald-300">
                      Auto-Includes Lab Suggestion Box
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Questions List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Laboratory Feedback Statements ({labQuestions.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResetToDefault("lab")}
                      className="text-xs h-8 gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset to 13 Defaults</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddQuestion("lab")}
                      className="text-xs h-8 gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Statement</span>
                    </Button>
                  </div>
                </div>

                {labQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl border bg-card/40 hover:bg-card transition-colors shadow-2xs"
                  >
                    <Badge
                      variant="secondary"
                      className="h-6 w-9 shrink-0 flex items-center justify-center font-mono text-[11px] font-bold mt-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    >
                      #{idx + 1}
                    </Badge>
                    <Textarea
                      rows={2}
                      value={q.text}
                      onChange={(e) => handleUpdateQuestion("lab", idx, e.target.value)}
                      placeholder={`Laboratory Statement #${idx + 1}`}
                      className="text-xs sm:text-sm rounded-lg resize-none min-h-[52px]"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveQuestion("lab", idx)}
                      title="Remove question"
                      className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0 mt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Action row */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => handleSave("lab")}
                  disabled={saving || loading}
                  className="gap-2 h-10 px-6 font-medium shadow-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Lab Questionnaire
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 sm:p-4 border-t bg-muted/10 flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Changes will apply to all future student feedback submissions for this department.</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-lg h-9">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

