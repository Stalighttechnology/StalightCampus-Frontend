import { useCallback, useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { FaDownload } from 'react-icons/fa';
import { getTimetable, TimetableEntry } from '../../utils/faculty_api';
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable } from "@/components/ui/skeleton";

interface TimetableProps {
  role: string;
}

interface TimetableSlot {
  time: string;
  subject: string;
  faculty: string;
  room: string;
  section: string;
  semester: number;
  branch: string;
}

interface TimetableDay {
  day: string;
  slots: TimetableSlot[];
}

const timeSlots = [
  "09:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "11:15-12:15",
  "12:00-13:00",
  "12:15-13:15",
  "14:00-15:00",
  "15:00-16:00"
];

const Timetable = ({ role }: TimetableProps) => {
  const [timetableData, setTimetableData] = useState<TimetableDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    getTimetable()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          console.log('Backend timetable data:', res.data); // Debug log
          
          const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const dayMapping = {
            'MON': 'Monday',
            'TUE': 'Tuesday', 
            'WED': 'Wednesday',
            'THU': 'Thursday',
            'FRI': 'Friday',
            'SAT': 'Saturday'
          };
          
          const backendData: TimetableDay[] = daysOfWeek.map((day) => ({
            day,
            slots: res.data
              .filter((entry: TimetableEntry) => {
                const mappedDay = dayMapping[entry.day] || entry.day;
                return mappedDay === day;
              })
              .map((entry: TimetableEntry) => {
                return {
                  time: `${entry.start_time}-${entry.end_time}`,
                  subject: entry.subject,
                  // Show only semester and section as requested
                  faculty: `Sem ${entry.semester}, Sec ${entry.section}`,
                  room: entry.room,
                  section: entry.section,
                  semester: entry.semester,
                  branch: entry.branch
                };
              }),
          }));
          
          console.log('Transformed timetable data:', backendData); // Debug log
          setTimetableData(backendData);
        } else {
          setTimetableData([]);
        }
      })
      .catch((error) => {
        console.error('Error loading timetable:', error); // Debug log
        setError("Failed to load timetable")
      })
      .finally(() => setLoading(false));
  }, [role]);

  const filteredData = timetableData.map((day) => ({
    day: day.day,
    slots: day.slots,
  }));

  const exportPDF = useCallback(() => {
    const doc = new jsPDF("landscape");
    doc.setFontSize(14);
    doc.text(`1st Semester Timetable - ${role}`, 14, 15);

    const head = [["Time/Day", ...filteredData.map((d) => d.day)]];

    const body = timeSlots.map((time) => {
      const row = [time];
      for (const day of filteredData) {
        const slot = day.slots.find((s) => s.time === time);
        if (!slot) {
          row.push("Break");
        } else {
          row.push(`${slot.subject}\n${slot.faculty}\nRoom ${slot.room}`);
        }
      }
      return row;
    });

    autoTable(doc, {
      head,
      body,
      startY: 25,
      styles: {
        fontSize: 10,
        cellPadding: 3,
        halign: "center",
        valign: "middle",
      },
    });

    doc.save(`${role}_Timetable.pdf`);
  }, [filteredData, role]);

  return (
    <Card className={`shadow-xl ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
      <CardHeader className="flex flex-row items-center justify-between bg-card px-4 py-3 rounded-t-md">
        <CardTitle className="text-2xl font-semibold leading-none tracking-tight text-gray-900">Timetable - {role}</CardTitle>
        <div className="flex space-x-2">
          <Button 
            onClick={exportPDF} 
            className="hidden md:flex items-center mr-3 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out shadow-md"
          >
            <FaDownload />
            <span className="ml-2">Export PDF</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="bg-card">
        {loading ? (
          <SkeletonTable rows={8} cols={7} />
        ) : error ? (
          <div className={`text-center ${theme === 'dark' ? 'text-destructive' : 'text-red-600'}`}>{error}</div>
        ) : (
        <div className="overflow-x-auto">
          <table className={`min-w-full table-auto border-collapse text-sm ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>
            <thead>
              <tr className={theme === 'dark' ? 'bg-muted text-foreground' : 'bg-gray-100 text-gray-900'}>
                <th className={`border px-4 py-2 text-left ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>Time/Day</th>
                {filteredData.map((d) => (
                  <th key={d.day} className={`border px-4 py-2 ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>{d.day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time) => (
                <tr key={time}>
                  <td className={`border px-4 py-2 font-semibold ${theme === 'dark' ? 'border-border text-foreground' : 'border-gray-300 text-gray-900'}`}>{time}</td>
                  {filteredData.map((day) => {
                    const slot = day.slots.find((s) => s.time === time);
                    
                    return (
                      <td key={day.day + time} className={`border px-4 py-2 text-center ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>
                        {slot ? (
                          <>
                            <strong className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>{slot.subject}</strong><br />
                            <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>{slot.faculty}</span><br />
                            <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Room {slot.room}</span>
                          </>
                        ) : (
                          <span className={theme === 'dark' ? 'text-muted-foreground italic' : 'text-gray-500 italic'}>Break</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Timetable;