import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProctorStudents, ProctorStudent } from '../utils/faculty_api';

interface ProctorStudentsContextType {
  proctorStudents: ProctorStudent[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isLoaded: boolean;
}

const ProctorStudentsContext = createContext<ProctorStudentsContextType | undefined>(undefined);

interface ProctorStudentsProviderProps {
  children: ReactNode;
}

export const ProctorStudentsProvider: React.FC<ProctorStudentsProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();

  const {
    data: proctorStudents = [],
    isLoading: loading,
    error,
    refetch,
    isSuccess: isLoaded
  } = useQuery({
    queryKey: ['proctorStudents'],
    queryFn: async () => {
      const response = await getProctorStudents();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch proctor students');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const contextValue: ProctorStudentsContextType = {
    proctorStudents,
    loading,
    error: error?.message || null,
    refetch,
    isLoaded
  };

  return (
    <ProctorStudentsContext.Provider value={contextValue}>
      {children}
    </ProctorStudentsContext.Provider>
  );
};

export const useProctorStudents = (): ProctorStudentsContextType => {
  const context = useContext(ProctorStudentsContext);
  if (context === undefined) {
    throw new Error('useProctorStudents must be used within a ProctorStudentsProvider');
  }
  return context;
};