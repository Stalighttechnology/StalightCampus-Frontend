import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "../ui/card";
import { Button } from "../ui/button";
import {
  CalendarDays,
  FileDown,
  Calendar,
  Loader2,
  LayoutGrid,
  Clock,
  MapPin,
  Users
} from "lucide-react";
import { getTimetable, type TimetableEntry } from '../../utils/faculty_api';
import { useTheme } from "@/context/ThemeContext";
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';

interface TimetableProps {
  role: string;
}

const Timetable = ({ role }: TimetableProps) => {
  const [timetableData, setTimetableData] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const { theme } = useTheme();
  const tableRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [selectedDay, setSelectedDay] = useState<'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'>('MON');
  const [currentTime, setCurrentTime] = useState(new Date());

  const timeSlots = [
    "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"
  ];

  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // Fetch timetable on mount
  useEffect(() => {
    getTimetable()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setTimetableData(res.data);
        } else {
          setTimetableData([]);
        }
      })
      .catch(() => {
        setError("Failed to load timetable");
      })
      .finally(() => setLoading(false));
  }, [role]);

  // Update current time & set smart defaults on load
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // 30s check

    // Set selectedDay to current weekday
    const dayIndex = new Date().getDay();
    const dayMap: Record<number, 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'> = {
      1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT'
    };
    if (dayMap[dayIndex]) {
      setSelectedDay(dayMap[dayIndex]);
    }

    // Default view mode based on screen width
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode('daily');
      } else {
        setViewMode('weekly');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Parse time to minutes
  const parseTimeToMinutes = useCallback((timeStr: string) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }, []);

  // Format 24h clock strings into AM/PM
  const format12Hour = useCallback((timeStr: string) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  }, []);

  // Check if session is ongoing
  const isSessionOngoing = useCallback((start: string, end: string, day: string) => {
    const now = currentTime;
    const currentDayIndex = now.getDay();
    const dayMap: Record<number, string> = {
      1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT'
    };
    if (dayMap[currentDayIndex] !== day) return false;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = parseTimeToMinutes(start);
    const endMinutes = parseTimeToMinutes(end);
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }, [currentTime, parseTimeToMinutes]);

  // Color mapper based on subject name hash
  const getSubjectColor = useCallback((subjectName: string) => {
    const colors = [
      { border: 'border-l-2 border-blue-500', text: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-500/10' },
      { border: 'border-l-2 border-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
      { border: 'border-l-2 border-purple-500', text: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-500/10' },
      { border: 'border-l-2 border-amber-500', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10' },
      { border: 'border-l-2 border-indigo-500', text: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-500/10' },
      { border: 'border-l-2 border-rose-500', text: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-500/10' }
    ];
    let sum = 0;
    for (let i = 0; i < subjectName.length; i++) {
      sum += subjectName.charCodeAt(i);
    }
    return colors[sum % colors.length];
  }, []);

  const getTableData = () => {
    const timetable = Array.isArray(timetableData) ? timetableData : [];
    return timeSlots.map((hour) => {
      const row: Record<string, any> = { time: hour };
      days.forEach((day) => {
        const entries = timetable.filter(
          (e) => e.start_time.startsWith(hour.split(":")[0]) && e.day === day
        );
        row[day.toLowerCase()] = entries.map((e) => ({
          subject: e.subject || 'Unknown',
          room: e.room,
          start_time: e.start_time,
          end_time: e.end_time,
          day: e.day,
          section: e.section,
          semester: e.semester,
          branch: e.branch
        }));
      });
      return row;
    });
  };

  const exportPDF = async () => {
    setDownloadingPDF(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/timetable/export-pdf/`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Faculty_Timetable_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        // Safe fail
      }
    } catch (err) {
      // Safe catch
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <Card id="timetable-card" className={`w-full overflow-hidden border-0 sm:border shadow-none ${theme === 'dark' ? 'bg-transparent sm:bg-[#0f172a] text-slate-100 border-slate-800' : 'bg-transparent sm:bg-white text-slate-900 border-slate-200'}`}>
      <CardHeader className="px-0 py-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
          <div>
            <CardTitle className="text-2xl font-semibold tracking-tight">Faculty Timetable</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">View your assigned teaching schedules and class slots.</p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-start">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 flex-1 sm:flex-none justify-center">
              <button
                onClick={() => setViewMode('weekly')}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex-1 sm:flex-none ${viewMode === 'weekly'
                  ? 'bg-white dark:bg-slate-950 shadow-sm text-primary'
                  : 'text-slate-500 hover:text-slate-705 dark:hover:text-slate-300'
                  }`}
              >
                <LayoutGrid size={14} />
                <span>Weekly Grid</span>
              </button>
              <button
                onClick={() => setViewMode('daily')}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex-1 sm:flex-none ${viewMode === 'daily'
                  ? 'bg-white dark:bg-slate-950 shadow-sm text-primary'
                  : 'text-slate-500 hover:text-slate-705 dark:hover:text-slate-300'
                  }`}
              >
                <CalendarDays size={14} />
                <span>Daily List</span>
              </button>
            </div>

            {/* Export Button */}
            <Button
              variant="outline"
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 rounded-lg flex items-center gap-2 shadow-sm font-medium"
              disabled={downloadingPDF || loading || timetableData.length === 0}
              onClick={exportPDF}
            >
              {downloadingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{downloadingPDF ? "Exporting..." : "Export PDF"}</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 sm:px-6 py-4 sm:p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-primary/5 text-primary'} animate-pulse`}>
              <Calendar className="w-12 h-12 opacity-80" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Fetching teaching schedule...</p>
          </div>
        ) : error ? (
          <div className="text-center py-6 text-red-500">{error}</div>
        ) : timetableData.length > 0 ? (
          viewMode === 'daily' ? (
            /* DAILY PLANNER VIEW */
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Day Tab Selectors */}
              <div className="grid grid-cols-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/50 dark:border-slate-700/50 w-full">
                {days.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day as any)}
                    className={`py-2 text-xs font-semibold rounded-md transition-all ${selectedDay === day
                      ? 'bg-primary text-white font-semibold'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Day's Timeline List */}
              <div className="space-y-4">
                {(() => {
                  const dayEntries = timetableData.filter(e => e.day === selectedDay)
                    .sort((a, b) => a.start_time.localeCompare(b.start_time));

                  if (dayEntries.length === 0) {
                    return (
                      <div className={`flex flex-col items-center justify-center py-14 px-4 text-center rounded-2xl border-2 border-dashed transition-all duration-300 ${
                        theme === 'dark' 
                          ? 'bg-[#0f172a]/20 border-slate-800 text-slate-400' 
                          : 'bg-slate-50/50 border-slate-200 text-slate-500'
                      }`}>
                        <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-slate-900 text-primary' : 'bg-primary/5 text-primary'}`}>
                          <CalendarDays className="w-8 h-8 opacity-90" />
                        </div>
                        <h4 className={`text-base font-semibold mb-1.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>No lectures scheduled</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px] leading-relaxed">
                          Enjoy your day off! There are no sessions scheduled for {selectedDay}.
                        </p>
                      </div>
                    );
                  }

                  return dayEntries.map((entry, idx) => {
                    const colors = getSubjectColor(entry.subject);
                    const ongoing = isSessionOngoing(entry.start_time, entry.end_time, entry.day);

                    return (
                      <div
                        key={idx}
                        className={`relative p-5 rounded-xl border transition-all duration-300 ${ongoing
                          ? `${colors.border} bg-primary/5 dark:bg-primary/10 border-primary ring-1 ring-primary/30 scale-[1.01]`
                          : theme === 'dark'
                            ? 'border-slate-800/80 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                            : 'border-slate-100 bg-slate-50/50 text-slate-600 hover:bg-slate-100/50'
                          }`}
                      >
                        {ongoing && (
                          <span className="absolute right-4 top-4 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        )}

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                                {entry.branch || 'LEC'}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                <Clock size={11} /> {format12Hour(entry.start_time)} - {format12Hour(entry.end_time)}
                              </span>
                            </div>
                            <h4 className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{entry.subject}</h4>
                          </div>

                          <div className="flex flex-row sm:flex-col gap-4 sm:gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60 w-full sm:w-auto">
                            <div className="flex items-center gap-1.5 font-medium">
                              <Users size={13} className="text-slate-400" />
                              <span>Sem {entry.semester}, Sec {entry.section}</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-semibold text-primary">
                              <MapPin size={13} />
                              <span>Room {entry.room}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          ) : (
            /* WEEKLY GRID VIEW */
            <div ref={tableRef} className="overflow-x-auto border border-slate-150 dark:border-slate-800/60 rounded-xl custom-scrollbar animate-in fade-in duration-300">
              <table className="w-full border-collapse text-left whitespace-nowrap min-w-[900px]">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-b border-slate-150 dark:border-slate-800">
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider w-24 text-center md:sticky md:left-0 md:z-10 bg-slate-100 dark:bg-[#151c2c] border-r border-slate-200 dark:border-slate-800">
                      Time Slot
                    </th>
                    {days.map((day) => (
                      <th
                        key={day}
                        className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-center"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                  {getTableData().map((row, idx) => {
                    const isEvenRow = idx % 2 === 0;
                    const rowBgClass = theme === 'dark'
                      ? isEvenRow ? 'bg-[#0f172a]' : 'bg-[#0f172a]/40'
                      : isEvenRow ? 'bg-white' : 'bg-slate-50/30';

                    return (
                      <tr key={idx} className={`${rowBgClass} hover:bg-slate-100/50 dark:hover:bg-slate-800/20 transition-colors`}>
                        <td className="px-4 py-4 font-semibold text-xs text-center border-r border-slate-200 dark:border-slate-800 md:sticky md:left-0 md:z-10 md:bg-[#f8fafc] md:dark:bg-[#151c2c] text-slate-600 dark:text-slate-400">
                          {format12Hour(row.time)}
                        </td>
                        {["mon", "tue", "wed", "thu", "fri", "sat"].map((day) => {
                          const entries = row[day] as any[];
                          return (
                            <td key={day} className="px-3 py-3 vertical-top min-w-[140px] max-w-[180px]">
                              {entries && entries.length > 0 ? (
                                entries.map((entry, eIdx) => {
                                  const colors = getSubjectColor(entry.subject);
                                  const ongoing = isSessionOngoing(entry.start_time, entry.end_time, entry.day);

                                  return (
                                    <div
                                      key={eIdx}
                                      className={`p-2.5 rounded-lg border flex flex-col justify-between h-full transition-all duration-300 ${colors.border} ${colors.bg} ${ongoing
                                        ? 'border-primary ring-2 ring-primary/40 dark:ring-primary/60 scale-[1.03] bg-primary/15 dark:bg-primary/25'
                                        : 'opacity-80 hover:opacity-100 hover:scale-[1.01]'
                                        }`}
                                    >
                                      <div className="relative">
                                        {ongoing && (
                                          <span className="absolute right-0 top-0.5 flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                          </span>
                                        )}
                                        <div className={`font-semibold text-[11px] leading-tight ${colors.text} truncate pr-3.5`}>
                                          {entry.subject}
                                        </div>
                                        <div className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 mt-1">
                                          {format12Hour(entry.start_time)} - {format12Hour(entry.end_time)}
                                        </div>
                                      </div>

                                      <div className="flex justify-between items-center text-[9px] font-semibold text-slate-400 dark:text-slate-400 mt-2 pt-1.5 border-t border-slate-200/40 dark:border-slate-850/40">
                                        <span className="truncate max-w-[70px]">Sem {entry.semester}, Sec {entry.section}</span>
                                        <span className="text-primary whitespace-nowrap">Room {entry.room}</span>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="h-full min-h-[48px] flex items-center justify-center text-slate-200 dark:text-slate-800/80 font-semibold select-none">
                                  •
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="p-6">
            <div className={`flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/10 text-slate-400' : 'border-slate-200 bg-slate-50/50 text-slate-500'}`}>
              <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-primary/5 text-primary'} animate-pulse`}>
                <Calendar className="w-12 h-12 opacity-80" />
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>No Scheduled Lectures</h3>
              <p className="max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                You do not have any teaching sessions scheduled for this week.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Timetable;