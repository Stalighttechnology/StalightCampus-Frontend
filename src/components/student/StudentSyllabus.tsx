import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { getStudentAllSyllabusStatus, getStudentSyllabusStatus } from "@/utils/student_api";
import { useTheme } from "@/context/ThemeContext";
import { BookOpen, CheckCircle, Clock, Calendar, AlertCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";

const StudentSyllabus = () => {
  const formatDateToDDMMYYYY = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    try {
      const trimmed = dateStr.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [year, month, day] = trimmed.split("-");
        return `${day}-${month}-${year}`;
      }
      if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
        return trimmed;
      }
      const dateObj = new Date(trimmed);
      if (isNaN(dateObj.getTime())) return dateStr;
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const parseDateString = (str: string | null | undefined): Date | undefined => {
    if (!str) return undefined;
    try {
      const trimmed = str.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [y, m, d] = trimmed.split("-").map(Number);
        return new Date(y, m - 1, d);
      }
      if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
        const [d, m, y] = trimmed.split("-").map(Number);
        return new Date(y, m - 1, d);
      }
      const d = new Date(trimmed);
      return isNaN(d.getTime()) ? undefined : d;
    } catch {
      return undefined;
    }
  };

  const sortDailyLogs = (logs: any[]): any[] => {
    if (!Array.isArray(logs)) return [];
    return [...logs].sort((a, b) => {
      const parsedA = parseDateString(a?.date);
      const parsedB = parseDateString(b?.date);
      const dateA = parsedA ? parsedA.getTime() : 0;
      const dateB = parsedB ? parsedB.getTime() : 0;

      if (dateA && dateB) {
        if (dateA !== dateB) return dateA - dateB;
      } else if (dateA && !dateB) {
        return -1;
      } else if (!dateA && dateB) {
        return 1;
      }

      const dayA = typeof a?.day === 'number' ? a.day : Number(a?.day) || 99;
      const dayB = typeof b?.day === 'number' ? b.day : Number(b?.day) || 99;
      return dayA - dayB;
    });
  };

  const { theme } = useTheme();
  const { toast } = useToast();
  
  const [subjects, setSubjects] = useState<any[]>([]);
  const [syllabusDataMap, setSyllabusDataMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null);
  const [loadingSubjectId, setLoadingSubjectId] = useState<string | null>(null);

  // Fetch subject syllabus timeline data dynamically on click
  const handleViewTimeline = async (subject: any) => {
    const subjectIdStr = subject.id.toString();
    setSelectedSubject(subject);

    // If weeks are not loaded yet, fetch details from backend
    if (!syllabusDataMap[subjectIdStr]?.weeks || syllabusDataMap[subjectIdStr].weeks.length === 0) {
      setLoadingSubjectId(subjectIdStr);
      try {
        const res = await getStudentSyllabusStatus(subjectIdStr);
        if (res?.success && res.data) {
          setSyllabusDataMap(prev => ({
            ...prev,
            [subjectIdStr]: res.data
          }));
        } else {
          toast({ title: "Error", description: res?.message || "Failed to load syllabus timeline", variant: "destructive" });
        }
      } catch (e) {
        toast({ title: "Error", description: "Network error loading syllabus details", variant: "destructive" });
      } finally {
        setLoadingSubjectId(null);
      }
    }
  };

  // Fetch student syllabus details in a single call
  const initializeStudentSyllabus = async () => {
    setLoading(true);
    try {
      const res = await getStudentAllSyllabusStatus();
      if (res?.success && res.data) {
        const fetchedSubjects = res.data.map((item: any) => ({
          id: item.subject_id,
          name: item.subject_name,
          subject_code: item.subject_code,
          subject_type: item.subject_type
        }));
        setSubjects(fetchedSubjects);

        const progressMap: Record<string, any> = {};
        res.data.forEach((item: any) => {
          progressMap[item.subject_id.toString()] = item;
        });
        setSyllabusDataMap(progressMap);
      } else {
        toast({ title: "Error", description: res?.message || "Failed to load student profile details", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Network error while loading syllabus", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeStudentSyllabus();
  }, []);

  return (
    <div className={`w-full ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
      <Card id="student-syllabus-card" className={`${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
        <CardHeader id="student-syllabus-header" className="px-4 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-4 md:py-5 border-b">
          <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            My Syllabus Tracker
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1">
            Track the week-by-week syllabus completion status of all your enrolled courses.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 space-y-6">
          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`border rounded-xl p-5 space-y-4 ${theme === 'dark' ? 'border-border bg-muted/10' : 'border-gray-200 bg-white'}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                      <Skeleton className="h-4 w-60" />
                    </div>
                    <div className="flex items-center gap-4 min-w-[200px] md:min-w-[300px]">
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between">
                          <Skeleton className="h-3 w-12" />
                          <Skeleton className="h-3 w-8" />
                        </div>
                        <Skeleton className="h-2 w-full rounded-full" />
                      </div>
                      <Skeleton className="h-9 w-28" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : subjects.length === 0 ? (
            <div className="py-16 text-center space-y-4 border-2 border-dashed rounded-xl dark:border-border">
              <AlertCircle className="w-12 h-12 text-muted-foreground opacity-50 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">No Enrolled Courses</h3>
                <p className="text-sm opacity-70">No subjects found for your current semester and branch.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {subjects.map(subject => {
                const subjectIdStr = subject.id.toString();
                const syllabusData = syllabusDataMap[subjectIdStr];

                return (
                  <div 
                    key={subject.id} 
                    className={`border rounded-xl p-5 transition-all duration-200 ${
                      theme === 'dark' 
                        ? 'border-border bg-muted/10 hover:bg-muted/20' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold">{subject.name}</h3>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                            theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'
                          }`}>
                            {subject.subject_code}
                          </span>
                          {subject.subject_type && (
                            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                              {subject.subject_type.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs opacity-75 mt-1">
                          {syllabusData 
                            ? `${syllabusData.completed_weeks} of ${syllabusData.total_weeks} weeks marked completed by faculty`
                            : "Syllabus progress details pending"
                          }
                        </p>
                      </div>

                      {/* Progress Bar & View Action */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full sm:w-auto md:min-w-[300px]">
                        {syllabusData && (
                          <div className="w-full sm:flex-1 space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span>Coverage</span>
                              <span>{syllabusData.progress_percentage}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-all duration-500"
                                style={{ width: `${syllabusData.progress_percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewTimeline(subject)}
                          className={`w-full sm:w-auto h-9 text-sm font-semibold flex items-center justify-center gap-2 rounded-lg shadow-sm transition-all duration-200 shrink-0
                          ${theme === 'dark' ?
                              'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20' :
                              'bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10'}`}
                        >
                          <Eye className="w-4 h-4" /> View Timeline
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Timeline details popup Dialog */}
          <Dialog open={!!selectedSubject} onOpenChange={(open) => !open && setSelectedSubject(null)}>
            <DialogContent className={`max-w-2xl w-[calc(100vw-1.5rem)] max-h-[85vh] flex flex-col rounded-xl ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white text-gray-900 border-gray-200'}`}>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                  Syllabus Status Timeline
                </DialogTitle>
                <DialogDescription className="text-sm opacity-75">
                  Detailed progress for {selectedSubject?.name} ({selectedSubject?.subject_code})
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar pr-1">
                {loadingSubjectId === selectedSubject?.id.toString() ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((w) => (
                      <div key={w} className="p-4 rounded-xl border border-border bg-card space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-40" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative border-l border-gray-200 dark:border-gray-800 ml-3 space-y-6">
                    {(() => {
                      const syllabusData = syllabusDataMap[selectedSubject?.id.toString() || ""];
                    const weeks = Array.from({ length: 16 }, (_, i) => {
                      const weekNum = i + 1;
                      const existingWeek = syllabusData?.weeks?.find((w: any) => w.week === weekNum);
                      return existingWeek || {
                        week: weekNum,
                        is_completed: false,
                        expected_topics: "",
                        topics_covered: null,
                        notes: null
                      };
                    });

                    return weeks.map((w: any) => (
                      <div key={w.week} className="relative pl-6">
                        {/* Timeline Dot Icon */}
                        <span className={`absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full ring-4 ${
                          w.is_completed
                            ? "bg-emerald-500 ring-emerald-500/10 text-white"
                            : "bg-muted ring-muted/10 text-muted-foreground"
                        }`}>
                          {w.is_completed ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : (
                            <span className="text-[10px] font-semibold">{w.week}</span>
                          )}
                        </span>

                        {/* Week Card */}
                        <div className={`p-4 rounded-xl border transition-all duration-200 ${
                          w.is_completed
                            ? "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/5"
                            : "border-border bg-card"
                        }`}>
                          <div className="flex justify-between items-start flex-wrap gap-2">
                            <h5 className="font-semibold text-sm">Week {w.week}</h5>
                            {w.is_completed && w.completed_date && (
                              <div className="flex items-center gap-1.5 text-xs opacity-70">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Covered on {formatDateToDDMMYYYY(w.completed_date)} by {w.faculty_name || "Faculty"}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-2 space-y-1 text-xs">
                            <p>
                              <strong>Expected Plan:</strong> {w.expected_topics || <span className="italic opacity-50">Not planned yet</span>}
                            </p>
                            {w.is_completed && w.topics_covered && (
                              <p className="text-emerald-600 dark:text-emerald-400">
                                <strong>Actual Covered:</strong> {w.topics_covered}
                              </p>
                            )}
                            {/* Day-wise breakdown display if present */}
                            {Array.isArray(w.daily_logs) && w.daily_logs.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-dashed space-y-1.5">
                                <span className="font-semibold text-primary block text-[11px]">Day-Wise Lectures:</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {sortDailyLogs(w.daily_logs).map((dl: any, dIdx: number) => {
                                    const dayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                                    const dayTitle = dl.day_name || (dl.day >= 1 && dl.day <= 7 ? dayLabels[dl.day - 1] : `Day ${dl.day || dIdx + 1}`);
                                    return (
                                      <div key={dIdx} className={`p-1.5 rounded border text-[11px] flex items-center justify-between gap-1.5 ${
                                        dl.is_completed ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300" : "bg-muted/30 border-border"
                                      }`}>
                                        <span className="font-semibold">{dayTitle}: {dl.topic_covered}</span>
                                        {dl.date && <span className="text-[10px] opacity-70 shrink-0">{formatDateToDDMMYYYY(dl.date)}</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {w.notes && (
                              <p className="italic opacity-75 mt-1">
                                <strong>Note:</strong> {w.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
                )}
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

export default StudentSyllabus;
