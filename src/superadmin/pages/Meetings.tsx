import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Calendar, Clock, Video, User, Briefcase, Mail, Phone, Target, Search, Filter } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

import { fetchWithSuperadminTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";

interface Meeting {
  id: number;
  name: string;
  company: string;
  designation: string;
  email: string;
  phone: string;
  purpose: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  meet_link: string;
  status: string;
}

export default function Meetings() {
  const { theme } = useTheme();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchWithSuperadminTokenRefresh(`${API_ENDPOINT}/chatbot/meetings/`)
      .then(res => res.json())
      .then(data => {
        setMeetings(data.meetings || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch meetings:", err);
        setLoading(false);
      });
  }, []);

  const filteredMeetings = meetings.filter((m) => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      m.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed": return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
      case "completed": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
      case "pending": return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
      default: return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    }
  };

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetchWithSuperadminTokenRefresh(`${API_ENDPOINT}/chatbot/meetings/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        setMeetings(meetings.map(m => m.id === id ? { ...m, status: newStatus } : m));
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meeting Schedules</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View incoming consultation bookings and scheduled demos from the last 24 hours.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
            <Input
              type="text"
              placeholder="Search by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 w-full sm:w-64"
            />
          </div>
          
          <div className="w-36 flex-shrink-0">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <SelectValue placeholder="All Statuses" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No meetings found</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">No scheduled meetings match your current filters.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 dark:bg-slate-800/50">
                <TableHead>Participant Details</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMeetings.map((meeting) => (
                <TableRow key={meeting.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                        {meeting.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">{meeting.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{meeting.designation} at {meeting.company}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex gap-2 mt-0.5">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3"/> {meeting.email}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-200 whitespace-nowrap">
                      {meeting.start_time ? format(parseISO(meeting.start_time), "MMM d, yyyy") : "N/A"}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 whitespace-nowrap">
                      {meeting.start_time ? format(parseISO(meeting.start_time), "h:mm a") : "N/A"} ({meeting.duration_minutes}m)
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-700 dark:text-gray-300 max-w-[200px] truncate" title={meeting.purpose}>
                      {meeting.purpose}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Select value={meeting.status} onValueChange={(val) => updateStatus(meeting.id, val)}>
                      <SelectTrigger className={`h-8 w-28 ml-auto ${getStatusColor(meeting.status)} rounded-full border-0`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
