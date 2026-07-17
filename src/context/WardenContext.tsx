import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getWardenDashboard, WardenStats } from '../utils/warden_api';
import { useAuth } from './AuthContext';

interface Hostel {
  id: number;
  name: string;
  gender: string;
  room_count: number;
  student_count: number;
}

interface WardenContextType {
  managedHostels: Hostel[];
  wardenFloorsMap: Record<number, number[]>;
  wardenName: string;
  stats: WardenStats | null;
  loading: boolean;
  refreshWardenData: () => Promise<void>;
}

export const WardenContext = createContext<WardenContextType | undefined>(undefined);

export const WardenProvider: React.FC<{children: React.ReactNode;}> = ({ children }) => {
  const { role } = useAuth();
  const [managedHostels, setManagedHostels] = useState<Hostel[]>([]);
  const [wardenFloorsMap, setWardenFloorsMap] = useState<Record<number, number[]>>({});
  const [wardenName, setWardenName] = useState("");
  const [stats, setStats] = useState<WardenStats | null>(null);
  const [loading, setLoading] = useState(true);

  const isFetchingRef = useRef(false);

  const refreshWardenData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const result = await getWardenDashboard();
      if (result.success) {
        setManagedHostels(result.data.hostels);
        setWardenFloorsMap(result.data.hostel_floors || {});
        setWardenName(result.warden_name);
        setStats(result.statistics);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    // Only fetch if the user is actually a warden
    const isWardenPath = window.location.pathname.includes('/warden');

    if (role === 'warden' || isWardenPath) {
      refreshWardenData();
    } else {
      // Clear data if not warden/warden path or logged out
      setManagedHostels([]);
      setWardenFloorsMap({});
      setWardenName("");
      setStats(null);
      setLoading(false);
    }
  }, [role]);

  return (
    <WardenContext.Provider value={{ managedHostels, wardenFloorsMap, wardenName, stats, loading, refreshWardenData }}>
      {children}
    </WardenContext.Provider>);

};

export const useWardenContext = () => {
  const context = useContext(WardenContext);
  if (context === undefined) {
    throw new Error('useWardenContext must be used within a WardenProvider');
  }
  return context;
};