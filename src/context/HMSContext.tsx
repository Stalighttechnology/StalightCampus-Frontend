import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getHostelManagementInit } from '../utils/hms_api';
import { useToast } from '../hooks/use-toast';

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
  setHostels: React.Dispatch<React.SetStateAction<Hostel[]>>;
  getCachedFloors: (hostelId: number) => Promise<number[]>;
  getCachedRooms: (hostelId: number, floor?: string) => Promise<any[]>;
}

const HMSContext = createContext<HMSContextType | undefined>(undefined);

let cachedInitData: any = null;

export const HMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
  const [loading, setLoading] = useState(!cachedInitData);
  const [skeletonMode, setSkeletonMode] = useState(false);
  const floorCache = useRef<Record<number, number[]>>({});
  const roomCache = useRef<Record<string, any[]>>({});
  const { toast } = useToast();
  const fetchRef = useRef(false);

  const getCachedFloors = async (hostelId: number) => {
    if (floorCache.current[hostelId]) return floorCache.current[hostelId];
    
    const { getFloorsByHostel } = await import('../utils/hms_api');
    const response = await getFloorsByHostel(hostelId);
    if (response.success && response.results) {
      floorCache.current[hostelId] = response.results;
      return response.results;
    }
    return [];
  };

  const getCachedRooms = async (hostelId: number, floor?: string) => {
    const cacheKey = `${hostelId}-${floor || 'all'}`;
    if (roomCache.current[cacheKey]) return roomCache.current[cacheKey];

    const { getRoomsByHostelId } = await import('../utils/hms_api');
    const response = await getRoomsByHostelId(hostelId, floor);
    if (response.success && response.data?.rooms) {
      roomCache.current[cacheKey] = response.data.rooms;
      return response.data.rooms;
    } else if (response.success && response.results) {
      roomCache.current[cacheKey] = response.results;
      return response.results;
    }
    return [];
  };

  const refreshData = async (force = false) => {
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
        if (rawData.statistics) {
          setStatistics(rawData.statistics);
        }
        cachedInitData = rawData;
      }
    } catch (error) {
      console.error('Failed to fetch HMS initial data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load hostel management data",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem('role');
    const isWardenPath = window.location.pathname.includes('/warden');
    
    if (!fetchRef.current && role !== 'warden' && !isWardenPath) {
      refreshData();
      fetchRef.current = true;
    }
  }, []);

  return (
    <HMSContext.Provider value={{ hostels, wardens, caretakers, statistics, loading, skeletonMode, setSkeletonMode, refreshData, setHostels, getCachedFloors, getCachedRooms }}>
      {children}
    </HMSContext.Provider>
  );
};

export const useHMSContext = () => {
  const context = useContext(HMSContext);
  if (context === undefined) {
    throw new Error('useHMSContext must be used within an HMSProvider');
  }
  return context;
};
