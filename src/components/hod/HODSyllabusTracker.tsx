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
  getSyllabusBootstrap 
} from "@/utils/faculty_api";
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Save, 
  Edit3, 
  AlertCircle,
  Eye
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

const HODSyllabusTracker = () => {
  const { toast } = useToast();
  const { theme } = useTheme();

  // Bootstrap lists
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
  const [weeksPlan, setWeeksPlan] = useState<Array<{ week: number; expected_topics: string }>>([]);

  const [isSubjectOpen, setIsSubjectOpen] = useState(false);

  // Load HOD bootstrap data
  useEffect(() => {
    const loadBootstrap = async () => {
      setBootstrapLoading(true);
      try {
        const res = await getSyllabusBootstrap();
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
        section_id: ""
      });
      if (res.success && res.data) {
        setSyllabusData(res.data);
        // Only update local weeksPlan if the user is not actively editing inside the modal
        if (!editingPlan) {
          setWeeksPlan(res.data.weeks.map((w: any) => ({ week: w.week, expected_topics: w.expected_topics })));
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
  }, [semesterId, subjectId, editingPlan, toast]);

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
        <CardHeader id="hod-syllabus-tracker-header">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold">Department Syllabus Management</CardTitle>
              <CardDescription>Configure department-level week-wise syllabus templates.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dropdown Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase opacity-80">Semester</label>
              <Select value={semesterId?.toString() || ""} onValueChange={(v) => setSemesterId(Number(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Semester" />
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
                  {subjects.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.subject_code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loader or Content */}
          {bootstrapLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium animate-pulse">Loading Department Structure...</p>
            </div>
          ) : loadingSyllabus ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium animate-pulse">Loading Syllabus Layout...</p>
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

              {/* Edit Plan Dialog (Popup Modal) */}
              <Dialog open={editingPlan} onOpenChange={setEditingPlan}>
                <DialogContent className={`max-w-3xl w-[calc(100vw-1.5rem)] max-h-[85vh] flex flex-col rounded-xl ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white text-gray-900 border-gray-200'}`}>
                  <DialogHeader className="shrink-0 pb-2 border-b border-border/40">
                    <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-primary" />
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
                          <Input
                            placeholder="Enter expected topics for this week"
                            value={w.expected_topics}
                            onChange={(e) => {
                              const updated = [...weeksPlan];
                              updated[index].expected_topics = e.target.value;
                              setWeeksPlan(updated);
                            }}
                            className="bg-background"
                          />
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
                            disabled={weeksPlan.length <= 1}
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
                            setWeeksPlan([...weeksPlan, { week: nextWeek, expected_topics: "" }]);
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
