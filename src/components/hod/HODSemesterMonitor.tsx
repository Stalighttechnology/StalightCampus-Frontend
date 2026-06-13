import { translateTerminology, getTerm } from "@/utils/institutionConfig";
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
  getSyllabusBootstrap, 
  getSemesterSyllabusMonitor,
  SemesterSyllabusMonitorResponse
} from "@/utils/faculty_api";
import { BookOpen, BarChart3, Users, Clock, AlertCircle, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";

const HODSemesterMonitor = () => {
  const { toast } = useToast();
  const { theme } = useTheme();

  const [semesters, setSemesters] = useState<any[]>([]);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [monitorData, setMonitorData] = useState<SemesterSyllabusMonitorResponse | null>(null);
  const [loadingMonitor, setLoadingMonitor] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null);

  // Load HOD bootstrap data
  useEffect(() => {
    const loadBootstrap = async () => {
      setBootstrapLoading(true);
      try {
        const res = await getSyllabusBootstrap();
        if (res.success) {
          setSemesters(res.semesters || []);
          // Auto select first semester if available
          if (res.semesters && res.semesters.length > 0) {
            setSemesterId(res.semesters[0].id);
          }
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

  // Fetch Semester syllabus monitoring metrics
  const fetchMonitorData = async (showLoader = false) => {
    if (!semesterId) {
      setMonitorData(null);
      return;
    }
    if (showLoader) setLoadingMonitor(true);
    try {
      const res = await getSemesterSyllabusMonitor(semesterId.toString());
      if (res.success) {
        // Update monitor data
        setMonitorData(res);
        
        // Also dynamically update selected subject details if modal is open
        if (selectedSubject) {
          const updatedSubject = res.subjects?.find((s: any) => s.subject_id === selectedSubject.subject_id);
          if (updatedSubject) {
            setSelectedSubject(updatedSubject);
          }
        }
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
    }
  };

  useEffect(() => {
    if (semesterId) {
      fetchMonitorData(true);
    }
  }, [semesterId]);

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
        <CardHeader id="hod-semester-monitor-header">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div>
                <CardTitle className="text-2xl font-semibold">Semester Syllabus Overview</CardTitle>
                <CardDescription>Track weekly teaching completions across all subjects in the department.</CardDescription>
              </div>
            </div>

            {/* Semester Filter */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold uppercase opacity-80 shrink-0">{translateTerminology("Semester")}</span>
              <Select 
                value={semesterId?.toString() || ""} 
                onValueChange={(v) => setSemesterId(Number(v))}
                disabled={bootstrapLoading}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={translateTerminology("Select Semester")} />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      Semester {s.number}
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
                // Calculate average progress across sections
                const totalSections = subj.sections_progress.length;
                const avgProgress = totalSections > 0
                  ? Math.round(subj.sections_progress.reduce((acc: number, curr: any) => acc + curr.progress_percentage, 0) / totalSections)
                  : 0;

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
                      
                      <div className="pt-2 flex justify-end">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2"
                          onClick={() => setSelectedSubject(subj)}
                        >
                          <Eye className="w-4 h-4" /> View Section Progress
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
                  There are no active subjects assigned or tracked under this semester.
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
                {selectedSubject?.sections_progress.map((sec: any, idx: number) => (
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
                      <span className="font-semibold">
                        {sec.completed_weeks} / {sec.total_weeks} Weeks
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button onClick={() => setSelectedSubject(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default HODSemesterMonitor;
