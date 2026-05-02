import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getAcademicInit } from '../utils/hms_api';
import { getSemesters as getSemestersApi } from '../utils/student_api';

export interface Batch {
  id: number;
  name: string;
}

export interface Branch {
  id: number;
  name: string;
}

export interface Semester {
  id: string;
  number: number;
}

interface AcademicContextType {
  batches: Batch[];
  branches: Branch[];
  loading: boolean;
  refreshAcademicData: () => Promise<void>;
  getSemestersForBranch: (branchId: number) => Promise<Semester[]>;
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

let cachedBatches: Batch[] | null = null;
let cachedBranches: Branch[] | null = null;
let cachedSemestersMap: Record<string, Semester[]> | null = null;

export const AcademicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [batches, setBatches] = useState<Batch[]>(cachedBatches || []);
  const [branches, setBranches] = useState<Branch[]>(cachedBranches || []);
  const [semestersMap, setSemestersMap] = useState<Record<string, Semester[]>>(cachedSemestersMap || {});
  const [loading, setLoading] = useState(false);
  const fetchRef = useRef(false);
  const semesterCache = useRef<Record<number, Semester[]>>({});

  const refreshAcademicData = async () => {
    if (cachedBatches && cachedBranches) {
      return;
    }
    try {
      setLoading(true);
      const response = await getAcademicInit();
      console.log('Academic Init Response:', response);
      
      if (response.success && response.data) {
        const rawData = response.data.data || response.data;
        const batchesData = rawData.batches || response.data.batches || [];
        const branchesData = rawData.branches || response.data.branches || [];
        const semsMap = rawData.semesters_by_branch || response.data.semesters_by_branch || {};
        
        setBatches(batchesData);
        setBranches(branchesData);
        setSemestersMap(semsMap);
        
        cachedBatches = batchesData;
        cachedBranches = branchesData;
        cachedSemestersMap = semsMap;
        
        // Clear semester cache on full refresh to avoid stale data
        semesterCache.current = {};
      }
    } catch (error) {
      console.error('Failed to fetch academic data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSemestersForBranch = async (branchId: number): Promise<Semester[]> => {
    if (!branchId || isNaN(branchId)) return [];
    
    // Check local pre-loaded map first (Performance Optimization)
    const bIdStr = branchId.toString();
    if (semestersMap[bIdStr]) {
      console.log('[CACHE] Using pre-loaded semesters for branch:', branchId);
      return semestersMap[bIdStr];
    }

    if (semesterCache.current[branchId]) return semesterCache.current[branchId];
    
    try {
      console.log('[API] Fetching semesters for branch:', branchId);
      const response = await getSemestersApi(bIdStr);
      let results: Semester[] = [];
      
      if (response && response.success && response.data) {
        results = Array.isArray(response.data) ? response.data : (response.data.results || []);
      } else if (Array.isArray(response)) {
        results = response;
      } else if (response && response.results) {
        results = response.results;
      }
      
      if (results.length > 0) {
        semesterCache.current[branchId] = results;
      }
      return results;
    } catch (error) {
      console.error('Failed to fetch semesters:', error);
      return [];
    }
  };

  useEffect(() => {
    const role = localStorage.getItem('role');
    const isWardenPath = window.location.pathname.includes('/warden');
    
    if (!fetchRef.current && role !== 'warden' && !isWardenPath) {
      refreshAcademicData();
      fetchRef.current = true;
    }
  }, []);

  return (
    <AcademicContext.Provider value={{ batches, branches, loading, refreshAcademicData, getSemestersForBranch }}>
      {children}
    </AcademicContext.Provider>
  );
};

export const useAcademicContext = () => {
  const context = useContext(AcademicContext);
  if (context === undefined) {
    throw new Error('useAcademicContext must be used within an AcademicProvider');
  }
  return context;
};
