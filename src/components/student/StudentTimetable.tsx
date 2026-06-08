import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from
  "../ui/card";
import { Button } from "../ui/button";
import { CalendarDays, FileDown, Calendar, Loader2 } from "lucide-react";
import { getTimetable, type TimetableEntry } from "@/utils/student_api";
import { useTheme } from "@/context/ThemeContext";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import styles from './StudentTimetable.module.css';

const StudentTimetable = () => {
  const [timetableData, setTimetableData] = useState<TimetableEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();
  const tableRef = useRef<HTMLDivElement>(null);
  const [exportingPDF, setExportingPDF] = useState(false);

  // Predefined time slots for the grid (9:00 AM to 5:00 PM)
  // Reference hours for the vertical axis
  const timeSlots = [
    "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        setIsLoading(true);
        const data = await getTimetable();
        if (data.success && Array.isArray(data.data)) {
          setTimetableData(data.data);
        }
      } catch (error) {

      } finally {
        setIsLoading(false);
      }
    };
    fetchTimetable();
  }, []);

  // Generate table data for the grid
  interface DayEntry {
    subject: string;
    room: string;
  }

  interface TableRow {
    time: string;
    [key: string]: string | DayEntry | null | undefined;
  }

  const findTimetableEntry = (timetable: TimetableEntry[], slotStart: string, slotEnd: string, day: string): TimetableEntry | undefined => {
    return timetable.find((e) => {
      if (e.day !== day) return false;

      // Handle "HH:MM:SS" or "HH:MM" formats
      const lectureStart = e.start_time.substring(0, 5);

      // Check if lecture starts within this slot
      // e.g., if slot is 11:00-12:00 and lecture is 11:15, it matches
      return lectureStart >= slotStart && lectureStart < slotEnd;
    });
  };

  const createDayEntry = (entry: TimetableEntry | undefined): DayEntry | null => {
    if (!entry) return null;
    const subjectStr = typeof entry.subject === 'string' ? entry.subject : entry.subject?.name || 'Unknown';
    return {
      subject: subjectStr,
      room: entry.room
    };
  };

  const getTableData = () => {
    const timetable = Array.isArray(timetableData) ? timetableData : [];
    const tableData = timeSlots.map((hour) => {
      const row: Record<string, any> = { time: hour };
      days.forEach((day) => {
        // Find entries that start within this hour
        const entries = timetable.filter(
          (e) => e.start_time.startsWith(hour.split(":")[0]) && e.day === day
        );
        row[day.toLowerCase()] = entries.map((e) => ({
          subject: typeof e.subject === 'string' ? e.subject : e.subject?.name || 'Unknown',
          room: e.room,
          start_time: e.start_time,
          end_time: e.end_time
        }));
      });
      return row;
    });
    return tableData;
  };

  const exportToPDF = async () => {
    setExportingPDF(true);
    try {
      const url = `${API_ENDPOINT}/student/timetable/export-pdf/`;
      const response = await fetchWithTokenRefresh(url);
      if (!response.ok) {
        throw new Error("Failed to download PDF from backend");
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `Student_Timetable.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      // Non-blocking catch
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <Card id="timetable-card" className={`${styles.card} ${theme === 'dark' ? 'bg-card text-card-foreground' : 'bg-white text-gray-900'}`}>
      <CardHeader id="timetable-card-header" className={`${styles.cardHeader} ${theme === 'dark' ? 'bg-card' : 'bg-white'}`}>
        <CardTitle className={`text-lg sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
          Timetable
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          className={`${styles.exportButton} bg-primary hover:bg-primary/90 text-white border-primary`}
          disabled={exportingPDF || timetableData.length === 0}
          onClick={exportToPDF}>

          {exportingPDF ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4 mr-2" />
          )}
          {exportingPDF ? "Exporting..." : "Export"}
        </Button>
      </CardHeader>

      <CardContent className={`p-0 ${styles.card}`}>
        {isLoading ?
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-accent/20 text-primary' : 'bg-primary/10 text-primary'} animate-pulse`}>
              <Calendar className="w-12 h-12 opacity-80" />
            </div>
            <p className={`${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Loading schedule...</p>
          </div> :
          timetableData.length > 0 ?
            <div
              ref={tableRef}
              className={`${styles.timetableContainer} custom-scrollbar ${theme === 'dark' ? 'bg-card text-card-foreground' : 'bg-white text-gray-900'}`}>

              <table className={styles.timetableTable}>
                <thead className={theme === 'dark' ? 'bg-muted' : 'bg-gray-50'}>
                  <tr>
                    <th className={`${styles.timeColumn} ${theme === 'dark' ? 'border-b border-border text-card-foreground' : 'border-b border-gray-200 text-gray-900'}`}>
                      Time
                    </th>
                    {days.map((day) =>
                      <th
                        key={day}
                        className={`${styles.dayColumn} ${theme === 'dark' ? 'border-b border-border text-card-foreground' : 'border-b border-gray-200 text-gray-900'}`}>

                        {day}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {getTableData().map((row, idx) => {
                    const isEvenRow = idx % 2 === 0;
                    const rowBgClass = theme === 'dark' ?
                      isEvenRow ? 'bg-card' : 'bg-muted/40' :
                      isEvenRow ? 'bg-white' : 'bg-gray-50';
                    const hoverClass = theme === 'dark' ? 'hover:bg-accent/50' : 'hover:bg-blue-50';

                    return (
                      <tr key={idx} className={`${rowBgClass} ${hoverClass}`}>
                        <td className={`${styles.timeColumn} ${theme === 'dark' ? 'text-card-foreground border-r border-border' : 'text-gray-900 border-r border-gray-200'}`}>
                          {row.time}
                        </td>
                        {["mon", "tue", "wed", "thu", "fri", "sat"].map((day) => {
                          const entries = row[day] as any[];
                          return (
                            <td key={day} className={`${styles.dayColumn} ${theme === 'dark' ? 'text-card-foreground border-b border-border/50' : 'text-gray-900 border-b border-gray-200'}`}>
                              {entries && entries.length > 0 ?
                                entries.map((entry, eIdx) =>
                                  <div key={eIdx} className="mb-2 p-2 rounded bg-primary/10 border-l-4 border-primary">
                                    <div className={`font-semibold ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>{entry.subject}</div>
                                    <div className="text-[10px] font-bold text-primary">{entry.start_time.substring(0, 5)} - {entry.end_time.substring(0, 5)}</div>
                                    <div className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Room {entry.room}</div>
                                  </div>
                                ) :

                                <span className={theme === 'dark' ? 'text-muted-foreground/30' : 'text-gray-300'}>—</span>
                              }
                            </td>);

                        })}
                      </tr>);

                  })}
                </tbody>
              </table>
            </div> :

            <div className="p-6">
              <div className={`flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-accent/20 text-primary' : 'bg-primary/10 text-primary'} animate-pulse`}>
                  <Calendar className="w-12 h-12 opacity-80" />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Schedule Available</h3>
                <p className="max-w-xs text-base leading-relaxed">
                  Your <span className="font-semibold text-primary">weekly timetable</span> has not been scheduled yet. Please check back later or contact your department.
                </p>
              </div>
            </div>
        }
      </CardContent>
    </Card>);

};

export default StudentTimetable;