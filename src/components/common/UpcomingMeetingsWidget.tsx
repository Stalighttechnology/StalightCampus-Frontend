import React, { useState, useEffect } from 'react';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { API_ENDPOINT } from '../../utils/config';
import { useTheme } from '../../context/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Video, Calendar, Clock, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { SkeletonCard } from '../ui/skeleton';

export default function UpcomingMeetingsWidget() {
  const { theme } = useTheme();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/meetings/`);
        if (res.ok) {
          const data = await res.json();
          // Filter out past meetings and show top 5
          const now = new Date();
          const upcoming = data.filter((m: any) => new Date(m.end_time) >= now);
          setMeetings(upcoming.slice(0, 5));
        }
      } catch (e) {
        console.error("Failed to fetch meetings for widget", e);
      } finally {
        setLoading(false);
      }
    };
    fetchMeetings();
  }, []);

  if (loading) {
    return <SkeletonCard className="h-64 w-full" />;
  }

  if (meetings.length === 0) {
    return null; // Don't show widget if there are no upcoming meetings
  }

  return (
    <Card className={`col-span-full mb-6 overflow-hidden ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white'}`}>
      <div className="bg-[#1a73e8] h-1.5 w-full"></div>
      <CardHeader className="pb-3 border-b">
        <CardTitle className="flex items-center text-lg">
          <Video className="w-5 h-5 mr-2 text-[#1a73e8]" />
          Upcoming Meetings
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {meetings.map(meeting => {
            const start = new Date(meeting.start_time);
            const end = new Date(meeting.end_time);
            const dateStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            
            return (
              <div key={meeting.id} className={`flex items-center justify-between p-4 transition-colors ${theme === 'dark' ? 'hover:bg-accent/50' : 'hover:bg-gray-50'}`}>
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="font-medium text-base truncate">{meeting.title}</h4>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center whitespace-nowrap"><Calendar className="w-3.5 h-3.5 mr-1" />{dateStr}</span>
                    <span className="flex items-center whitespace-nowrap"><Clock className="w-3.5 h-3.5 mr-1" />{timeStr}</span>
                  </div>
                </div>
                {meeting.google_meet_link && (
                  <Button 
                    size="sm" 
                    onClick={() => window.open(meeting.google_meet_link, '_blank')}
                    className="shrink-0 bg-[#1a73e8] hover:bg-[#1557b0] text-white"
                  >
                    Join
                    <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
