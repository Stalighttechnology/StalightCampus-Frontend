import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getHostelManagementInit, getFloorsByHostel, getRoomsByHostelId, getDashboardStats, getHostelNames } from '../utils/hms_api';
import { useToast } from '../hooks/use-toast';
import { useAuth } from './AuthContext';

interface Hostel {
  id: number;
  name: string;
  gender: 'M' | 'F';
  warden: number | null;
  caretaker: number | null;
  warden_name?: string;
  caretaker_name?: string;
  floor_count?: number;
}

interface Warden {
  id: number;
  name: string;
}

interface Caretaker {
  id: number;
  name: string;
}

interface Stats {
  total_hostels: number;
  total_rooms: number;
  total_students: number;
  total_wardens: number;
  total_caretakers: number;
  occupancy_rate: number;
}

interface HMSContextType {
  hostels: Hostel[];
  wardens: Warden[];
  caretakers: Caretaker[];
  statistics: Stats;
  loading: boolean;
  skeletonMode: boolean;
  setSkeletonMode: (val: boolean) => void;
  refreshData: (force?: boolean) => Promise<void>;
  fetchDashboardStats: (force?: boolean) => Promise<void>;
  fetchHostelsOnly: () => Promise<any[]>;
  setHostels: React.Dispatch<React.SetStateAction<Hostel[]>>;
  setWardens: React.Dispatch<React.SetStateAction<Warden[]>>;
  setCaretakers: React.Dispatch<React.SetStateAction<Caretaker[]>>;
  setStatistics: React.Dispatch<React.SetStateAction<Stats>>;
  getCachedFloors: (hostelId: number) => Promise<number[]>;
  getCachedRooms: (hostelId: number, floor?: string) => Promise<any[]>;
  updateRoomStudentCount: (hostelId: number, roomId: number, delta: number) => void;
}

const HMSContext = createContext<HMSContextType | undefined>(undefined);

let cachedInitData: any = null;

export const HMSProvider: React.FC<{children: React.ReactNode;}> = ({ children }) => {
  const { role } = useAuth();
  const [hostels, setHostels] = useState<Hostel[]>(cachedInitData?.hostels || []);
  const [wardens, setWardens] = useState<Warden[]>(cachedInitData?.wardens || []);
  const [caretakers, setCaretakers] = useState<Caretaker[]>(cachedInitData?.caretakers || []);
  const [statistics, setStatistics] = useState<Stats>(cachedInitData?.statistics || {
    total_hostels: 0,
    total_rooms: 0,
    total_students: 0,
    total_wardens: 0,
    total_caretakers: 0,
    occupancy_rate: 0
  });
  const [loading, setLoading] = useState(false);
  const [skeletonMode, setSkeletonMode] = useState(false);
  const floorCache = useRef<Record<number, number[]>>({});
  const roomCache = useRef<Record<string, any[]>>({});
  const pendingFloorRequests = useRef<Record<number, Promise<number[]>>>({});
  const pendingRoomRequests = useRef<Record<string, Promise<any[]>>>({});
  const pendingStatsRequest = useRef<Promise<void> | null>(null);
  const { toast } = useToast();

  const getCachedFloors = async (hostelId: number) => {
    if (floorCache.current[hostelId]) return floorCache.current[hostelId];
    if (pendingFloorRequests.current[hostelId]) return pendingFloorRequests.current[hostelId];

    const promise = (async () => {
      const response = await getFloorsByHostel(hostelId);
      if (response.success && response.results) {
        floorCache.current[hostelId] = response.results;
        return response.results;
      }
      return [];
    })();

    pendingFloorRequests.current[hostelId] = promise;
    const result = await promise;
    delete pendingFloorRequests.current[hostelId];
    return result;
  };

  const getCachedRooms = async (hostelId: number, floor?: string) => {
    const cacheKey = `${hostelId}-${floor || 'all'}`;
    if (roomCache.current[cacheKey]) return roomCache.current[cacheKey];
    if (pendingRoomRequests.current[cacheKey]) return pendingRoomRequests.current[cacheKey];

    const promise = (async () => {
      const response = await getRoomsByHostelId(hostelId, floor);
      if (response.success && response.rooms) {
        roomCache.current[cacheKey] = response.rooms;
        return response.rooms;
      } else if (response.success && response.data?.rooms) {
        roomCache.current[cacheKey] = response.data.rooms;
        return response.data.rooms;
      } else if (response.success && response.results) {
        roomCache.current[cacheKey] = response.results;
        return response.results;
      }
      return [];
    })();

    pendingRoomRequests.current[cacheKey] = promise;
    const result = await promise;
    delete pendingRoomRequests.current[cacheKey];
    return result;
  };

  const updateRoomStudentCount = (hostelId: number, roomId: number, delta: number) => {
    // Update all relevant cache keys (specific floor and 'all')
    Object.keys(roomCache.current).forEach((key) => {
      if (key.startsWith(`${hostelId}-`)) {
        roomCache.current[key] = roomCache.current[key].map((room: any) =>
        room.id === roomId ? { ...room, student_count: Math.max(0, (room.student_count || 0) + delta) } : room
        );
      }
    });
  };

  const refreshData = async (force = false) => {
    if (force) {
      cachedInitData = null;
    }
    if (!force && cachedInitData) {
      return;
    }
    setLoading(true);
    // Clear cache on full refresh
    floorCache.current = {};
    roomCache.current = {};
    try {
      const response = await getHostelManagementInit();
      if (response.success) {
        const rawData = response.data || response;
        setHostels(rawData.hostels || []);
        setWardens(rawData.wardens || []);
        setCaretakers(rawData.caretakers || []);
        cachedInitData = rawData;
      }
    } catch (error) {

      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load hostel management data"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async (force = false) => {
    if (force) {
      cachedInitData = null;
    }
    if (!force && cachedInitData && cachedInitData.statistics && cachedInitData.statistics.total_hostels > 0) {
      return;
    }
    if (pendingStatsRequest.current) {
      return pendingStatsRequest.current;
    }

    const promise = (async () => {
      setLoading(true);
      // Clear cache on full refresh
      floorCache.current = {};
      roomCache.current = {};
      try {
        const response = await getDashboardStats();
        if (response.success) {
          const rawData = response.data || response;
          setHostels(rawData.hostels || []);
          setWardens(rawData.wardens || []);
          setCaretakers(rawData.caretakers || []);
          if (rawData.statistics) {
            setStatistics(rawData.statistics);
          }
          cachedInitData = rawData;
        }
      } catch (error) {
        console.error("HMSContext - Error fetching dashboard statistics:", error);
      } finally {
        setLoading(false);
        pendingStatsRequest.current = null;
      }
    })();

    pendingStatsRequest.current = promise;
    return promise;
  };

  const fetchHostelsOnly = async (): Promise<any[]> => {
    try {
      const response = await getHostelNames();
      if (response.success && response.results) {
        setHostels(response.results);
        return response.results;
      }
    } catch (error) {
      console.error("HMSContext - Error fetching hostel names:", error);
    }
    return [];
  };

  useEffect(() => {
    if (!role) {
      // Clear data on logout
      setHostels([]);
      setWardens([]);
      setCaretakers([]);
      setStatistics({
        total_hostels: 0,
        total_rooms: 0,
        total_students: 0,
        total_wardens: 0,
        total_caretakers: 0,
        occupancy_rate: 0
      });
      cachedInitData = null;
      floorCache.current = {};
      roomCache.current = {};
    }
  }, [role]);

  useEffect(() => {
    if (!loading && (hostels.length > 0 || wardens.length > 0 || caretakers.length > 0)) {
      cachedInitData = {
        hostels,
        wardens,
        caretakers,
        statistics
      };
    }
  }, [hostels, wardens, caretakers, statistics, loading]);

  return (
    <HMSContext.Provider value={{
      hostels,
      wardens,
      caretakers,
      statistics,
      loading,
      skeletonMode,
      setSkeletonMode,
      refreshData,
      fetchDashboardStats,
      fetchHostelsOnly,
      setHostels,
      setWardens,
      setCaretakers,
      setStatistics,
      getCachedFloors,
      getCachedRooms,
      updateRoomStudentCount
    }}>
      {children}
    </HMSContext.Provider>);

};

export const useHMSContext = () => {
  const context = useContext(HMSContext);
  if (context === undefined) {
    throw new Error('useHMSContext must be used within an HMSProvider');
  }
  return context;
};