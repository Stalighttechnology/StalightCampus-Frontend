import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Star,
  Sparkles,
  PartyPopper,
  Building,
  Flag,
  Loader2,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO
} from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '../../context/ThemeContext';
import {
  getSuperAdminDeveloperHolidays,
  createSuperAdminDeveloperHoliday,
  deleteSuperAdminDeveloperHoliday,
  DeveloperHolidayRecord
} from '../../utils/admin_api';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

interface DeveloperHolidayCalendarProps {
  readOnly?: boolean;
}

const HOLIDAY_TYPES = [
  { value: 'holiday', label: 'National / Public Holiday', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  { value: 'restricted', label: 'Restricted / Optional Holiday', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  { value: 'company', label: 'Company / Platform Holiday', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  { value: 'festival', label: 'Festival Holiday', color: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30' },
];

export const DeveloperHolidayCalendar: React.FC<DeveloperHolidayCalendarProps> = ({ readOnly = false }) => {
  const { theme } = useTheme();
  const [holidays, setHolidays] = useState<DeveloperHolidayRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [holidayType, setHolidayType] = useState<string>('holiday');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [viewingHoliday, setViewingHoliday] = useState<DeveloperHolidayRecord | null>(null);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await getSuperAdminDeveloperHolidays({ year: currentDate.getFullYear() });
      if (res && res.success) {
        setHolidays(res.holidays || []);
      }
    } catch (err) {
      console.error('Failed to load developer holidays', err);
      toast.error('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [currentDate.getFullYear()]);

  const handlePreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  const getHolidaysForDay = (day: Date) => {
    const formatted = format(day, 'yyyy-MM-dd');
    return holidays.filter(h => h.date === formatted);
  };

  const handleOpenAddModal = (dateStr?: string) => {
    if (readOnly) return;
    setSelectedDate(dateStr || format(new Date(), 'yyyy-MM-dd'));
    setDescription('');
    setHolidayType('holiday');
    setViewingHoliday(null);
    setIsModalOpen(true);
  };

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !description.trim()) {
      toast.error('Please enter date and description');
      return;
    }

    try {
      setSubmitting(true);
      const res = await createSuperAdminDeveloperHoliday({
        date: selectedDate,
        description: description.trim(),
        holiday_type: holidayType
      });

      if (res && res.success) {
        toast.success(res.message || 'Holiday added successfully!');
        setIsModalOpen(false);
        fetchHolidays();
      } else {
        throw new Error(res?.message || 'Failed to save holiday');
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Could not save holiday.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (holiday: DeveloperHolidayRecord) => {
    if (readOnly) return;
    const result = await Swal.fire({
      title: 'Delete Holiday?',
      text: `Are you sure you want to remove "${holiday.description}" on ${holiday.date}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete'
    });

    if (result.isConfirmed) {
      try {
        const res = await deleteSuperAdminDeveloperHoliday(holiday.id);
        if (res && res.success) {
          toast.success('Holiday deleted');
          setViewingHoliday(null);
          fetchHolidays();
        } else {
          throw new Error(res?.message || 'Failed to delete');
        }
      } catch (err: any) {
        toast.error(err.message || 'Could not delete holiday');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Developer Annual Holiday Calendar</h2>
              <p className="text-xs text-muted-foreground">
                Manage official platform and regional holidays for developers for the year {currentDate.getFullYear()}.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <Button
              type="button"
              onClick={() => handleOpenAddModal()}
              size="sm"
              className="h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Holiday
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Calendar on Left, List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Interactive Month Calendar (2 spans) */}
        <Card className={`lg:col-span-2 border shadow-sm ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
          <CardHeader className="p-4 pb-3 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base">
                {format(currentDate, 'MMMM yyyy')}
              </h3>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {holidays.length} Holidays in {currentDate.getFullYear()}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="h-8 px-2.5 text-xs mr-1"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePreviousMonth}
                className="h-8 w-8"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="h-8 w-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs py-2 border-b text-muted-foreground">
              <span className="text-rose-500">Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span className="text-blue-500">Sat</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 pt-2">
              {daysInMonth.map((day, idx) => {
                const dayHolidays = getHolidaysForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const isSunday = day.getDay() === 0;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (dayHolidays.length > 0) {
                        setViewingHoliday(dayHolidays[0]);
                      } else if (!readOnly && isCurrentMonth) {
                        handleOpenAddModal(format(day, 'yyyy-MM-dd'));
                      }
                    }}
                    className={`min-h-[70px] sm:min-h-[85px] p-1.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                      !isCurrentMonth
                        ? 'opacity-30 bg-muted/10 border-transparent cursor-default'
                        : isToday
                        ? `${theme === 'dark' ? 'bg-primary/15 border-primary/40' : 'bg-primary/5 border-primary/30'} shadow-xs`
                        : `${theme === 'dark' ? 'bg-card hover:bg-muted/30 border-border/50' : 'bg-white hover:bg-slate-50 border-slate-100'}`
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center ${
                          isToday
                            ? 'bg-primary text-white font-bold'
                            : isSunday
                            ? 'text-rose-500'
                            : 'text-foreground'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>

                      {dayHolidays.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </div>

                    <div className="space-y-1 mt-1 overflow-hidden">
                      {dayHolidays.map((h) => {
                        const typeInfo = HOLIDAY_TYPES.find(t => t.value === h.holiday_type) || HOLIDAY_TYPES[0];
                        return (
                          <div
                            key={h.id}
                            title={`${h.description} (${typeInfo.label})`}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate border ${typeInfo.color}`}
                          >
                            {h.description}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Yearly Holidays List */}
        <Card className={`border shadow-sm flex flex-col h-[560px] ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
          <CardHeader className="p-4 pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">
                {currentDate.getFullYear()} Developer Holidays
              </CardTitle>
              <CardDescription className="text-xs">
                Chronological list of all platform holidays
              </CardDescription>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {holidays.length} Total
            </span>
          </CardHeader>

          <CardContent className="p-3 flex-1 overflow-y-auto space-y-2 thin-scrollbar">
            {holidays.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground space-y-2">
                <PartyPopper className="w-8 h-8 opacity-40" />
                <p className="text-xs">No holidays configured for {currentDate.getFullYear()} yet.</p>
                {!readOnly && (
                  <Button
                    type="button"
                    onClick={() => handleOpenAddModal()}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs mt-2"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add First Holiday
                  </Button>
                )}
              </div>
            ) : (
              holidays.map((h) => {
                const parsed = parseISO(h.date);
                const typeInfo = HOLIDAY_TYPES.find(t => t.value === h.holiday_type) || HOLIDAY_TYPES[0];
                return (
                  <div
                    key={h.id}
                    className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2.5 ${
                      theme === 'dark' ? 'bg-background hover:bg-muted/20 border-border/70' : 'bg-slate-50/70 hover:bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="text-center px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shrink-0 border border-emerald-500/20">
                        <div className="text-[10px] uppercase font-mono">{format(parsed, 'MMM')}</div>
                        <div className="text-sm leading-none">{format(parsed, 'dd')}</div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate text-foreground">{h.description}</p>
                        <span className={`inline-block text-[9px] font-medium px-1.5 py-0.2 rounded mt-0.5 border ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </div>
                    </div>

                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteHoliday(h)}
                        title="Delete Holiday"
                        className="h-7 w-7 text-muted-foreground hover:text-rose-600 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Holiday Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className={`max-w-md ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-emerald-600" />
              Add Developer Holiday
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Declare an annual holiday for all developers across the platform.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveHoliday} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Holiday Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Holiday Name / Description</Label>
              <Input
                type="text"
                placeholder="e.g. Independence Day, Diwali, Annual Hackathon"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Holiday Category</Label>
              <Select value={holidayType} onValueChange={setHolidayType}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOLIDAY_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Save Holiday
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Holiday Detail Dialog */}
      {viewingHoliday && (
        <Dialog open={!!viewingHoliday} onOpenChange={() => setViewingHoliday(null)}>
          <DialogContent className={`max-w-sm ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white'}`}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <PartyPopper className="w-4 h-4 text-emerald-600" />
                Holiday Details
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                <span className="text-[11px] font-mono text-muted-foreground">{viewingHoliday.date}</span>
                <p className="text-sm font-bold text-foreground">{viewingHoliday.description}</p>
                <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {viewingHoliday.holiday_type.toUpperCase()}
                </span>
              </div>
            </div>

            <DialogFooter className="pt-2 flex justify-between sm:justify-between">
              {!readOnly && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteHoliday(viewingHoliday)}
                  className="h-8 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewingHoliday(null)}
                className="h-8 text-xs ml-auto"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DeveloperHolidayCalendar;
