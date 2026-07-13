import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon, Star, ArrowRight, Edit } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isWithinInterval, startOfDay } from 'date-fns';
import { getHolidays, createHoliday, deleteHoliday, Holiday, getStudentExams, ExamEvent, getMyApprovedLeaves, LeaveEvent } from '../../utils/holiday_api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useTheme } from '../../context/ThemeContext';
import { showConfirmAlert, showSuccessAlert, showErrorAlert } from '../../utils/sweetalert';

interface HolidayCalendarProps {
    readOnly?: boolean;
    showExams?: boolean;
    showLeaves?: boolean;
    userRole?: string;
}

export const HolidayCalendar: React.FC<HolidayCalendarProps> = ({ readOnly = false, showExams = false, showLeaves = false, userRole }) => {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([]);
    const [examEvents, setExamEvents] = useState<ExamEvent[]>([]);
    const [leaveEvents, setLeaveEvents] = useState<LeaveEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const { theme } = useTheme();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [description, setDescription] = useState('');
    const [holidayType, setHolidayType] = useState('holiday');
    const [existingHoliday, setExistingHoliday] = useState<Holiday | null>(null);

    // Exam info dialog
    const [selectedExam, setSelectedExam] = useState<ExamEvent | null>(null);
    const [isExamModalOpen, setIsExamModalOpen] = useState(false);

    // Leave info dialog
    const [selectedLeave, setSelectedLeave] = useState<LeaveEvent | null>(null);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

    // Edit Mode states
    const [isEditModeActive, setIsEditModeActive] = useState(false);
    const [isDialogReadOnly, setIsDialogReadOnly] = useState(false);

    const fetchHolidays = async (date: Date = currentDate) => {
        try {
            setLoading(true);
            const startDate = format(startOfMonth(date), 'yyyy-MM-dd');
            const endDate = format(endOfMonth(date), 'yyyy-MM-dd');

            const data = await getHolidays(startDate, endDate);
            setHolidays(data);
        } catch (err) {
            console.error('Failed to fetch holidays');
        } finally {
            setLoading(false);
        }
    };

    const fetchUpcomingHolidays = async () => {
        try {
            const startDate = format(new Date(), 'yyyy-MM-dd');
            const endDate = format(addMonths(new Date(), 12), 'yyyy-MM-dd');
            const data = await getHolidays(startDate, endDate);

            const today = startOfDay(new Date());
            const filtered = data
                .filter(h => parseISO(h.date) >= today)
                .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
                .slice(0, 25);

            setUpcomingHolidays(filtered);
        } catch (err) {
            console.error('Failed to fetch upcoming holidays');
        }
    };

    useEffect(() => {
        fetchHolidays(currentDate);
    }, [currentDate.getMonth(), currentDate.getFullYear()]);

    useEffect(() => {
        fetchUpcomingHolidays();
    }, []);

    // Fetch student exams for the current month when showExams is enabled
    useEffect(() => {
        if (!showExams) return;
        const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

        getStudentExams(startDate, endDate).then(setExamEvents).catch(() => setExamEvents([]));
    }, [showExams, currentDate.getMonth(), currentDate.getFullYear()]);

    // Fetch approved leaves for the current month when showLeaves is enabled
    useEffect(() => {
        if (!showLeaves) return;
        const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

        getMyApprovedLeaves(userRole, startDate, endDate).then(setLeaveEvents).catch(() => setLeaveEvents([]));
    }, [showLeaves, userRole, currentDate.getMonth(), currentDate.getFullYear()]);

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
        return holidays.filter(h => isSameDay(parseISO(h.date), day));
    };

    const getExamsForDay = (day: Date): ExamEvent[] => {
        if (!showExams) return [];
        return examEvents.filter(e => {
            const d = typeof e.date === 'string' ? parseISO(e.date) : new Date(e.date);
            return isSameDay(d, day);
        });
    };

    const getLeavesForDay = (day: Date): LeaveEvent[] => {
        if (!showLeaves) return [];
        return leaveEvents.filter(leave => {
            if (!leave.start_date || !leave.end_date) return false;
            try {
                const start = startOfDay(parseISO(leave.start_date));
                const end = startOfDay(parseISO(leave.end_date));
                const current = startOfDay(day);
                return isWithinInterval(current, { start, end });
            } catch (error) {
                return false;
            }
        });
    };

    const handleExamClick = (e: React.MouseEvent, exam: ExamEvent) => {
        e.stopPropagation();
        setSelectedExam(exam);
        setIsExamModalOpen(true);
    };

    const handleLeaveClick = (e: React.MouseEvent, leave: LeaveEvent) => {
        e.stopPropagation();
        setSelectedLeave(leave);
        setIsLeaveModalOpen(true);
    };

    const handleDayClick = (day: Date) => {
        const dayHolidays = getHolidaysForDay(day);
        if (dayHolidays.length > 0) {
            setExistingHoliday(dayHolidays[0]);
            setDescription(dayHolidays[0].description);
            setHolidayType(dayHolidays[0].holiday_type || 'holiday');
            setSelectedDate(day);
            setIsDialogReadOnly(readOnly || !isEditModeActive);
            setIsModalOpen(true);
        } else {
            if (readOnly || !isEditModeActive) return;
            setExistingHoliday(null);
            setDescription('');
            setHolidayType('holiday');
            setSelectedDate(day);
            setIsDialogReadOnly(false);
            setIsModalOpen(true);
        }
    };

    const handleEventClick = (e: React.MouseEvent, holiday: Holiday) => {
        e.stopPropagation();
        setExistingHoliday(holiday);
        setSelectedDate(parseISO(holiday.date));
        setDescription(holiday.description);
        setHolidayType(holiday.holiday_type || 'holiday');
        setIsDialogReadOnly(readOnly || !isEditModeActive);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (readOnly) return;
        if (!selectedDate || !description.trim()) return;
        try {
            if (existingHoliday) {
                await deleteHoliday(existingHoliday.id);
            }
            await createHoliday({
                date: format(selectedDate, 'yyyy-MM-dd'),
                description: description.trim(),
                holiday_type: holidayType
            });
            setIsModalOpen(false);
            fetchHolidays();
            fetchUpcomingHolidays();
            await showSuccessAlert('Saved!', 'Event/Holiday has been saved successfully.');
        } catch (err) {
            await showErrorAlert('Error', 'Failed to save event/holiday.');
        }
    };

    const handleDelete = async () => {
        if (readOnly || !existingHoliday) return;

        const result = await showConfirmAlert(
            'Are you sure?',
            'Do you want to delete this event/holiday?',
            'Yes, delete it!'
        );

        if (result.isConfirmed) {
            try {
                await deleteHoliday(existingHoliday.id);
                setIsModalOpen(false);
                fetchHolidays();
                fetchUpcomingHolidays();
                await showSuccessAlert('Deleted!', 'Event/Holiday has been deleted.');
            } catch (err) {
                await showErrorAlert('Error', 'Failed to delete event/holiday.');
            }
        }
    };



    return (
        <div className="space-y-3 flex flex-col pb-2 w-full max-w-full">
            <Card className={`flex-1 flex flex-col border min-h-[650px] w-full max-w-full rounded-lg ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
                {/* Header Section */}
                <CardHeader className="flex flex-col md:flex-row items-stretch md:items-center justify-between pb-3 gap-3 border-b border-gray-100 dark:border-border/30">
                    {/* Month Title & Navigation */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 w-full md:w-auto">
                        <div className="flex flex-row items-center justify-between w-full sm:w-auto gap-2">
                            <h2 className={`text-2xl font-semibold tracking-tight min-w-[160px] ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                {format(currentDate, 'MMMM')}
                            </h2>
                            <div className="flex sm:hidden items-center gap-2.5 text-[10px] text-muted-foreground font-medium shrink-0">
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Holiday
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-primary"></span> Event
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-2">
                            <div className={`flex shrink-0 items-center justify-center gap-1 p-1 rounded-lg border ${theme === 'dark' ? 'bg-muted/10 border-border/50' : 'bg-gray-50 border-gray-200'}`}>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-primary/10" onClick={handlePreviousMonth}>
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </Button>
                                <span className="px-2.5 py-0.5 text-xs font-semibold bg-primary text-white rounded-md shadow-sm">
                                    {format(currentDate, 'yyyy')}
                                </span>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-primary/10" onClick={handleNextMonth}>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                            <div className="flex flex-1 items-center gap-2">
                                <Button variant="outline" size="sm" className={`flex-1 h-8 px-3 sm:px-2 text-xs font-medium ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`} onClick={handleToday}>
                                    Today
                                </Button>
                                {!readOnly && (
                                    <Button
                                        size="sm"
                                        className={`sm:hidden flex-1 h-8 px-3 text-xs font-semibold flex justify-center items-center gap-1.5 shadow-sm rounded-lg ${isEditModeActive
                                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                : "bg-primary hover:bg-primary/90 text-white"
                                            }`}
                                        onClick={() => setIsEditModeActive(!isEditModeActive)}
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                        {isEditModeActive ? "Done" : "Edit"}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Legend & Actions */}
                    <div className="flex flex-row items-center justify-end md:justify-end gap-3 w-full md:w-auto pt-1 md:pt-0">
                        <div className="hidden sm:flex items-center gap-3 text-[11px] md:text-xs text-muted-foreground font-medium">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Holiday / Break
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span> Event
                            </span>
                            {showExams && (
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Exam
                                </span>
                            )}
                            {showLeaves && (
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span> Approved Leave
                                </span>
                            )}
                        </div>
                        {!readOnly && (
                            <Button
                                size="sm"
                                className={`hidden sm:flex h-8 px-3 text-xs font-semibold items-center gap-1.5 shadow-sm rounded-lg ${isEditModeActive
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                        : "bg-primary hover:bg-primary/90 text-white"
                                    }`}
                                onClick={() => setIsEditModeActive(!isEditModeActive)}
                            >
                                <Edit className="w-3.5 h-3.5" />
                                {isEditModeActive ? "Done" : "Edit"}
                            </Button>
                        )}
                    </div>
                </CardHeader>

                {/* Calendar Grid Section */}
                <CardContent className="flex-1 p-0 m-1 md:m-2 rounded-2xl overflow-x-auto overflow-y-auto sm:overflow-x-visible flex flex-col custom-scrollbar">
                    <div className="w-full sm:min-w-[700px] flex-1 flex flex-col">
                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7 bg-primary text-white rounded-t-2xl">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                <div key={day} className="py-2 text-center text-xs font-semibold uppercase tracking-wider">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className={`flex-1 grid grid-cols-7 auto-rows-fr divide-x divide-y ${theme === 'dark' ? 'divide-border bg-card' : 'divide-gray-100 bg-white'}`}>
                            {daysInMonth.map((day, idx) => {
                                const dayHolidays = getHolidaysForDay(day);
                                const dayExams = getExamsForDay(day);
                                const dayLeaves = getLeavesForDay(day);
                                const isCurrentMonth = isSameMonth(day, currentDate);
                                const isToday = isSameDay(day, new Date());
                                const hasHoliday = dayHolidays.length > 0;
                                const hasExam = dayExams.length > 0;
                                const hasLeave = dayLeaves.length > 0;

                                return (
                                    <div
                                        key={day.toString()}
                                        onClick={() => handleDayClick(day)}
                                        className={`h-full min-h-0 p-1.5 hover:bg-primary/5 transition-colors relative flex flex-col justify-between ${hasHoliday || hasExam || hasLeave || (!readOnly && isEditModeActive) ? 'cursor-pointer' : ''
                                            } ${!isCurrentMonth ? (theme === 'dark' ? 'bg-muted/10 text-muted-foreground/30' : 'bg-gray-50/50 text-gray-400') : (
                                                hasHoliday ? (
                                                    dayHolidays[0].holiday_type === 'event'
                                                        ? (theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5')
                                                        : (theme === 'dark' ? 'bg-rose-500/10' : 'bg-rose-50/50')
                                                ) : hasExam ? (theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50/60') : hasLeave ? (theme === 'dark' ? 'bg-teal-500/10' : 'bg-teal-50/60') : (theme === 'dark' ? 'bg-card' : 'bg-white')
                                            )} ${isToday ? 'ring-1 ring-primary/30' : ''}`}
                                    >
                                        {/* Left border strip */}
                                        {hasHoliday && (
                                            <span className={`absolute left-0 top-0 bottom-0 w-1 ${dayHolidays[0].holiday_type === 'event' ? 'bg-primary' : 'bg-rose-500'}`} />
                                        )}
                                        {!hasHoliday && hasExam && (
                                            <span className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                                        )}
                                        {!hasHoliday && !hasExam && hasLeave && (
                                            <span className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500" />
                                        )}

                                        {/* Day header: number and star */}
                                        <div className="flex justify-between items-center w-full">
                                            <span className={`text-xs md:text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white shadow-sm' : (theme === 'dark' ? 'text-foreground' : 'text-gray-800')}`}>
                                                {isCurrentMonth ? format(day, 'dd') : ''}
                                            </span>
                                            {isCurrentMonth && hasHoliday && (
                                                <Star className={`w-3.5 h-3.5 fill-current ${dayHolidays[0].holiday_type === 'event' ? 'text-primary' : 'text-rose-500'}`} />
                                            )}
                                        </div>

                                        {/* Holiday details text & Pill */}
                                        <div className="mt-1 flex-1 flex-col gap-1 hidden sm:flex overflow-y-auto overflow-x-hidden custom-scrollbar">
                                            {isCurrentMonth && hasHoliday && (
                                                <div className="flex flex-col gap-1 items-start w-full">
                                                    <span className={`text-[10px] md:text-xs font-medium leading-tight line-clamp-1 break-all w-full ${dayHolidays[0].holiday_type === 'event' ? 'text-primary' : 'text-rose-500'}`} title={dayHolidays[0].description}>
                                                        {dayHolidays[0].description}
                                                    </span>
                                                    <span
                                                        onClick={(e) => handleEventClick(e, dayHolidays[0])}
                                                        className={`text-[8px] md:text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider cursor-pointer ${dayHolidays[0].holiday_type === 'event' ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'}`}
                                                    >
                                                        {!readOnly && isEditModeActive ? 'Tap to Edit' : 'View Details'}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Exam chips */}
                                            {isCurrentMonth && !hasLeave && dayExams.slice(0, 2).map(exam => (
                                                <div key={exam.id} className="flex flex-col gap-0.5 items-start w-full">
                                                    <span className="text-[10px] md:text-xs font-semibold leading-tight line-clamp-1 break-all w-full text-amber-600 dark:text-amber-400" title={exam.subject}>
                                                        {exam.subject}
                                                    </span>
                                                    <span
                                                        onClick={(e) => handleExamClick(e, exam)}
                                                        className="text-[8px] md:text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider cursor-pointer bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                                                    >
                                                        Exam
                                                    </span>
                                                </div>
                                            ))}
                                            {isCurrentMonth && !hasLeave && dayExams.length > 2 && (
                                                <span className="text-[9px] font-medium text-amber-600">+{dayExams.length - 2} more</span>
                                            )}

                                            {/* Leave chips */}
                                            {isCurrentMonth && dayLeaves.slice(0, 1).map(leave => (
                                                <div key={leave.id} className="flex flex-col gap-0.5 items-start w-full">
                                                    <span className="text-[10px] md:text-xs font-semibold leading-tight line-clamp-1 break-all w-full text-teal-600 dark:text-teal-400" title={leave.leave_type}>
                                                        {leave.leave_type?.replace(/_/g, ' ')}
                                                    </span>
                                                    <span
                                                        onClick={(e) => handleLeaveClick(e, leave)}
                                                        className="text-[8px] md:text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider cursor-pointer bg-teal-500/10 text-teal-600 hover:bg-teal-500/20"
                                                    >
                                                        Approved Leave
                                                    </span>
                                                </div>
                                            ))}
                                            {isCurrentMonth && dayLeaves.length > 1 && (
                                                <span className="text-[9px] font-medium text-teal-600">+{dayLeaves.length - 1} more</span>
                                            )}

                                            {isCurrentMonth && !hasHoliday && !hasExam && !hasLeave && !readOnly && isEditModeActive && (
                                                <div className="flex justify-start items-end h-full">
                                                    <span className="text-[8px] md:text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-gray-100 text-gray-500 border border-gray-200 animate-pulse">
                                                        Tap to Add
                                                    </span>
                                                </div>
                                            )}
                                            {!hasHoliday && !hasExam && !hasLeave && (readOnly || !isEditModeActive) && <div />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>



            {/* Event dialog (Add/Edit) */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent
                    onPointerDownOutside={(e) => e.preventDefault()}
                    className={theme === 'dark' ? 'bg-card text-foreground border border-border w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6' : 'bg-white text-gray-900 border border-gray-200 w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6'}
                >
                    <DialogHeader>
                        <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                            {isDialogReadOnly ? 'Event/Holiday Details' : (existingHoliday ? 'Edit Event/Holiday' : 'Add Event/Holiday')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Date</label>
                            <div className={`p-2.5 rounded-lg border text-sm font-semibold ${theme === 'dark' ? 'bg-muted/10 border-border/40 text-foreground' : 'bg-gray-50 border-gray-100 text-gray-700'}`}>
                                {selectedDate ? format(selectedDate, 'PPP') : ''}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <Select
                                value={holidayType}
                                onValueChange={(val) => setHolidayType(val)}
                                disabled={isDialogReadOnly}
                            >
                                <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'} ${isDialogReadOnly ? 'opacity-80 cursor-not-allowed' : ''}`}>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent className={theme === 'dark' ? 'bg-background border border-border text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                                    <SelectItem value="holiday">Holiday / Break</SelectItem>
                                    <SelectItem value="event">Campus Event</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description / Title</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={isDialogReadOnly}
                                className={`w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-primary ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'} ${isDialogReadOnly ? 'opacity-80 cursor-not-allowed' : ''}`}
                                placeholder="e.g. Diwali Holiday, Tech Fest"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex flex-row justify-between w-full gap-2 pt-2 border-t border-border/20">
                        {isDialogReadOnly ? (
                            <div className="flex justify-end w-full">
                                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Close</Button>
                            </div>
                        ) : (
                            <>
                                {existingHoliday ? (
                                    <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700 border-red-200/50 hover:bg-red-50 dark:hover:bg-red-950/20 flex gap-2">
                                        <Trash2 className="w-4 h-4" /> Delete
                                    </Button>
                                ) : (
                                    <div></div>
                                )}
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                    <Button className="bg-primary hover:bg-primary/90 text-white font-semibold" onClick={handleSave}>Save</Button>
                                </div>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Exam info dialog */}
            <Dialog open={isExamModalOpen} onOpenChange={setIsExamModalOpen}>
                <DialogContent
                    onPointerDownOutside={(e) => e.preventDefault()}
                    className={theme === 'dark' ? 'bg-card text-foreground border border-border w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6' : 'bg-white text-gray-900 border border-gray-200 w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6'}
                >
                    <DialogHeader>
                        <DialogTitle className={`flex items-center gap-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                            Exam Details
                        </DialogTitle>
                    </DialogHeader>
                    {selectedExam && (
                        <div className="space-y-3 py-3">
                            <div className={`rounded-lg p-3 border ${theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-100'}`}>
                                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{selectedExam.subject}</p>
                                {selectedExam.subject_code && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{selectedExam.subject_code}</p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className={`rounded-lg p-3 border ${theme === 'dark' ? 'bg-muted/10 border-border/40' : 'bg-gray-50 border-gray-100'}`}>
                                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Exam Type</p>
                                    <p className="font-semibold capitalize">{selectedExam.exam_type?.replace(/_/g, ' ')}</p>
                                </div>
                                <div className={`rounded-lg p-3 border ${theme === 'dark' ? 'bg-muted/10 border-border/40' : 'bg-gray-50 border-gray-100'}`}>
                                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Venue</p>
                                    <p className="font-semibold">{selectedExam.room || 'TBD'}</p>
                                </div>
                                <div className={`rounded-lg p-3 border ${theme === 'dark' ? 'bg-muted/10 border-border/40' : 'bg-gray-50 border-gray-100'}`}>
                                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Date</p>
                                    <p className="font-semibold">{selectedExam.date ? format(parseISO(selectedExam.date as string), 'dd MMM yyyy') : '—'}</p>
                                </div>
                                <div className={`rounded-lg p-3 border ${theme === 'dark' ? 'bg-muted/10 border-border/40' : 'bg-gray-50 border-gray-100'}`}>
                                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Time</p>
                                    <p className="font-semibold">
                                        {selectedExam.start_time} – {selectedExam.end_time}
                                    </p>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground italic pt-1">{selectedExam.title}</p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsExamModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Leave info dialog */}
            <Dialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
                <DialogContent
                    onPointerDownOutside={(e) => e.preventDefault()}
                    className={theme === 'dark' ? 'bg-card text-foreground border border-border w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6' : 'bg-white text-gray-900 border border-gray-200 w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6'}
                >
                    <DialogHeader>
                        <DialogTitle className={`flex items-center gap-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block"></span>
                            Approved Leave Details
                        </DialogTitle>
                    </DialogHeader>
                    {selectedLeave && (
                        <div className="space-y-3 py-3">
                            <div className={`rounded-lg p-3 border ${theme === 'dark' ? 'bg-teal-500/10 border-teal-500/20' : 'bg-teal-50 border-teal-100'}`}>
                                <p className="text-sm font-bold text-teal-600 dark:text-teal-400 capitalize">{selectedLeave.leave_type?.replace(/_/g, ' ')}</p>
                                {selectedLeave.title && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{selectedLeave.title}</p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className={`rounded-lg p-3 border ${theme === 'dark' ? 'bg-muted/10 border-border/40' : 'bg-gray-50 border-gray-100'}`}>
                                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Start Date</p>
                                    <p className="font-semibold">{selectedLeave.start_date ? format(parseISO(selectedLeave.start_date), 'dd MMM yyyy') : '—'}</p>
                                </div>
                                <div className={`rounded-lg p-3 border ${theme === 'dark' ? 'bg-muted/10 border-border/40' : 'bg-gray-50 border-gray-100'}`}>
                                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">End Date</p>
                                    <p className="font-semibold">{selectedLeave.end_date ? format(parseISO(selectedLeave.end_date), 'dd MMM yyyy') : '—'}</p>
                                </div>
                            </div>
                            {selectedLeave.reason && (
                                <div className={`rounded-lg p-3 border mt-2 ${theme === 'dark' ? 'bg-muted/5 border-border/20' : 'bg-gray-50/50 border-gray-50'}`}>
                                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Reason</p>
                                    <p className="text-sm">{selectedLeave.reason}</p>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsLeaveModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
