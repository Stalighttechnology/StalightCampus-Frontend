import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";

// Types for Student Fee Reports
export interface StudentFeeReport {
  student: {
    id: number;
    name: string;
    usn: string;
    branch: string;
    semester: number;
    section: string | null;
    email: string | null;
    phone: string | null;
  };
  fee_summary: {
    total_fee: number;
    total_paid: number;
    total_pending: number;
    custom_fee_amount: number;
  };
  semester_wise_breakdown?: Array<{
    semester_name: string;
    total_fee: number;
    total_paid: number;
    total_pending: number;
    invoices: Array<{
      id: number;
      invoice_number: string;
      total_amount: number;
      paid_amount: number;
      balance_amount: number;
      status: string;
      due_date: string | null;
      created_at: string;
      template_name: string | null;
      components: Array<{
        name: string;
        amount: number;
        description: string;
      }>;
    }>;
    payments: Array<{
      id: number;
      amount: number;
      status: string;
      payment_date: string;
      invoice_number: string;
      payment_method: string;
      transaction_id: string | null;
    }>;
  }>;
  invoices: Array<{
    id: number;
    invoice_number: string;
    total_amount: number;
    paid_amount: number;
    balance_amount: number;
    status: string;
    due_date: string | null;
    created_at: string;
    template_name: string | null;
    components: Array<{
      name: string;
      amount: number;
      description: string;
    }>;
  }>;
  payment_history: Array<{
    id: number;
    amount: number;
    status: string;
    payment_date: string;
    invoice_number: string;
    payment_method: string;
    transaction_id: string | null;
  }>;
  custom_fee_structure: any;
}

export interface StudentFeeSummary {
  student: {
    id: number;
    name: string;
    usn: string;
    branch: string;
    semester: number;
    section: string | null;
  };
  fee_summary: {
    total_fee: number;
    total_paid: number;
    total_pending: number;
    invoice_count: number;
    payment_count: number;
  };
}

export interface Branch {
  id: number;
  name: string;
  code: string;
}

export interface Semester {
  id: number;
  number: number;
  name: string;
}

export interface Section {
  id: number;
  name: string;
}

// API Functions
// Fee Components
export const getFeeComponents = async (page: number = 1, pageSize: number = 25) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/components/?page=${page}&page_size=${pageSize}`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Fee Components Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const createFeeComponent = async (data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/components/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Create Fee Component Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const updateFeeComponent = async (id: number, data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/components/${id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Update Fee Component Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const deleteFeeComponent = async (id: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/components/${id}/`, {
      method: "DELETE",
    });
    if (response.ok) return { success: true };
    return await response.json();
  } catch (error) {
    console.error("Delete Fee Component Error:", error);
    return { success: false, message: "Network error" };
  }
};

// Fee Templates
export const getFeeTemplates = async (page: number = 1, pageSize: number = 25) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/fee-templates/?page=${page}&page_size=${pageSize}`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Fee Templates Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const createFeeTemplate = async (data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/fee-templates/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Create Fee Template Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const updateFeeTemplate = async (id: number, data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/templates/${id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Update Fee Template Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const deleteFeeTemplate = async (id: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/templates/${id}/`, {
      method: "DELETE",
    });
    if (response.ok) return { success: true };
    return await response.json();
  } catch (error) {
    console.error("Delete Fee Template Error:", error);
    return { success: false, message: "Network error" };
  }
};

// Fee Assignments
export const getFeesManagerAssignments = async (params: any) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/assignments/?${query}`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Fee Assignments Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const deleteFeeAssignment = async (id: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/assignments/${id}/`, {
      method: "DELETE",
    });
    if (response.ok) return { success: true };
    return await response.json();
  } catch (error) {
    console.error("Delete Fee Assignment Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const bulkAssignFees = async (data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/bulk-assignments/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Bulk Assign Fees Error:", error);
    return { success: false, message: "Network error" };
  }
};

// Invoices
export const getInvoices = async (params: any) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/invoices/?${query}`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Invoices Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const deleteInvoice = async (id: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/invoices/${id}/`, {
      method: "DELETE",
    });
    if (response.ok) return { success: true };
    return await response.json();
  } catch (error) {
    console.error("Delete Invoice Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const getInvoiceDetails = async (id: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/invoices/${id}/`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Invoice Details Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const downloadInvoice = async (id: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/invoices/${id}/download/`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Download Invoice Error:", error);
    return { success: false, message: "Network error" };
  }
};

// Payments
export const getPayments = async (params: any) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payments/?${query}`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Payments Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const recordPayment = async (data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payments/record/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Record Payment Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const getPaymentStats = async (params: any) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payment-stats/?${query}`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Payment Stats Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const refundPayment = async (id: number, data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payments/${id}/refund/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Refund Payment Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const processRefund = refundPayment;

export const getPaymentDetails = async (id: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payments/${id}/`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Payment Details Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const getPaymentReceipt = async (id: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payments/${id}/receipt/`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Payment Receipt Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const downloadReceipt = async (id: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payments/${id}/receipt/`, {
      method: "GET",
    });
    if (!response.ok) {
      return { success: false, message: "Failed to download receipt" };
    }
    const blob = await response.blob();
    return { success: true, data: blob };
  } catch (error) {
    console.error("Download Receipt Error:", error);
    return { success: false, message: "Network error" };
  }
};

// Stats and Other
export const getFeesManagerStats = async (params: any) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/stats/?${query}`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Fees Stats Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const getFeesManagerStudents = async (params: any) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/students/?${query}`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Fees Students Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const getFeesManagerLeaves = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/leaves/`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Fees Leaves Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const applyFeesManagerLeave = async (data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/leaves/apply/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Apply Fees Leave Error:", error);
    return { success: false, message: "Network error" };
  }
};

// Student Fee Reports
export const getStudentFeeReport = async (searchTerm: string) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/reports/student/?search=${searchTerm}`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Student Fee Report Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const getStudentsFeeReports = async (batchId?: string, branchId?: string, semesterId?: string, sectionId?: string, admissionMode?: string, page: number = 1) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      ...(batchId && { batch_id: batchId }),
      ...(branchId && { branch_id: branchId }),
      ...(semesterId && { semester_id: semesterId }),
      ...(sectionId && { section_id: sectionId }),
      ...(admissionMode && { admission_mode: admissionMode }),
    });
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/reports/bulk/?${params.toString()}`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Students Fee Reports Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const sendFeeReminder = async (studentId: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/students/${studentId}/send-reminder/`, {
      method: "POST",
    });
    return await response.json();
  } catch (error) {
    console.error("Send Fee Reminder Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const bulkSendReminders = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/bulk-reminders/`, {
      method: "POST",
    });
    return await response.json();
  } catch (error) {
    console.error("Bulk Send Reminders Error:", error);
    return { success: false, message: "Network error" };
  }
};

// Staff Attendance Reports
export const getStaffAttendanceAudit = async (role: string, startDate: string, endDate: string, page: number = 1, format?: string) => {
  try {
    const params = new URLSearchParams({
      role,
      start_date: startDate,
      end_date: endDate,
      page: page.toString(),
      ...(format && { format }),
    });
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/reports/attendance/?${params.toString()}`, {
      method: "GET",
    });
    
    if (format) return response; // Return raw response for downloads
    return await response.json();
  } catch (error) {
    console.error("Get Staff Attendance Audit Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const getStaffDetailedAttendance = async (staffId: number, startDate: string, endDate: string) => {
  try {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/reports/attendance/${staffId}/?${params.toString()}`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Staff Detailed Attendance Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const getFeesManagerFilters = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/filters/`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Fees Filters Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const getFeesManagerBranches = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/branches/`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Fees Branches Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const getFeesManagerSemesters = async (branchId: string) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/semesters/?branch_id=${branchId}`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Fees Semesters Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const getFeesManagerSections = async (branchId: string, semesterId: string) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/sections/?branch_id=${branchId}&semester_id=${semesterId}`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Fees Sections Error:", error);
    return { success: false, message: "Network error" };
  }
};

// Profile and Dashboard
export const getFeesManagerProfile = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Profile Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const updateFeesManagerProfile = async (data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/update/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Update Profile Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const changeFeesManagerPassword = async (data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/change-password/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Change Password Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const getFeesManagerDashboard = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/dashboard/`, {
      method: "GET",
    });
    return await response.json();
  } catch (error) {
    console.error("Get Dashboard Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const STAFF_ROLES = [
  { value: 'principal', label: 'Principal' },
  { value: 'hod', label: 'HOD' },
  { value: 'dean', label: 'Dean' },
  { value: 'teacher', label: 'Faculty' },
  { value: 'coe', label: 'COE' },
  { value: 'fees_manager', label: 'Fees Manager' },
  { value: 'warden', label: 'Warden' },
  { value: 'caretaker', label: 'Caretaker' },
];
