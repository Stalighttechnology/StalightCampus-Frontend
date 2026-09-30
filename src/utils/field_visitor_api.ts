import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";

export interface OrganizationOption {
  id: number;
  name: string;
  domain: string;
  institution_type?: string;
  principal_name?: string;
  principal_email?: string;
  principal_phone?: string;
}

export interface PhotoAttachment {
  url: string;
  caption?: string;
  category?: 'classroom' | 'hostel' | 'kitchen' | 'infrastructure' | 'document' | 'general';
}

export interface FieldVisitInspection {
  id?: number;
  org_id: number;
  org_name?: string;
  visitor_id?: number;
  visitor_name?: string;
  visitor_email?: string;
  visitor_designation?: string;
  visit_date: string;
  visit_time?: string;
  departure_time?: string;
  school_name?: string;
  school_code?: string;
  school_address?: string;
  accompanying_officials?: string;
  principal_name?: string;
  principal_contact?: string;
  principal_interaction_notes?: string;
  student_interaction_notes?: string;
  student_count_present?: number;
  teachers_count_present?: number;
  classroom_inspection?: {
    cleanliness?: string;
    seating_capacity?: string;
    ventilation?: string;
    blackboard_smartboard?: string;
    rating?: number;
    remarks?: string;
    [key: string]: any;
  };
  hostel_inspection?: {
    has_hostel?: boolean;
    hygiene?: string;
    safety_security?: string;
    room_condition?: string;
    rating?: number;
    remarks?: string;
    [key: string]: any;
  };
  kitchen_mess_inspection?: {
    cleanliness?: string;
    food_quality?: string;
    drinking_water_safe?: boolean;
    storage_condition?: string;
    rating?: number;
    remarks?: string;
    [key: string]: any;
  };
  infrastructure_docs?: {
    library_status?: string;
    lab_equipment?: string;
    fire_safety_compliant?: boolean;
    registers_verified?: boolean;
    rating?: number;
    remarks?: string;
    [key: string]: any;
  };
  photos?: PhotoAttachment[];
  photos_count?: number;
  has_principal_response?: boolean;
  observations: string;
  corrective_action?: string;
  action_deadline?: string | null;
  follow_up_status: 'SUBMITTED' | 'IN_REVIEW' | 'ACTION_REQUIRED' | 'RESOLVED';
  overall_score_rating: number;
  summary_report?: string;
  principal_response?: string;
  principal_response_date?: string | null;
  created_at?: string;
}

export interface VisitorProfileData {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  designation: string;
  employee_id: string;
  agency_or_department: string;
  assigned_zone: string;
  bio: string;
  profile_picture_url: string;
  org_name: string;
}

export interface VisitorStatsData {
  total_inspections: number;
  schools_visited_count: number;
  action_required_count: number;
  resolved_count: number;
}

// Fetch list of organizations from database
export const getAvailableOrganizations = async (search?: string): Promise<{ success: boolean; organizations: OrganizationOption[]; message?: string }> => {
  try {
    const url = new URL(`${API_ENDPOINT}/field-visitor/organizations/`);
    if (search) url.searchParams.append('search', search);

    const response = await fetchWithTokenRefresh(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, organizations: [], message: errorData.message || "Failed to fetch institutions" };
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching available organizations:", error);
    return { success: false, organizations: [], message: "Network error occurred" };
  }
};

// Fetch list of field visits (role-aware: visitor gets their visits, principal gets visits for their school)
export const getFieldVisits = async (params?: {
  status?: string;
  search?: string;
  org_id?: number;
}): Promise<{ success: boolean; visits: FieldVisitInspection[]; total_count?: number; message?: string }> => {
  try {
    const url = new URL(`${API_ENDPOINT}/field-visitor/visits/`);
    if (params?.status) url.searchParams.append('status', params.status);
    if (params?.search) url.searchParams.append('search', params.search);
    if (params?.org_id) url.searchParams.append('org_id', String(params.org_id));

    const response = await fetchWithTokenRefresh(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, visits: [], message: errorData.message || "Failed to load field visits" };
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching field visits:", error);
    return { success: false, visits: [], message: "Network error occurred" };
  }
};

// Fetch single visit detail
export const getFieldVisitDetail = async (id: number): Promise<{ success: boolean; report?: FieldVisitInspection; message?: string }> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/field-visitor/visits/${id}/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.message || "Failed to fetch visit details" };
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching visit details:", error);
    return { success: false, message: "Network error occurred" };
  }
};

// Download official inspection PDF report generated by backend HTML template
export const downloadFieldVisitPdf = async (id: number, filename?: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/field-visitor/visits/${id}/pdf/`, {
      method: "GET",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.message || "Failed to generate inspection PDF" };
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `Inspection_Report_${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return { success: true };
  } catch (error) {
    console.error("Error downloading field visit PDF:", error);
    return { success: false, message: "Network error while downloading PDF" };
  }
};

// Submit a new Field Visit record
export const createFieldVisit = async (payload: Partial<FieldVisitInspection>): Promise<{ success: boolean; message: string; report_id?: number; summary_report?: string }> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/field-visitor/visits/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return {
      success: response.ok && data.success !== false,
      message: data.message || (response.ok ? "Visit recorded successfully" : "Failed to record visit"),
      report_id: data.report_id,
      summary_report: data.summary_report,
    };
  } catch (error) {
    console.error("Error recording field visit:", error);
    return { success: false, message: "Network error occurred while saving visit" };
  }
};

// Update an existing visit (e.g. Principal submitting institutional response or Visitor updating status)
export const updateFieldVisit = async (id: number, payload: Partial<FieldVisitInspection>): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/field-visitor/visits/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return {
      success: response.ok && data.success !== false,
      message: data.message || "Updated successfully",
    };
  } catch (error) {
    console.error("Error updating field visit:", error);
    return { success: false, message: "Network error occurred while updating visit" };
  }
};

// Fetch visitor profile & statistics
export const getFieldVisitorProfile = async (): Promise<{ success: boolean; profile?: VisitorProfileData; stats?: VisitorStatsData; message?: string }> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/field-visitor/profile/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.message || "Failed to load profile" };
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching visitor profile:", error);
    return { success: false, message: "Network error occurred" };
  }
};

// Upload inspection evidence photo or document to Cloudflare R2
export const uploadInspectionEvidencePhoto = async (
  file: File,
  orgId: number,
  category: string = "general",
  caption: string = ""
): Promise<{ success: boolean; attachment?: PhotoAttachment & { s3_key?: string; filename?: string; size?: string }; message?: string }> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("org_id", String(orgId));
    formData.append("category", category);
    formData.append("caption", caption);

    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/field-visitor/upload-evidence/`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok || data.success === false) {
      return { success: false, message: data.message || "Failed to upload image to Cloudflare" };
    }

    return {
      success: true,
      attachment: {
        url: data.attachment?.url,
        caption: data.attachment?.caption || caption || file.name,
        category: data.attachment?.category || category,
        s3_key: data.attachment?.s3_key,
        filename: data.attachment?.filename,
        size: data.attachment?.size,
      } as any,
      message: data.message,
    };
  } catch (error) {
    console.error("Error uploading evidence to Cloudflare R2:", error);
    return { success: false, message: "Network error occurred while uploading evidence" };
  }
};

// Update visitor profile
export const updateFieldVisitorProfile = async (payload: Partial<VisitorProfileData>): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/field-visitor/profile/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return {
      success: response.ok && data.success !== false,
      message: data.message || "Profile updated successfully",
    };
  } catch (error) {
    console.error("Error updating visitor profile:", error);
    return { success: false, message: "Network error occurred" };
  }
};


