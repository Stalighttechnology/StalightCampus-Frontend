const API_BASE = "/api/library";

const authHeaders = () => ({
  Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
  "Content-Type": "application/json",
});

// ─── LIBRARY ADMIN ──────────────────────────────────────────

export const fetchLibraryAdminStats = () =>
  fetch(`${API_BASE}/admin/stats/`, { headers: authHeaders() }).then((r) => r.json());

export const fetchLibraryBooks = (search = "") =>
  fetch(`${API_BASE}/admin/books/?search=${encodeURIComponent(search)}`, { headers: authHeaders() }).then((r) => r.json());

export const createLibraryBook = (data: any) =>
  fetch(`${API_BASE}/admin/books/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const updateLibraryBook = (id: number, data: any) =>
  fetch(`${API_BASE}/admin/books/${id}/`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const deleteLibraryBook = (id: number) =>
  fetch(`${API_BASE}/admin/books/${id}/`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then((r) => r.json());

export const fetchBookCopies = (bookId: number, page: number = 1) =>
  fetch(`${API_BASE}/admin/books/${bookId}/copies/?page=${page}`, { headers: authHeaders() }).then((r) => r.json());

export const searchBorrowers = (search = "") =>
  fetch(`${API_BASE}/admin/borrowers/search/?search=${encodeURIComponent(search)}`, { headers: authHeaders() }).then((r) => r.json());

export const issueBook = (data: { user_id: number; barcode_id: string; duration_days?: number }) =>
  fetch(`${API_BASE}/admin/issue/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const returnBook = (data: { barcode_id: string }) =>
  fetch(`${API_BASE}/admin/return/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const renewBook = (id: number) =>
  fetch(`${API_BASE}/admin/renew/${id}/`, {
    method: "POST",
    headers: authHeaders(),
  }).then((r) => r.json());

export const fetchActiveBorrows = (page: number = 1) =>
  fetch(`${API_BASE}/admin/borrows/?page=${page}`, { headers: authHeaders() }).then((r) => r.json());

export const fetchFines = (page: number = 1) =>
  fetch(`${API_BASE}/admin/fines/?page=${page}`, { headers: authHeaders() }).then((r) => r.json());

export const payFine = (id: number) =>
  fetch(`${API_BASE}/admin/fines/${id}/pay/`, {
    method: "POST",
    headers: authHeaders(),
  }).then((r) => r.json());

export const fetchReservations = (page: number = 1) =>
  fetch(`${API_BASE}/admin/reservations/?page=${page}`, { headers: authHeaders() }).then((r) => r.json());


// ─── STUDENT LIBRARY ────────────────────────────────────────

export const fetchStudentLibraryDashboard = () =>
  fetch(`${API_BASE}/student/dashboard/`, { headers: authHeaders() }).then((r) => r.json());

export const fetchStudentBorrows = (status = "taken", page: number = 1) =>
  fetch(`${API_BASE}/student/borrows/?status=${status}&page=${page}`, { headers: authHeaders() }).then((r) => r.json());

export const searchCatalog = (search = "", page: number = 1) =>
  fetch(`${API_BASE}/student/catalog/?search=${encodeURIComponent(search)}&page=${page}`, { headers: authHeaders() }).then((r) => r.json());

export const requestReservation = (bookId: number) =>
  fetch(`${API_BASE}/student/reserve/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ book_id: bookId }),
  }).then((r) => r.json());
