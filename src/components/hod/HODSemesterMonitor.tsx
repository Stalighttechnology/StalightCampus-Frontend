import { translateTerminology, getTerm, getInstitutionType } from "@/utils/institutionConfig";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../ui/select";
import { Button } from "../ui/button";
import { useTheme } from "@/context/ThemeContext";
import { 
  getBatches,
  getSemesterSyllabusMonitor,
  getSubjectSyllabusMonitor,
  SemesterSyllabusMonitorResponse,
  exportSemesterSyllabusMonitorPdf,
  exportSyllabusPdf,
  exportSubjectSyllabusMonitorPdf,
  toggleCourseExitSurvey
} from "@/utils/faculty_api";
import { BookOpen, BarChart3, Users, Clock, AlertCircle, Eye, FileDown, Loader2, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";

const SURVEY_QUESTIONS = [
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

const HODSemesterMonitor = () => {
  const { toast } = useToast();
  const { theme } = useTheme();

  const [batches, setBatches] = useState<any[]>([]);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [monitorData, setMonitorData] = useState<SemesterSyllabusMonitorResponse | null>(null);
  const [loadingMonitor, setLoadingMonitor] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null);
  const [loadingSubjectProgress, setLoadingSubjectProgress] = useState(false);
  const [exportingSubjectId, setExportingSubjectId] = useState<number | null>(null);
  const [exportingSectionId, setExportingSectionId] = useState<number | null>(null);
  const [togglingSubjectId, setTogglingSubjectId] = useState<number | null>(null);
  const [selectedSurveySubject, setSelectedSurveySubject] = useState<any | null>(null);

  const handleToggleSurvey = async (subj: any) => {
    setTogglingSubjectId(subj.subject_id);
    const targetStatus = !subj.course_exit_survey_active;
    try {
      const res = await toggleCourseExitSurvey(subj.subject_id.toString(), targetStatus);
      if (res.success) {
        toast({
          title: "Success",
          description: `Course Exit Survey is now ${targetStatus ? 'Active' : 'Inactive'} for ${subj.subject_name}`
        });
        // Refresh local data state
        setMonitorData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            subjects: prev.subjects.map(s => s.subject_id === subj.subject_id ? { ...s, course_exit_survey_active: targetStatus } : s)
          };
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: res.message || "Failed to update Course Exit Survey status"
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to connect to the server"
      });
    } finally {
      setTogglingSubjectId(null);
    }
  };

  const handleExportSubjectPDF = async (subj: any) => {
    if (!semesterId) return;
    setExportingSubjectId(subj.subject_id);
    try {
      const blob = await exportSubjectSyllabusMonitorPdf(batchId!.toString(), semesterId.toString(), subj.subject_id.toString());
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileNameSuffix = `${subj.subject_name.replace(/\s+/g, '_')}`;
      link.setAttribute('download', `Syllabus_Monitor_${fileNameSuffix}_${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Syllabus coverage PDF downloaded successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to export syllabus coverage PDF',
      });
    } finally {
      setExportingSubjectId(null);
    }
  };

  const handleExportSectionPDF = async (subject: any, sectionId: number | null, sectionName: string) => {
    setExportingSubjectId(subject.subject_id);
    if (sectionId) setExportingSectionId(sectionId);
    try {
      const blob = await exportSyllabusPdf({
        batch_id: batchId!.toString(),
        subject_id: subject.subject_id.toString(),
        branch_id: "",
        semester_id: semesterId?.toString() || "",
        section_id: sectionId?.toString() || ""
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const fileNameSuffix = sectionId 
        ? `${subject.subject_name.replace(/\s+/g, '_')}_${sectionName.replace(/\s+/g, '_')}`
        : `${subject.subject_name.replace(/\s+/g, '_')}_Elective`;
      link.setAttribute('download', `Syllabus_Progress_${fileNameSuffix}_${new Date().toISOString().slice(0, 10)}.pdf`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Syllabus progress PDF downloaded successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to export syllabus progress PDF',
      });
    } finally {
      setExportingSubjectId(null);
      setExportingSectionId(null);
    }
  };

  // Fetch Semester syllabus monitoring metrics
  const fetchMonitorData = async (showLoader = false, overrideSemesterId?: string) => {
    if (!batchId) return;
    const sId = overrideSemesterId || semesterId?.toString();
    if (showLoader) setLoadingMonitor(true);
    try {
      const res = await getSemesterSyllabusMonitor(batchId.toString(), sId);
      if (res.success) {
        if (res.semesters && res.semesters.length > 0 && semesters.length === 0) {
          setSemesters(res.semesters);
        }
        if (res.semester_id && res.semester_id !== semesterId) {
          setSemesterId(res.semester_id);
        }
        setMonitorData(res);
      } else {
        if (showLoader) {
          toast({ title: "Error", description: res.message || "Failed to load monitor data", variant: "destructive" });
        }
      }
    } catch (e) {
      if (showLoader) {
        toast({ title: "Error", description: "Failed to fetch syllabus progress", variant: "destructive" });
      }
    } finally {
      if (showLoader) setLoadingMonitor(false);
      setBootstrapLoading(false);
    }
  };

  useEffect(() => {
    const initBatches = async () => {
      const bRes = await getBatches();
      if (bRes.success && bRes.data && bRes.data.length > 0) {
        setBatches(bRes.data);
        // No auto-select — user must choose
      }
      setBootstrapLoading(false);
    };
    initBatches();
  }, []);

  // When batch changes: reset semester, fetch semesters list, then auto-open semester dropdown
  useEffect(() => {
    if (!batchId) return;
    setSemesterId(null);
    setMonitorData(null);
    // Fetch semesters list by hitting the monitor with no semester (backend returns semesters)
    (async () => {
      try {
        const res = await getSemesterSyllabusMonitor(batchId.toString());
        if (res.success && res.semesters) {
          setSemesters(res.semesters);
          setIsSemesterOpen(true); // auto-open semester dropdown
        }
      } catch {}
    })();
  }, [batchId]);

  // When semester is explicitly chosen, fetch the data
  useEffect(() => {
    if (batchId && semesterId) fetchMonitorData(true);
  }, [semesterId]);

  const handleSemesterChange = (val: string) => {
    const newId = Number(val);
    setSemesterId(newId);
    // NOTE: fetchMonitorData is triggered by the useEffect watching [semesterId]
    // No need to call it here — avoids double API call on semester selection
  };

  const handleViewSectionProgress = async (subj: any) => {
    if (!semesterId) return;
    setSelectedSubject({ ...subj, sections_progress: [] });
    setLoadingSubjectProgress(true);
    try {
      const res = await getSubjectSyllabusMonitor(batchId!.toString(), semesterId.toString(), subj.subject_id.toString());
      if (res.success) {
        setSelectedSubject({ ...subj, sections_progress: res.sections_progress || [] });
      } else {
        toast({ title: "Error", description: res.message || "Failed to load section progress", variant: "destructive" });
        setSelectedSubject(null);
      }
    } catch (error) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
      setSelectedSubject(null);
    } finally {
      setLoadingSubjectProgress(false);
    }
  };

  // Color helper for progress status
  const getProgressColor = (pct: number) => {
    if (pct < 40) return "from-red-500 to-rose-600";
    if (pct < 75) return "from-amber-500 to-orange-600";
    return "from-emerald-500 to-teal-600";
  };

  const getProgressBadgeClass = (pct: number) => {
    if (pct < 40) return "bg-red-500/10 text-red-500 border border-red-500/20";
    if (pct < 75) return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
    return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
  };

  return (
    <div className={`space-y-6 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'} agent`}>
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader id="hod-semester-monitor-header" className="border-b mb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
            <div className="flex-1 min-w-0 text-left">
              <CardTitle className="text-xl sm:text-2xl font-semibold mb-2">
                {getInstitutionType() === 'school' ? 'Class Syllabus Overview' : 'Semester Syllabus Overview'}
              </CardTitle>
              <CardDescription>
                {getInstitutionType() === 'school'
                  ? 'Track weekly teaching completions across all subjects in the stream.'
                  : 'Track weekly teaching completions across all subjects in the department.'}
              </CardDescription>
            </div>

            {/* Batch Filter */}
            <div className="flex flex-col items-start gap-1 shrink-0 w-full sm:w-auto mr-4">
              <span className="text-xs font-semibold uppercase opacity-80 shrink-0">Batch</span>
              <Select 
                value={batchId?.toString() || ""} 
                onValueChange={(v) => setBatchId(Number(v))}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map(b => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Semester Filter */}
            <div className="flex flex-col items-start gap-1 shrink-0 w-full sm:w-auto">
              <span className="text-xs font-semibold uppercase opacity-80 shrink-0">
                {getInstitutionType() === 'school' ? 'Class' : translateTerminology("Semester")}
              </span>
              <Select 
                value={semesterId?.toString() || ""} 
                onValueChange={handleSemesterChange}
                disabled={!batchId || bootstrapLoading}
                open={isSemesterOpen}
                onOpenChange={setIsSemesterOpen}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={getInstitutionType() === 'school' ? 'Choose Class' : translateTerminology("Select Semester")} />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {getInstitutionType() === 'school' ? `Class ${s.number}` : `Semester ${s.number}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {bootstrapLoading || loadingMonitor ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className={`border p-6 space-y-6 ${theme === 'dark' ? 'bg-muted/10 border-border' : 'bg-gray-50/50 border-gray-100'}`}>
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <Skeleton className="h-6 w-2/3" />
                      <Skeleton className="h-5 w-20 rounded-full shrink-0" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                  <div className="flex justify-end pt-2">
                    <Skeleton className="h-9 w-44" />
                  </div>
                </Card>
              ))}
            </div>
          ) : monitorData && monitorData.subjects && monitorData.subjects.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {monitorData.subjects.map((subj) => {
                const avgProgress = subj.avg_progress || 0;

                return (
                  <Card 
                    key={subj.subject_id} 
                    className={`border hover:shadow-md transition-all duration-300 flex flex-col justify-between ${
                      theme === 'dark' ? 'bg-muted/10 border-border' : 'bg-gray-50/50 border-gray-100'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-semibold text-lg leading-tight">{subj.subject_name}</h4>
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-secondary text-secondary-foreground uppercase whitespace-nowrap shrink-0">
                              {subj.subject_code}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground capitalize mt-1.5">
                            Type: {subj.subject_type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                      {/* Overall Average Progress Summary */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm font-semibold">
                          <span>Average Syllabus Coverage</span>
                          <span className="text-primary">{avgProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(avgProgress)} transition-all duration-500`}
                            style={{ width: `${avgProgress}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between border-t pt-3">
                        <span className="text-sm font-medium">Course Exit Survey</span>
                        <Button
                          variant={subj.course_exit_survey_active ? "default" : "outline"}
                          size="sm"
                          disabled={togglingSubjectId === subj.subject_id}
                          onClick={() => handleToggleSurvey(subj)}
                          className={subj.course_exit_survey_active ? "bg-green-600 hover:bg-green-700 text-white border-transparent h-8" : "h-8"}
                        >
                          {togglingSubjectId === subj.subject_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : subj.course_exit_survey_active ? (
                            "Active (On)"
                          ) : (
                            "Inactive (Off)"
                          )}
                        </Button>
                      </div>

                      {subj.survey_stats && subj.survey_stats.total_responses > 0 && (
                        <div className="flex items-center justify-between border-t pt-3">
                          <div className="flex flex-col text-left">
                            <span className="text-sm font-medium">Exit Survey Rating</span>
                            <span className="text-xs text-muted-foreground">{subj.survey_stats.total_responses} responses</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/20"
                            onClick={() => setSelectedSurveySubject(subj)}
                          >
                            <Star className="w-4 h-4 fill-current text-yellow-500" />
                            <span>{subj.survey_stats.average_rating} / 5</span>
                          </Button>
                        </div>
                      )}

                      <div className="pt-2 flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2 flex-1 sm:flex-none"
                          onClick={() => handleViewSectionProgress(subj)}
                        >
                          <Eye className="w-4 h-4" /> View Section Progress
                        </Button>
                        {/* Desktop view button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="hidden sm:flex bg-primary hover:bg-primary/90 text-white hover:text-white border-primary gap-2"
                          onClick={() => handleExportSubjectPDF(subj)}
                          disabled={exportingSubjectId === subj.subject_id}
                        >
                          {exportingSubjectId === subj.subject_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileDown className="w-4 h-4" />
                          )}
                          <span>Export PDF</span>
                        </Button>
                        {/* Mobile view icon button */}
                        <Button
                          onClick={() => handleExportSubjectPDF(subj)}
                          disabled={exportingSubjectId === subj.subject_id}
                          size="icon"
                          variant="outline"
                          className="flex sm:hidden h-9 w-9 items-center justify-center shrink-0 border border-input bg-background"
                        >
                          {exportingSubjectId === subj.subject_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center space-y-4 border-2 border-dashed rounded-xl dark:border-border">
              <div className="flex justify-center">
                <BookOpen className="w-12 h-12 text-muted-foreground opacity-50" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No Syllabus Tracked Yet</h3>
                <p className="text-sm opacity-70 max-w-sm mx-auto mt-1">
                  {getInstitutionType() === 'school'
                    ? 'There are no active subjects assigned or tracked under this class.'
                    : 'There are no active subjects assigned or tracked under this semester.'}
                </p>
              </div>
            </div>
          )}

          <Dialog open={!!selectedSubject} onOpenChange={(open) => !open && setSelectedSubject(null)}>
            <DialogContent className={`w-[90%] h-[80vh] sm:max-w-2xl sm:h-auto sm:max-h-[85vh] flex flex-col rounded-xl ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white text-gray-900 border-gray-200'}`}>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                  Section-wise Syllabus Coverage
                </DialogTitle>
                <DialogDescription className="text-sm opacity-75">
                  Detailed progress for {selectedSubject?.subject_name} ({selectedSubject?.subject_code})
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar pr-1">
                {loadingSubjectProgress ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  selectedSubject?.sections_progress?.map((sec: any, idx: number) => (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-xl border space-y-3 ${
                        theme === 'dark' ? 'bg-muted/20 border-border/40' : 'bg-gray-50 border-gray-100'
                      }`}
                    >
                      <div className="flex justify-between items-center text-sm font-medium">
                        <span className="flex items-center gap-1.5 font-semibold text-indigo-500">
                          <Clock className="w-4 h-4 shrink-0" />
                          {sec.section_name}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${getProgressBadgeClass(sec.progress_percentage)}`}>
                          {sec.progress_percentage}% Completed
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden relative">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(sec.progress_percentage)} transition-all duration-500`}
                          style={{ width: `${sec.progress_percentage}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-xs opacity-80 pt-1">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <strong>Faculty:</strong> {sec.faculty_name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold mr-1">
                            {sec.completed_weeks} / {sec.total_weeks} Weeks
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
                            onClick={() => handleExportSectionPDF(selectedSubject, sec.section_id, sec.section_name)}
                            disabled={exportingSubjectId === selectedSubject.subject_id && exportingSectionId === sec.section_id}
                          >
                            {exportingSubjectId === selectedSubject.subject_id && exportingSectionId === sec.section_id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <FileDown className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Per-Section Survey Rating */}
                      {sec.survey_stats && sec.survey_stats.total_responses > 0 && (
                        <div className={`mt-2 pt-3 border-t space-y-2 ${theme === 'dark' ? 'border-border/30' : 'border-gray-200'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              Exit Survey — {sec.survey_stats.total_responses} {sec.survey_stats.total_responses === 1 ? 'response' : 'responses'}
                            </span>
                            <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                              {sec.survey_stats.average_rating} / 5.0
                            </span>
                          </div>
                          {/* Per-question mini bars */}
                          <div className="space-y-1.5">
                            {Object.entries(sec.survey_stats.question_averages as Record<string, number>).map(([qKey, rating]) => (
                              <div key={qKey} className="flex items-center gap-2 text-xs">
                                <span className="w-6 shrink-0 font-semibold text-muted-foreground">{qKey}</span>
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                                    style={{ width: `${(rating / 5) * 100}%` }}
                                  />
                                </div>
                                <span className="w-6 text-right font-medium text-muted-foreground">{rating}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {sec.survey_stats && sec.survey_stats.total_responses === 0 && (
                        <div className={`mt-2 pt-3 border-t text-xs text-muted-foreground flex items-center gap-1.5 ${theme === 'dark' ? 'border-border/30' : 'border-gray-200'}`}>
                          <Star className="w-3.5 h-3.5 opacity-40" />
                          No exit survey responses for this section yet
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <DialogFooter>
                <Button onClick={() => setSelectedSubject(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        {/* Survey Analytics Dialog */}
        {selectedSurveySubject && selectedSurveySubject.survey_stats && (
          <Dialog open={!!selectedSurveySubject} onOpenChange={(open) => { if (!open) setSelectedSurveySubject(null); }}>
            <DialogContent className={`w-[95vw] sm:max-w-3xl overflow-y-auto max-h-[90vh] p-4 sm:p-6 rounded-2xl ${theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
              <DialogHeader className="border-b pb-4 pr-6">
                <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
                  <Star className="w-5 h-5 fill-current text-yellow-500" />
                  Course Exit Survey Analytics
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Detailed ratings breakdown for <strong>{selectedSurveySubject.subject_name}</strong> ({selectedSurveySubject.subject_code}) based on {selectedSurveySubject.survey_stats.total_responses} student responses.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-4 overflow-y-auto max-h-[60vh] pr-1">
                <div className="flex items-center justify-between p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 mb-2">
                  <span className="font-semibold text-sm">Overall Average Rating</span>
                  <div className="flex items-center gap-1.5 font-bold text-lg text-yellow-600 dark:text-yellow-400">
                    <Star className="w-5 h-5 fill-current" />
                    {selectedSurveySubject.survey_stats.average_rating} / 5.0
                  </div>
                </div>

                <div className="space-y-4">
                  {SURVEY_QUESTIONS.map((q, idx) => {
                    const rating = selectedSurveySubject.survey_stats.question_averages[q.id] || 0.0;
                    const percentage = (rating / 5) * 100;
                    return (
                      <div key={q.id} className={`p-4 rounded-xl border space-y-2.5 transition-all duration-300 ${theme === 'dark' ? 'bg-muted/5 border-border' : 'bg-gray-50/30 border-gray-100'}`}>
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-0.5 text-left">
                            <span className="text-xs font-semibold text-primary uppercase">Question {idx + 1}</span>
                            <p className="text-sm font-medium leading-relaxed">{q.text}</p>
                          </div>
                          <span className="text-sm font-bold shrink-0 text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            {rating.toFixed(2)}
                          </span>
                        </div>
                        {/* Rating Progress Visualizer */}
                        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden relative">
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

              <DialogFooter className="border-t pt-4">
                <Button onClick={() => setSelectedSurveySubject(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  </div>
  );
};

export default HODSemesterMonitor;
