import React, { useState, useEffect, useContext } from 'react';
import { getTodayMenu } from '../../utils/hms_api';
import { useToast } from '../../hooks/use-toast';
import {
  ChefHat,
  Clock,
  Leaf,
  Utensils,
  Coffee,
  Sun,
  Moon,
  Info,
  Home
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { useHMSContext } from '../../context/HMSContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '../../context/AuthContext';
import { WardenContext } from '../../context/WardenContext';

interface MenuItem {
  id: number;
  name: string;
  vegetarian: boolean;
}

interface Meal {
  id: number;
  meal_type: number;
  meal_type_detail: {
    name: string;
    time_from: string;
    time_to: string;
  };
  items: MenuItem[];
  day_name?: string;
}

interface StudentMealManagementProps {
  hostelId?: number | null;
}

const MEAL_NAME_MAP: Record<string, string> = {
  'BR': 'Breakfast',
  'LN': 'Lunch',
  'SN': 'Snacks',
  'DN': 'Dinner'
};

const getMealTypeFullName = (name: string) => {
  return MEAL_NAME_MAP[name] || name;
};

const formatTimeToAmPm = (timeStr: string) => {
  if (!timeStr) return "";
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = hours < 10 ? `0${hours}` : hours.toString();
  return `${hoursStr}:${minutes} ${ampm}`;
};

const StudentMealManagement: React.FC<StudentMealManagementProps> = ({ hostelId }) => {
  const { toast } = useToast();
  const { role } = useAuth();
  const { hostels, skeletonMode } = useHMSContext();
  const wardenContext = useContext(WardenContext);

  const displayedHostels = role === 'warden' && wardenContext?.managedHostels
    ? wardenContext.managedHostels
    : hostels;

  const [todayMenu, setTodayMenu] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedHostelId, setSelectedHostelId] = useState<string>('');

  useEffect(() => {
    if (hostelId) {
      setSelectedHostelId(hostelId.toString());
    } else if (displayedHostels && displayedHostels.length > 0 && !selectedHostelId) {
      setSelectedHostelId(displayedHostels[0].id.toString());
    }
  }, [hostelId, displayedHostels]);

  useEffect(() => {
    if (selectedHostelId) {
      loadTodayMenu(Number(selectedHostelId));
    }
  }, [selectedHostelId]);

  const loadTodayMenu = async (hid: number) => {
    setLoading(true);
    try {
      const todayRes = await getTodayMenu(hid);
      if (todayRes.success && todayRes.results) {
        setTodayMenu(todayRes.results);
      } else {
        setTodayMenu([]);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load today\'s menu',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getMealIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('breakfast')) return <Coffee className="w-5 h-5" />;
    if (lower.includes('lunch')) return <Sun className="w-5 h-5" />;
    if (lower.includes('dinner')) return <Moon className="w-5 h-5" />;
    return <Utensils className="w-5 h-5" />;
  };

  const getMealGradient = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('breakfast')) return "bg-orange-50 border-orange-200 dark:bg-orange-950/20";
    if (lower.includes('lunch')) return "bg-blue-50 border-blue-200 dark:bg-blue-950/20";
    if (lower.includes('dinner')) return "bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20";
    return "bg-slate-50 border-slate-200 dark:bg-slate-900/20";
  };

  const getMealAccentColor = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('breakfast')) return "text-orange-600";
    if (lower.includes('lunch')) return "text-blue-600";
    if (lower.includes('dinner')) return "text-indigo-600";
    return "text-slate-600";
  };

  return (
    <Card className="border-primary/10 shadow-sm overflow-hidden">
      <CardHeader id="hms-meals-card" className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500/10 p-2 rounded-lg flex-shrink-0">
                <ChefHat className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl">Today's Menu</CardTitle>
                <CardDescription className='text-sm'>Scheduled meals and nutrition info</CardDescription>
              </div>
            </div>
            {displayedHostels.length > 0 && (
              <div className="w-full sm:w-[260px] sm:ml-4">
                <Select value={selectedHostelId} onValueChange={setSelectedHostelId}>
                  <SelectTrigger className="w-full bg-background border-primary/10 hover:border-primary/30 transition-colors h-9 flex items-center gap-2 pl-3">
                    <Home className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                    <SelectValue placeholder="Select Hostel" />
                  </SelectTrigger>
                  <SelectContent>
                    {displayedHostels.map((h) => (
                      <SelectItem key={h.id} value={h.id.toString()}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none self-start sm:self-auto text-xs whitespace-nowrap">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading || skeletonMode ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-5 rounded-2xl border-2 border-dashed bg-muted/5 animate-pulse space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-muted" />
                    <div className="h-5 w-24 bg-muted rounded" />
                  </div>
                  <div className="h-4 w-16 bg-muted rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-4 w-[80%] bg-muted rounded" />
                </div>
                <div className="pt-2 border-t border-muted">
                  <div className="h-3 w-32 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : todayMenu.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl bg-muted/5">
            <div className="bg-muted p-4 rounded-full mb-4">
              <Info className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-muted-foreground">No menu scheduled</p>
            <p className="text-sm text-muted-foreground">The mess menu for today hasn't been uploaded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {todayMenu.map((meal) => {
              const fullName = getMealTypeFullName(meal.meal_type_detail.name);
              return (
                <motion.div
                  key={meal.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`group relative rounded-2xl border p-5 ${getMealGradient(fullName)} transition-all hover:shadow-md`}
                >
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl bg-background/80 shadow-sm ${getMealAccentColor(fullName)} flex-shrink-0`}>
                        {getMealIcon(fullName)}
                      </div>
                      <h3 className="font-semibold text-lg">{fullName}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 text-[12px] sm:text-[14px] font-semibold uppercase tracking-wider bg-background/50 px-2 py-1 rounded-md border self-start xl:self-auto whitespace-nowrap w-fit">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {formatTimeToAmPm(meal.meal_type_detail.time_from)} - {formatTimeToAmPm(meal.meal_type_detail.time_to)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {meal.items.map((item) => (
                      <Badge
                        key={item.id}
                        variant="outline"
                        className={`h-7 px-3 flex items-center gap-1.5 bg-background/90 shadow-sm transition-all hover:scale-105 ${
                          item.vegetarian 
                          ? "border-green-500/20 text-green-700" 
                          : "border-red-500/20 text-red-700"
                        }`}
                      >
                        {item.vegetarian && <Leaf className="w-3 h-3" />}
                        <span className="font-medium text-[14px]">{item.name}</span>
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentMealManagement;
