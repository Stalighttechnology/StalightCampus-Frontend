import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";

export interface StudentBranchDetail {
  branch: string;
  branch_code?: string;
  boys: number;
  girls: number;
  total: number;
}

export interface StudentQuotaDetail {
  quota: string;
  boys: number;
  girls: number;
  total: number;
}

export interface FeeStructureItem {
  standard: string;
  notified_fee: string;
  exam_dev_fee: string;
  total: string;
}

export interface CollegeMediaItem {
  id: string;
  category: 'campus_photos' | 'certificates' | 'facilities' | 'seals' | string;
  title: string;
  filename: string;
  s3_key: string;
  url: string;
  content_type?: string;
  size?: string;
  size_bytes?: number;
  uploaded_at: string;
}

export interface CollegeAchievement {
  id: string;
  title: string;
  category: "college_level" | "student_level" | "faculty_research" | "state_national" | "international" | string;
  recipient_name?: string;
  department?: string;
  year?: string;
  awarding_body?: string;
  description?: string;
  certificate_url?: string;
  certificate_filename?: string;
}

export interface CollegeDetailsData {
  id?: number;
  organization_id?: number;
  org_name?: string;
  org_logo?: string;

  // 1. Profile
  college_code: string;
  aishe_code: string;
  college_name: string;
  affiliated_university: string;
  state: string;
  educational_district: string;
  educational_block: string;
  revenue_district: string;
  revenue_block: string;
  village_city: string;
  pincode: string;
  assembly_constituency: string;
  parliamentary_constituency: string;
  school_address: string;
  website: string;
  official_email: string;
  official_phone: string;
  principal_name: string;
  dean_name: string;

  // 2. Recognition & Accreditation
  year_of_establishment: string;
  first_renewal: string;
  recognition_period_start?: string;
  recognition_period_end?: string;
  aicte_approval_status: string;
  aicte_approval_number: string;
  aicte_validity_period: string;
  nba_accreditation_details: string;
  naac_grade: string;
  naac_cycle: string;
  naac_cgpa: string;
  naac_validity_end?: string;
  autonomous_status: string;
  ugc_approval_date?: string;
  nirf_rank: string;
  iso_certified: string;
  college_syllabus: string;
  college_management: string;
  college_type: string;
  lowest_highest_class: string;
  is_shift_college: string;
  minority_school: string;

  // 3. Instruction & Visits
  medium_of_instruction: string;
  academic_inspections_count: number;
  university_lic_visits_count: number;
  nba_naac_visits_count: number;
  state_district_officers_visits: number;

  // 4. Infrastructure & Facilities
  total_land_area_acres: string;
  total_built_up_area_sqm: string;
  building_status: string;
  boundary_wall: string;
  no_of_building_blocks: number;
  pucca_building_blocks: number;
  approachable_all_weather_road: string;
  is_special_school_cwsn: string;
  availability_of_ramps: string;
  availability_of_handrails: string;
  availability_of_lifts: string;

  total_classrooms: number;
  classrooms_in_good_condition: number;
  classrooms_needs_minor_repair: number;
  classrooms_needs_major_repair: number;
  smart_classrooms_count: number;
  seminar_halls_count: number;
  computing_labs_count: number;
  engineering_labs_count: number;
  other_rooms: number;

  library_availability: string;
  library_total_books: number;
  library_total_titles: number;
  library_journals_subscribed: number;
  library_digital_subscriptions: string;
  library_seating_capacity: number;
  is_library_automated: string;

  // Sanitation & Amenities
  toilets_boys_total: number;
  toilets_girls_total: number;
  toilets_boys_functional: number;
  toilets_girls_functional: number;
  toilets_cwsn_boys: number;
  toilets_cwsn_girls: number;
  urinals_boys: number;
  urinals_girls: number;
  hand_wash_near_toilet: string;
  hand_wash_facility_meal: string;
  drinking_water_available: number;
  drinking_water_functional: string;
  ro_plants_count: number;
  rain_water_harvesting: string;
  solar_panel_available: string;
  solar_capacity_kw: string;
  play_ground_available: string;
  sports_facilities_details: string;
  auditorium_available: string;
  auditorium_seating_capacity: number;
  electricity_available: string;
  dg_generator_backup: string;
  medical_checkups: string;
  health_center_ambulance: string;
  canteen_cafeteria: string;
  boys_hostel_capacity: number;
  girls_hostel_capacity: number;
  separate_room_hm: string;
  board_room_available: string;
  placement_cell_available: string;
  incubation_center_available: string;
  total_students_furniture_available: number;

  // 5. Digital & IT
  ict_lab: string;
  internet: string;
  internet_bandwidth: string;
  desktop_count: number;
  laptop_count: number;
  tablet_count: number;
  printer_count: number;
  projector_count: number;
  digiboard_count: number;
  gpu_server_count: number;
  cctv_cameras_count: number;
  campus_erp_system: string;
  dth_facility: string;

  // 6. Committees
  smc_exists: string;
  smdc_constituted: string;
  iqac_constituted: string;
  anti_ragging_committee: string;
  icc_posh_committee: string;
  grievance_redressal_cell: string;
  instructional_days: number;
  cce_implemented: string;
  text_books_received: string;
  total_complaints_received: number;
  complaints_resolved: number;

  // 7. Faculty & Staff
  no_of_teachers: number;
  professors_count: number;
  assoc_professors_count: number;
  asst_professors_count: number;
  phd_faculty_count: number;
  pursuing_phd_count: number;
  non_teaching_staff_count: number;
  technical_staff_count: number;
  student_faculty_ratio: string;
  faculty_vacancies: number;
  faculty_shortage: number;

  // 8. Regulatory Clearances & Inspection Standards (AICTE / LIC / NAAC)
  fire_safety_certificate?: string;
  fire_safety_validity?: string;
  building_occupancy_certificate?: string;
  structural_stability_certificate?: string;
  land_ownership_type?: string;
  environmental_clearance?: string;

  sc_st_cell_constituted?: string;
  student_grievance_committee?: string;
  anti_ragging_squad_active?: string;
  iic_incubation_cell?: string;
  placement_mous_count?: number;

  biometric_attendance_system?: string;
  student_computer_ratio?: string;
  language_lab_available?: string;
  research_grants_lakhs?: string;
  patents_published_count?: number;

  joint_fdr_with_university?: string;
  joint_fdr_amount_lakhs?: string;
  audited_balance_sheet_available?: string;
  mandatory_disclosure_url?: string;

  // Matrices
  student_details_class_wise: StudentBranchDetail[];
  student_details_quota_wise: StudentQuotaDetail[];
  fee_structure_data: FeeStructureItem[];

  // 10 Media Manifest & 11 Achievements
  uploaded_media: CollegeMediaItem[];
  achievements_data?: CollegeAchievement[];

  updated_at?: string;
  live_stats?: {
    total_students_in_db: number;
    total_faculty_in_db: number;
    total_branches_in_db: number;
  };
}

/**
 * Fetch institutional details and report card configuration on-demand (supports tab-wise loading)
 */
export async function getCollegeDetails(tab?: string, orgId?: string | number): Promise<{ success: boolean; data?: CollegeDetailsData; error?: string }> {
  try {
    const params = new URLSearchParams();
    if (tab && tab !== 'all') params.set('tab', tab);
    if (orgId) params.set('org_id', orgId.toString());
    const query = params.toString() ? `?${params.toString()}` : "";

    const headers: Record<string, string> = {};
    if (orgId) {
      headers["X-Active-Org-Id"] = orgId.toString();
    }
    const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/college-details/${query}`, {
      method: "GET",
      headers
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Failed to fetch college details" };
    }
    return { success: true, data: data.data };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error fetching college details" };
  }
}

/**
 * Save / Update institutional report card details
 */
export async function updateCollegeDetails(payload: Partial<CollegeDetailsData>, orgId?: string | number): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (orgId) {
      headers["X-Active-Org-Id"] = orgId.toString();
    }
    const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/college-details/update/`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Failed to save college details" };
    }
    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error saving college details" };
  }
}

/**
 * Upload a media asset (photo/document) to Cloudflare R2 bucket
 */
export async function uploadCollegeMedia(file: File, category: string, title?: string, orgId?: string | number): Promise<{ success: boolean; media_item?: CollegeMediaItem; error?: string }> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    if (title) formData.append("title", title);

    const headers: Record<string, string> = {};
    if (orgId) {
      headers["X-Active-Org-Id"] = orgId.toString();
    }

    const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/college-details/upload-media/`, {
      method: "POST",
      headers,
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Failed to upload file" };
    }
    return { success: true, media_item: data.media_item };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error uploading file" };
  }
}

/**
 * Delete a media asset from Cloudflare R2 and catalog
 */
export async function deleteCollegeMedia(mediaId?: string, url?: string, orgId?: string | number): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (orgId) {
      headers["X-Active-Org-Id"] = orgId.toString();
    }

    const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/college-details/delete-media/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ media_id: mediaId, url })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Failed to delete media item" };
    }
    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error deleting media item" };
  }
}

export interface PaginatedResponse<T> {
  success: boolean;
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  data: T[];
  counts?: {
    total: number;
    college_level?: number;
    student_level?: number;
    faculty_research?: number;
    state_national?: number;
  };
  error?: string;
}

/**
 * Fetch paginated, searchable, and filtered achievements from the backend
 */
export async function getPaginatedAchievements(
  page: number = 1,
  pageSize: number = 6,
  category: string = 'all',
  search: string = '',
  year: string = '',
  orgId?: string | number
): Promise<PaginatedResponse<CollegeAchievement>> {
  try {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('page_size', pageSize.toString());
    if (category && category !== 'all') params.set('category', category);
    if (search.trim()) params.set('search', search.trim());
    if (year.trim()) params.set('year', year.trim());

    const headers: Record<string, string> = {};
    if (orgId) {
      headers["X-Active-Org-Id"] = orgId.toString();
    }

    const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/college-details/achievements/?${params.toString()}`, {
      headers
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        page: 1,
        page_size: pageSize,
        total: 0,
        total_pages: 1,
        data: [],
        error: data.error || 'Failed to fetch achievements'
      };
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      page: 1,
      page_size: pageSize,
      total: 0,
      total_pages: 1,
      data: [],
      error: err.message || 'Network error fetching achievements'
    };
  }
}

/**
 * Fetch paginated, searchable, and filtered uploaded media from the backend
 */
export async function getPaginatedMedia(
  page: number = 1,
  pageSize: number = 8,
  category: string = 'all',
  search: string = '',
  orgId?: string | number
): Promise<PaginatedResponse<CollegeMediaItem>> {
  try {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('page_size', pageSize.toString());
    if (category && category !== 'all') params.set('category', category);
    if (search.trim()) params.set('search', search.trim());

    const headers: Record<string, string> = {};
    if (orgId) {
      headers["X-Active-Org-Id"] = orgId.toString();
    }

    const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/college-details/media/?${params.toString()}`, {
      headers
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        page: 1,
        page_size: pageSize,
        total: 0,
        total_pages: 1,
        data: [],
        error: data.error || 'Failed to fetch media'
      };
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      page: 1,
      page_size: pageSize,
      total: 0,
      total_pages: 1,
      data: [],
      error: err.message || 'Network error fetching media'
    };
  }
}

