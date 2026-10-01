import { API_BASE_URL } from "./config";
import { fetchWithTokenRefresh } from "./authService";

export interface StudentActivityRecord {
  id: number;
  org: number;
  student: number;
  student_name: string;
  usn: string;
  branch_name: string;
  batch_name: string;
  semester_name: string;
  participation_type?: 'solo' | 'team';
  participation_type_display?: string;
  team_name?: string | null;
  team_role?: 'captain' | 'vice_captain' | 'member';
  team_role_display?: string;
  team_members_data?: Array<{
    student_id: number;
    student_name: string;
    usn: string;
    branch_name?: string;
    role: 'captain' | 'vice_captain' | 'member';
  }>;
  activity_type: string;
  activity_type_display: string;
  activity_name: string;
  academic_year: string | null;
  event_date: string;
  level: string;
  level_display: string;
  position_award: string;
  position_award_display: string;
  role_designation: string | null;
  description: string | null;
  certificate_file: string | null;
  certificate_url: string | null;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface ActivitySummaryMetrics {
  total_activities: number;
  by_type: Record<string, number>;
  by_level: Record<string, number>;
  by_award: Record<string, number>;
}

export interface StudentMedicalProfile {
  id: number | null;
  student: number;
  student_name: string;
  usn: string;
  branch_name: string;
  batch_name: string;
  semester_name: string;
  blood_group: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  physical_disability: string | null;
  regular_medications: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relation: string | null;
  emergency_contact_phone: string | null;
  secondary_contact_name: string | null;
  secondary_contact_phone: string | null;
  preferred_hospital: string | null;
  insurance_policy_number: string | null;
  insurance_provider: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StudentHealthCheckRecord {
  id: number;
  org: number;
  student: number;
  student_name: string;
  usn: string;
  branch_name: string;
  batch_name: string;
  semester_name: string;
  check_type: string;
  check_type_display: string;
  check_date: string;
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  blood_pressure: string | null;
  pulse_rate: number | null;
  vision_left: string | null;
  vision_right: string | null;
  hearing_status: string | null;
  general_observations: string | null;
  examined_by: string | null;
  medical_report_file: string | null;
  medical_report_url: string | null;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface StudentTreatmentReferral {
  id: number;
  org: number;
  student: number;
  student_name: string;
  usn: string;
  branch_name: string;
  batch_name: string;
  semester_name: string;
  incident_date: string;
  complaints_symptoms: string;
  diagnosis: string | null;
  treatment_provided: string | null;
  is_referred: boolean;
  referred_to: string | null;
  referral_reason: string | null;
  rest_advised_days: number;
  attending_doctor: string | null;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface OverviewStats {
  total_activities: number;
  total_health_checks: number;
  total_treatments: number;
  total_referrals: number;
  medical_alerts_count: number;
  by_type?: Record<string, number>;
  by_level?: Record<string, number>;
  by_award?: Record<string, number>;
}

export interface StudentSearchItem {
  id: number;
  name: string;
  usn: string;
  branch_name: string;
  batch_name: string;
  semester_name: string;
  blood_group: string;
  has_medical_alert: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const sportsWellnessApi = {
  // 1. Activities
  async fetchActivities(params: {
    student_id?: number;
    activity_type?: string;
    level?: string;
    academic_year?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<StudentActivityRecord>> {
    const query = new URLSearchParams();
    if (params.student_id) query.append("student_id", params.student_id.toString());
    if (params.activity_type) query.append("activity_type", params.activity_type);
    if (params.level) query.append("level", params.level);
    if (params.academic_year) query.append("academic_year", params.academic_year);
    if (params.search) query.append("search", params.search);
    if (params.page) query.append("page", params.page.toString());
    if (params.page_size) query.append("page_size", params.page_size.toString());

    const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/student-activities/?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch activities");
    return res.json();
  },

  async fetchActivityDetail(id: number): Promise<StudentActivityRecord> {
    const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/student-activities/${id}/`);
    if (!res.ok) throw new Error("Failed to fetch activity details");
    return res.json();
  },

  async createActivity(formData: FormData): Promise<StudentActivityRecord> {
    const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/student-activities/`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.detail || Object.values(err)[0] as string || "Failed to create activity");
    }
    return res.json();
  },

  async updateActivity(id: number, formData: FormData): Promise<StudentActivityRecord> {
    const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/student-activities/${id}/`, {
      method: "PATCH",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.detail || Object.values(err)[0] as string || "Failed to update activity");
    }
    return res.json();
  },

  async deleteActivity(id: number): Promise<void> {
    const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/student-activities/${id}/`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete activity");
  },

  async fetchActivitySummary(studentId?: number): Promise<ActivitySummaryMetrics> {
    const query = studentId ? `?student_id=${studentId}` : "";
    const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/student-activities/summary/${query}`);
    if (!res.ok) throw new Error("Failed to fetch activity summary");
    return res.json();
  },

  // 2. Medical Profile
  async fetchMedicalProfile(studentId: number): Promise<StudentMedicalProfile> {
    const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/student-medical/profile/${studentId}/`);
    if (!res.ok) throw new Error("Failed to fetch medical profile");
    return res.json();
  },

  async saveMedicalProfile(studentId: number, data: Partial<StudentMedicalProfile>): Promise<StudentMedicalProfile> {
    const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/student-medical/profile/${studentId}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.detail || Object.values(err)[0] as string || "Failed to save medical profile");
    }
    return res.json();
  },

  // 3. Health Checks
  async fetchHealthChecks(params: {
    student_id?: number;
    check_type?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<StudentHealthCheckRecord>> {
    const query = new URLSearchParams();
    if (params.student_id) query.append("student_id", params.student_id.toString());
    if (params.check_type) query.append("check_type", params.check_type);
    if (params.search) query.append("search", params.search);
    if (params.page) query.append("page", params.page.toString());
    if (params.page_size) query.append("page_size", params.page_size.toString());

    const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/student-medical/checkups/?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch health checks");
    return res.json();
  },

  async fetchHealthCheckDetail(id: number): Promise<StudentHealthCheckRecord> {
    const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/student-medical/checkups/${id}/`);
    if (!res.ok) throw new Error("Failed to fetch health check details");
    return res.json();
  },

  async createHealthCheck(formData: FormData): Promise<StudentHealthCheckRecord> {
    const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/student-medical/checkups/`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.detail || Object.values(err)[0] as string || "Failed to record health check");
    }
    return res.json();
  },

  async updateHealthCheck(id: number, formData: FormData): Promise<StudentHealthCheckRecord> {
    const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/student-medical/checkups/${id}/`, {
      method: "PATCH",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.detail || Object.values(err)[0] as string || "Failed to update health check");
    }
    return res.json();
  },

  async deleteHealthCheck(id: number): Promise<void> {
    const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/student-medical/checkups/${id}/`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete health check");
  },

  // 4. Treatments & Referrals
  async fetchTreatments(params: {
    student_id?: number;
    is_referred?: boolean;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<StudentTreatmentReferral>> {
    const query = new URLSearchParams();
    if (params.student_id) query.append("student_id", params.student_id.toString());
    if (params.is_referred !== undefined) query.append("is_referred", params.is_referred.toString());
    if (params.search) query.append("search", params.search);
    if (params.page) query.append("page", params.page.toString());
    if (params.page_size) query.append("page_size", params.page_size.toString());

    const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/student-medical/treatments/?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch treatments");
    return res.json();
  },

  async fetchTreatmentDetail(id: number): Promise<StudentTreatmentReferral> {
    const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/student-medical/treatments/${id}/`);
    if (!res.ok) throw new Error("Failed to fetch treatment details");
    return res.json();
  },

  async createTreatment(data: Record<string, any>): Promise<StudentTreatmentReferral> {
    const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/student-medical/treatments/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.detail || Object.values(err)[0] as string || "Failed to log treatment");
    }
    return res.json();
  },

  async updateTreatment(id: number, data: Record<string, any>): Promise<StudentTreatmentReferral> {
    const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/student-medical/treatments/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.detail || Object.values(err)[0] as string || "Failed to update treatment");
    }
    return res.json();
  },

  async deleteTreatment(id: number): Promise<void> {
    const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/student-medical/treatments/${id}/`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete treatment");
  },

  // 5. High-level stats & quick search
  async fetchOverviewStats(studentId?: number): Promise<OverviewStats> {
    const query = studentId ? `?student_id=${studentId}` : "";
    const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/sports-wellness/overview-stats/${query}`);
    if (!res.ok) throw new Error("Failed to fetch overview stats");
    return res.json();
  },

  async searchStudents(q: string = ""): Promise<StudentSearchItem[]> {
    const query = q ? `?q=${encodeURIComponent(q)}` : "";
    const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/sports-wellness/students-search/${query}`);
    if (!res.ok) throw new Error("Failed to search students");
    return res.json();
  },
};
