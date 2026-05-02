import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFacultyAssignments, FacultyAssignment } from '../utils/faculty_api';

interface FacultyAssignmentsContextType {
  assignments: FacultyAssignment[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isLoaded: boolean;
}

const FacultyAssignmentsContext = createContext<FacultyAssignmentsContextType | undefined>(undefined);

interface FacultyAssignmentsProviderProps {
  children: ReactNode;
}

export const FacultyAssignmentsProvider: React.FC<FacultyAssignmentsProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();

  const {
    data: assignments = [],
    isLoading: loading,
    error,
    refetch,
    isSuccess: isLoaded
  } = useQuery({
    queryKey: ['facultyAssignments'],
    queryFn: async () => {
      const response = await getFacultyAssignments();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch faculty assignments');
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  const contextValue: FacultyAssignmentsContextType = {
    assignments,
    loading,
    error: error?.message || null,
    refetch,
    isLoaded
  };

  return (
    <FacultyAssignmentsContext.Provider value={contextValue}>
      {children}
    </FacultyAssignmentsContext.Provider>
  );
};

export const useFacultyAssignments = (): FacultyAssignmentsContextType => {
  const context = useContext(FacultyAssignmentsContext);
  if (context === undefined) {
    throw new Error('useFacultyAssignments must be used within a FacultyAssignmentsProvider');
  }
  return context;
};