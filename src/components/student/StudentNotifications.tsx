import React, { useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Megaphone, Bell, BookOpen, Layers, Calendar, MapPin } from "lucide-react";
import { useStudentNotificationsQuery } from "@/hooks/useApiQueries";
import { useTheme } from "@/context/ThemeContext";
import { useVirtualizer } from '@tanstack/react-virtual';
import { SkeletonList } from "../ui/skeleton";
import { format, parseISO } from "date-fns";

interface Notification {
  id: number;
  title: string;
  message: string;
  created_at: string;
}

interface ParsedExamNotification {
  id: number;
  original: Notification;
  examName: string;
  subjectName: string;
  examType: string;
  dateStr: string;
  timeStr: string;
  venue: string;
  dateObj: Date;
}

interface ExamGroup {
  examName: string;
  examType: string;
  publishedBy: string;
  publishedAt: string;
  subjects: ParsedExamNotification[];
}

const parseNotifications = (notifications: Notification[]) => {
  const regular: Notification[] = [];
  const examGroupsMap: Record<string, ExamGroup> = {};

  notifications.forEach(n => {
    const titleMatch = n.title.match(/^New Exam Scheduled:\s*(.*)$/i);
    const msgMatch = n.message.match(/A new (.*?) has been scheduled for (.*?) at (.*?)\.\s*(?:Venue:\s*(.*?)\.?)?$/i);

    if (titleMatch && msgMatch) {
      const titleContent = titleMatch[1];
      let examName = titleContent;
      let subjectName = "General Subject";
      
      if (titleContent.includes(" - ")) {
        const parts = titleContent.split(" - ");
        examName = parts[0].trim();
        subjectName = parts.slice(1).join(" - ").trim();
      }

      const examType = msgMatch[1].trim();
      const dateStr = msgMatch[2].trim();
      const timeStr = msgMatch[3].trim();
      const venueStr = msgMatch[4]?.trim() || "TBD";
      
      let dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) {
        dateObj = new Date(); // fallback
      }

      if (!examGroupsMap[examName]) {
        examGroupsMap[examName] = {
          examName,
          examType,
          publishedAt: n.created_at,
          publishedBy: "Administrator", // Default if not parsed
          subjects: []
        };
      }

      examGroupsMap[examName].subjects.push({
        id: n.id,
        original: n,
        examName,
        subjectName,
        examType,
        dateStr,
        timeStr,
        venue: venueStr,
        dateObj
      });
    } else {
      regular.push(n);
    }
  });

  return {
    regular,
    examGroups: Object.values(examGroupsMap).sort((a, b) => {
      const timeA = new Date(a.publishedAt).getTime();
      const timeB = new Date(b.publishedAt).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    })
  };
};

const getExamWindowStr = (subjects: ParsedExamNotification[]) => {
  if (subjects.length === 0) return "N/A";
  const dates = subjects.map(s => s.dateObj.getTime()).sort((a, b) => a - b);
  const minDate = new Date(dates[0]);
  const maxDate = new Date(dates[dates.length - 1]);
  if (isNaN(minDate.getTime()) || isNaN(maxDate.getTime())) return "N/A";
  
  const minStr = format(minDate, "dd MMM yyyy");
  const maxStr = format(maxDate, "dd MMM yyyy");
  if (minStr === maxStr) return minStr;
  return `${format(minDate, "dd MMM")} - ${maxStr}`;
};

const groupByDate = (subjects: ParsedExamNotification[]) => {
  const grouped: Record<string, ParsedExamNotification[]> = {};
  const sorted = [...subjects].sort((a, b) => {
    if (a.dateObj.getTime() !== b.dateObj.getTime()) {
      return a.dateObj.getTime() - b.dateObj.getTime();
    }
    return a.timeStr.localeCompare(b.timeStr);
  });
  
  sorted.forEach(s => {
    const key = isNaN(s.dateObj.getTime()) ? "Unknown Date" : format(s.dateObj, "yyyy-MM-dd");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });
  return grouped;
};

const ExamNotificationCard = ({ exam, theme }: { exam: ExamGroup, theme: string }) => {
  const dateGroups = groupByDate(exam.subjects);
  const publishedDate = new Date(exam.publishedAt);
  const isValidPublishedDate = !isNaN(publishedDate.getTime());
  
  return (
    <Card className={`mb-4 overflow-hidden border ${theme === 'dark' ? 'border-border bg-card' : 'border-blue-100 bg-white'} shadow-sm`}>
      <CardHeader className={`${theme === 'dark' ? 'bg-muted/30' : 'bg-blue-50/50'} pb-4`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">{exam.examName}</CardTitle>
            </div>
            <CardDescription className="flex items-center gap-2 text-sm mt-2">
              <span>Published by: {exam.publishedBy}</span>
              {isValidPublishedDate && (
                <>
                  <span>•</span>
                  <span>Published: {format(publishedDate, "dd MMM yyyy, hh:mm a")}</span>
                </>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="h-7 px-3 gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold">View Schedule</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">{exam.examName} Schedule</DialogTitle>
                </DialogHeader>
                <div className={`mt-4 border rounded-md overflow-hidden ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                  {Object.entries(dateGroups).map(([dateStr, subjects]) => (
                    <div key={dateStr} className={`border-b last:border-b-0 ${theme === 'dark' ? 'border-border' : 'border-gray-100'}`}>
                      <div className={`sticky top-0 px-4 py-2 backdrop-blur-sm border-b font-medium text-sm flex items-center gap-2 z-10 ${theme === 'dark' ? 'bg-muted/60 border-border text-muted-foreground' : 'bg-gray-50/90 border-gray-100 text-gray-500'}`}>
                        <Calendar className="h-4 w-4" />
                        {dateStr === "Unknown Date" ? dateStr : format(parseISO(dateStr), "dd MMM yyyy")}
                      </div>
                      <div className="p-4 space-y-4">
                        {(subjects as any[]).map(sub => (
                          <div key={sub.id} className="flex gap-4 px-2 sm:px-4">
                            <div className={`w-24 shrink-0 text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'} pt-0.5`}>
                              {sub.timeStr}
                            </div>
                            <div className={`flex-1 space-y-1 border-l-2 pl-4 ${theme === 'dark' ? 'border-blue-800' : 'border-blue-200'}`}>
                              <p className={`font-medium leading-none ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>{sub.subjectName}</p>
                              <p className={`text-sm flex items-center gap-1 mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                <MapPin className="h-3 w-3" />
                                Venue: {sub.venue}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Badge variant="outline" className={`${theme === 'dark' ? 'bg-blue-900/30 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>
              {exam.examType}
            </Badge>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">Total Subjects Scheduled:</span>
            <span className={theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}>{exam.subjects.length}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">Exam Window:</span>
            <span className={theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}>{getExamWindowStr(exam.subjects)}</span>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

const VirtualizedNotificationsList = React.memo(({ 
  notifications, 
  theme 
}: { 
  notifications: Notification[]; 
  theme: string 
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: notifications.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated notification item height
    overscan: 3,
  });

  if (notifications.length === 0) {
    return (
      <div className={`text-center py-8 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
        <Bell className="mx-auto h-8 w-8 mb-2" />
        <p>No notifications available</p>
      </div>
    );
  }

  return (
    <div 
      ref={parentRef} 
      className="h-96 overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div 
        style={{ 
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = notifications[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              className={`rounded-lg border p-4 transition-colors ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-200 hover:bg-gray-50'}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <h3 className={`font-medium ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>{item.title}</h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    {item.message}
                  </p>
                </div>
                <Badge variant="secondary" className={`text-xs shrink-0 ${theme === 'dark' ? 'bg-muted text-muted-foreground' : 'bg-gray-100 text-gray-800'}`}>
                  New
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const StudentNotifications = () => {
  const { theme } = useTheme();
  const { data: notificationsResponse, isLoading, error } = useStudentNotificationsQuery();

  const notifications = notificationsResponse?.notifications || [];

  const { regular, examGroups } = useMemo(() => parseNotifications(notifications), [notifications]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              <CardTitle className={theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}>Notifications</CardTitle>
            </div>
            <CardDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>
              View all recent updates from your institution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SkeletonList items={5} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="text-red-500">Error loading notifications</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {examGroups.length > 0 && (
        <div className="space-y-4">
          <h2 className={`text-lg font-semibold px-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Exam Schedules
          </h2>
          {examGroups.map(exam => (
            <ExamNotificationCard key={exam.examName} exam={exam} theme={theme} />
          ))}
        </div>
      )}

      {(regular.length > 0 || examGroups.length === 0) && (
        <Card className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              <CardTitle className={theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}>
                {examGroups.length > 0 ? 'Other Notifications' : 'Notifications'}
              </CardTitle>
            </div>
            <CardDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>
              View all recent updates from your institution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VirtualizedNotificationsList notifications={regular} theme={theme} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentNotifications;