import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { useTheme } from "../../context/ThemeContext";
import { normalizePaginatedResponse } from '../../utils/normalizePagination';
import { SkeletonStatsGrid, SkeletonTable, SkeletonPageHeader, SkeletonCard } from "../ui/skeleton";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { RefreshCcw, BookOpen, Clock, Calendar, CheckCircle2, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";

type ExamEntry = {
  id: string | number;
  title?: string;
  subject?: string;
  branch?: string;
  batch?: string;
  semester?: number | string;
  exam_type?: string;
  exam_period?: string;
  faculty_assignment?: {
    faculty?: string;
    subject?: string;
    semester?: number;
    section?: string;
  };
  date: string; // ISO or YYYY-MM-DD
  start_time?: string; // HH:MM
  end_time?: string; // HH:MM
  room?: string;
  is_published?: boolean;
  notes?: string;
};

type ExamGroup = {
  id: string;
  title: string;
  batch: string;
  branch: string;
  semester: string;
  exam_type: string;
  exam_period: string;
  dateStr: string;
  is_published: boolean;
  status: string;
  subjects: ExamEntry[];
};

const formatTime = (timeStr?: string) => {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':');
    const d = new Date();
    d.setHours(parseInt(h, 10), parseInt(m, 10));
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return timeStr;
  }
};

const groupExams = (exams: ExamEntry[]): ExamGroup[] => {
  const groups: Record<string, ExamGroup> = {};
  exams.forEach(ex => {
    const key = `${ex.batch}-${ex.branch}-${ex.semester}-${ex.exam_type}-${ex.exam_period}`;
    if (!groups[key]) {
      groups[key] = {
        id: key,
        title: ex.title || ex.exam_type?.replace('_', ' ') || 'Exam',
        batch: ex.batch || '-',
        branch: ex.branch || '-',
        semester: ex.semester ? `Sem ${ex.semester}` : '-',
        exam_type: ex.exam_type || '',
        exam_period: ex.exam_period || '',
        dateStr: '',
        status: 'upcoming',
        is_published: false,
        subjects: [],
      };
    }
    groups[key].subjects.push(ex);
  });

  return Object.values(groups).map(g => {
    let hasOngoing = false;
    let allPast = true;
    let allPublished = true;

    g.subjects.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    g.subjects.forEach(ex => {
      const s = computeStatus(ex);
      if (s === 'ongoing') hasOngoing = true;
      if (s !== 'past') allPast = false;
      if (!ex.is_published) allPublished = false;
    });

    g.status = hasOngoing ? 'ongoing' : allPast ? 'past' : 'upcoming';
    g.is_published = allPublished;
    
    if (g.subjects.length > 0) {
      const firstD = formatDate(g.subjects[0].date);
      const lastD = formatDate(g.subjects[g.subjects.length - 1].date);
      if (firstD === lastD) {
        if (g.subjects[0].start_time && g.subjects[0].end_time) {
          const timeStr = `${formatTime(g.subjects[0].start_time)} - ${formatTime(g.subjects[0].end_time)}`;
          g.dateStr = `${firstD}, ${timeStr}`;
        } else {
          g.dateStr = firstD;
        }
      } else {
        g.dateStr = `${firstD} - ${lastD}`;
      }
    }
    
    return g;
  });
};

const now = () => new Date();

const parseDateTime = (dateStr?: string, timeStr?: string) => {
  if (!dateStr) return null;
  const t = timeStr || '00:00';
  // assume dateStr is YYYY-MM-DD or ISO
  const iso = `${dateStr}T${t}:00`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d;
};

const computeStatus = (e: ExamEntry) => {
  const start = parseDateTime(e.date, e.start_time);
  const end = parseDateTime(e.date, e.end_time) || (start ? new Date(start.getTime() + 1000 * 60 * 60) : null);
  const cur = now();
  if (start && end) {
    if (cur >= start && cur <= end) return 'ongoing';
    if (cur < start) return 'upcoming';
    return 'past';
  }
  return 'scheduled';
};

const formatDate = (dstr?: string) => {
  if (!dstr) return '-';
  try {
    const d = new Date(dstr);
    return d.toLocaleDateString();
  } catch {
    return dstr;
  }
};

const DeanExams: React.FC<{ isReadOnly?: boolean }> = ({ isReadOnly = false }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [activeExams, setActiveExams] = useState<ExamEntry[]>([]);
  const [counts, setCounts] = useState({ ongoing: 0, upcoming: 0, past: 0 });
  const [error, setError] = useState<string | null>(null);
  const [upcomingOnly, setUpcomingOnly] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [firstLoad, setFirstLoad] = useState(true);
  const [viewGroupId, setViewGroupId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);setError(null);
    try {
      // build query params
      const qs: string[] = [];
      qs.push(`page_size=200`);
      if (upcomingOnly) {
        qs.push(`upcoming=1`);
      } else {
        // If we're showing everything, the main list should be 'past' 
        // since ongoing/upcoming are pinned separately
        qs.push(`past=1`);
      }
      const url = `${API_ENDPOINT}/dean/reports/exams/${qs.length ? `?${qs.join('&')}` : ''}`;

      const res = await fetchWithTokenRefresh(url);
      const json = await res.json();

      if (json.success) {
        const normalized = normalizePaginatedResponse(json, 'data');
        const list: ExamEntry[] = normalized.items && normalized.items.length ? normalized.items : Array.isArray(json.data) ? json.data : json.data || [];
        setExams(list.map((x) => ({ ...x, id: x.id })));

        if (json.counts) {
          setCounts(json.counts);
        }

        // Fetch active (upcoming/ongoing) exams to pin them
        if (!upcomingOnly) {
          const activeUrl = `${API_ENDPOINT}/dean/reports/exams/?upcoming=1&page_size=200`;
          const activeRes = await fetchWithTokenRefresh(activeUrl);
          const activeJson = await activeRes.json();
          if (activeJson.success) {
            setActiveExams(activeJson.data || []);
          }
        }
      } else {
        setExams([]);
        setError(json.message || 'Failed to load exams');
      }
    } catch (e: any) {
      setExams([]);
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    load();
  }, [upcomingOnly]);




  const publishExam = async (id: string | number) => {
    const result = await MySwal.fire({
      title: 'Are you sure?',
      text: 'Publish exam results?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#9147e0',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, publish!',
      target: document.body
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/dean/reports/exams/${id}/publish/`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setExams((prev) => prev.map((ex) => ex.id === id ? { ...ex, is_published: true } : ex));
        setActiveExams((prev) => prev.map((ex) => ex.id === id ? { ...ex, is_published: true } : ex));
        MySwal.fire({
          title: 'Published',
          text: 'Exam results published successfully',
          icon: 'success',
          confirmButtonColor: '#9147e0',
          target: document.body
        });
      } else {
        MySwal.fire({
          title: 'Error',
          text: json.message || 'Failed to publish',
          icon: 'error',
          confirmButtonColor: '#9147e0',
          target: document.body
        });
      }
    } catch (e: any) {
      MySwal.fire({
        title: 'Error',
        text: e?.message || 'Network error',
        icon: 'error',
        confirmButtonColor: '#9147e0',
        target: document.body
      });
    }
  };

  const publishAllExams = async (group: ExamGroup) => {
    const unpublished = group.subjects.filter(ex => !ex.is_published);
    if (unpublished.length === 0) return;

    const isUpdate = group.subjects.some(ex => ex.notes?.startsWith('[UPDATED]'));

    const result = await MySwal.fire({
      title: 'Are you sure?',
      text: isUpdate
        ? `Publish updates for all ${unpublished.length} scheduled subjects?`
        : `Publish all ${unpublished.length} scheduled subjects?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#9147e0',
      cancelButtonColor: '#d33',
      confirmButtonText: isUpdate ? 'Yes, publish updates!' : 'Yes, publish all!',
      target: document.body
    });

    if (!result.isConfirmed) return;
    
    try {
      setLoading(true);
      const publishedIds = unpublished.map(ex => ex.id);
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/dean/reports/exams/publish-all/`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_ids: publishedIds })
      });
      
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || 'Failed to publish exams');
      }

      setExams((prev) => prev.map((ex) => publishedIds.includes(ex.id) ? { ...ex, is_published: true } : ex));
      setActiveExams((prev) => prev.map((ex) => publishedIds.includes(ex.id) ? { ...ex, is_published: true } : ex));
      MySwal.fire({
        title: 'Published',
        text: 'All selected subjects published successfully',
        icon: 'success',
        confirmButtonColor: '#9147e0',
        target: document.body
      });
    } catch (e: any) {
      MySwal.fire({
        title: 'Error',
        text: 'Some subjects failed to publish.',
        icon: 'error',
        confirmButtonColor: '#9147e0',
        target: document.body
      });
    } finally {
      setLoading(false);
    }
  };

  const grouped = {
    ongoing: [] as ExamEntry[],
    upcoming: [] as ExamEntry[],
    past: [] as ExamEntry[],
    other: [] as ExamEntry[]
  };

  // Use activeExams for ongoing and upcoming sections
  const groupedActiveExams = groupExams(activeExams);
  groupedActiveExams.forEach((g) => {
    if (g.status === 'ongoing') grouped.ongoing.push(g as any);
    else if (g.status === 'upcoming') grouped.upcoming.push(g as any);
    else if (g.status === 'past') grouped.past.push(g as any);
    else grouped.other.push(g as any);
  });

  // Use main exams list for past section (and avoid duplicates)
  const groupedMainExams = groupExams(exams);
  groupedMainExams.forEach((g) => {
    if (g.status === 'past') {
      if (!grouped.past.find(x => x.id === g.id)) grouped.past.push(g as any);
    } else {
      if (g.status === 'ongoing' && !grouped.ongoing.find(x => x.id === g.id)) grouped.ongoing.push(g as any);
      else if (g.status === 'upcoming' && !grouped.upcoming.find(x => x.id === g.id)) grouped.upcoming.push(g as any);
      else if (g.status === 'past' && !grouped.past.find(x => x.id === g.id)) grouped.past.push(g as any);
      else if (!grouped.other.find(x => x.id === g.id)) grouped.other.push(g as any);
    }
  });

  const allGroups = [...grouped.ongoing, ...grouped.upcoming, ...grouped.past, ...grouped.other] as any as ExamGroup[];

  const totalGroups = grouped.past.length;
  const totalPages = Math.max(1, Math.ceil(totalGroups / pageSize));
  const paginatedPastGroups = grouped.past.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const currentGroup = allGroups.find(g => g.id === viewGroupId);
  const countCards = [
    { key: 'ongoing', title: 'Ongoing', count: grouped.ongoing.length, color: 'green' },
    { key: 'upcoming', title: 'Upcoming', count: grouped.upcoming.length, color: 'blue' },
    { key: 'past', title: 'Past', count: grouped.past.length, color: 'gray' }
  ];


  return (
    <div className={`${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card id="dean-exams-container">
        <CardContent className="px-6 pb-6 pt-2 space-y-8">
          {firstLoad ?
          <div className="space-y-6">
              <SkeletonStatsGrid items={4} />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SkeletonCard className="h-24" />
                <SkeletonCard className="h-24" />
                <SkeletonCard className="h-24" />
                <SkeletonCard className="h-24" />
              </div>
              <SkeletonTable rows={10} cols={8} />
            </div> :

          <div className={loading ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>


              {/* Stats Cards Row */}
              <div id="dean-exams-stats-grid" className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {countCards.map((c) =>
              <div key={c.key} className={`p-6 rounded-xl border shadow-sm transition-all hover:shadow-md flex items-center gap-6 ${theme === 'dark' ? 'bg-muted/30 border-border' : 'bg-gray-50 border-gray-300'}`
              }>
                    <div className={`p-3 rounded-xl ${c.color === 'green' ? theme === 'dark' ? 'bg-green-900/20 text-green-400' : 'bg-green-50 text-green-600' :
                c.color === 'blue' ? theme === 'dark' ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600' :
                theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`
                }>
                      {c.key === 'ongoing' ? <Clock className="w-6 h-6" /> :
                  c.key === 'upcoming' ? <Calendar className="w-6 h-6" /> :
                  <History className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        {c.title}
                      </div>
                      <div className={`text-3xl font-bold mt-1 ${c.color === 'green' ? theme === 'dark' ? 'text-green-400' : 'text-green-600' :
                  c.color === 'blue' ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600' :
                  theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`
                  }>
                        {c.count}
                      </div>
                    </div>
                  </div>
              )}
              </div>

              {/* Filters Row */}
              <div className="flex flex-col md:flex-row items-end gap-6 mt-4 mb-4">

              </div>

              {error &&
            <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
            }

              <div className="space-y-10">
                {['ongoing', 'upcoming', 'past', 'other'].map((sectionKey) => {
                const list = (grouped as any)[sectionKey];
                if (list.length === 0 && sectionKey !== 'upcoming' && sectionKey !== 'ongoing') return null;

                return (
                  <div key={sectionKey} className="space-y-4">
                      <div className="flex items-center gap-2 px-1">
                        <div className={`w-2 h-2 rounded-full ${sectionKey === 'ongoing' ? 'bg-green-500' :
                      sectionKey === 'upcoming' ? 'bg-blue-500' :
                      'bg-gray-400'}`
                      } />
                        <h3 className="font-semibold text-lg capitalize tracking-tight">
                          {sectionKey === 'other' ? 'Scheduled' : sectionKey} Exams
                        </h3>
                        <Badge variant="outline" className="ml-2 font-normal">
                          {list.length} {list.length === 1 ? 'Exam' : 'Exams'}
                        </Badge>
                      </div>

                      {list.length === 0 ?
                    <div className={`flex flex-col items-center justify-center py-20 px-4 rounded-xl border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
                          <div className={`p-5 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                            <BookOpen className="w-10 h-10 text-primary opacity-50" />
                          </div>
                          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                            No {sectionKey === 'other' ? 'Scheduled' : sectionKey} Exams Found
                          </h3>
                          <p className={`text-center max-w-sm text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                            There are currently no {sectionKey === 'other' ? 'scheduled' : sectionKey} exams in the system. New entries will appear here once scheduled.
                          </p>
                        </div> :

                    <div className={`md:rounded-xl md:border md:shadow-sm overflow-hidden ${theme === 'dark' ? 'md:bg-card md:border-border' : 'md:bg-white md:border-gray-200'}`}
                    >
                          {/* Desktop Table View */}
                          <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-border">
                              <thead className={theme === 'dark' ? 'bg-muted/50' : 'bg-gray-50'}>
                                <tr className={`text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`
                            }>
                                  <th className="px-6 py-4">Exam Details</th>
                                  <th className="px-6 py-4 text-center">Batch / Branch / Sem</th>
                                  <th className="px-6 py-4 text-center">Date & Time</th>
                                  <th className="px-6 py-4">Venue</th>
                                  <th className="px-6 py-4 text-center">Status</th>
                                  <th className="px-6 py-4 text-center">Published</th>
                                  <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className={`divide-y ${theme === 'dark' ? 'divide-border' : 'divide-gray-200'}`}>
                                {(sectionKey === 'past' ? paginatedPastGroups : list).map((g: any) =>
                            <tr key={g.id} className={`text-sm hover:${theme === 'dark' ? 'bg-muted/30' : 'bg-gray-50'} transition-colors`}>
                                    <td className="px-6 py-4">
                                      <div className="font-semibold text-foreground">
                                        {g.title}
                                      </div>
                                      <div className="mt-1 flex gap-1">
                                        {g.exam_type && <Badge variant="outline" className="text-[10px] py-0">{g.exam_type.replace('_', ' ')}</Badge>}
                                        {g.exam_period && <Badge variant="outline" className="text-[10px] py-0">{g.exam_period.replace('_', '/')}</Badge>}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <div className="font-medium">{g.batch}</div>
                                      <div className="text-xs text-muted-foreground">{g.branch} • {g.semester}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                      <div className="font-medium">{g.dateStr}</div>
                                      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                                        <BookOpen className="w-3 h-3" />
                                        {g.subjects.length} Subjects
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <Badge variant="secondary" className="font-medium">
                                        {g.subjects[0]?.room || 'TBD'}
                                      </Badge>
                                    </td>

                                    <td className="px-6 py-4 text-center">
                                      <Badge className={`capitalize ${g.status === 'ongoing' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                                g.status === 'upcoming' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                                'bg-gray-500/10 text-gray-600 border-gray-500/20'}`
                                } variant="outline">
                                        {g.status}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      {g.is_published ?
                                <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" /> :
                                <span className="text-xs text-muted-foreground">Draft</span>
                                }
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button
                                          variant="default"
                                          size="sm"
                                          onClick={() => setViewGroupId(g.id)}
                                          className="h-8 text-xs font-semibold">
                                          View
                                        </Button>
                                    </td>
                                  </tr>
                            )}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Card View */}
                          <div className="md:hidden space-y-3">
                            {(sectionKey === 'past' ? paginatedPastGroups : list).map((g: any) => (
                              <div
                                key={g.id}
                                className={`rounded-xl border p-4 space-y-3 ${theme === 'dark' ? 'bg-muted/20 border-border' : 'bg-white border-gray-200'}`}
                              >
                                {/* Header row: title left, status+published right */}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-base text-foreground leading-snug break-words">{g.title}</p>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {g.exam_type && (
                                        <Badge variant="outline" className="text-[11px] px-2 py-0.5 font-medium">
                                          {g.exam_type.replace('_', ' ')}
                                        </Badge>
                                      )}
                                      {g.exam_period && (
                                        <Badge variant="outline" className="text-[11px] px-2 py-0.5 font-medium">
                                          {g.exam_period.replace('_', '/')}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                                    <Badge
                                      className={`capitalize text-xs font-semibold px-2.5 py-0.5 ${
                                        g.status === 'ongoing'
                                          ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                          : g.status === 'upcoming'
                                          ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                          : 'bg-gray-500/10 text-gray-500 border-gray-400/30'
                                      }`}
                                      variant="outline"
                                    >
                                      {g.status}
                                    </Badge>
                                    {g.is_published ? (
                                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    ) : (
                                      <span className="text-[11px] text-muted-foreground font-medium">Draft</span>
                                    )}
                                  </div>
                                </div>

                                {/* Divider */}
                                <div className={`border-t ${theme === 'dark' ? 'border-border' : 'border-gray-100'}`} />

                                {/* Details: label + value rows */}
                                <div className="space-y-2">
                                  {[
                                    { label: 'Batch', value: g.batch },
                                    { label: 'Branch / Sem', value: `${g.branch} • ${g.semester}` },
                                    { label: 'Date & Time', value: g.dateStr },
                                  ].map(({ label, value }) => (
                                    <div key={label} className="flex items-baseline gap-2">
                                      <span className="w-[90px] shrink-0 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        {label}
                                      </span>
                                      <span className="flex-1 text-[14px] font-medium text-foreground leading-snug break-words">
                                        {value || '—'}
                                      </span>
                                    </div>
                                  ))}

                                  {/* Subjects row with icon */}
                                  <div className="flex items-baseline gap-2">
                                    <span className="w-[90px] shrink-0 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      Subjects
                                    </span>
                                    <span className="flex items-center gap-1.5 text-[14px] font-medium text-foreground">
                                      <BookOpen className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                      {g.subjects.length} Subject{g.subjects.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>

                                  {/* Venue row */}
                                  <div className="flex items-baseline gap-2">
                                    <span className="w-[90px] shrink-0 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      Venue
                                    </span>
                                    <Badge variant="secondary" className="text-[13px] font-medium px-2.5 py-0.5">
                                      {g.subjects[0]?.room || 'TBD'}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Action button */}
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => setViewGroupId(g.id)}
                                  className="w-full h-10 text-sm font-semibold mt-1"
                                >
                                  View Details
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                    }
                    </div>);

              })}

              </div>
            </div>
          }
        </CardContent>
        {totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-border mt-auto gap-4">
            <div className={`text-xs font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Showing {totalGroups === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalGroups)} of {totalGroups} {totalGroups === 1 ? 'exam schedule' : 'exam schedules'}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="h-9 px-4 text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all rounded-lg"
              >
                Previous
              </Button>
              <div className={`flex items-center justify-center min-w-[40px] h-9 px-3 text-sm font-bold rounded-lg border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
                {currentPage}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages || loading}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="h-9 px-4 text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all rounded-lg"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
      
      <Dialog open={!!viewGroupId} onOpenChange={(open) => !open && setViewGroupId(null)}>
        <DialogContent 
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="w-[90vw] max-h-[80vh] md:max-w-2xl md:max-h-[90vh] overflow-y-auto custom-scrollbar rounded-xl">
          <DialogHeader>
            <DialogTitle>{currentGroup?.title} - Detailed Schedule</DialogTitle>
            <DialogDescription>
              {currentGroup?.batch} • {currentGroup?.branch} • {currentGroup?.semester}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 border rounded-md overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold">Subject</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold">Room</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {currentGroup?.subjects.map(ex => (
                  <tr key={ex.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{ex.subject}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(ex.date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{ex.start_time || '-'} - {ex.end_time || '-'}</td>
                    <td className="px-4 py-3">{ex.room || 'TBD'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            {currentGroup?.status !== 'past' && currentGroup?.subjects.some(ex => !ex.is_published) && (
              <Button onClick={() => currentGroup && publishAllExams(currentGroup)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {currentGroup.subjects.some(ex => ex.notes?.startsWith('[UPDATED]')) ? "Update Publish Schedule" : "Publish All Schedule"}
              </Button>
            )}
            <Button variant="outline" className="bg-primary hover:bg-primary/90 text-white hover:text-white" onClick={() => setViewGroupId(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

};

export default DeanExams;