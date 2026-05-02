import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProctorStudents,
  getFacultyAssignments,
  ProctorStudent,
  FacultyAssignment,
  takeAttendance,
  TakeAttendanceRequest,
  uploadInternalMarks,
  UploadMarksRequest,
  createAnnouncement,
  CreateAnnouncementRequest,
  applyLeave,
  ApplyLeaveRequest,
  manageProfile,
  ManageProfileRequest,
  scheduleMentoring,
  ScheduleMentoringRequest,
  manageStudentLeave,
  getFacultyNotifications,
  getFacultySentNotifications,
  getAttendanceRecordsList,
  getAttendanceRecordDetails,
  getInternalMarksForClass,
  getStudentsForClass,
  ClassStudent,
  InternalMarkStudent
} from '../utils/faculty_api';

// Student API imports
import {
  getStudentAttendance,
  getInternalMarks,
  getNotifications,
  submitLeaveRequest,
  updateProfile,
  uploadCertificate,
  getCertificates,
  deleteCertificate,
  getStudentStudyMaterials,
  getStudentAssignments,
  GetStudentAttendanceResponse,
  GetInternalMarksResponse,
  GetNotificationsResponse,
  SubmitLeaveRequestRequest,
  UpdateProfileRequest,
  UploadCertificateRequest,
  GetCertificatesResponse,
  DeleteCertificateRequest,
} from '../utils/student_api';

import { fetchWithTokenRefresh } from '../utils/authService';
import { API_ENDPOINT } from '../utils/config';
import { usePagination, useInfiniteScroll, useOptimisticUpdate } from './useOptimizations';
import { getLeaveRequests } from '../utils/student_api';

// Custom hooks for data fetching
export const useProctorStudentsQuery = (enabled: boolean = true, include?: string | string[], examPeriod?: string, onlyWithLeaves: boolean = false) => {
  const pagination = usePagination({
    queryKey: ['proctorStudents', examPeriod || ''],
    pageSize: 20,
  });

  return {
    ...useQuery({
      queryKey: pagination.queryKey,
      queryFn: async (): Promise<{ data: ProctorStudent[]; pagination: any }> => {
        const response = await getProctorStudents({
          page: pagination.page,
          page_size: pagination.pageSize,
          include: include,
          exam_period: examPeriod,
          only_with_leaves: onlyWithLeaves,
        });
        if (response.success && response.data) {
          pagination.updatePagination(response);
          return { data: response.data, pagination: response.pagination };
        }
        throw new Error(response.message || 'Failed to fetch proctor students');
      },
      enabled, // allow caller to control when to fetch
    }),
    pagination,
  };
};

export const useProctorExamStatusQuery = (examPeriod: string, page: number, pageSize: number, enabled: boolean = true) => {
  // Request only essential fields for the status map
  const fields = 'id,user_id,name,usn,branch,semester,section,status';
  return useQuery({
    queryKey: ['proctorExamStatus', examPeriod, page, pageSize, fields],
    queryFn: async () => {
      const response = await fetchWithTokenRefresh(
        `${API_ENDPOINT}/faculty/proctor-students/with-exam-status/?exam_period=${examPeriod}&page=${page}&page_size=${pageSize}&include=${fields}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );
      const result = await response.json();
      if (result.success) return result.data;
      throw new Error(result.message || 'Failed to fetch exam statuses');
    },
    enabled,
    staleTime: 1000 * 30, // 30 seconds
  });
};

export const useFacultyAssignmentsQuery = () => {
  return useQuery({
    queryKey: ['facultyAssignments'],
    queryFn: async (): Promise<FacultyAssignment[]> => {
      const response = await getFacultyAssignments();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch faculty assignments');
    },
    // Keep assignments cached for a short period to avoid duplicate calls on rapid remounts
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

// Student-specific optimized hooks

// Student Attendance with Pagination
export const useStudentAttendanceQuery = () => {
  const pagination = usePagination({
    queryKey: ['studentAttendance'],
    pageSize: 50,
  });

  return {
    ...useQuery({
      queryKey: pagination.queryKey,
      queryFn: async (): Promise<GetStudentAttendanceResponse> => {
        const response = await getStudentAttendance();
        pagination.updatePagination(response);
        return response;
      },
    }),
    pagination,
  };
};

// Student Internal Marks with Pagination
export const useStudentInternalMarksQuery = () => {
  const pagination = usePagination({
    queryKey: ['studentInternalMarks'],
    pageSize: 50,
  });

  return {
    ...useQuery({
      queryKey: pagination.queryKey,
      queryFn: async (): Promise<GetInternalMarksResponse> => {
        const response = await getInternalMarks();
        pagination.updatePagination(response);
        return response;
      },
    }),
    pagination,
  };
};

// Student Notifications with Infinite Scroll
export const useStudentNotificationsQuery = () => {
  const infiniteScroll = useInfiniteScroll(['studentNotifications'], async () => {
    // This would be implemented with pagination parameters
    // For now, we'll keep it simple
  });

  return {
    ...useQuery({
      queryKey: ['studentNotifications'],
      queryFn: async (): Promise<GetNotificationsResponse> => {
        const response = await getNotifications();
        return response;
      },
    }),
    infiniteScroll,
  };
};

// Student Study Materials with Lazy Loading
export const useStudentStudyMaterialsQuery = (enabled: boolean = false) => {
  return useQuery({
    queryKey: ['studentStudyMaterials'],
    queryFn: async () => {
      const response = await getStudentStudyMaterials();
      return response;
    },
    enabled, // Only fetch when explicitly enabled (lazy loading)
  });
};

// Student Leave Requests with react-query
export const useStudentLeaveRequestsQuery = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['studentLeaveRequests'],
    queryFn: async () => {
      const response = await getLeaveRequests();
      if (!response.success) throw new Error(response.message || 'Failed to fetch leave requests');
      return response.leave_requests || [];
    },
    enabled,
    staleTime: 1000 * 30, // 30s
    refetchOnWindowFocus: false,
  });
};

// Historical Student Data with Lazy Loading
export const useHistoricalStudentDataQuery = (enabled: boolean = false) => {
  return useQuery({
    queryKey: ['historicalStudentData'],
    queryFn: async () => {
      const response = await getStudentAssignments();
      return response;
    },
    enabled, // Only fetch when explicitly enabled (lazy loading)
  });
};

// Student Certificates with Pagination
export const useStudentCertificatesQuery = () => {
  const pagination = usePagination({
    queryKey: ['studentCertificates'],
    pageSize: 20,
  });

  return {
    ...useQuery({
      queryKey: pagination.queryKey,
      queryFn: async (): Promise<GetCertificatesResponse> => {
        const response = await getCertificates();
        pagination.updatePagination(response);
        return response;
      },
    }),
    pagination,
  };
};

// Custom hooks for mutations (if needed in the future)
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();

  return {
    invalidateProctorStudents: () => queryClient.invalidateQueries({ queryKey: ['proctorStudents'] }),
    invalidateFacultyAssignments: () => queryClient.invalidateQueries({ queryKey: ['facultyAssignments'] }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
};

// Mutation hooks with cache invalidation
export const useTakeAttendanceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TakeAttendanceRequest) => takeAttendance(data),
    onSuccess: () => {
      // Invalidate attendance-related queries
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
    },
  });
};

export const useUploadMarksMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UploadMarksRequest) => uploadInternalMarks(data),
    onSuccess: () => {
      // Invalidate marks-related queries
      queryClient.invalidateQueries({ queryKey: ['internalMarks'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
};

export const useCreateAnnouncementMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAnnouncementRequest) => createAnnouncement(data),
    onSuccess: () => {
      // Invalidate notifications
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useApplyLeaveMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ApplyLeaveRequest) => applyLeave(data),
    onSuccess: () => {
      // Invalidate leave-related queries
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
    },
  });
};

export const useManageProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ManageProfileRequest) => manageProfile(data),
    onSuccess: () => {
      // Invalidate profile-related queries
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

export const useScheduleMentoringMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ScheduleMentoringRequest) => scheduleMentoring(data),
    onSuccess: () => {
      // Invalidate mentoring-related queries
      queryClient.invalidateQueries({ queryKey: ['mentoring'] });
    },
  });
};

export const useManageStudentLeaveMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leave_id, action }: { leave_id: string; action: 'APPROVE' | 'REJECT' }) =>
      manageStudentLeave({ leave_id, action }),
    onSuccess: () => {
      // Invalidate leave-related queries
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['studentLeaves'] });
    },
  });
};

// Student-specific mutations with optimistic updates

// Optimistic Profile Update
export const useStudentProfileUpdateMutation = () => {
  return useOptimisticUpdate(
    async (data: UpdateProfileRequest) => {
      const response = await updateProfile(data);
      if (!response.success) {
        throw new Error(response.message || 'Failed to update profile');
      }
      return response;
    },
    ['studentProfile'],
    (oldData, newData) => {
      // Optimistically update the profile data
      return { ...oldData, ...newData };
    }
  );
};

// Optimistic Leave Request Submission
export const useStudentLeaveRequestMutation = () => {
  const queryClient = useQueryClient();
  return useOptimisticUpdate(
    async (data: SubmitLeaveRequestRequest) => {
      const response = await submitLeaveRequest(data);
      if (!response.success) {
        throw new Error(response.message || 'Failed to submit leave request');
      }
      return response;
    },
    ['studentLeaveRequests'],
    (oldData, newData) => {
      // Optimistically add the new leave request
      const optimisticLeave = {
        id: `temp-${Date.now()}`,
        start_date: newData.start_date,
        end_date: newData.end_date,
        title: newData.title || 'N/A',
        reason: newData.reason,
        status: 'PENDING',
        submitted_at: new Date().toISOString(),
      };
      return oldData ? [optimisticLeave, ...oldData] : [optimisticLeave];
    }
    , { 
        refetchOnSettled: false,
        onSuccess: (response) => {
          if (response.success && response.leave_request) {
            queryClient.setQueryData(['studentLeaveRequests'], (oldData: any) => {
              if (!oldData) return [response.leave_request];
              // Replace the most recent temporary entry with the actual response
              const newData = [...oldData];
              const tempIndex = newData.findIndex(item => item.id.toString().startsWith('temp-'));
              if (tempIndex !== -1) {
                newData[tempIndex] = response.leave_request;
              }
              return newData;
            });
          }
        }
      }
  );
};

// Optimistic Certificate Upload
export const useStudentCertificateUploadMutation = () => {
  return useOptimisticUpdate(
    async (data: UploadCertificateRequest) => {
      const response = await uploadCertificate(data);
      if (!response.success) {
        throw new Error(response.message || 'Failed to upload certificate');
      }
      return response;
    },
    ['studentCertificates'],
    (oldData, newData) => {
      // Optimistically add the new certificate
      const optimisticCert = {
        id: `temp-${Date.now()}`,
        description: newData.description || 'New Certificate',
        file_url: '#', // Placeholder URL
        uploaded_at: new Date().toISOString(),
      };
      return oldData ? [...oldData, optimisticCert] : [optimisticCert];
    }
  );
};

// Certificate Delete Mutation
export const useStudentCertificateDeleteMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteCertificateRequest) => {
      const response = await deleteCertificate(data);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete certificate');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentCertificates'] });
    },
  });
};