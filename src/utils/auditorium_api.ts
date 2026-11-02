import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";

export interface Auditorium {
  id: number;
  name: string;
  location: string;
  max_capacity: number;
  has_ac: boolean;
  has_sound_system: boolean;
  has_projector: boolean;
  has_stage_lighting: boolean;
  has_drinking_water: boolean;
  has_restrooms: boolean;
  has_live_streaming: boolean;
  has_security_cctv: boolean;
  has_first_aid: boolean;
  has_wifi: boolean;
  has_power_backup: boolean;
  has_podium_mic: boolean;
  has_green_room: boolean;
  has_wheelchair_access: boolean;
  has_parking: boolean;
  images?: string[];
  other_facilities: string;
  status: 'available' | 'maintenance' | 'inactive';
  maintenance_notes: string;
  created_by?: number | null;
  created_by_name?: string | null;
  active_bookings_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface BookedSlot {
  id: number;
  event_name: string;
  purpose: string;
  start_time: string;
  end_time: string;
  formatted_time: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  branch: string;
  requested_by: string;
}

export interface AuditoriumAvailability {
  success: boolean;
  auditorium_id: number;
  auditorium_name: string;
  date: string;
  is_available: boolean;
  status: string;
  maintenance_notes: string;
  booked_slots: BookedSlot[];
}

export interface AuditoriumBooking {
  id: number;
  auditorium: number;
  auditorium_details?: Auditorium;
  auditorium_name?: string;
  auditorium_location?: string;
  auditorium_max_capacity?: number;
  requested_by?: number;
  requester_name?: string;
  requester_email?: string;
  branch?: number | null;
  branch_name?: string | null;
  event_name: string;
  event_purpose: string;
  required_capacity: number;
  expected_attendees: number;
  booking_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM or HH:MM:SS
  end_time: string; // HH:MM or HH:MM:SS
  need_ac: boolean;
  need_sound_system: boolean;
  need_projector: boolean;
  need_stage_lighting: boolean;
  need_drinking_water?: boolean;
  need_restrooms?: boolean;
  need_live_streaming?: boolean;
  need_security_cctv?: boolean;
  need_first_aid?: boolean;
  need_wifi?: boolean;
  need_power_backup?: boolean;
  need_podium_mic?: boolean;
  need_green_room?: boolean;
  need_wheelchair_access?: boolean;
  need_parking?: boolean;
  reason_and_requirements: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reviewed_by?: number | null;
  reviewer_name?: string | null;
  reviewed_at?: string | null;
  admin_remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AuditoriumFilterParams {
  search?: string;
  status?: string;
  min_capacity?: number;
  has_ac?: boolean;
  has_sound_system?: boolean;
  has_projector?: boolean;
  has_stage_lighting?: boolean;
  all?: boolean;
  page?: number;
  page_size?: number;
}

export interface BookingFilterParams {
  status?: string;
  auditorium_id?: number;
  branch_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

// ================= AUDITORIUM REGISTRY API ================= //

export const getAuditoriums = async (params: AuditoriumFilterParams = {}): Promise<PaginatedResponse<Auditorium> | { success: boolean; data: Auditorium[] }> => {
  const query = new URLSearchParams();
  if (params.search) query.append("search", params.search);
  if (params.status && params.status !== "all") query.append("status", params.status);
  if (params.min_capacity) query.append("min_capacity", String(params.min_capacity));
  if (params.has_ac !== undefined) query.append("has_ac", String(params.has_ac));
  if (params.has_sound_system !== undefined) query.append("has_sound_system", String(params.has_sound_system));
  if (params.has_projector !== undefined) query.append("has_projector", String(params.has_projector));
  if (params.has_stage_lighting !== undefined) query.append("has_stage_lighting", String(params.has_stage_lighting));
  if (params.all) query.append("all", "true");
  if (params.page) query.append("page", String(params.page));
  if (params.page_size) query.append("page_size", String(params.page_size));

  const queryString = query.toString() ? `?${query.toString()}` : "";
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/auditoriums/${queryString}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch auditoriums");
  }
  return response.json();
};

export const createAuditorium = async (data: Partial<Auditorium>): Promise<{ success: boolean; message: string; data: Auditorium }> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/auditoriums/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const resData = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = resData.message || (resData.errors ? JSON.stringify(resData.errors) : "Failed to create auditorium");
    throw new Error(errorMsg);
  }
  return resData;
};

export const getAuditorium = async (id: number): Promise<{ success: boolean; data: Auditorium }> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/auditoriums/${id}/`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch auditorium details");
  }
  return response.json();
};

export const updateAuditorium = async (id: number, data: Partial<Auditorium>): Promise<{ success: boolean; message: string; data: Auditorium }> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/auditoriums/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const resData = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = resData.message || (resData.errors ? JSON.stringify(resData.errors) : "Failed to update auditorium");
    throw new Error(errorMsg);
  }
  return resData;
};

export const deleteAuditorium = async (id: number): Promise<{ success: boolean; message: string }> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/auditoriums/${id}/`, {
    method: "DELETE",
  });
  const resData = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(resData.message || "Failed to delete auditorium");
  }
  return resData;
};

export const getAuditoriumAvailability = async (id: number, date: string): Promise<AuditoriumAvailability> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/auditoriums/${id}/availability/?date=${date}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch auditorium availability");
  }
  return response.json();
};

// ================= BOOKING REQUESTS API ================= //

export const getAuditoriumBookings = async (params: BookingFilterParams = {}): Promise<PaginatedResponse<AuditoriumBooking>> => {
  const query = new URLSearchParams();
  if (params.status && params.status !== "ALL") query.append("status", params.status);
  if (params.auditorium_id) query.append("auditorium_id", String(params.auditorium_id));
  if (params.branch_id) query.append("branch_id", String(params.branch_id));
  if (params.date_from) query.append("date_from", params.date_from);
  if (params.date_to) query.append("date_to", params.date_to);
  if (params.search) query.append("search", params.search);
  if (params.page) query.append("page", String(params.page));
  if (params.page_size) query.append("page_size", String(params.page_size));

  const queryString = query.toString() ? `?${query.toString()}` : "";
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/auditorium-bookings/${queryString}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch auditorium bookings");
  }
  return response.json();
};

export const createAuditoriumBooking = async (data: Partial<AuditoriumBooking>): Promise<{ success: boolean; message: string; data: AuditoriumBooking }> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/auditorium-bookings/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const resData = await response.json().catch(() => ({}));
  if (!response.ok) {
    let msg = resData.message;
    if (!msg && resData.errors) {
      if (resData.errors.non_field_errors) {
        msg = resData.errors.non_field_errors.join(", ");
      } else {
        const firstKey = Object.keys(resData.errors)[0];
        msg = `${firstKey}: ${resData.errors[firstKey]}`;
      }
    }
    throw new Error(msg || "Failed to submit booking request");
  }
  return resData;
};

export const actionAuditoriumBooking = async (
  id: number,
  action: 'APPROVE' | 'REJECT',
  adminRemarks: string = ""
): Promise<{ success: boolean; message: string; data: AuditoriumBooking }> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/auditorium-bookings/${id}/action/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, admin_remarks: adminRemarks }),
  });
  const resData = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(resData.message || `Failed to ${action.toLowerCase()} booking`);
  }
  return resData;
};

export const cancelAuditoriumBooking = async (id: number): Promise<{ success: boolean; message: string; data: AuditoriumBooking }> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/auditorium-bookings/${id}/cancel/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const resData = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(resData.message || "Failed to cancel booking");
  }
  return resData;
};



// ================= FACILITY METADATA & CONFIG ================= //

export interface FacilityConfig {
  id: string;
  hasKey: keyof Auditorium;
  needKey: keyof AuditoriumBooking;
  label: string;
  shortLabel: string;
  category: 'av' | 'essential' | 'safety_comfort';
  categoryLabel: string;
  description: string;
}

export const AUDITORIUM_FACILITIES: FacilityConfig[] = [
  // AV & Staging
  {
    id: 'ac',
    hasKey: 'has_ac',
    needKey: 'need_ac',
    label: 'Air Conditioning (AC)',
    shortLabel: 'AC',
    category: 'av',
    categoryLabel: 'Audio-Visual & Staging',
    description: 'Centralized or split air conditioning climate control.',
  },
  {
    id: 'sound_system',
    hasKey: 'has_sound_system',
    needKey: 'need_sound_system',
    label: 'Sound System & Speakers',
    shortLabel: 'Audio System',
    category: 'av',
    categoryLabel: 'Audio-Visual & Staging',
    description: 'Amplifiers, speakers, audio mixer console.',
  },
  {
    id: 'projector',
    hasKey: 'has_projector',
    needKey: 'need_projector',
    label: 'Projector & Screen',
    shortLabel: 'Projector',
    category: 'av',
    categoryLabel: 'Audio-Visual & Staging',
    description: 'HD motorized projection screen with HDMI/wireless casting.',
  },
  {
    id: 'stage_lighting',
    hasKey: 'has_stage_lighting',
    needKey: 'need_stage_lighting',
    label: 'Stage & Theatrical Lighting',
    shortLabel: 'Stage Lighting',
    category: 'av',
    categoryLabel: 'Audio-Visual & Staging',
    description: 'Dimmable spotlights, footlights, and ambient stage lighting.',
  },
  {
    id: 'podium_mic',
    hasKey: 'has_podium_mic',
    needKey: 'need_podium_mic',
    label: 'Podium & Cordless / Collar Mics',
    shortLabel: 'Podium & Mics',
    category: 'av',
    categoryLabel: 'Audio-Visual & Staging',
    description: 'Speaker podium with gooseneck mic plus wireless microphones.',
  },
  {
    id: 'live_streaming',
    hasKey: 'has_live_streaming',
    needKey: 'need_live_streaming',
    label: 'Live Streaming & Video Recording',
    shortLabel: 'Live Streaming',
    category: 'av',
    categoryLabel: 'Audio-Visual & Staging',
    description: 'Cameras and broadcast equipment for online streaming & recording.',
  },

  // Utilities & Essentials
  {
    id: 'drinking_water',
    hasKey: 'has_drinking_water',
    needKey: 'need_drinking_water',
    label: 'Drinking Water Facility',
    shortLabel: 'Drinking Water',
    category: 'essential',
    categoryLabel: 'Utilities & Campus Essentials',
    description: 'Purified RO drinking water stations and dispensers.',
  },
  {
    id: 'restrooms',
    hasKey: 'has_restrooms',
    needKey: 'need_restrooms',
    label: 'Restrooms / Washrooms',
    shortLabel: 'Restrooms',
    category: 'essential',
    categoryLabel: 'Utilities & Campus Essentials',
    description: 'Adjacent clean restrooms for ladies, gents, and staff.',
  },
  {
    id: 'wifi',
    hasKey: 'has_wifi',
    needKey: 'need_wifi',
    label: 'High-Speed Wi-Fi / Internet',
    shortLabel: 'Wi-Fi',
    category: 'essential',
    categoryLabel: 'Utilities & Campus Essentials',
    description: 'High-speed campus network and guest wireless access.',
  },
  {
    id: 'power_backup',
    hasKey: 'has_power_backup',
    needKey: 'need_power_backup',
    label: 'Power Backup (Generator / UPS)',
    shortLabel: 'Power Backup',
    category: 'essential',
    categoryLabel: 'Utilities & Campus Essentials',
    description: 'Generator and online UPS ensuring uninterrupted power.',
  },

  // Safety, Comfort & Accessibility
  {
    id: 'security_cctv',
    hasKey: 'has_security_cctv',
    needKey: 'need_security_cctv',
    label: 'Security & CCTV Surveillance',
    shortLabel: 'Security & CCTV',
    category: 'safety_comfort',
    categoryLabel: 'Safety, Comfort & Accessibility',
    description: '24/7 CCTV surveillance cameras and security guard support.',
  },
  {
    id: 'first_aid',
    hasKey: 'has_first_aid',
    needKey: 'need_first_aid',
    label: 'First Aid Facility',
    shortLabel: 'First Aid Kit',
    category: 'safety_comfort',
    categoryLabel: 'Safety, Comfort & Accessibility',
    description: 'Emergency medical first aid kit and on-call health support.',
  },
  {
    id: 'green_room',
    hasKey: 'has_green_room',
    needKey: 'need_green_room',
    label: 'Green Room / Dressing Rooms',
    shortLabel: 'Green Room',
    category: 'safety_comfort',
    categoryLabel: 'Safety, Comfort & Accessibility',
    description: 'Backstage green rooms for speakers, dignitaries, and artists.',
  },
  {
    id: 'wheelchair_access',
    hasKey: 'has_wheelchair_access',
    needKey: 'need_wheelchair_access',
    label: 'Wheelchair & Ramp Accessibility',
    shortLabel: 'Wheelchair Access',
    category: 'safety_comfort',
    categoryLabel: 'Safety, Comfort & Accessibility',
    description: 'Accessible entrance ramps and designated seating areas.',
  },
  {
    id: 'parking',
    hasKey: 'has_parking',
    needKey: 'need_parking',
    label: 'Dedicated Parking Space',
    shortLabel: 'Parking Space',
    category: 'safety_comfort',
    categoryLabel: 'Safety, Comfort & Accessibility',
    description: 'Dedicated parking facility for VIP guests and event attendees.',
  },
];
