import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import { useEffect, useState, useMemo, useCallback } from "react";
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
import { Input } from "../ui/input";
import { useTheme } from "@/context/ThemeContext";
import {
  getSyllabusStatus,
  updateSyllabusPlan,
  getSyllabusBootstrap,
  exportSyllabusPdf,
  getBatches
} from "@/utils/faculty_api";
import {
  BookOpen,
  CheckCircle,
  Clock,
  Save,
  Edit3,
  AlertCircle,
  Eye,
  FileDown,
  Loader2,
  Lock
} from "lucide-react";
import { showSuccessAlert, showErrorAlert } from "@/utils/sweetalert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";

const HODSyllabusTracker = () => {
  const { toast } = useToast();
  const { theme } = useTheme();

  // Bootstrap lists
  const [batches, setBatches] = useState<any[]>([]);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);

  // Filter selections
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);

  // States
  const [syllabusData, setSyllabusData] = useState<any>(null);
  const [loadingSyllabus, setLoadingSyllabus] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(false);

  // Local state for template plans
  const [weeksPlan, setWeeksPlan] = useState<Array<{
    week: number;
    expected_topics: string;
    has_progress?: boolean;
    progress_details?: string[];
  }>>([]);

  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  // When batch changes, reset semester/subject and auto-open semester dropdown
  useEffect(() => {
    if (!batchId) return;
    setSemesterId(null);
    setSubjectId(null);
    setSyllabusData(null);
    setIsSemesterOpen(true);
  }, [batchId]);

  const handleExportPDF = async () => {
    if (!subjectId) return;
    setExportingPDF(true);
    try {
      const blob = await exportSyllabusPdf({
        subject_id: subjectId.toString(),
        branch_id: "",
        semester_id: semesterId?.toString() || "",
        section_id: ""
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const fileNameSuffix = `${selectedSubject?.name.replace(/\s+/g, '_')}_MasterSyllabus`;
      link.setAttribute('download', `Master_Syllabus_${fileNameSuffix}_${new Date().toISOString().slice(0, 10)}.pdf`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Syllabus template PDF downloaded successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to export syllabus template PDF',
      });
    } finally {
      setExportingPDF(false);
    }
  };

  // Load HOD bootstrap data
  useEffect(() => {
    const loadBootstrap = async () => {
      setBootstrapLoading(true);
      try {
        const [res, batchRes] = await Promise.all([getSyllabusBootstrap(), getBatches()]);
        if (batchRes.success && batchRes.data && batchRes.data.length > 0) {
          setBatches(batchRes.data);
          // No auto-select — user must choose batch first
        }
        if (res.success) {
          setSemesters(res.semesters || []);
          setAllSubjects(res.subjects || []);
        } else {
          toast({ title: "Error", description: res.message || "Failed to load department structure", variant: "destructive" });
        }
      } catch (e) {
        toast({ title: "Error", description: "Failed to fetch bootstrap details", variant: "destructive" });
      } finally {
        setBootstrapLoading(false);
      }
    };
    loadBootstrap();
  }, []);

  // Filter subjects based on chosen Semester
  const subjects = useMemo(() => {
    if (!semesterId) return [];
    return allSubjects.filter(s => s.semester_id === semesterId);
  }, [semesterId, allSubjects]);

  // Determine if chosen subject is elective
  const selectedSubject = useMemo(() => subjects.find(s => s.id === subjectId), [subjectId, subjects]);
  const isElective = useMemo(() => selectedSubject?.subject_type === "elective" || selectedSubject?.subject_type === "open_elective", [selectedSubject]);

  // Reset cascading filters
  useEffect(() => {
    setSubjectId(null);
    if (semesterId && subjects.length > 0) {
      setIsSubjectOpen(true);
    }
  }, [semesterId]);

  // Fetch Syllabus status in real time
  const fetchSyllabus = useCallback(async (showLoader = false) => {
    if (!subjectId) {
      setSyllabusData(null);
      return;
    }
    if (showLoader) setLoadingSyllabus(true);
    try {
      const res = await getSyllabusStatus({
        subject_id: subjectId.toString(),
        branch_id: "",
        semester_id: semesterId?.toString() || "",
        section_id: "",
        batch_id: batchId?.toString() || ""
      });
      if (res.success && res.data) {
        setSyllabusData(res.data);
        // Only update local weeksPlan if the user is not actively editing inside the modal
        if (!editingPlan) {
          setWeeksPlan(res.data.weeks.map((w: any) => ({
            week: w.week,
            expected_topics: w.expected_topics,
            has_progress: !!w.has_progress,
            progress_details: w.progress_details || []
          })));
        }
      } else {
        if (showLoader) {
          toast({ title: "Error", description: res.message || "Failed to load syllabus details", variant: "destructive" });
        }
      }
    } catch (e) {
      if (showLoader) {
        toast({ title: "Error", description: "Failed to fetch syllabus data", variant: "destructive" });
      }
    } finally {
      if (showLoader) setLoadingSyllabus(false);
    }
  }, [semesterId, subjectId, batchId, editingPlan, toast]);

  useEffect(() => {
    fetchSyllabus(true);
  }, [fetchSyllabus]);

  // Save syllabus template plan
  const handleSavePlan = async () => {
    if (!subjectId) return;
    setSavingPlan(true);
    try {
      const planData = weeksPlan.map(w => ({ week: w.week, topics: w.expected_topics }));
      const res = await updateSyllabusPlan({
        subject_id: subjectId.toString(),
        plan_data: planData
      });
      if (res.success) {
        showSuccessAlert("Template Saved", "Syllabus week-wise plan template updated successfully!");
        setEditingPlan(false);
        fetchSyllabus();
      } else {
        showErrorAlert("Error", res.message || "Failed to update plan");
      }
    } catch (e) {
      showErrorAlert("Error", "Failed to update plan");
    } finally {
      setSavingPlan(false);
    }
  };

  return (
    <div className={`space-y-6 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'} agent`}>
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader id="hod-syllabus-tracker-header" className="border-b mb-3">
          <div className="flex flex-row items-start justify-between gap-4 w-full">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl sm:text-2xl font-semibold mb-2">Department Syllabus Management</CardTitle>
              <CardDescription>Configure department-level week-wise syllabus templates.</CardDescription>
            </div>
            {syllabusData && (
              <>
                {/* Desktop view button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  disabled={exportingPDF}
                  className="hidden sm:flex bg-primary hover:bg-primary/90 text-white hover:text-white border-primary h-9 px-4 transition-all text-sm items-center justify-center gap-2"
                >
                  {exportingPDF ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4" />
                      <span>Export PDF</span>
                    </>
                  )}
                </Button>

                {/* Mobile view icon button */}
                <Button
                  onClick={handleExportPDF}
                  disabled={exportingPDF}
                  size="icon"
                  variant="outline"
                  className="flex sm:hidden h-10 w-10 items-center justify-center shrink-0 border border-input bg-background"
                >
                  {exportingPDF ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dropdown Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase opacity-80">Batch</label>
              <Select value={batchId?.toString() || ""} onValueChange={(v) => setBatchId(Number(v))} disabled={bootstrapLoading}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase opacity-80">{translateTerminology("Semester")}</label>
              <Select value={semesterId?.toString() || ""} onValueChange={(v) => setSemesterId(Number(v))} disabled={!batchId} open={isSemesterOpen} onOpenChange={setIsSemesterOpen}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={!batchId ? "Select Batch first" : translateTerminology("Select Semester")} />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map(s => <SelectItem key={s.id} value={s.id.toString()}>Semester {s.number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase opacity-80">Subject</label>
              <Select value={subjectId?.toString() || ""} onValueChange={(v) => setSubjectId(Number(v))} disabled={!semesterId} open={isSubjectOpen} onOpenChange={setIsSubjectOpen}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={!semesterId ? "Select Semester first" : "Select Subject"} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.length > 0 ? (
                    subjects.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.subject_code})</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled className="text-center text-xs text-muted-foreground">
                      No subjects available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loader or Content */}
          {bootstrapLoading || loadingSyllabus ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`p-4 rounded-xl border flex flex-col md:flex-row gap-4 justify-between items-start md:items-center ${theme === 'dark' ? 'bg-muted/10 border-border' : 'bg-gray-50/50 border-gray-100'}`}>
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : syllabusData ? (
            <div className="space-y-6">
              {/* Progress Summary Card */}
              <div className={`p-6 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${theme === 'dark' ? 'bg-muted/30 border-border' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'}`}>
                <div className="space-y-1 flex-1">
                  <h3 className="text-lg font-semibold text-primary">Master Syllabus Plan Template</h3>
                  <p className="text-sm opacity-80">Currently set to {syllabusData.total_weeks} weeks course duration.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setEditingPlan(true)}>
                    <Edit3 className="w-4 h-4 mr-2" /> Edit Plan Template
                  </Button>
                </div>
              </div>

              {/* Timeline / Checklist view */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  Master Expected Topics Timeline
                </h3>

                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-800 dark:text-blue-200 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500 shrink-0" />
                  <span><strong>Master Template Mode:</strong> Set up weekly expected topics here. These plans will automatically propagate to all Faculty teaching sections under this subject.</span>
                </div>

                <div className="space-y-4">
                  {syllabusData.weeks.map((w: any) => (
                    <div
                      key={w.week}
                      className="p-4 rounded-xl border border-border hover:border-primary/30 transition-all duration-300 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center"
                    >
                      <div className="flex-1 space-y-1 w-full">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold bg-muted text-muted-foreground">
                            {w.week}
                          </span>
                          <div>
                            <h4 className="font-semibold text-base flex items-center gap-2">
                              Week {w.week}
                            </h4>
                            <p className="text-sm opacity-80">
                              <strong>Expected Plan:</strong> {w.expected_topics || <span className="italic opacity-50">Not planned yet</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Dialog open={editingPlan} onOpenChange={setEditingPlan}>
                <DialogContent className={`w-[90%] h-[80vh] sm:max-w-3xl sm:h-auto sm:max-h-[85vh] flex flex-col rounded-xl ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white text-gray-900 border-gray-200'}`}>
                  <DialogHeader className="shrink-0 pb-2 border-b border-border/40">
                    <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                      Edit Syllabus Plan Template
                    </DialogTitle>
                    <DialogDescription className="text-sm opacity-75">
                      Configure the weekly expected topics template for this subject.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto py-4 pr-1 custom-scrollbar space-y-3">
                    {weeksPlan.map((w, index) => (
                      <div key={w.week} className="flex gap-3 items-center p-2 rounded-lg border border-border/80 bg-muted/20 hover:border-primary/40 transition-colors duration-200">
                        <span className="font-semibold text-xs min-w-16 text-center text-muted-foreground">Week {w.week}:</span>
                        <div className="flex-1 flex flex-col">
                          <div className="relative w-full">
                            <Input
                              placeholder="Enter expected topics for this week"
                              value={w.expected_topics}
                              onChange={(e) => {
                                const updated = [...weeksPlan];
                                updated[index].expected_topics = e.target.value;
                                setWeeksPlan(updated);
                              }}
                              className={`bg-background ${w.has_progress ? "pr-8 opacity-75 cursor-not-allowed" : ""}`}
                              disabled={w.has_progress}
                            />
                            {w.has_progress && (
                              <Lock className="w-4 h-4 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2" />
                            )}
                          </div>
                          {w.progress_details && w.progress_details.length > 0 && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              Locked: {w.progress_details.join(", ")}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                          onClick={() => {
                            // If they want to delete a specific week, or just filter it out
                            if (weeksPlan.length > 1) {
                              const updated = weeksPlan.filter((_, idx) => idx !== index)
                                .map((item, idx) => ({ ...item, week: idx + 1 }));
                              setWeeksPlan(updated);
                            }
                          }}
                          disabled={weeksPlan.length <= 1 || w.has_progress || weeksPlan.slice(index).some(item => item.has_progress)}
                          title={w.has_progress ? "Cannot delete: Week is in use by faculty" : weeksPlan.slice(index).some(item => item.has_progress) ? "Cannot delete: Shifting would affect later locked weeks" : ""}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}

                    {/* Real-time Inline Add Button at the Bottom */}
                    <div className="pt-2 flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 text-primary gap-2 transition-all duration-300 py-6"
                        onClick={() => {
                          const nextWeek = weeksPlan.length + 1;
                          setWeeksPlan([...weeksPlan, { week: nextWeek, expected_topics: "", has_progress: false }]);
                          // Auto scroll to bottom after state update
                          setTimeout(() => {
                            const scrollContainer = document.querySelector(".thin-scrollbar");
                            if (scrollContainer) {
                              scrollContainer.scrollTop = scrollContainer.scrollHeight;
                            }
                          }, 50);
                        }}
                      >
                        + Add Week {weeksPlan.length + 1}
                      </Button>
                    </div>
                  </div>

                  <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t border-border/50">
                    <div className="flex-1 flex justify-start">
                      <p className="text-xs text-muted-foreground self-center">
                        Total duration: <span className="font-semibold text-primary">{weeksPlan.length} Weeks</span>
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setEditingPlan(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSavePlan} disabled={savingPlan}>
                      {savingPlan ? "Saving Template..." : <><Save className="w-4 h-4 mr-2" /> Save Plan Template</>}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="py-16 text-center space-y-4 border-2 border-dashed rounded-xl dark:border-border">
              <div className="flex justify-center">
                <BookOpen className="w-12 h-12 text-muted-foreground opacity-50" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Select Subject & Semester</h3>
                <p className="text-sm opacity-70 max-w-sm mx-auto mt-1">Please select the Semester and Subject to load the weekly syllabus tracking configuration.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HODSyllabusTracker;
