import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon, Star, ArrowRight, Edit } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { getHolidays, createHoliday, deleteHoliday, Holiday } from '../../utils/holiday_api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useTheme } from '../../context/ThemeContext';
import { showConfirmAlert, showSuccessAlert, showErrorAlert } from '../../utils/sweetalert';

interface HolidayCalendarProps {
    readOnly?: boolean;
}

export const HolidayCalendar: React.FC<HolidayCalendarProps> = ({ readOnly = false }) => {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const { theme } = useTheme();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [description, setDescription] = useState('');
    const [holidayType, setHolidayType] = useState('holiday');
    const [existingHoliday, setExistingHoliday] = useState<Holiday | null>(null);

    // Edit Mode states
    const [isEditModeActive, setIsEditModeActive] = useState(false);
    const [isDialogReadOnly, setIsDialogReadOnly] = useState(false);

    const fetchHolidays = async () => {
        try {
            setLoading(true);
            const data = await getHolidays();
            setHolidays(data);
        } catch (err) {
            console.error('Failed to fetch holidays');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHolidays();
    }, []);

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
                await showSuccessAlert('Deleted!', 'Event/Holiday has been deleted.');
            } catch (err) {
                await showErrorAlert('Error', 'Failed to delete event/holiday.');
            }
        }
    };

    // Calculate upcoming holidays for current month and future
    const upcomingHolidays = useMemo(() => {
        return holidays
            .filter(h => {
                const hDate = parseISO(h.date);
                return hDate >= startOfMonth(currentDate);
            })
            .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
            .slice(0, 5);
    }, [holidays, currentDate]);

    return (
        <div className="space-y-3 flex flex-col md:h-[calc(100vh-130px)] pb-2 w-full max-w-full overflow-hidden">
            <Card className={`flex-1 flex flex-col border min-h-[480px] w-full max-w-full rounded-lg ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
                {/* Header Section */}
                <CardHeader className="flex flex-col md:flex-row items-stretch md:items-center justify-between pb-3 gap-3 border-b border-gray-100 dark:border-border/30">
                    {/* Month Title & Navigation */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 w-full md:w-auto">
                        <div className="flex flex-row items-center justify-between w-full sm:w-auto gap-2">
                            <h2 className={`text-2xl font-semibold tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
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
                        
                        <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                            <div className={`flex flex-1 sm:flex-initial items-center justify-between sm:justify-start gap-1 p-1 rounded-lg border ${theme === 'dark' ? 'bg-muted/10 border-border/50' : 'bg-gray-50 border-gray-200'}`}>
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
                            <Button variant="outline" size="sm" className={`h-8 px-2 text-xs font-medium ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`} onClick={handleToday}>
                                Today
                            </Button>
                        </div>
                    </div>

                    {/* Legend & Actions */}
                    <div className="flex flex-row items-center justify-between md:justify-end gap-3 w-full md:w-auto pt-1 md:pt-0">
                        <div className="hidden sm:flex items-center gap-3 text-[11px] md:text-xs text-muted-foreground font-medium">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Holiday / Break
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span> Event
                            </span>
                        </div>
                        {!readOnly && (
                            <Button 
                                size="sm" 
                                className={`h-8 px-3 text-xs font-semibold flex items-center gap-1.5 shadow-sm rounded-lg ${
                                    isEditModeActive 
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
                <CardContent className="flex-1 p-0 m-1 md:m-2 border rounded-2xl overflow-x-auto sm:overflow-x-visible overflow-y-hidden flex flex-col custom-scrollbar">
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
                                const isCurrentMonth = isSameMonth(day, currentDate);
                                const isToday = isSameDay(day, new Date());
                                const hasHoliday = dayHolidays.length > 0;

                                return (
                                    <div
                                        key={day.toString()}
                                        onClick={() => handleDayClick(day)}
                                        className={`h-full min-h-0 p-1.5 hover:bg-primary/5 transition-colors relative flex flex-col justify-between ${hasHoliday || (!readOnly && isEditModeActive) ? 'cursor-pointer' : ''
                                            } ${!isCurrentMonth ? (theme === 'dark' ? 'bg-muted/10 text-muted-foreground/30' : 'bg-gray-50/50 text-gray-400') : (
                                                hasHoliday ? (
                                                    dayHolidays[0].holiday_type === 'event'
                                                        ? (theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5')
                                                        : (theme === 'dark' ? 'bg-rose-500/10' : 'bg-rose-50/50')
                                                ) : (theme === 'dark' ? 'bg-card' : 'bg-white')
                                            )} ${isToday ? 'bg-primary/5 ring-1 ring-primary/30' : ''
                                            }`}
                                    >
                                        {/* Holiday left border strip */}
                                        {hasHoliday && (
                                            <span className={`absolute left-0 top-0 bottom-0 w-1 ${dayHolidays[0].holiday_type === 'event' ? 'bg-primary' : 'bg-rose-500'
                                                }`} />
                                        )}

                                        {/* Day header: number and star */}
                                        <div className="flex justify-between items-center w-full">
                                            <span className={`text-xs md:text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white shadow-sm' : (theme === 'dark' ? 'text-foreground' : 'text-gray-800')
                                                }`}>
                                                {format(day, 'dd')}
                                            </span>
                                            {hasHoliday && (
                                                <Star className={`w-3.5 h-3.5 fill-current ${dayHolidays[0].holiday_type === 'event' ? 'text-primary' : 'text-rose-500'
                                                    }`} />
                                            )}
                                        </div>

                                        {/* Holiday details text & Pill */}
                                        <div className="mt-2 flex-1 flex-col justify-between hidden sm:flex">
                                            {dayHolidays.length > 0 ? (
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    <span className={`text-[10px] md:text-xs font-medium leading-tight line-clamp-2 ${dayHolidays[0].holiday_type === 'event' ? 'text-primary' : 'text-rose-500'
                                                        }`} title={dayHolidays[0].description}>
                                                        {dayHolidays[0].description}
                                                    </span>
                                                    <span
                                                        onClick={(e) => handleEventClick(e, dayHolidays[0])}
                                                        className={`text-[8px] md:text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider cursor-pointer ${dayHolidays[0].holiday_type === 'event' ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                                                            }`}
                                                    >
                                                        {!readOnly && isEditModeActive ? 'Tap to Edit' : 'View Details'}
                                                    </span>
                                                </div>
                                            ) : (
                                                !readOnly && isEditModeActive ? (
                                                    <div className="flex justify-start items-end h-full">
                                                        <span className="text-[8px] md:text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-gray-100 text-gray-500 border border-gray-200 animate-pulse">
                                                            Tap to Add
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div />
                                                )
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Bottom Summary Pill */}
            <div className={`border-2 border-dashed rounded-2xl md:rounded-full px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-2 shadow-sm shrink-0 ${
                theme === 'dark' ? 'border-primary/30 bg-muted/10' : 'border-primary/20 bg-primary/5'
            }`}>
                <span className="text-xs md:text-sm font-semibold uppercase tracking-wider text-primary whitespace-nowrap">
                    Upcoming Events & Holidays :
                </span>
                <div className="w-full flex-1 overflow-x-auto thin-scrollbar flex gap-2.5 md:gap-3 text-xs md:text-sm font-semibold md:ml-2 items-center">
                    {upcomingHolidays.length > 0 ? (
                        upcomingHolidays.map((holiday, i) => {
                            const isEvent = holiday.holiday_type === 'event';
                            return (
                                <span 
                                    key={holiday.id} 
                                    onClick={() => {
                                        const eventDate = parseISO(holiday.date);
                                        setCurrentDate(eventDate);
                                    }}
                                    className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer hover:scale-105 active:scale-95 transition-all ${
                                        isEvent
                                            ? (theme === 'dark' ? 'bg-primary/20 border-primary/30 text-primary-foreground hover:bg-primary/30' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20')
                                            : (theme === 'dark' ? 'bg-rose-500/20 border-rose-500/30 text-rose-300 hover:bg-rose-500/30' : 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100/50')
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${isEvent ? 'bg-primary' : 'bg-rose-500'}`}></span>
                                    {holiday.description}
                                </span>
                            );
                        })
                    ) : (
                        <span className="text-xs md:text-sm text-muted-foreground italic pl-1">
                            No upcoming events or holidays scheduled.
                        </span>
                    )}
                </div>
            </div>

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
        </div>
    );
};
