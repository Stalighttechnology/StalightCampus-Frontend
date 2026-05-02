import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { CalendarDays, FileDown } from "lucide-react";
import { getTimetable, type TimetableEntry } from "@/utils/student_api";
import { useTheme } from "@/context/ThemeContext";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import styles from './StudentTimetable.module.css';

const StudentTimetable = () => {
  const [timetableData, setTimetableData] = useState<TimetableEntry[]>([]);
  const { theme } = useTheme();
  const tableRef = useRef<HTMLDivElement>(null);

  // Predefined time slots for the grid (9:00 AM to 5:00 PM)
  const timeSlots = [
    { start: "09:00", end: "10:00" },
    { start: "10:00", end: "11:00" },
    { start: "11:00", end: "12:00" },
    { start: "12:00", end: "13:00" },
    { start: "13:00", end: "14:00" },
    { start: "14:00", end: "15:00" },
    { start: "15:00", end: "16:00" },
    { start: "16:00", end: "17:00" },
  ];
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

  useEffect(() => {
    const fetchTimetable = async () => {
      const data = await getTimetable();
      if (data.success && Array.isArray(data.data)) {
        setTimetableData(data.data);
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

  const findTimetableEntry = (timetable: TimetableEntry[], start: string, end: string, day: string): TimetableEntry | undefined => {
    return timetable.find(
      (e) => e.start_time === start && e.end_time === end && e.day === day
    );
  };

  const createDayEntry = (entry: TimetableEntry | undefined): DayEntry | null => {
    if (!entry) return null;
    const subjectStr = typeof entry.subject === 'string' ? entry.subject : (entry.subject?.name || 'Unknown');
    return {
      subject: subjectStr,
      room: entry.room,
    };
  };

  const getTableData = () => {
    const timetable = Array.isArray(timetableData) ? timetableData : [];
    const tableData = timeSlots.map(({ start, end }) => {
      const row: TableRow = { time: `${start} - ${end}` };
      days.forEach((day) => {
        const entry = findTimetableEntry(timetable, start, end, day);
        const dayKey = day.toLowerCase() as keyof TableRow;
        row[dayKey] = createDayEntry(entry);
      });
      return row;
    });
    return tableData;
  };

  const exportToPDF = async () => {
    if (!tableRef.current) return;

    try {
      const canvas = await html2canvas(tableRef.current, {
        backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
        scale: 2,
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 280;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save('timetable.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <Card className={`${styles.card} ${theme === 'dark' ? 'bg-card text-card-foreground' : 'bg-white text-gray-900'}`}>
      <CardHeader className={`${styles.cardHeader} ${theme === 'dark' ? 'bg-card' : 'bg-white'}`}>
        <CardTitle className={`text-lg sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
          Timetable
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          className={`${styles.exportButton} bg-primary hover:bg-primary/90 text-white border-primary`}
          onClick={exportToPDF}
        >
          <FileDown className="w-4 h-4 mr-2" /> Export
        </Button>
      </CardHeader>

      <CardContent className={`p-0 ${styles.card}`}>
        <div
          ref={tableRef}
          className={`${styles.timetableContainer} ${theme === 'dark' ? 'bg-card text-card-foreground' : 'bg-white text-gray-900'}`}
        >
          <table className={styles.timetableTable}>
            <thead className={theme === 'dark' ? 'bg-muted' : 'bg-gray-50'}>
              <tr>
                <th className={`${styles.timeColumn} ${theme === 'dark' ? 'border-b border-border text-card-foreground' : 'border-b border-gray-200 text-gray-900'}`}>
                  Time
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className={`${styles.dayColumn} ${theme === 'dark' ? 'border-b border-border text-card-foreground' : 'border-b border-gray-200 text-gray-900'}`}
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {getTableData().map((row, idx) => {
                const isEvenRow = idx % 2 === 0;
                const rowBgLight = isEvenRow ? 'bg-white' : 'bg-gray-50';
                const rowBgDark = isEvenRow ? 'bg-card' : 'bg-muted/40';
                const rowBgClass = theme === 'dark' ? rowBgDark : rowBgLight;
                const hoverClass = theme === 'dark' ? 'hover:bg-accent/50' : 'hover:bg-blue-50';
                const slotKey = `time-${idx}`;

                return (
                  <tr
                    key={slotKey}
                    className={`${rowBgClass} ${hoverClass}`}
                  >
                    <td className={`${styles.timeColumn} ${theme === 'dark'
                        ? 'text-card-foreground border-r border-border'
                        : 'text-gray-900 border-r border-gray-200'
                      }`}>
                      {row.time}
                    </td>
                    {["mon", "tue", "wed", "thu", "fri", "sat"].map((day) => {
                      type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
                      const entryValue = row[day as DayKey];
                      const entry = (entryValue && typeof entryValue === 'object') ? entryValue : null;
                      const tdTextLight = 'text-gray-900 border-b border-gray-200';
                      const tdTextDark = 'text-card-foreground border-b border-border/50';
                      const tdTextClass = theme === 'dark' ? tdTextDark : tdTextLight;
                      const subjectColorLight = 'text-gray-900';
                      const subjectColorDark = 'text-card-foreground';
                      const subjectColor = theme === 'dark' ? subjectColorDark : subjectColorLight;
                      const roomColorLight = 'text-gray-600';
                      const roomColorDark = 'text-muted-foreground';
                      const roomColor = theme === 'dark' ? roomColorDark : roomColorLight;
                      const emptyColorLight = 'text-gray-300';
                      const emptyColorDark = 'text-muted-foreground/50';
                      const emptyColor = theme === 'dark' ? emptyColorDark : emptyColorLight;

                      return (
                        <td
                          key={day}
                          className={`${styles.dayColumn} ${tdTextClass}`}
                        >
                          {entry ? (
                            <div className={styles.cellContent}>
                              <div className={`${styles.subject} ${subjectColor}`}>
                                {entry.subject}
                              </div>
                              <div className={`${styles.room} ${roomColor}`}>
                                {entry.room}
                              </div>
                            </div>
                          ) : (
                            <span className={`${styles.emptyCell} ${emptyColor}`}>—</span>
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
      </CardContent>
    </Card>
  );
};

export default StudentTimetable;