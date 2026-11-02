import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { format, parse, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Building2,
  Calendar,
  Clock,
  Users,
  Tv,
  Volume2,
  ListChecks,
  Shirt,
  Accessibility,
  DoorClosed,
  HeartPulse,
  ShieldCheck,
  Zap,
  Wifi,
  Droplets,
  Radio,
  Mic,
  Wind,
  Plus,
  Search,
  CheckCircle2,
  Check,
  Loader2,
  ImageIcon,
  XCircle,
  AlertTriangle,
  Send,
  Eye,
  Info,
  CalendarDays,
  ShieldAlert,
} from "lucide-react";
import {
  Auditorium,
  AuditoriumBooking,
  AUDITORIUM_FACILITIES,
  BookedSlot,
  getAuditoriums,
  getAuditoriumAvailability,
  getAuditoriumBookings,
  createAuditoriumBooking,
  cancelAuditoriumBooking,
} from "@/utils/auditorium_api";

// Helper: Convert 12-hour components (Hour: 01-12, Minute: 00-55, Period: AM/PM) to 24-hour "HH:MM"
const to24Hour = (hour: string, minute: string, period: string): string => {
  let h = parseInt(hour, 10);
  if (isNaN(h)) h = 12;
  if (period === "AM") {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return `${String(h).padStart(2, "0")}:${minute.padStart(2, "0")}`;
};

// Helper: Convert "HH:MM" (or "HH:MM:SS") to 12-hour formatted string "hh:mm AM/PM"
const format12Hour = (time24?: string): string => {
  if (!time24) return "--:--";
  const parts = time24.split(":");
  let h = parseInt(parts[0], 10);
  const m = parts[1] || "00";
  if (isNaN(h)) return time24;
  const period = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${String(h).padStart(2, "0")}:${m} ${period}`;
};

// Helper: Format YYYY-MM-DD to DD-MM-YYYY
const formatDateDisplay = (dateStr?: string): string => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, "dd-MM-yyyy");
  } catch {
    return dateStr;
  }
};

const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES_OPTIONS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

export const HODAuditoriumBooking: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"book" | "my-bookings">("book");

  // ================= AUDITORIUMS LIST ================= //
  const [availableAuditoriums, setAvailableAuditoriums] = useState<Auditorium[]>([]);
  const [loadingAuditoriums, setLoadingAuditoriums] = useState(false);
  const [selectedAuditoriumId, setSelectedAuditoriumId] = useState<string>("");

  const selectedAuditorium = useMemo(
    () => availableAuditoriums.find((a) => String(a.id) === selectedAuditoriumId),
    [availableAuditoriums, selectedAuditoriumId]
  );

  // ================= FORM STATE ================= //
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  // 12-Hour Dropdowns State (defaults to 12:00 PM - 01:00 PM)
  const [startHour, setStartHour] = useState("12");
  const [startMinute, setStartMinute] = useState("00");
  const [startPeriod, setStartPeriod] = useState<"AM" | "PM">("PM");

  const [endHour, setEndHour] = useState("01");
  const [endMinute, setEndMinute] = useState("00");
  const [endPeriod, setEndPeriod] = useState<"AM" | "PM">("PM");

  const [eventName, setEventName] = useState("");
  const [eventPurpose, setEventPurpose] = useState("");
  const [requiredCapacity, setRequiredCapacity] = useState<number>(100);
  const [expectedAttendees, setExpectedAttendees] = useState<number>(100);

  const [neededFacilities, setNeededFacilities] = useState<Record<string, boolean>>({
    need_ac: true,
    need_sound_system: true,
    need_projector: true,
    need_stage_lighting: false,
    need_drinking_water: true,
    need_restrooms: true,
    need_live_streaming: false,
    need_security_cctv: true,
    need_first_aid: false,
    need_wifi: true,
    need_power_backup: true,
    need_podium_mic: true,
    need_green_room: false,
    need_wheelchair_access: false,
    need_parking: false,
  });

  const toggleNeededFacility = (key: string) => {
    setNeededFacilities((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  const [reasonAndRequirements, setReasonAndRequirements] = useState("");

  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Selected auditorium active preview image index
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);

  // Derived 24-hr values for API comparison and backend payload
  const startTime24 = useMemo(() => to24Hour(startHour, startMinute, startPeriod), [startHour, startMinute, startPeriod]);
  const endTime24 = useMemo(() => to24Hour(endHour, endMinute, endPeriod), [endHour, endMinute, endPeriod]);

  // Live booked slots preview
  const [daySchedule, setDaySchedule] = useState<BookedSlot[]>([]);
  const [loadingDaySchedule, setLoadingDaySchedule] = useState(false);

  // ================= MY BOOKINGS STATE ================= //
  const [myBookings, setMyBookings] = useState<AuditoriumBooking[]>([]);
  const [loadingMyBookings, setLoadingMyBookings] = useState(false);
  const [myBookingsSearch, setMyBookingsSearch] = useState("");
  const [debouncedMyBookingsSearch, setDebouncedMyBookingsSearch] = useState("");
  const [myBookingsStatusFilter, setMyBookingsStatusFilter] = useState("ALL");
  const [myBookingsPage, setMyBookingsPage] = useState(1);
  const [totalMyBookingPages, setTotalMyBookingPages] = useState(1);
  const [totalMyBookingsCount, setTotalMyBookingsCount] = useState(0);

  // Debounce search state (350ms) to prevent network spam on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMyBookingsSearch(myBookingsSearch);
    }, 350);
    return () => clearTimeout(timer);
  }, [myBookingsSearch]);

  // Detail Modal
  const [detailBooking, setDetailBooking] = useState<AuditoriumBooking | null>(null);

  // Request sequence tracking to discard stale out-of-order network responses
  const myBookingsReqSeq = useRef(0);
  const availabilityReqSeq = useRef(0);

  // ================= FETCH AUDITORIUMS ================= //
  const fetchAuditoriums = useCallback(async () => {
    setLoadingAuditoriums(true);
    try {
      const response = await getAuditoriums({ all: true, status: "available" });
      const list =
        "data" in response && Array.isArray(response.data)
          ? response.data
          : "results" in response
          ? response.results
          : [];
      setAvailableAuditoriums(list);

      // Functional updater avoids selectedAuditoriumId in dependency array, eliminating duplicate call loops
      setSelectedAuditoriumId((prev) => (!prev && list.length > 0 ? String(list[0].id) : prev));
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to load auditoriums",
        description: err.message || "Please refresh and try again.",
      });
    } finally {
      setLoadingAuditoriums(false);
    }
  }, [toast]);

  // Check availability
  const checkDayAvailability = useCallback(async (auditoriumId: number, dateStr: string) => {
    if (!auditoriumId || !dateStr) return;
    const seq = ++availabilityReqSeq.current;
    setLoadingDaySchedule(true);
    try {
      const res = await getAuditoriumAvailability(auditoriumId, dateStr);
      if (seq !== availabilityReqSeq.current) return;
      setDaySchedule(res.booked_slots || []);
    } catch {
      if (seq !== availabilityReqSeq.current) return;
      setDaySchedule([]);
    } finally {
      if (seq === availabilityReqSeq.current) {
        setLoadingDaySchedule(false);
      }
    }
  }, []);

  // Fetch auditoriums list exactly once on initial mount
  useEffect(() => {
    fetchAuditoriums();
  }, [fetchAuditoriums]);

  // Check schedule only when active tab is 'book' and valid auditorium & date are selected
  useEffect(() => {
    if (activeTab === "book" && selectedAuditoriumId && bookingDate) {
      checkDayAvailability(Number(selectedAuditoriumId), bookingDate);
    }
  }, [activeTab, selectedAuditoriumId, bookingDate, checkDayAvailability]);

  // ================= FETCH MY BOOKINGS ================= //
  const fetchMyBookingsList = useCallback(async () => {
    const seq = ++myBookingsReqSeq.current;
    setLoadingMyBookings(true);
    try {
      const response = await getAuditoriumBookings({
        status: myBookingsStatusFilter,
        search: debouncedMyBookingsSearch,
        page: myBookingsPage,
        page_size: 10,
      });

      if (seq !== myBookingsReqSeq.current) return;

      setMyBookings(response.results);
      setTotalMyBookingPages(response.total_pages || 1);
      setTotalMyBookingsCount(response.count || 0);
    } catch (err: any) {
      if (seq !== myBookingsReqSeq.current) return;
      toast({
        variant: "destructive",
        title: "Error fetching bookings",
        description: err.message || "Failed to load your booking history.",
      });
    } finally {
      if (seq === myBookingsReqSeq.current) {
        setLoadingMyBookings(false);
      }
    }
  }, [myBookingsStatusFilter, debouncedMyBookingsSearch, myBookingsPage, toast]);

  // Fetch bookings only when active tab is 'my-bookings'
  useEffect(() => {
    if (activeTab === "my-bookings") {
      fetchMyBookingsList();
    }
  }, [activeTab, fetchMyBookingsList]);

  // Conflict evaluation against current selected 12-hr slot
  const isSlotConflicting = useMemo(() => {
    if (startTime24 >= endTime24) return false;
    return daySchedule.some(
      (slot) =>
        slot.status === "APPROVED" &&
        slot.start_time < endTime24 &&
        slot.end_time > startTime24
    );
  }, [daySchedule, startTime24, endTime24]);

  // ================= SUBMISSION ================= //
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAuditoriumId) {
      toast({
        variant: "destructive",
        title: "Auditorium Required",
        description: "Please select an auditorium venue.",
      });
      return;
    }

    if (!eventName.trim() || !eventPurpose.trim()) {
      toast({
        variant: "destructive",
        title: "Mandatory Fields Missing",
        description: "Please provide both event name and event purpose.",
      });
      return;
    }

    if (startTime24 >= endTime24) {
      toast({
        variant: "destructive",
        title: "Invalid Timing",
        description: `Start time (${format12Hour(startTime24)}) must be before end time (${format12Hour(endTime24)}).`,
      });
      return;
    }

    if (selectedAuditorium && expectedAttendees > selectedAuditorium.max_capacity) {
      toast({
        variant: "destructive",
        title: "Capacity Exceeded",
        description: `Expected attendees (${expectedAttendees}) exceeds the venue's max capacity (${selectedAuditorium.max_capacity} seats).`,
      });
      return;
    }

    if (isSlotConflicting) {
      toast({
        variant: "destructive",
        title: "Slot Conflict Detected",
        description: "An approved booking already occupies this time slot. Please pick another time or date.",
      });
      return;
    }

    setSubmittingBooking(true);
    try {
      const payload = {
        auditorium: Number(selectedAuditoriumId),
        event_name: eventName.trim(),
        event_purpose: eventPurpose.trim(),
        required_capacity: requiredCapacity,
        expected_attendees: expectedAttendees,
        booking_date: bookingDate,
        start_time: startTime24,
        end_time: endTime24,
        need_ac: !!neededFacilities.need_ac,
        need_sound_system: !!neededFacilities.need_sound_system,
        need_projector: !!neededFacilities.need_projector,
        need_stage_lighting: !!neededFacilities.need_stage_lighting,
        need_drinking_water: !!neededFacilities.need_drinking_water,
        need_restrooms: !!neededFacilities.need_restrooms,
        need_live_streaming: !!neededFacilities.need_live_streaming,
        need_security_cctv: !!neededFacilities.need_security_cctv,
        need_first_aid: !!neededFacilities.need_first_aid,
        need_wifi: !!neededFacilities.need_wifi,
        need_power_backup: !!neededFacilities.need_power_backup,
        need_podium_mic: !!neededFacilities.need_podium_mic,
        need_green_room: !!neededFacilities.need_green_room,
        need_wheelchair_access: !!neededFacilities.need_wheelchair_access,
        need_parking: !!neededFacilities.need_parking,
        reason_and_requirements: reasonAndRequirements.trim(),
      };

      await createAuditoriumBooking(payload);

      toast({
        title: "Request Submitted Successfully",
        description: `Auditorium booking for '${eventName}' submitted for Admin/Principal approval.`,
      });

      // Clear form
      setEventName("");
      setEventPurpose("");
      setReasonAndRequirements("");
      setActiveTab("my-bookings");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: err.message || "Failed to submit booking request.",
      });
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleCancelBooking = async (booking: AuditoriumBooking) => {
    if (!window.confirm(`Are you sure you want to cancel '${booking.event_name}'?`)) return;

    try {
      await cancelAuditoriumBooking(booking.id);
      toast({
        title: "Booking Cancelled",
        description: `Booking for '${booking.event_name}' has been cancelled.`,
      });
      fetchMyBookingsList();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Cancellation Error",
        description: err.message || "Failed to cancel booking.",
      });
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-3 sm:p-5 md:p-6 max-w-7xl mx-auto">
      {/* App-like Responsive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />
            <span>Auditorium Booking</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Reserve campus halls for seminars, guest lectures, and department events.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "book" | "my-bookings")}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-2 w-full sm:w-[360px] h-11 p-1 bg-muted/60 rounded-xl">
          <TabsTrigger value="book" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium rounded-lg">
            <Plus className="h-4 w-4" />
            <span>New Booking</span>
          </TabsTrigger>
          <TabsTrigger value="my-bookings" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium rounded-lg">
            <Calendar className="h-4 w-4" />
            <span>My Bookings ({totalMyBookingsCount})</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: NEW BOOKING */}
        <TabsContent value="book" className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Form Column */}
            <Card className="lg:col-span-2 shadow-sm rounded-xl border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  <span>Event Reservation Form</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Select your venue, timing, attendee count, and facilities.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmitBooking} className="space-y-5">
                  {/* 1. Venue Dropdown */}
                  <div className="space-y-2">
                    <Label htmlFor="venue" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-foreground">
                      <Building2 className="h-4 w-4 text-primary" />
                      Auditorium Venue <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={selectedAuditoriumId}
                      onValueChange={(val) => setSelectedAuditoriumId(val)}
                      disabled={loadingAuditoriums || availableAuditoriums.length === 0}
                    >
                      <SelectTrigger id="venue" className="w-full h-11 px-3 text-sm rounded-lg">
                        <SelectValue placeholder="Choose an auditorium..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAuditoriums.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)} className="text-sm py-2">
                            {item.name} ({item.location}) &mdash; {item.max_capacity} Seats
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 2. Event Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t">
                    <div className="space-y-1.5 sm:col-span-2 pt-2">
                      <Label htmlFor="event_name" className="text-xs sm:text-sm font-semibold">
                        Event Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="event_name"
                        placeholder="e.g. AI Innovation Summit 2026"
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                        className="h-10 sm:h-11 text-sm rounded-lg"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="event_purpose" className="text-xs sm:text-sm font-semibold">
                        Purpose of Event <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="event_purpose"
                        placeholder="e.g. Technical Seminar, Guest Lecture, Workshop"
                        value={eventPurpose}
                        onChange={(e) => setEventPurpose(e.target.value)}
                        className="h-10 sm:h-11 text-sm rounded-lg"
                        required
                      />
                    </div>
                  </div>

                  {/* 3. Date & 12-Hour Time Format Dropdown Pickers */}
                  <div className="space-y-4 pt-2 border-t">
                    <Label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-foreground">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      Date & 12-Hour Time Selection <span className="text-destructive">*</span>
                    </Label>

                    {/* Date Picker using Shadcn Popover & Calendar */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Event Date</Label>
                      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full h-11 justify-start text-left font-normal px-3.5 rounded-lg border",
                              !bookingDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4 text-primary shrink-0" />
                            <span className="text-sm font-medium">
                              {bookingDate ? formatDateDisplay(bookingDate) : "Select Date (DD-MM-YYYY)"}
                            </span>
                            <Badge variant="secondary" className="ml-auto text-[11px] font-normal py-0">
                              DD-MM-YYYY
                            </Badge>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-xl shadow-xl z-50" align="start">
                          <ShadcnCalendar
                            mode="single"
                            selected={bookingDate ? new Date(bookingDate) : undefined}
                            onSelect={(d) => {
                              if (d) {
                                setBookingDate(format(d, "yyyy-MM-dd"));
                                setIsCalendarOpen(false);
                              }
                            }}
                            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Start Time & End Time using 12-Hour Format Dropdowns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Start Time */}
                      <div className="space-y-1.5 bg-muted/20 p-3 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold flex items-center gap-1 text-foreground">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            Start Time <span className="text-destructive">*</span>
                          </Label>
                          <Badge variant="outline" className="text-[11px] font-mono text-primary font-semibold">
                            {format12Hour(startTime24)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          {/* Hour */}
                          <Select value={startHour} onValueChange={setStartHour}>
                            <SelectTrigger className="h-10 text-xs px-2 font-medium">
                              <SelectValue placeholder="Hour" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[220px]">
                              {HOURS_12.map((h) => (
                                <SelectItem key={h} value={h} className="text-xs">
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Minute */}
                          <Select value={startMinute} onValueChange={setStartMinute}>
                            <SelectTrigger className="h-10 text-xs px-2 font-medium">
                              <SelectValue placeholder="Min" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[220px]">
                              {MINUTES_OPTIONS.map((m) => (
                                <SelectItem key={m} value={m} className="text-xs">
                                  :{m}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* AM/PM */}
                          <Select value={startPeriod} onValueChange={(val: "AM" | "PM") => setStartPeriod(val)}>
                            <SelectTrigger className="h-10 text-xs px-2 font-semibold">
                              <SelectValue placeholder="AM/PM" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM" className="text-xs font-medium">AM</SelectItem>
                              <SelectItem value="PM" className="text-xs font-medium">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* End Time */}
                      <div className="space-y-1.5 bg-muted/20 p-3 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold flex items-center gap-1 text-foreground">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            End Time <span className="text-destructive">*</span>
                          </Label>
                          <Badge variant="outline" className="text-[11px] font-mono text-primary font-semibold">
                            {format12Hour(endTime24)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          {/* Hour */}
                          <Select value={endHour} onValueChange={setEndHour}>
                            <SelectTrigger className="h-10 text-xs px-2 font-medium">
                              <SelectValue placeholder="Hour" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[220px]">
                              {HOURS_12.map((h) => (
                                <SelectItem key={h} value={h} className="text-xs">
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Minute */}
                          <Select value={endMinute} onValueChange={setEndMinute}>
                            <SelectTrigger className="h-10 text-xs px-2 font-medium">
                              <SelectValue placeholder="Min" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[220px]">
                              {MINUTES_OPTIONS.map((m) => (
                                <SelectItem key={m} value={m} className="text-xs">
                                  :{m}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* AM/PM */}
                          <Select value={endPeriod} onValueChange={(val: "AM" | "PM") => setEndPeriod(val)}>
                            <SelectTrigger className="h-10 text-xs px-2 font-semibold">
                              <SelectValue placeholder="AM/PM" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM" className="text-xs font-medium">AM</SelectItem>
                              <SelectItem value="PM" className="text-xs font-medium">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Timing validation warning */}
                    {startTime24 >= endTime24 && (
                      <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>Start time ({format12Hour(startTime24)}) must be strictly before end time ({format12Hour(endTime24)}).</span>
                      </div>
                    )}
                  </div>

                  {/* 4. Capacity & Attendees */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                    <div className="space-y-1.5">
                      <Label htmlFor="required_capacity" className="text-xs sm:text-sm font-semibold">
                        Required Seating Capacity <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="required_capacity"
                        type="number"
                        min={1}
                        value={requiredCapacity}
                        onChange={(e) => setRequiredCapacity(parseInt(e.target.value, 10) || 0)}
                        className="h-10 sm:h-11 text-sm rounded-lg"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="expected_attendees" className="text-xs sm:text-sm font-semibold">
                        Expected Number of Attendees <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="expected_attendees"
                        type="number"
                        min={1}
                        value={expectedAttendees}
                        onChange={(e) => setExpectedAttendees(parseInt(e.target.value, 10) || 0)}
                        className="h-10 sm:h-11 text-sm rounded-lg"
                        required
                      />
                      {selectedAuditorium && expectedAttendees > selectedAuditorium.max_capacity && (
                        <p className="text-xs text-destructive font-medium">
                          Attendees exceed venue maximum capacity ({selectedAuditorium.max_capacity}).
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 5. Comprehensive Categorized Facilities Selection */}
                  <div className="space-y-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-foreground">
                          <ListChecks className="h-4 w-4 text-primary" />
                          Facilities & Equipment Required
                        </Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Select the facilities you require for your event. Venue support status is indicated for each.
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[11px] font-semibold">
                        {AUDITORIUM_FACILITIES.filter((f) => neededFacilities[f.needKey]).length} Requested
                      </Badge>
                    </div>

                    <div className="space-y-3 border rounded-xl p-3.5 bg-muted/10">
                      {/* Audio-Visual & Staging */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-primary uppercase tracking-wide flex items-center gap-1">
                          <Volume2 className="h-3 w-3" /> Audio-Visual & Staging
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {AUDITORIUM_FACILITIES.filter((f) => f.category === 'av').map((f) => {
                            const isRequested = !!neededFacilities[f.needKey];
                            const isEquipped = selectedAuditorium ? !!selectedAuditorium[f.hasKey] : false;
                            return (
                              <label
                                key={f.id}
                                className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                                  isRequested
                                    ? "bg-primary/5 border-primary/40 text-foreground"
                                    : "bg-background border-border/60 hover:bg-muted/30 text-muted-foreground"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isRequested}
                                  onChange={() => toggleNeededFacility(f.needKey as string)}
                                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 mt-0.5 shrink-0"
                                />
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <p className="text-xs font-semibold leading-tight text-foreground">{f.label}</p>
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] px-1 py-0 shrink-0 font-normal ${
                                        isEquipped
                                          ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300"
                                          : "text-muted-foreground border-dashed"
                                      }`}
                                    >
                                      {isEquipped ? "Available" : "Not equipped"}
                                    </Badge>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground line-clamp-1">{f.description}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Utilities & Campus Essentials */}
                      <div className="space-y-1.5 pt-1 border-t">
                        <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide flex items-center gap-1">
                          <Droplets className="h-3 w-3" /> Utilities & Campus Essentials
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {AUDITORIUM_FACILITIES.filter((f) => f.category === 'essential').map((f) => {
                            const isRequested = !!neededFacilities[f.needKey];
                            const isEquipped = selectedAuditorium ? !!selectedAuditorium[f.hasKey] : false;
                            return (
                              <label
                                key={f.id}
                                className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                                  isRequested
                                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-foreground"
                                    : "bg-background border-border/60 hover:bg-muted/30 text-muted-foreground"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isRequested}
                                  onChange={() => toggleNeededFacility(f.needKey as string)}
                                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 mt-0.5 shrink-0"
                                />
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <p className="text-xs font-semibold leading-tight text-foreground">{f.label}</p>
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] px-1 py-0 shrink-0 font-normal ${
                                        isEquipped
                                          ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300"
                                          : "text-muted-foreground border-dashed"
                                      }`}
                                    >
                                      {isEquipped ? "Available" : "Not equipped"}
                                    </Badge>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground line-clamp-1">{f.description}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Safety, Comfort & Accessibility */}
                      <div className="space-y-1.5 pt-1 border-t">
                        <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wide flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> Safety, Comfort & Accessibility
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {AUDITORIUM_FACILITIES.filter((f) => f.category === 'safety_comfort').map((f) => {
                            const isRequested = !!neededFacilities[f.needKey];
                            const isEquipped = selectedAuditorium ? !!selectedAuditorium[f.hasKey] : false;
                            return (
                              <label
                                key={f.id}
                                className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                                  isRequested
                                    ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-foreground"
                                    : "bg-background border-border/60 hover:bg-muted/30 text-muted-foreground"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isRequested}
                                  onChange={() => toggleNeededFacility(f.needKey as string)}
                                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 mt-0.5 shrink-0"
                                />
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <p className="text-xs font-semibold leading-tight text-foreground">{f.label}</p>
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] px-1 py-0 shrink-0 font-normal ${
                                        isEquipped
                                          ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300"
                                          : "text-muted-foreground border-dashed"
                                      }`}
                                    >
                                      {isEquipped ? "Available" : "Not equipped"}
                                    </Badge>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground line-clamp-1">{f.description}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <Label htmlFor="requirements" className="text-xs sm:text-sm font-semibold">
                        Reason / Additional Requirements
                      </Label>
                      <Textarea
                        id="requirements"
                        placeholder="Detail VIP seating, podium microphone, banner hooks, or special setup instructions..."
                        value={reasonAndRequirements}
                        onChange={(e) => setReasonAndRequirements(e.target.value)}
                        rows={3}
                        className="text-sm rounded-lg resize-none"
                      />
                    </div>
                  </div>

                  {/* Submission Row */}
                  <div className="pt-3 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      {isSlotConflicting ? (
                        <span className="text-destructive font-medium flex items-center gap-1">
                          <ShieldAlert className="h-4 w-4" /> Conflict on selected slot!
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" /> Slot is free for {formatDateDisplay(bookingDate)}
                        </span>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={submittingBooking || !selectedAuditoriumId || isSlotConflicting || startTime24 >= endTime24}
                      className="gap-2 h-11 px-6 shadow-sm rounded-lg font-medium"
                    >
                      {submittingBooking ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" /> Submit Booking Request
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Right Column: Venue Details & 12-Hour Schedule Preview */}
            <div className="space-y-5">
              {/* Venue Preview Card with Auditorium Images Showcase */}
              {selectedAuditorium ? (
                <Card className="rounded-xl border shadow-sm bg-gradient-to-br from-primary/5 via-card to-background overflow-hidden">
                  {/* Photo Showcase (Cloudflare R2) */}
                  <div className="relative h-44 w-full bg-muted/40 border-b overflow-hidden">
                    {selectedAuditorium.images && selectedAuditorium.images.length > 0 ? (
                      <>
                        <img
                          src={selectedAuditorium.images[activeImageIdx] || selectedAuditorium.images[0]}
                          alt={selectedAuditorium.name}
                          className="w-full h-full object-cover transition-all duration-300"
                        />
                        <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          {selectedAuditorium.images.length} {selectedAuditorium.images.length === 1 ? "photo" : "photos"}
                        </span>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50 bg-gradient-to-br from-muted/30 to-muted/70">
                        <Building2 className="h-10 w-10 mb-1 opacity-40 text-primary" />
                        <span className="text-[11px] font-medium">No photos uploaded for this hall</span>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Row if Multiple Images */}
                  {selectedAuditorium.images && selectedAuditorium.images.length > 1 && (
                    <div className="flex gap-2 p-2 bg-muted/20 border-b overflow-x-auto">
                      {selectedAuditorium.images.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImageIdx(idx)}
                          className={`relative h-11 w-16 rounded-md overflow-hidden border-2 shrink-0 transition-all ${
                            activeImageIdx === idx
                              ? "border-primary shadow-xs ring-1 ring-primary"
                              : "border-transparent opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  <CardHeader className="pb-3 pt-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base sm:text-lg font-bold">{selectedAuditorium.name}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{selectedAuditorium.location}</CardDescription>
                      </div>
                      <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300 text-xs">
                        Available
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background border text-xs sm:text-sm">
                      <Users className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">Venue Capacity:</span>
                      <span className="font-bold text-foreground">{selectedAuditorium.max_capacity} Seats</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">Venue Facilities</span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {AUDITORIUM_FACILITIES.filter((f) => selectedAuditorium[f.hasKey]).length} active
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {AUDITORIUM_FACILITIES.map((f) => {
                          const isAvailable = !!selectedAuditorium[f.hasKey];
                          if (!isAvailable) return null;
                          return (
                            <Badge
                              key={f.id}
                              variant="outline"
                              className="text-[11px] font-normal py-0.5 px-2 bg-background border-primary/20 text-foreground flex items-center gap-1 shadow-2xs"
                            >
                              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                              <span>{f.shortLabel}</span>
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    {selectedAuditorium.other_facilities && (
                      <p className="text-xs text-muted-foreground pt-1 border-t">
                        <span className="font-semibold text-foreground">Amenities:</span> {selectedAuditorium.other_facilities}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="rounded-xl">
                  <CardContent className="p-6 text-center text-muted-foreground text-xs sm:text-sm">
                    Select an auditorium to view venue capacity and features.
                  </CardContent>
                </Card>
              )}

              {/* Day's Schedule in 12-Hour Format */}
              <Card className="rounded-xl border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>Schedule for {formatDateDisplay(bookingDate)}</span>
                    </CardTitle>
                    <Badge variant="secondary" className="text-[10px] font-mono">12-Hour Format</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Existing bookings on this date to prevent timing clashes.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-2 text-xs">
                  {loadingDaySchedule ? (
                    <div className="py-6 text-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1 text-primary" />
                      Checking schedule...
                    </div>
                  ) : daySchedule.length === 0 ? (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>Entire day is currently clear. No conflicts!</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {daySchedule.map((slot) => {
                        const isApproved = slot.status === "APPROVED";
                        return (
                          <div
                            key={slot.id}
                            className={`p-2.5 rounded-lg border flex flex-col gap-1 ${
                              isApproved
                                ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-300"
                                : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300"
                            }`}
                          >
                            <div className="flex items-center justify-between font-semibold">
                              <span className="truncate">{slot.event_name}</span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] py-0 shrink-0 ${
                                  isApproved ? "border-red-400 text-red-700" : "border-amber-400 text-amber-700"
                                }`}
                              >
                                {isApproved ? "Approved" : "Pending"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-90 font-mono text-[11px]">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span>
                                {format12Hour(slot.start_time)} &ndash; {format12Hour(slot.end_time)}
                              </span>
                              <span className="opacity-70">({slot.branch})</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: MY BOOKINGS (Mobile App-like & Responsive) */}
        <TabsContent value="my-bookings" className="space-y-4">
          {/* Filter Bar */}
          <Card className="rounded-xl border">
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative sm:col-span-2">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search your bookings by event name, auditorium..."
                    value={myBookingsSearch}
                    onChange={(e) => {
                      setMyBookingsSearch(e.target.value);
                      setMyBookingsPage(1);
                    }}
                    className="pl-9 h-10 text-xs sm:text-sm rounded-lg"
                  />
                </div>
                <div>
                  <Select
                    value={myBookingsStatusFilter}
                    onValueChange={(val) => {
                      setMyBookingsStatusFilter(val);
                      setMyBookingsPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 text-xs sm:text-sm rounded-lg">
                      <SelectValue placeholder="Status Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Requests</SelectItem>
                      <SelectItem value="PENDING">Pending Review</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bookings Display */}
          {loadingMyBookings ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              <Loader2 className="h-7 w-7 animate-spin mx-auto mb-2 text-primary" />
              Loading your booking requests...
            </div>
          ) : myBookings.length === 0 ? (
            <Card className="text-center py-12 rounded-xl">
              <CardContent className="space-y-2">
                <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="font-semibold text-sm">No booking requests found.</p>
                <Button
                  variant="link"
                  className="text-primary text-xs"
                  onClick={() => setActiveTab("book")}
                >
                  Create your first auditorium booking request &rarr;
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile Card List (Visible on mobile/tablet screens < 768px for app-like experience) */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {myBookings.map((b) => (
                  <Card key={b.id} className="rounded-xl border shadow-sm p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{b.event_name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">{b.event_purpose}</p>
                      </div>
                      <Badge
                        variant={
                          b.status === "APPROVED"
                            ? "default"
                            : b.status === "PENDING"
                            ? "secondary"
                            : "destructive"
                        }
                        className={
                          b.status === "APPROVED"
                            ? "bg-emerald-600 text-white text-[10px]"
                            : b.status === "PENDING"
                            ? "bg-amber-600 text-white text-[10px]"
                            : "text-[10px]"
                        }
                      >
                        {b.status === "PENDING"
                          ? "Pending"
                          : b.status === "APPROVED"
                          ? "Approved"
                          : b.status === "REJECTED"
                          ? "Rejected"
                          : "Cancelled"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-2.5 rounded-lg">
                      <div>
                        <span className="text-muted-foreground">Venue:</span>
                        <p className="font-medium truncate">{b.auditorium_name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date:</span>
                        <p className="font-medium">{formatDateDisplay(b.booking_date)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Time Slot:</span>
                        <p className="font-medium font-mono text-[11px]">
                          {format12Hour(b.start_time)} - {format12Hour(b.end_time)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Attendees:</span>
                        <p className="font-medium">{b.expected_attendees} Expected</p>
                      </div>
                    </div>

                    {b.admin_remarks && (
                      <p className="text-xs p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 text-amber-900 dark:text-amber-200">
                        <span className="font-semibold">Remarks:</span> {b.admin_remarks}
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1 border-t">
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDetailBooking(b)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> View Details
                      </Button>
                      {b.status === "PENDING" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 h-8 text-xs"
                          onClick={() => handleCancelBooking(b)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View (Visible on >= 768px screens) */}
              <div className="hidden md:block">
                <Card className="rounded-xl border overflow-hidden shadow-sm">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event Name & Purpose</TableHead>
                          <TableHead>Auditorium</TableHead>
                          <TableHead>Date (DD-MM-YYYY)</TableHead>
                          <TableHead>12-Hr Time Slot</TableHead>
                          <TableHead>Attendees</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Admin Remarks</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myBookings.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell className="font-medium">
                              <span className="font-semibold text-foreground text-sm">{b.event_name}</span>
                              <p className="text-xs text-muted-foreground line-clamp-1">{b.event_purpose}</p>
                            </TableCell>

                            <TableCell>
                              <span className="font-medium text-foreground text-sm">{b.auditorium_name}</span>
                              <p className="text-xs text-muted-foreground">{b.auditorium_location}</p>
                            </TableCell>

                            <TableCell>
                              <span className="font-medium text-sm font-mono">{formatDateDisplay(b.booking_date)}</span>
                            </TableCell>

                            <TableCell>
                              <span className="font-mono text-xs font-semibold text-primary">
                                {format12Hour(b.start_time)} &ndash; {format12Hour(b.end_time)}
                              </span>
                            </TableCell>

                            <TableCell>
                              <span className="font-medium text-sm">{b.expected_attendees}</span>
                              <span className="text-xs text-muted-foreground"> (Req: {b.required_capacity})</span>
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant={
                                  b.status === "APPROVED"
                                    ? "default"
                                    : b.status === "PENDING"
                                    ? "secondary"
                                    : "destructive"
                                }
                                className={
                                  b.status === "APPROVED"
                                    ? "bg-emerald-600 text-white text-xs"
                                    : b.status === "PENDING"
                                    ? "bg-amber-600 text-white text-xs"
                                    : "text-xs"
                                }
                              >
                                {b.status === "PENDING"
                                  ? "Pending Approval"
                                  : b.status === "APPROVED"
                                  ? "Approved"
                                  : b.status === "REJECTED"
                                  ? "Rejected"
                                  : "Cancelled"}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              <span className="text-xs text-muted-foreground line-clamp-2">
                                {b.admin_remarks || "—"}
                              </span>
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="View Details"
                                  onClick={() => setDetailBooking(b)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>

                                {b.status === "PENDING" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:bg-destructive/10 text-xs h-8"
                                    onClick={() => handleCancelBooking(b)}
                                  >
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Pagination */}
              {totalMyBookingPages > 1 && (
                <div className="pt-2">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setMyBookingsPage((p) => Math.max(1, p - 1))}
                          className={myBookingsPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalMyBookingPages }, (_, i) => i + 1).map((p) => (
                        <PaginationItem key={p}>
                          <PaginationLink
                            isActive={myBookingsPage === p}
                            onClick={() => setMyBookingsPage(p)}
                            className="cursor-pointer"
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setMyBookingsPage((p) => Math.min(totalMyBookingPages, p + 1))}
                          className={myBookingsPage === totalMyBookingPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={!!detailBooking} onOpenChange={(open) => !open && setDetailBooking(null)}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Eye className="h-5 w-5 text-primary" />
              Booking Request Details
            </DialogTitle>
          </DialogHeader>

          {detailBooking && (
            <div className="space-y-3 py-1 text-xs sm:text-sm">
              {/* Venue Photos Showcase if available */}
              {detailBooking.auditorium_details?.images && detailBooking.auditorium_details.images.length > 0 && (
                <div className="rounded-lg overflow-hidden border h-36 w-full relative bg-muted/30">
                  <img
                    src={detailBooking.auditorium_details.images[0]}
                    alt={detailBooking.auditorium_name || "Auditorium"}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    {detailBooking.auditorium_details.images.length} {detailBooking.auditorium_details.images.length === 1 ? "photo" : "photos"}
                  </span>
                </div>
              )}

              <div className="border-b pb-2">
                <h4 className="font-bold text-foreground text-sm sm:text-base">{detailBooking.event_name}</h4>
                <p className="text-muted-foreground">{detailBooking.event_purpose}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-muted/30 p-2.5 rounded-lg">
                <div>
                  <span className="text-[11px] text-muted-foreground">Venue</span>
                  <p className="font-medium">{detailBooking.auditorium_name}</p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Date (DD-MM-YYYY)</span>
                  <p className="font-medium font-mono">{formatDateDisplay(detailBooking.booking_date)}</p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">12-Hour Slot</span>
                  <p className="font-medium font-mono">
                    {format12Hour(detailBooking.start_time)} &ndash; {format12Hour(detailBooking.end_time)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Attendees</span>
                  <p className="font-medium">{detailBooking.expected_attendees} Expected</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Facilities Requested</span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {AUDITORIUM_FACILITIES.map((f) => {
                    const isRequested = !!detailBooking[f.needKey as keyof AuditoriumBooking];
                    if (!isRequested) return null;
                    return (
                      <Badge
                        key={f.id}
                        variant="secondary"
                        className="text-xs flex items-center gap-1 bg-primary/10 text-primary border border-primary/20"
                      >
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span>{f.label}</span>
                      </Badge>
                    );
                  })}
                  {!AUDITORIUM_FACILITIES.some((f) => detailBooking[f.needKey as keyof AuditoriumBooking]) && (
                    <span className="text-xs text-muted-foreground italic">Standard venue facilities only</span>
                  )}
                </div>
              </div>

              {detailBooking.reason_and_requirements && (
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Special Requirements</span>
                  <p className="p-2 bg-muted/20 rounded border mt-1 text-xs text-foreground">
                    {detailBooking.reason_and_requirements}
                  </p>
                </div>
              )}

              {detailBooking.admin_remarks && (
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Admin / Principal Remarks</span>
                  <p className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 text-amber-900 dark:text-amber-200 mt-1 text-xs">
                    {detailBooking.admin_remarks}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailBooking(null)} className="rounded-lg h-9 text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HODAuditoriumBooking;
