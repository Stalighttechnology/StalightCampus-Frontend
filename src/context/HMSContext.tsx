import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getHostelManagementInit, getDashboardStats, getHostelNames } from '../utils/hms_api';
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
  const pendingStatsRequest = useRef<Promise<void> | null>(null);
  const { toast } = useToast();



  const refreshData = async () => {
    setLoading(true);
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
      // Clear any stale pending request so a fresh one is made
      cachedInitData = null;
      pendingStatsRequest.current = null;
    }
    if (!force && cachedInitData && cachedInitData.statistics && cachedInitData.statistics.total_hostels > 0) {
      return;
    }
    if (pendingStatsRequest.current) {
      return pendingStatsRequest.current;
    }

    const promise = (async () => {
      setLoading(true);
      try {
        const response = await getDashboardStats();
        if (response.success) {
          const rawData = response.data || response;
          if (rawData.hostels) {
            setHostels(rawData.hostels);
          }
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
    }
  }, [role]);



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