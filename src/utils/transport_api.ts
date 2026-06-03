import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";
const API_BASE = `${API_ENDPOINT}/transport`;

const authHeaders = () => ({
  Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
  "Content-Type": "application/json",
});

// ─── ADMIN ─────────────────────────────────────────────

export const fetchTransportDashboardStats = () =>
  fetchWithTokenRefresh(`${API_BASE}/admin/dashboard/`, { headers: authHeaders() }).then((r) => r.json());

export const fetchLiveTracking = () =>
  fetchWithTokenRefresh(`${API_BASE}/admin/live-tracking/`, { headers: authHeaders() }).then((r) => r.json());

// Buses
export const fetchBuses = (page = 1, search = "") =>
  fetchWithTokenRefresh(`${API_BASE}/buses/?page=${page}&search=${encodeURIComponent(search)}`, { headers: authHeaders() }).then((r) => r.json());

export const createBus = (data: any) =>
  fetchWithTokenRefresh(`${API_BASE}/buses/`, { method: "POST", headers: authHeaders(), body: JSON.stringify(data) }).then((r) => r.json());

export const updateBus = (id: number, data: any) =>
  fetchWithTokenRefresh(`${API_BASE}/buses/${id}/`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(data) }).then((r) => r.json());

export const deleteBus = (id: number) =>
  fetchWithTokenRefresh(`${API_BASE}/buses/${id}/`, { method: "DELETE", headers: authHeaders() }).then((r) => r.json());

export const exportBusesPDF = () =>
  fetchWithTokenRefresh(`${API_BASE}/buses/export-pdf/`, { headers: authHeaders() });

// Routes
export const fetchRoutes = (page = 1) =>
  fetchWithTokenRefresh(`${API_BASE}/routes/?page=${page}`, { headers: authHeaders() }).then((r) => r.json());

export const createRoute = (data: any) =>
  fetchWithTokenRefresh(`${API_BASE}/routes/`, { method: "POST", headers: authHeaders(), body: JSON.stringify(data) }).then((r) => r.json());

export const updateRoute = (id: number, data: any) =>
  fetchWithTokenRefresh(`${API_BASE}/routes/${id}/`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(data) }).then((r) => r.json());

export const deleteRoute = (id: number) =>
  fetchWithTokenRefresh(`${API_BASE}/routes/${id}/`, { method: "DELETE", headers: authHeaders() }).then((r) => r.json());

export const updateRouteStops = (routeId: number, stops: any[]) =>
  fetchWithTokenRefresh(`${API_BASE}/routes/${routeId}/update_stops/`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ stops }) }).then((r) => r.json());

export const exportRoutesPDF = () =>
  fetchWithTokenRefresh(`${API_BASE}/routes/export-pdf/`, { headers: authHeaders() });

// Assignments
export const fetchAssignments = (page = 1) =>
  fetchWithTokenRefresh(`${API_BASE}/assignments/?page=${page}`, { headers: authHeaders() }).then((r) => r.json());

export const fetchAssignmentOptions = () =>
  fetchWithTokenRefresh(`${API_BASE}/admin/assignment-options/`, { headers: authHeaders() }).then((r) => r.json());

export const createAssignment = (data: any) =>
  fetchWithTokenRefresh(`${API_BASE}/assignments/`, { method: "POST", headers: authHeaders(), body: JSON.stringify(data) }).then((r) => r.json());

export const deleteAssignment = (id: number) =>
  fetchWithTokenRefresh(`${API_BASE}/assignments/${id}/`, { method: "DELETE", headers: authHeaders() }).then((r) => r.json());

export const updateAssignment = (id: number, data: any) =>
  fetchWithTokenRefresh(`${API_BASE}/assignments/${id}/`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(data) }).then((r) => r.json());

// Student Allocations
export const fetchAllocations = (page = 1, route = "", status = "", search = "") => {
  const query = new URLSearchParams({ page: String(page) });
  if (route) query.append("route", route);
  if (status) query.append("status", status);
  if (search) query.append("search", search);
  return fetchWithTokenRefresh(`${API_BASE}/allocations/?${query.toString()}`, { headers: authHeaders() }).then((r) => r.json());
};

export const createAllocation = (data: any) =>
  fetchWithTokenRefresh(`${API_BASE}/allocations/`, { method: "POST", headers: authHeaders(), body: JSON.stringify(data) }).then((r) => r.json());

export const deleteAllocation = (id: number) =>
  fetchWithTokenRefresh(`${API_BASE}/allocations/${id}/`, { method: "DELETE", headers: authHeaders() }).then((r) => r.json());

export const updateAllocation = (id: number, data: any) =>
  fetchWithTokenRefresh(`${API_BASE}/allocations/${id}/`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(data) }).then((r) => r.json());

// Drivers & Eligible Students
export const fetchDrivers = () =>
  fetchWithTokenRefresh(`${API_BASE}/admin/drivers/`, { headers: authHeaders() }).then((r) => r.json());

export const enrollDriver = (data: any) =>
  fetchWithTokenRefresh(`${API_BASE}/admin/enroll-driver/`, { method: "POST", headers: authHeaders(), body: JSON.stringify(data) }).then((r) => r.json());

export const deleteDriver = (id: number) =>
  fetchWithTokenRefresh(`${API_BASE}/admin/drivers/${id}/delete/`, { method: "DELETE", headers: authHeaders() }).then((r) => r.json());

export const fetchEligibleStudents = (page = 1, branch = "", batch = "", semester = "", search = "") => {
  const query = new URLSearchParams({ page: String(page) });
  if (branch) query.append("branch", branch);
  if (batch) query.append("batch", batch);
  if (semester) query.append("semester", semester);
  if (search) query.append("search", search);
  return fetchWithTokenRefresh(`${API_BASE}/admin/eligible-students/?${query.toString()}`, { headers: authHeaders() }).then((r) => r.json());
};

export const fetchTransportFilters = () =>
  fetchWithTokenRefresh(`${API_BASE}/admin/filters/`, { headers: authHeaders() }).then((r) => r.json());

export const fetchBranchSemesters = (branchId: number) =>
  fetchWithTokenRefresh(`${API_BASE}/admin/semesters/?branch_id=${branchId}`, { headers: authHeaders() }).then((r) => r.json());

export const fetchRouteOptions = () =>
  fetchWithTokenRefresh(`${API_BASE}/admin/route-options/`, { headers: authHeaders() }).then((r) => r.json());

export const fetchRouteStops = (routeId: number) =>
  fetchWithTokenRefresh(`${API_BASE}/admin/route-stops/?route_id=${routeId}`, { headers: authHeaders() }).then((r) => r.json());

// Incidents
export const fetchIncidents = (page = 1) =>
  fetchWithTokenRefresh(`${API_BASE}/incidents/?page=${page}`, { headers: authHeaders() }).then((r) => r.json());

export const resolveIncident = (id: number, action_taken: string) =>
  fetchWithTokenRefresh(`${API_BASE}/incidents/${id}/resolve/`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ action_taken }) }).then((r) => r.json());

// ─── DRIVER ────────────────────────────────────────────

export const fetchDriverAssignment = () =>
  fetchWithTokenRefresh(`${API_BASE}/driver/assignment/`, { headers: authHeaders() }).then((r) => r.json());

export const fetchDriverHistory = (page = 1) =>
  fetchWithTokenRefresh(`${API_BASE}/driver/history/?page=${page}`, { headers: authHeaders() }).then((r) => r.json());

export const fetchDriverComplaints = (page = 1) =>
  fetchWithTokenRefresh(`${API_BASE}/driver/complaints/?page=${page}`, { headers: authHeaders() }).then((r) => r.json());

export const startTrip = (trip_type: "morning" | "evening") =>
  fetchWithTokenRefresh(`${API_BASE}/driver/start-trip/`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ trip_type }) }).then((r) => r.json());

export const endTrip = (tripId: number) =>
  fetchWithTokenRefresh(`${API_BASE}/driver/trip/${tripId}/end/`, { method: "POST", headers: authHeaders() }).then((r) => r.json());

export const cancelTrip = (tripId: number) =>
  fetchWithTokenRefresh(`${API_BASE}/driver/trip/${tripId}/cancel/`, { method: "POST", headers: authHeaders() }).then((r) => r.json());

export const updateLocation = (tripId: number, lat: number, lng: number) =>
  fetchWithTokenRefresh(`${API_BASE}/driver/trip/${tripId}/update-location/`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ latitude: lat, longitude: lng }) }).then((r) => r.json());

export const fetchTripStudents = (tripId: number) =>
  fetchWithTokenRefresh(`${API_BASE}/driver/trip/${tripId}/students/`, { headers: authHeaders() }).then((r) => r.json());

export const markStudentAttendance = (attendanceId: number, newStatus: string) =>
  fetchWithTokenRefresh(`${API_BASE}/driver/attendance/${attendanceId}/mark/`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ status: newStatus }) }).then((r) => r.json());

export const triggerEmergency = (tripId: number, description: string) =>
  fetchWithTokenRefresh(`${API_BASE}/driver/trip/${tripId}/emergency/`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ description }) }).then((r) => r.json());

// ─── STUDENT ───────────────────────────────────────────

export const fetchMyBusDetails = () =>
  fetchWithTokenRefresh(`${API_BASE}/student/my-bus/`, { headers: authHeaders() }).then((r) => r.json());

export const fetchMyTripHistory = () =>
  fetchWithTokenRefresh(`${API_BASE}/student/trip-history/`, { headers: authHeaders() }).then((r) => r.json());

export const submitStudentComplaint = (title: string, description: string) =>
  fetchWithTokenRefresh(`${API_BASE}/student/complaint/`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ title, description }) }).then((r) => r.json());
