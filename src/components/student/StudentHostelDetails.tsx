import React, { useEffect, useState } from 'react';
import { getStudentHostelDetails, getTodayMenuSummary, getMyIssues, getMyGatePasses } from '../../utils/hms_api';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../hooks/use-toast';
import RaiseIssueModal from '../hms/RaiseIssueModal';
import RequestGatePassModal from '../hms/RequestGatePassModal';
import {
  FaBuilding,
  FaBed,
  FaUserTie,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaLayerGroup,
  FaUsers,
  FaExclamationCircle,
  FaSyncAlt,
  FaHotel,
  FaLeaf,
  FaDrumstickBite,
  FaCheckCircle,
  FaDirections,
  FaExclamationTriangle,
  FaClock,
  FaCog,
  FaHardHat,
  FaCalendarAlt,
  FaUtensils
} from
  'react-icons/fa';
import { SkeletonCard, SkeletonList } from '../ui/skeleton';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '../ui/select';

type Warden = {
  id?: number;
  name?: string;
  phone?: string;
  email?: string;
  designation?: string;
  experience?: number;
  profile_picture?: string;
};

type Caretaker = {
  id?: number;
  name?: string;
  phone?: string;
  email?: string;
  experience?: number;
};

type HostelInfo = {
  id?: number;
  name?: string;
  address?: string;
  contact?: string;
  gender?: string;
  rooms_count?: number;
  students_count?: number;
};

type RoomInfo = {
  id?: number;
  room_number?: string;
  floor?: string | number;
  room_type?: string;
  room_type_display?: string;
  capacity?: number;
  current_occupancy?: number;
  is_vacant?: boolean;
};

const ROOM_TYPE_COLORS: Record<string, string> = {
  S: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  D: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  P: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  B: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
};

// ── Meal Type Display Mapping ────────────────────────────────────────────────
const MEAL_TYPE_DISPLAY = {
  'BR': { label: 'Breakfast', time_from: '07:30', time_to: '09:00' },
  'LN': { label: 'Lunch', time_from: '12:00', time_to: '14:00' },
  'SN': { label: 'Snacks', time_from: '16:00', time_to: '17:30' },
  'DN': { label: 'Dinner', time_from: '19:00', time_to: '21:00' }
};

const getMealTypeLabel = (code: string) => {
  return MEAL_TYPE_DISPLAY[code as keyof typeof MEAL_TYPE_DISPLAY]?.label || code;
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

// ── Small reusable info row ──────────────────────────────────────────────────
const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: string | number | null;
  theme: string;
}> = ({ icon, label, value, theme }) => (
  <div className="flex items-center gap-2 p-1.5 rounded-lg transition-all duration-200 hover:bg-slate-500/5">
    <div className={`p-1.5 rounded-md flex-shrink-0 ${theme === 'dark' ? 'bg-slate-800 text-blue-400 border border-slate-700/50' : 'bg-slate-100 text-blue-600 border border-slate-200'}`}>
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className={`text-xs sm:text-[10px] uppercase tracking-widest font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`}>
        {label}
      </p>
      <p className={`text-sm sm:text-xs font-semibold truncate mt-0.5 ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-800'}`}>
        {value ?? '—'}
      </p>
    </div>
  </div>
);


// ── Occupancy bar ────────────────────────────────────────────────────────────
const OccupancyBar: React.FC<{ current: number; capacity: number; theme: string; }> = ({
  current,
  capacity,
  theme
}) => {
  const pct = capacity > 0 ? Math.round((current / capacity) * 100) : 0;
  const isFull = current === capacity;
  const isOver = current > capacity;
  const available = Math.max(0, capacity - current);

  const badgeStyle = isOver
    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
    : isFull
      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
      : theme === 'dark'
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'bg-emerald-50 text-emerald-700 border border-emerald-200';

  const statusLabel = isOver
    ? `${current}/${capacity} (Over Capacity)`
    : isFull
      ? `${current}/${capacity} (Fully Occupied)`
      : `${current}/${capacity} Beds (${available} Available)`;

  const barColor = isOver
    ? 'bg-gradient-to-r from-rose-500 to-red-600'
    : isFull
      ? 'bg-gradient-to-r from-amber-500 to-orange-500'
      : 'bg-gradient-to-r from-emerald-500 to-teal-500';

  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex justify-between items-center">
        <span className={`text-xs sm:text-[10px] uppercase tracking-wider font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
          Occupancy Status
        </span>
        <span className={`text-xs sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full ${badgeStyle}`}>
          {statusLabel}
        </span>
      </div>
      <div className={`h-2.5 rounded-full overflow-hidden p-[1px] border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-gray-100 border-gray-200'}`}>
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
};

// ── Staff card (warden / caretaker) ─────────────────────────────────────────
const StaffCard: React.FC<{
  role: string;
  person: Warden | Caretaker | null;
  color: string;
  theme: string;
}> = ({ role, person, color, theme }) => {
  const initials = person?.name ? person.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
  const [imgError, setImgError] = useState(false);
  const profilePic = (person as any)?.profile_picture;

  useEffect(() => {
    setImgError(false);
  }, [profilePic]);

  return (
    <div
      className={`rounded-xl border p-3.5 flex flex-col gap-3 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30 group h-full ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}
    >
      <div className="flex items-center gap-2.5">
        {!imgError && profilePic ? (
          <img
            src={profilePic}
            alt={person?.name}
            className="w-9 h-9 rounded-lg object-cover flex-shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-semibold text-xs tracking-wider shadow-sm transition-transform duration-300 group-hover:scale-105 ${color}`}>
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-[12px] uppercase tracking-widest font-semibold ${theme === 'dark' ? 'text-primary' : 'text-blue-600'}`}>
            {role}
          </p>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <h3 className={`text-sm sm:text-base font-semibold truncate leading-snug ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
              {person?.name ?? 'Not Assigned'}
            </h3>
            {person && person.phone && (
              <a
                href={`tel:${person.phone}`}
                className={`p-1.5 rounded-lg border transition-all duration-200 hover:scale-105 flex items-center justify-center flex-shrink-0 ${theme === 'dark'
                    ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/50'
                    : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'
                  }`}
                title="Call Warden"
              >
                <FaPhone size={11} />
              </a>
            )}
          </div>
        </div>
      </div>

      {person ? (
        <div className="grid grid-cols-1 gap-1.5 pt-0.5 mt-auto">
          {person.email && (
            <a href={`mailto:${person.email}`} className="block hover:opacity-90 transition-opacity">
              <InfoRow icon={<FaEnvelope size={11} />} label="Email Address" value={person.email} theme={theme} />
            </a>
          )}
          {person.phone && (
            <a href={`tel:${person.phone}`} className="block hover:opacity-90 transition-opacity">
              <InfoRow icon={<FaPhone size={11} />} label="Contact Number" value={person.phone} theme={theme} />
            </a>
          )}
        </div>
      ) : (
        <div className={`py-3 text-center rounded-lg border border-dashed mt-auto ${theme === 'dark' ? 'border-border bg-slate-900/30' : 'border-gray-200 bg-gray-50'}`}>
          <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`}>
            No staff assigned to this hostel.
          </p>
        </div>
      )}
    </div>
  );
};


// ── Main component ───────────────────────────────────────────────────────────
const StudentHostelDetails: React.FC<{ readOnly?: boolean }> = ({ readOnly = false }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hostel, setHostel] = useState<HostelInfo | null>(null);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [warden, setWarden] = useState<Warden | null>(null);
  const [caretaker, setCaretaker] = useState<Caretaker | null>(null);
  const [todayMenus, setTodayMenus] = useState<any[]>([]);
  const [isRaiseIssueModalOpen, setIsRaiseIssueModalOpen] = useState(false);
  const [myIssues, setMyIssues] = useState<any[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [isGatePassModalOpen, setIsGatePassModalOpen] = useState(false);
  const [myGatePasses, setMyGatePasses] = useState<any[]>([]);
  const [loadingGatePasses, setLoadingGatePasses] = useState(false);
  const [hasLoadedGatePasses, setHasLoadedGatePasses] = useState(false);
  const [gatePassPage, setGatePassPage] = useState(1);
  const [totalGatePassPages, setTotalGatePassPages] = useState(1);
  const [totalGatePassCount, setTotalGatePassCount] = useState(0);
  const [issuePage, setIssuePage] = useState(1);
  const [totalIssuePages, setTotalIssuePages] = useState(1);
  const [totalIssueCount, setTotalIssueCount] = useState(0);
  const [hasLoadedIssues, setHasLoadedIssues] = useState(false);
  const [hasLoadedMeals, setHasLoadedMeals] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getStudentHostelDetails();
      if (!r.success) throw new Error(r.message || 'Failed to fetch');

      // Handle possible double-wrap from HMS API utility
      const data = r.data?.data ?? r.data ?? {};

      setRoom(data.room ?? null);
      setHostel(data.hostel ?? null);
      setWarden(data.warden ?? null);
      setCaretaker(data.caretaker ?? null);
    } catch (err: any) {

      setError(err.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const loadToday = async () => {
      try {
        const res = await getTodayMenuSummary(hostel?.id || room?.hostel);
        if (res.success && res.results) {
          setTodayMenus(res.results);
        } else if (res.success && Array.isArray(res.data)) {
          setTodayMenus(res.data);
        } else {
          setTodayMenus([]);
        }
      } catch (e) {
        setTodayMenus([]);
      } finally {
        setHasLoadedMeals(true);
      }
    };

    if (activeTab === 'meals' && !hasLoadedMeals && (hostel?.id || room?.hostel)) {
      loadToday();
    }
  }, [activeTab, hasLoadedMeals, hostel, room]);

  const loadGatePasses = async (page: number = 1) => {
    setLoadingGatePasses(true);
    try {
      const res = await getMyGatePasses(page);
      if (res.success && res.results) {
        setMyGatePasses(res.results);
        setTotalGatePassCount(res.count || res.results.length);
        setTotalGatePassPages(res.total_pages || 1);
      } else if (res.success && Array.isArray(res.data)) {
        setMyGatePasses(res.data);
        setTotalGatePassCount(res.data.length);
        setTotalGatePassPages(1);
      } else {
        setMyGatePasses([]);
        setTotalGatePassCount(0);
        setTotalGatePassPages(1);
      }
    } catch (e) {
      setMyGatePasses([]);
      setTotalGatePassCount(0);
      setTotalGatePassPages(1);
    } finally {
      setLoadingGatePasses(false);
      setHasLoadedGatePasses(true);
    }
  };

  useEffect(() => {
    if (activeTab === 'gate-passes') {
      loadGatePasses(gatePassPage);
    }
  }, [activeTab, gatePassPage]);

  const loadIssues = async (page: number = 1) => {
    setLoadingIssues(true);
    try {
      const res = await getMyIssues(page);
      if (res.success && res.results) {
        setMyIssues(res.results);
        setTotalIssueCount(res.count || res.results.length);
        setTotalIssuePages(res.total_pages || 1);
      } else if (res.success && Array.isArray(res.data)) {
        setMyIssues(res.data);
        setTotalIssueCount(res.data.length);
        setTotalIssuePages(1);
      } else {
        setMyIssues([]);
        setTotalIssueCount(0);
        setTotalIssuePages(1);
      }
    } catch (e) {
      setMyIssues([]);
      setTotalIssueCount(0);
      setTotalIssuePages(1);
    } finally {
      setLoadingIssues(false);
      setHasLoadedIssues(true);
    }
  };

  useEffect(() => {
    if (activeTab === 'issues') {
      loadIssues(issuePage);
    }
  }, [activeTab, issuePage]);



  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={`space-y-4 p-4 ${theme === 'dark' ? 'bg-background text-gray-200' : 'bg-gray-50 text-gray-900'}`}>
        <SkeletonCard className="h-28" />
        <SkeletonCard className="h-28" />
        <SkeletonCard className="h-28" />
      </div>);

  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        className={`rounded-xl border p-6 flex flex-col items-center gap-3 ${theme === 'dark' ? 'bg-destructive/10 border-destructive text-destructive-foreground' : 'bg-red-50 border-red-200 text-red-700'}`
        }>

        <FaExclamationCircle className="w-10 h-10 opacity-80" />
        <p className="font-semibold text-center">{error}</p>
        <button
          onClick={load}
          className={`mt-2 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'dark' ?
              'bg-destructive/20 hover:bg-destructive/40 text-destructive-foreground' :
              'bg-red-100 hover:bg-red-200 text-red-700'}`
          }>

          <FaSyncAlt className="w-3 h-3" /> Retry
        </button>
      </div>);

  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!hostel && !room) {
    return (
      <div className={`w-full space-y-4 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
        <Card id="hostel-details-card" className={`${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
          <CardHeader id="hostel-details-header" className="px-4 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-4 md:py-5 border-b flex flex-row items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
              <FaHotel className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className={`text-xl sm:text-2xl font-semibold tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                My Hostel Details
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                Your hostel accommodation information
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 space-y-6">
            <div className={`py-12 flex flex-col items-center justify-center text-center rounded-3xl border-2 border-dashed ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200 shadow-sm'}`}>
              <div className={`p-6 rounded-full ${theme === 'dark' ? 'bg-white/5' : 'bg-white shadow-md'} mb-4`}>
                <FaHotel className="h-12 w-12 text-primary/40" />
              </div>
              <h3 className={`text-xl font-semibold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>No Hostel Assigned</h3>
              <p className={`text-sm mt-2 max-w-sm mx-auto leading-relaxed ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                You haven't been assigned a hostel room yet. Please contact the hostel administration or the warden's office for your room allocation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roomTypeBadge = ROOM_TYPE_COLORS[room?.room_type ?? ''] ?? 'bg-gray-100 text-gray-600';

  return (
    <div className={`w-full space-y-4 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
      <Card id="hostel-details-card" className={theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}>
        <CardHeader id="hostel-details-header" className="px-4 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-4 md:py-5 border-b flex flex-row items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
            <FaHotel className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className={`text-xl sm:text-2xl font-semibold tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              My Hostel Details
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              Your hostel accommodation information
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 space-y-6">

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Mobile View: Select Dropdown */}
            <div className="block sm:hidden mb-5 w-full">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className={`w-full h-11 px-3.5 font-semibold text-sm rounded-xl border shadow-sm ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'
                  }`}>
                  <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}>
                  <SelectItem value="overview" className="py-2.5 font-medium">Overview</SelectItem>
                  <SelectItem value="gate-passes" className="py-2.5 font-medium">Gate Passes</SelectItem>
                  <SelectItem value="issues" className="py-2.5 font-medium">Issues</SelectItem>
                  <SelectItem value="meals" className="py-2.5 font-medium">Meals</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Desktop / Tablet View: Tabs List */}
            <TabsList className="hidden sm:grid w-full grid-cols-2 md:grid-cols-4 mb-6 h-auto gap-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="gate-passes">Gate Passes</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="meals">Meals</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0">
              {/* ── Hostel + Room + Warden row ────────────────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Hostel card */}
                {hostel && (
                  <div
                    className={`rounded-xl border p-3.5 shadow-sm hover:shadow-md transition-all duration-300 hover:border-purple-500/50 flex flex-col justify-between h-full ${theme === 'dark' ? 'bg-card border-purple-900/50' : 'bg-white border-purple-200'}`}
                  >
                    <div className="flex flex-col justify-between h-full w-full">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${theme === 'dark' ? 'bg-purple-950/40 text-purple-400 border border-purple-900/40' : 'bg-purple-50 text-purple-600 border border-purple-100'
                          }`}>
                          <FaBuilding className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className={`text-sm sm:text-base font-semibold truncate leading-tight ${theme === 'dark' ? 'text-card-foreground' : 'text-slate-900'}`}>
                            {hostel.name}
                          </h2>
                          <p className={`text-[9px] tracking-wider uppercase font-semibold mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {hostel.gender === 'M' ? 'BOYS HOSTEL' : 'GIRLS HOSTEL'}
                          </p>
                        </div>
                      </div>

                      {/* Location Info & Get Direction Button */}
                      {hostel.address && (() => {
                        const isCoords = (() => {
                          const parts = hostel.address.split(',').map(p => p.trim());
                          if (parts.length >= 2) {
                            const lat = parseFloat(parts[0]);
                            const lng = parseFloat(parts[1]);
                            return !isNaN(lat) && !isNaN(lng);
                          }
                          return false;
                        })();
                        return (
                          <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-2 mt-auto">
                            <InfoRow
                              icon={<FaMapMarkerAlt size={11} />}
                              label="Location"
                              value={isCoords ? `Coordinates: ${hostel.address.split(',').slice(0, 2).join(', ')}` : hostel.address}
                              theme={theme}
                            />
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                isCoords ? hostel.address.split(',').slice(0, 2).join(',') : hostel.address
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`w-full py-1.5 px-3 rounded-lg border text-xs font-semibold transition-all duration-200 hover:scale-[1.01] flex items-center justify-center gap-1.5 ${theme === 'dark'
                                  ? 'bg-purple-950/40 border-purple-800/40 text-purple-300 hover:bg-purple-900/50'
                                  : 'bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100'
                                }`}
                            >
                              <FaDirections size={12} className="flex-shrink-0" />
                              <span>Get Directions</span>
                            </a>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Room card */}
                {room && (
                  <div
                    className={`rounded-xl border p-3.5 shadow-sm hover:shadow-md transition-all duration-300 hover:border-indigo-500/30 flex flex-col justify-between h-full ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${theme === 'dark' ? 'bg-indigo-900/30 text-indigo-400 border border-indigo-800/40' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                            }`}>
                            <FaBed className="w-4 h-4" />
                          </div>
                          <div>
                            <p className={`text-[12px] uppercase tracking-widest font-semibold ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
                              Assigned Room
                            </p>
                            <h2 className={`text-sm sm:text-base font-semibold leading-tight ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
                              Room {room.room_number ?? '—'}
                            </h2>
                          </div>
                        </div>
                        {room && room.capacity && (
                          <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${roomTypeBadge}`}>
                            {room.capacity}-Sharing
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 pt-0.5">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col p-2 rounded-lg border border-dashed bg-slate-500/5 border-slate-500/10">
                            <span className={`text-[10px] uppercase tracking-widest font-semibold mb-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`}>
                              Floor Level
                            </span>
                            <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {room.floor !== 'N/A' ? `Floor ${room.floor}` : 'Ground Floor'}
                            </span>
                          </div>
                          <div className="flex flex-col p-2 rounded-lg border border-dashed bg-slate-500/5 border-slate-500/10">
                            <span className={`text-[10px] uppercase tracking-widest font-semibold mb-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`}>
                              Bed & Sharing
                            </span>
                            <span className={`text-xs font-semibold uppercase ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {room.capacity ? `${room.capacity} Sharing` : 'Assigned Bed'}
                            </span>
                          </div>
                        </div>

                        {room.capacity != null && room.current_occupancy != null && (
                          <OccupancyBar
                            current={room.current_occupancy!}
                            capacity={room.capacity!}
                            theme={theme}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Warden card */}
                <StaffCard
                  role="Hostel Warden"
                  person={warden}
                  color={theme === 'dark' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}
                  theme={theme} />

              </div>
            </TabsContent>

            <TabsContent value="issues" className="mt-0">
              {/* ── Issue Management Card (Combined) ──────────────────────────── */}
              {room &&
                <div className={`rounded-xl border shadow-sm ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>

                  {/* Section 1: Report an Issue */}
                  <div className={`p-6 bg-gradient-to-r ${theme === 'dark' ? 'from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-500/10' : 'from-amber-50/80 via-amber-50/30 to-transparent border-b border-amber-200/50'}`}>
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm shadow-amber-500/5`}>
                        <FaExclamationTriangle className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-lg font-semibold tracking-tight text-amber-600 dark:text-amber-400`}>
                          Report an Issue
                        </h3>
                        <p className={`text-sm mt-1.5 leading-relaxed text-muted-foreground max-w-2xl`}>
                          Have a maintenance problem, leak, or facility issue? Let us know and our team will resolve it within 2 days.
                        </p>
                        {!readOnly && (
                          <button
                            onClick={() => setIsRaiseIssueModalOpen(true)}
                            className="mt-4 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 shadow-md shadow-amber-500/15 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                          >
                            <FaExclamationTriangle className="w-3.5 h-3.5" />
                            Raise an Issue
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className={`h-px ${theme === 'dark' ? 'bg-border' : 'bg-gray-200'}`} />

                  {/* Section 2: Your Raised Issues */}
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <FaExclamationCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>Your Raised Issues</h3>
                        <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          Track all issues you've reported and their current status
                        </p>
                      </div>
                    </div>

                    {loadingIssues ?
                      <SkeletonList items={3} /> :
                      myIssues.length === 0 ?
                        <div className={`py-8 text-center rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-slate-900/30' : 'border-gray-200 bg-gray-50'}`}>
                          <FaExclamationCircle className={`w-10 h-10 mx-auto mb-2 opacity-50 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                            No issues raised yet
                          </p>
                          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>
                            Use the "Raise an Issue" button above to report your first issue
                          </p>
                        </div> :
                        <>
                          <div className="space-y-3">
                            {myIssues.map((issue) => {
                              const statusColors: Record<string, string> = {
                                pending: theme === 'dark' ? 'bg-yellow-900/30 text-yellow-300 border-yellow-700' : 'bg-yellow-50 text-yellow-800 border-yellow-200',
                                in_progress: theme === 'dark' ? 'bg-blue-900/30 text-blue-300 border-blue-700' : 'bg-blue-50 text-blue-800 border-blue-200',
                                waiting_for_workers: theme === 'dark' ? 'bg-orange-900/30 text-orange-300 border-orange-700' : 'bg-orange-50 text-orange-800 border-orange-200',
                                completed: theme === 'dark' ? 'bg-green-900/30 text-green-300 border-green-700' : 'bg-green-50 text-green-800 border-green-200'
                              };

                              const statusIcons: Record<string, React.ReactNode> = {
                                pending: <FaClock className="w-4 h-4 text-yellow-500" />,
                                in_progress: <FaCog className="w-4 h-4 text-blue-500 animate-spin" />,
                                waiting_for_workers: <FaHardHat className="w-4 h-4 text-orange-500" />,
                                completed: <FaCheckCircle className="w-4 h-4 text-green-500" />
                              };

                              const statusLabels: Record<string, string> = {
                                pending: 'Pending',
                                in_progress: 'In Progress',
                                waiting_for_workers: 'Waiting for Workers',
                                completed: 'Completed'
                              };

                              const colorClass = statusColors[issue.status] || statusColors.pending;
                              const statusLabel = statusLabels[issue.status] || issue.status;
                              const statusIcon = statusIcons[issue.status];

                              return (
                                <div
                                  key={issue.id}
                                  className={`rounded-lg border p-4 transition-all hover:shadow-md ${theme === 'dark' ? 'bg-slate-900/50 border-slate-700 hover:border-slate-600' : 'bg-gray-50/50 border-gray-200 hover:border-gray-300'}`}>

                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="flex items-center justify-center w-5 h-5 flex-shrink-0">{statusIcon}</span>
                                      <h4 className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {issue.title}
                                      </h4>
                                    </div>
                                    <div className={`w-fit px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${colorClass}`}>
                                      {statusLabel}
                                    </div>
                                  </div>
                                  <p className={`text-sm mb-3 leading-relaxed ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                                    {issue.description}
                                  </p>

                                  {/* Footer with timestamps and updates */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-gray-300/30">
                                    <p className={`text-xs flex items-center gap-1.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                      <FaCalendarAlt className="w-3 h-3 flex-shrink-0" />
                                      {new Date(issue.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(issue.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    {issue.update_count && issue.update_count > 0 &&
                                      <span className={`w-fit text-[11px] font-semibold px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                                        {issue.update_count} update{issue.update_count !== 1 ? 's' : ''}
                                      </span>
                                    }
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {/* Pagination Controls for Issues */}
                          {totalIssuePages > 1 && (
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground pt-6 mt-4 border-t border-border">
                              <div>
                                Showing {Math.min((issuePage - 1) * 10 + 1, totalIssueCount)} to {Math.min(issuePage * 10, totalIssueCount)} of {totalIssueCount} requests
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setIssuePage(prev => Math.max(1, prev - 1))}
                                  disabled={issuePage === 1 || loadingIssues}
                                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                                >
                                  Previous
                                </Button>

                                <div className="flex items-center justify-center min-w-[2rem]">
                                  <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                    {issuePage}
                                  </span>
                                </div>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setIssuePage(prev => Math.min(totalIssuePages, prev + 1))}
                                  disabled={issuePage === totalIssuePages || loadingIssues}
                                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                                >
                                  Next
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                    }
                  </div>
                </div>
              }
            </TabsContent>

            <TabsContent value="gate-passes" className="mt-0">
              {/* ── Gate Pass Request Card (Combined) ──────────────────────────── */}
              {room &&
                <div className={`rounded-xl border shadow-sm ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
                  {/* Section 1: Request a Gate Pass */}
                  <div className={`p-6 bg-gradient-to-r ${theme === 'dark' ? 'from-purple-500/10 via-purple-500/5 to-transparent border-b border-purple-500/10' : 'from-purple-50/80 via-purple-50/30 to-transparent border-b border-purple-200/50'}`}>
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-sm shadow-purple-500/5`}>
                        <FaLayerGroup className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-lg font-semibold tracking-tight text-purple-600 dark:text-purple-400`}>
                          Gate Pass Request
                        </h3>
                        <p className={`text-sm mt-1.5 leading-relaxed text-muted-foreground max-w-2xl`}>
                          Need to leave the campus? Submit a gate pass request here. Your assigned hostel warden will review and approve it.
                        </p>
                        {!readOnly && (
                          <button
                            onClick={() => setIsGatePassModalOpen(true)}
                            className="mt-4 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500 shadow-md shadow-purple-500/15 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                          >
                            <FaLayerGroup className="w-3.5 h-3.5" />
                            Request Gate Pass
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className={`h-px ${theme === 'dark' ? 'bg-border' : 'bg-gray-200'}`} />

                  {/* Section 2: Gate Pass History */}
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <FaCalendarAlt className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>Gate Pass History</h3>
                        <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          Track all your gate pass requests and status updates
                        </p>
                      </div>
                    </div>

                    {loadingGatePasses ?
                      <SkeletonList items={2} /> :
                      myGatePasses.length === 0 ?
                        <div className={`py-8 text-center rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-slate-900/30' : 'border-gray-200 bg-gray-50'}`}>
                          <FaLayerGroup className={`w-10 h-10 mx-auto mb-2 opacity-50 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                            No gate passes requested yet
                          </p>
                          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>
                            Submit a request above if you need to leave the campus.
                          </p>
                        </div> :
                        <>
                          <div className="space-y-3">
                            {myGatePasses.map((gp) => {
                              const statusColors: Record<string, string> = {
                                pending: theme === 'dark' ? 'bg-yellow-900/30 text-yellow-300 border-yellow-700' : 'bg-yellow-50 text-yellow-800 border-yellow-200',
                                approved: theme === 'dark' ? 'bg-green-900/30 text-green-300 border-green-700' : 'bg-green-50 text-green-800 border-green-200',
                                rejected: theme === 'dark' ? 'bg-red-900/30 text-red-300 border-red-700' : 'bg-red-50 text-red-800 border-red-200',
                                expired: theme === 'dark' ? 'bg-gray-800/40 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-700 border-gray-300',
                              };

                              const statusIcons: Record<string, React.ReactNode> = {
                                pending: <FaClock className="w-4 h-4 text-yellow-500" />,
                                approved: <FaCheckCircle className="w-4 h-4 text-green-500" />,
                                rejected: <FaExclamationCircle className="w-4 h-4 text-red-500" />,
                                expired: <FaClock className="w-4 h-4 text-gray-400" />,
                              };

                              const colorClass = statusColors[gp.status] || statusColors.pending;
                              const statusIcon = statusIcons[gp.status];

                              return (
                                <div
                                  key={gp.id}
                                  className={`rounded-lg border p-4 transition-all hover:shadow-md ${theme === 'dark' ? 'bg-slate-900/50 border-slate-700 hover:border-slate-600' : 'bg-gray-50/50 border-gray-200 hover:border-gray-300'}`}>

                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="flex items-center justify-center w-5 h-5 flex-shrink-0">{statusIcon}</span>
                                      <h4 className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {gp.reason}
                                      </h4>
                                    </div>
                                    <div className={`w-fit px-3 py-1 rounded-full text-xs font-semibold border capitalize whitespace-nowrap ${colorClass}`}>
                                      {gp.status}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-base sm:text-xs mb-3">
                                    <div>
                                      <span className="font-semibold text-muted-foreground uppercase tracking-wider block text-xs sm:text-[10px] mb-0.5">Out Time</span>
                                      <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{gp.out_date} at {formatTimeToAmPm(gp.out_time)}</span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-muted-foreground uppercase tracking-wider block text-xs sm:text-[10px] mb-0.5">Expected Return</span>
                                      <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{gp.expected_return_date} at {formatTimeToAmPm(gp.expected_return_time)}</span>
                                    </div>
                                  </div>

                                  {gp.action_note && (
                                    <div className={`p-2.5 rounded-lg text-base sm:text-xs mb-3 ${theme === 'dark' ? 'bg-slate-800 text-gray-300 border border-slate-700/50' : 'bg-slate-100 text-gray-700 border border-slate-200'}`}>
                                      <strong className="block text-xs sm:text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Warden Action Note</strong>
                                      {gp.action_note}
                                    </div>
                                  )}

                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-gray-300/30">
                                    <p className={`text-sm sm:text-xs flex items-center gap-1.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                      <FaCalendarAlt className="w-3.5 h-3.5 flex-shrink-0" />
                                      Requested on {new Date(gp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {/* Pagination Controls */}
                          {totalGatePassPages > 1 && (
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground pt-6 mt-4 border-t border-border">
                              <div>
                                Showing {Math.min((gatePassPage - 1) * 10 + 1, totalGatePassCount)} to {Math.min(gatePassPage * 10, totalGatePassCount)} of {totalGatePassCount} requests
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setGatePassPage(prev => Math.max(1, prev - 1))}
                                  disabled={gatePassPage === 1 || loadingGatePasses}
                                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                                >
                                  Previous
                                </Button>

                                <div className="flex items-center justify-center min-w-[2rem]">
                                  <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                    {gatePassPage}
                                  </span>
                                </div>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setGatePassPage(prev => Math.min(totalGatePassPages, prev + 1))}
                                  disabled={gatePassPage === totalGatePassPages || loadingGatePasses}
                                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                                >
                                  Next
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                    }
                  </div>
                </div>
              }
            </TabsContent>

            <TabsContent value="meals" className="mt-0">
              {/* ── Meal Management Section ──────────────────────────────────────── */}
              <div>
                <div className={`rounded-xl border p-4 shadow-sm ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className={`text-[10px] uppercase tracking-wider font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`}>Today's Menu</p>
                      <p className={`text-base font-semibold ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>Meals for today</p>
                    </div>
                  </div>

                  {todayMenus.length === 0 ? (
                    <div className={`py-8 text-center rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-slate-900/30' : 'border-gray-200 bg-gray-50'}`}>
                      <FaUtensils className={`w-10 h-10 mx-auto mb-2 opacity-50 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        No menus available for today
                      </p>
                      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>
                        Today's breakfast, lunch, and dinner plans will appear here once updated.
                      </p>
                    </div>
                  ) :

                    <div className="space-y-4">
                      {todayMenus.map((m) => {

                        return (
                          <div key={m.id}>
                            <div
                              className={`rounded-lg border p-4 ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>

                              <div className="mb-3 flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {getMealTypeLabel(m.meal_type_code || m.meal_label || '')}
                                  </h4>
                                  <div className="mt-1 flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2">
                                      <FaClock className={`h-3.5 w-3.5 flex-shrink-0 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {m.time_from && m.time_to ? `${formatTimeToAmPm(m.time_from)} - ${formatTimeToAmPm(m.time_to)}` : 'N/A'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2" />
                              </div>

                              {/* Menu Items */}
                              {m.items && m.items.length > 0 &&
                                <div className="flex flex-wrap gap-2">
                                  {m.items.map((item: any, idx: number) => {
                                    const isVeg = typeof item === 'object' ? item.vegetarian : true;
                                    const name = typeof item === 'object' ? item.name : item;
                                    return (
                                      <div
                                        key={idx}
                                        className={`rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1 ${isVeg ?
                                            theme === 'dark' ?
                                              'bg-green-900/30 text-green-300' :
                                              'bg-green-100 text-green-700' :
                                            theme === 'dark' ?
                                              'bg-red-900/30 text-red-300' :
                                              'bg-red-100 text-red-700'}`
                                        }>

                                        {isVeg ?
                                          <FaLeaf className="h-3 w-3" /> :

                                          <FaDrumstickBite className="h-3 w-3" />
                                        }
                                        {name}
                                      </div>);

                                  })}
                                </div>
                              }
                            </div>
                          </div>);

                      })}
                    </div>
                  }
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ── Raise Issue Modal ────────────────────────────────────────────── */}
      <RaiseIssueModal
        isOpen={isRaiseIssueModalOpen}
        onClose={() => setIsRaiseIssueModalOpen(false)}
        roomId={room?.id || 0}
        roomName={room?.room_number}
        onSuccess={() => {
          setIssuePage(1);
          loadIssues(1);

          toast({
            title: 'Issue Raised',
            description: 'Your issue has been successfully reported to the hostel management.',
            variant: 'default'
          });
        }} />

      {/* ── Request Gate Pass Modal ────────────────────────────────────── */}
      <RequestGatePassModal
        isOpen={isGatePassModalOpen}
        onClose={() => setIsGatePassModalOpen(false)}
        onSuccess={() => {
          setGatePassPage(1);
          loadGatePasses(1);
        }}
      />
    </div>
  );
};

export default StudentHostelDetails;