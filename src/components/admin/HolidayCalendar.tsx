import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isSunday } from 'date-fns';
import { getHolidays, createHoliday, deleteHoliday, Holiday } from '../../utils/holiday_api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';

interface HolidayCalendarProps {
    readOnly?: boolean;
}

export const HolidayCalendar: React.FC<HolidayCalendarProps> = ({ readOnly = false }) => {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [description, setDescription] = useState('');
    const [holidayType, setHolidayType] = useState('holiday');
    const [existingHoliday, setExistingHoliday] = useState<Holiday | null>(null);

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
        if (readOnly) return;
        const dayHolidays = getHolidaysForDay(day);
        if (dayHolidays.length > 0) {
            setExistingHoliday(dayHolidays[0]);
            setDescription(dayHolidays[0].description);
            setHolidayType(dayHolidays[0].holiday_type || 'holiday');
        } else {
            setExistingHoliday(null);
            setDescription('');
            setHolidayType('holiday');
        }
        setSelectedDate(day);
        setIsModalOpen(true);
    };

    const handleEventClick = (e: React.MouseEvent, holiday: Holiday) => {
        e.stopPropagation();
        if (readOnly) return;
        setExistingHoliday(holiday);
        setSelectedDate(parseISO(holiday.date));
        setDescription(holiday.description);
        setHolidayType(holiday.holiday_type || 'holiday');
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!selectedDate || !description.trim()) return;
        try {
            if (existingHoliday) {
                // If editing is required, currently we only support delete & recreate or just let it be.
                // Assuming we just delete and recreate for edit
                await deleteHoliday(existingHoliday.id);
            }
            await createHoliday({
                date: format(selectedDate, 'yyyy-MM-dd'),
                description: description.trim(),
                holiday_type: holidayType
            });
            setIsModalOpen(false);
            fetchHolidays();
        } catch (err) {
            alert('Failed to save holiday');
        }
    };

    const handleDelete = async () => {
        if (!existingHoliday) return;
        if (!window.confirm('Are you sure you want to delete this event?')) return;
        try {
            await deleteHoliday(existingHoliday.id);
            setIsModalOpen(false);
            fetchHolidays();
        } catch (err) {
            alert('Failed to delete holiday');
        }
    };

    return (
        <div className="space-y-4">
            <Card className="min-h-[800px] flex flex-col">
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-2 gap-4">
                    <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
                        <div className="flex gap-1">
                            <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={handleNextMonth}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button variant="outline" className="ml-2" onClick={handleToday}>
                            Today
                        </Button>
                    </div>
                    <CardTitle className="text-xl md:text-2xl font-bold">
                        {format(currentDate, 'MMMM yyyy')}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500">
                            <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500"></span> Holiday
                            <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-blue-500 ml-2"></span> Event
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 m-2 md:m-4 border rounded-lg overflow-x-auto flex flex-col">
                    <div className="min-w-[320px] flex-1 flex flex-col">
                        <div className="grid grid-cols-6 bg-gray-50 border-b">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                <div key={day} className="py-2 text-center text-xs md:text-sm font-semibold text-gray-700">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="flex-1 grid grid-cols-6 grid-rows-5 lg:grid-rows-6">
                            {daysInMonth.filter(day => !isSunday(day)).map((day, idx) => {
                                const dayHolidays = getHolidaysForDay(day);
                                const isCurrentMonth = isSameMonth(day, currentDate);
                                const isToday = isSameDay(day, new Date());

                                return (
                                    <div
                                        key={day.toString()}
                                        onClick={() => handleDayClick(day)}
                                        className={`min-h-[60px] md:min-h-[100px] border-b border-r p-0.5 md:p-1 hover:bg-gray-50 ${!readOnly ? 'cursor-pointer' : ''} transition-colors ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'} ${idx % 6 === 5 ? 'border-r-0' : ''}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className={`text-xs md:text-sm font-medium p-1 w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : ''}`}>
                                                {format(day, 'd')}
                                            </span>
                                        </div>
                                        <div className="mt-0.5 md:mt-1 flex flex-col gap-0.5 md:gap-1">
                                            {dayHolidays.map(holiday => (
                                                <div
                                                    key={holiday.id}
                                                    onClick={(e) => handleEventClick(e, holiday)}
                                                    className={`text-[10px] md:text-xs px-1 md:px-2 py-0.5 md:py-1 rounded truncate text-white font-medium ${holiday.holiday_type === 'event' ? 'bg-blue-500' : 'bg-red-500'}`}
                                                    title={holiday.description}
                                                >
                                                    {holiday.description}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {!readOnly && (
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{existingHoliday ? 'Edit Event/Holiday' : 'Add Event/Holiday'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Date</label>
                            <div className="text-gray-700 p-2 bg-gray-50 rounded border">
                                {selectedDate ? format(selectedDate, 'PPP') : ''}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <select
                                value={holidayType}
                                onChange={(e) => setHolidayType(e.target.value)}
                                className="w-full border rounded-md p-2"
                            >
                                <option value="holiday">Holiday / Break</option>
                                <option value="event">Campus Event</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description / Title</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full border rounded-md p-2"
                                placeholder="e.g. Diwali Holiday, Tech Fest"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex justify-between w-full sm:justify-between">
                        {existingHoliday ? (
                            <Button variant="destructive" onClick={handleDelete} className="flex gap-2">
                                <Trash2 className="w-4 h-4" /> Delete
                            </Button>
                        ) : (
                            <div></div>
                        )}
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleSave}>Save</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            )}
        </div>
    );
};
