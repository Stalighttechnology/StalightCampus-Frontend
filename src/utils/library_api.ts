import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";
const API_BASE = `${API_ENDPOINT}/library`;

const authHeaders = () => ({
  Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
  "Content-Type": "application/json",
});

// ─── LIBRARY ADMIN ──────────────────────────────────────────

export const fetchLibraryAdminStats = () =>
  fetchWithTokenRefresh(`${API_BASE}/admin/stats/`, { headers: authHeaders() }).then((r) => r.json());

export const fetchLibraryCategories = () =>
  fetchWithTokenRefresh(`${API_BASE}/admin/categories/`, { headers: authHeaders() }).then((r) => r.json());

export const createLibraryCategory = (data: { name: string }) =>
  fetchWithTokenRefresh(`${API_BASE}/admin/categories/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const fetchLibraryBooks = (search = "") =>
  fetchWithTokenRefresh(`${API_BASE}/admin/books/?search=${encodeURIComponent(search)}`, { headers: authHeaders() }).then((r) => r.json());

export const exportLibraryBooksCsv = (search = ""): Promise<Blob> =>
  fetchWithTokenRefresh(`${API_BASE}/admin/books/export-csv/?search=${encodeURIComponent(search)}`, {
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
    },
  }).then((r) => {
    if (!r.ok) throw new Error("Failed to export CSV");
    return r.blob();
  });

export const createLibraryBook = (data: any) =>
  fetchWithTokenRefresh(`${API_BASE}/admin/books/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const updateLibraryBook = (id: number, data: any) =>
  fetchWithTokenRefresh(`${API_BASE}/admin/books/${id}/`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const deleteLibraryBook = (id: number) =>
  fetchWithTokenRefresh(`${API_BASE}/admin/books/${id}/`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then((r) => r.json());

export const fetchBookCopies = (bookId: number, page: number = 1) =>
  fetchWithTokenRefresh(`${API_BASE}/admin/books/${bookId}/copies/?page=${page}`, { headers: authHeaders() }).then((r) => r.json());

export const addBookCopy = (bookId: number, data: { barcode_id?: string }) =>
  fetchWithTokenRefresh(`${API_BASE}/admin/books/${bookId}/add-copy/`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const searchBorrowers = (search = "") =>
  fetchWithTokenRefresh(`${API_BASE}/admin/borrowers/search/?search=${encodeURIComponent(search)}`, { headers: authHeaders() }).then((r) => r.json());

export const issueBook = (data: { user_id: number; barcode_id: string; duration_days?: number }) =>
  fetchWithTokenRefresh(`${API_BASE}/admin/issue/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const returnBook = (data: { barcode_id: string }) =>
  fetchWithTokenRefresh(`${API_BASE}/admin/return/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const renewBook = (id: number, durationDays?: number) =>
  fetchWithTokenRefresh(`${API_BASE}/admin/renew/${id}/`, {
    method: "POST",
    headers: authHeaders(),
    body: durationDays !== undefined ? JSON.stringify({ duration_days: durationDays }) : undefined,
  }).then((r) => r.json());

export const fetchActiveBorrows = (page: number = 1) =>
  fetchWithTokenRefresh(`${API_BASE}/admin/borrows/?page=${page}`, { headers: authHeaders() }).then((r) => r.json());

export const exportLibraryBorrowsCsv = (): Promise<Blob> =>
  fetchWithTokenRefresh(`${API_BASE}/admin/borrows/export-csv/`, {
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
    },
  }).then((r) => {
    if (!r.ok) throw new Error("Failed to export CSV");
    return r.blob();
  });

export const fetchFines = (page: number = 1) =>
  fetchWithTokenRefresh(`${API_BASE}/admin/fines/?page=${page}`, { headers: authHeaders() }).then((r) => r.json());

export const exportLibraryFinesCsv = (): Promise<Blob> =>
  fetchWithTokenRefresh(`${API_BASE}/admin/fines/export-csv/`, {
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
    },
  }).then((r) => {
    if (!r.ok) throw new Error("Failed to export CSV");
    return r.blob();
  });

export const payFine = (id: number) =>
  fetchWithTokenRefresh(`${API_BASE}/admin/fines/${id}/pay/`, {
    method: "POST",
    headers: authHeaders(),
  }).then((r) => r.json());

export const fetchReservations = (page: number = 1) =>
  fetchWithTokenRefresh(`${API_BASE}/admin/reservations/?page=${page}`, { headers: authHeaders() }).then((r) => r.json());


export const fetchLibrarySettings = () =>
  fetchWithTokenRefresh(`${API_BASE}/admin/settings/`, { headers: authHeaders() }).then((r) => r.json());

export const updateLibrarySettings = (data: { daily_fine_rate: number }) =>
  fetchWithTokenRefresh(`${API_BASE}/admin/settings/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then((r) => r.json());

// ─── STUDENT LIBRARY ────────────────────────────────────────

export const fetchStudentLibraryDashboard = () =>
  fetchWithTokenRefresh(`${API_BASE}/student/dashboard/`, { headers: authHeaders() }).then((r) => r.json());

export const fetchStudentBorrows = (status = "taken", page: number = 1) =>
  fetchWithTokenRefresh(`${API_BASE}/student/borrows/?status=${status}&page=${page}`, { headers: authHeaders() }).then((r) => r.json());

export const searchCatalog = (search = "", page: number = 1) =>
  fetchWithTokenRefresh(`${API_BASE}/student/catalog/?search=${encodeURIComponent(search)}&page=${page}`, { headers: authHeaders() }).then((r) => r.json());

export const requestReservation = (bookId: number) =>
  fetchWithTokenRefresh(`${API_BASE}/student/reserve/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ book_id: bookId }),
  }).then((r) => r.json());
