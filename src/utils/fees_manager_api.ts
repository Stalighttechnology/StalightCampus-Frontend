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
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const createFeeComponent = async (data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/components/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const updateFeeComponent = async (id: number, data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/components/${id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const deleteFeeComponent = async (id: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/components/${id}/`, {
      method: "DELETE"
    });
    if (response.ok) return { success: true };
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

// Fee Templates
export const getFeeTemplates = async (page: number = 1, pageSize: number = 25) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/fee-templates/?page=${page}&page_size=${pageSize}`, {
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const createFeeTemplate = async (data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/fee-templates/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const updateFeeTemplate = async (id: number, data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/templates/${id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const deleteFeeTemplate = async (id: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/templates/${id}/`, {
      method: "DELETE"
    });
    if (response.ok) return { success: true };
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

// Fee Assignments
export const getFeesManagerAssignments = async (params: any) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/assignments/?${query}`, {
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const deleteFeeAssignment = async (id: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/assignments/${id}/`, {
      method: "DELETE"
    });
    if (response.ok) return { success: true };
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const bulkAssignFees = async (data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/bulk-assignments/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

// Invoices
export const getInvoices = async (params: any) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/invoices/?${query}`, {
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const deleteInvoice = async (id: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/invoices/${id}/`, {
      method: "DELETE"
    });
    if (response.ok) return { success: true };
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getInvoiceDetails = async (id: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/invoices/${id}/`, {
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const downloadInvoice = async (id: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/invoices/${id}/download/`, {
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const downloadInvoicePdf = async (id: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/invoices/${id}/pdf/`, {
      method: "GET"
    });
    if (!response.ok) {
      return { success: false, message: "Failed to download invoice PDF" };
    }
    const blob = await response.blob();
    return { success: true, data: blob };
  } catch (error) {
    return { success: false, message: "Network error" };
  }
};

// Payments
export const getPayments = async (params: any) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payments/?${query}`, {
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const recordPayment = async (data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payments/record/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getPaymentStats = async (params: any) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payment-stats/?${query}`, {
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const refundPayment = async (id: number, data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payments/${id}/refund/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const processRefund = refundPayment;

export const getPaymentDetails = async (id: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payments/${id}/`, {
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getPaymentReceipt = async (id: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payments/${id}/receipt/`, {
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const downloadReceipt = async (id: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payments/${id}/receipt/`, {
      method: "GET"
    });
    if (!response.ok) {
      return { success: false, message: "Failed to download receipt" };
    }
    const blob = await response.blob();
    return { success: true, data: blob };
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

// Stats and Other
export const getFeesManagerStats = async (params: any) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/stats/?${query}`, {
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getFeesManagerStudents = async (params: any) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/students/?${query}`, {
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getFeesManagerLeaves = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/leaves/`, {
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const applyFeesManagerLeave = async (data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/leaves/apply/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

// Student Fee Reports
export const getStudentFeeReport = async (searchTerm: string) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/reports/student/?search=${searchTerm}`, {
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const downloadStudentFeeReportPdf = async (searchTerm: string) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/student-fee-report/export-pdf/?search=${searchTerm}`, {
      method: "GET"
    });
    if (!response.ok) {
      return { success: false, message: "Failed to download PDF report" };
    }
    const blob = await response.blob();
    return { success: true, data: blob };
  } catch (error) {
    return { success: false, message: "Network error" };
  }
};

export const downloadStudentsFeeReportsPdf = async (batchId?: string, branchId?: string, semesterId?: string, sectionId?: string, admissionMode?: string) => {
  try {
    const params = new URLSearchParams({
      ...(batchId && { batch_id: batchId }),
      ...(branchId && { branch_id: branchId }),
      ...(semesterId && { semester_id: semesterId }),
      ...(sectionId && { section_id: sectionId }),
      ...(admissionMode && { admission_mode: admissionMode })
    });
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/students-fee-reports/export-pdf/?${params.toString()}`, {
      method: "GET"
    });
    if (!response.ok) {
      return { success: false, message: "Failed to download bulk PDF report" };
    }
    const blob = await response.blob();
    return { success: true, data: blob };
  } catch (error) {
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
      ...(admissionMode && { admission_mode: admissionMode })
    });
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/reports/bulk/?${params.toString()}`, {
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const sendFeeReminder = async (studentId: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/students/${studentId}/send-reminder/`, {
      method: "POST"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const bulkSendReminders = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/bulk-reminders/`, {
      method: "POST"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

// Staff Attendance Reports
export const getStaffAttendanceAudit = async (role: string, startDate: string, endDate: string, page: number = 1, format?: string, searchQuery?: string) => {
  try {
    const params = new URLSearchParams({
      role,
      start_date: startDate,
      end_date: endDate,
      page: page.toString(),
      ...(format && { export_format: format }),
      ...(searchQuery && { search: searchQuery })
    });
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/reports/attendance/?${params.toString()}`, {
      method: "GET"
    });

    if (format) return response; // Return raw response for downloads
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getStaffDetailedAttendance = async (staffId: string, startDate: string, endDate: string) => {
  try {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate
    });
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/reports/attendance/${staffId}/?${params.toString()}`, {
      method: "GET"
    });
    if (response.ok) {
      return await response.json();
    }
    return { success: false, message: "Failed to fetch data" };
  } catch (error) {
    return { success: false, message: "An error occurred" };
  }
};

export const updateStaffAttendanceRecord = async (staffId: string, date: string, payload: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/reports/attendance/${staffId}/${date}/edit/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      return await response.json();
    }
    const errorData = await response.json().catch(() => ({}));
    return { success: false, message: errorData.message || "Failed to update record" };
  } catch (error) {
    return { success: false, message: "An error occurred" };
  }
};

export const getFeesManagerFilters = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/filters/`, {
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getFeesManagerBranches = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/branches/`, {
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getFeesManagerSemesters = async (branchId: string) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/semesters/?branch_id=${branchId}`, {
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getFeesManagerSections = async (branchId: string, semesterId: string) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/sections/?branch_id=${branchId}&semester_id=${semesterId}`, {
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

// Profile and Dashboard
export const getFeesManagerProfile = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/`, {
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const updateFeesManagerProfile = async (data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/update/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const changeFeesManagerPassword = async (data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/change-password/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getFeesManagerDashboard = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/dashboard/`, {
      method: "GET"
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

// Payment settings (Razorpay)
export const getPaymentSettings = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payment-settings/`, {
      method: 'GET'
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error' };
  }
};

export const savePaymentSettings = async (data: { razorpay_key_id: string; razorpay_key_secret: string }) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payment-settings/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error' };
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
{ value: 'hms_admin', label: 'HMS Admin' },
{ value: 'library_admin', label: 'Library Admin' },
{ value: 'transport_admin', label: 'Transport Admin' },
{ value: 'driver', label: 'Driver' },
{ value: 'placement_officer', label: 'Placement Officer' },
{ value: 'counsellor', label: 'Admission Counsellor' },
{ value: 'admission_manager', label: 'Admission Manager' },
{ value: 'org_admin', label: 'Org Admin' }];

// Payroll Management API Helpers
export const getPayrollSettings = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/settings/`, {
      method: 'GET'
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error fetching payroll settings' };
  }
};

export const savePayrollSettings = async (data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/settings/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error saving payroll settings' };
  }
};

export const getSalaryStructures = async (page: number = 1, search: string = '', role: string = '') => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/salary-structures/?page=${page}&search=${encodeURIComponent(search)}&role=${encodeURIComponent(role)}`, {
      method: 'GET'
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error fetching salary structures' };
  }
};

export const saveSalaryStructure = async (data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/salary-structures/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error saving salary structure' };
  }
};

export const getTaxDeclarations = async (financialYear: string, page: number = 1) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/declarations/?financial_year=${financialYear}&page=${page}`, {
      method: 'GET'
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error fetching tax declarations' };
  }
};

export const verifyTaxDeclaration = async (declarationId: number, isVerified: boolean) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/declarations/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ declaration_id: declarationId, is_verified: isVerified })
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error verifying tax declaration' };
  }
};

export const getReimbursementClaims = async (page: number = 1) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/reimbursements/?page=${page}`, {
      method: 'GET'
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error fetching reimbursement claims' };
  }
};

export const updateReimbursementClaim = async (claimId: number, action: 'approve' | 'reject') => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/reimbursements/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim_id: claimId, action })
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error updating reimbursement claim' };
  }
};

export const getLoanRequests = async (page: number = 1) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/loans/?page=${page}`, {
      method: 'GET'
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error fetching loans' };
  }
};

export const updateLoanRequest = async (loanId: number, action: 'approve' | 'cancel') => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/loans/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loan_id: loanId, action })
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error updating loan request' };
  }
};

export const getPayrollRuns = async (page: number = 1) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/runs/?page=${page}`, {
      method: 'GET'
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error fetching payroll runs' };
  }
};

export const initiatePayrollRun = async (month: number, year: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/runs/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year })
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error initiating payroll run' };
  }
};

export const getPayrollRunDetails = async (runId: number, page: number = 1, search: string = '', role: string = '') => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/runs/${runId}/?page=${page}&search=${encodeURIComponent(search)}&role=${encodeURIComponent(role)}`, {
      method: 'GET'
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error fetching payroll details' };
  }
};

export const updatePayrollRunStatus = async (runId: number, action: 'approve' | 'cancel') => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/runs/${runId}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error updating payroll run status' };
  }
};

export const disbursePayrollRun = async (runId: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/runs/${runId}/payout/`, {
      method: 'POST'
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error disbursing payroll run' };
  }
};

export const downloadPayslipPDF = async (payslipId: number, filename: string) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/payslips/${payslipId}/pdf/`);
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return { success: true };
    } else {
      return { success: false, message: 'Failed to download PDF payslip' };
    }
  } catch (error) {
    return { success: false, message: 'Network error downloading PDF' };
  }
};

// Payroll Adjustments
export const getPayrollAdjustments = async (page: number = 1, search: string = '') => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/adjustments/?page=${page}&search=${encodeURIComponent(search)}`, {
      method: 'GET'
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error fetching adjustments' };
  }
};

export const createPayrollAdjustment = async (data: any) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/adjustments/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error creating adjustment' };
  }
};

export const deletePayrollAdjustment = async (id: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/adjustments/`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adjustment_id: id })
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error deleting adjustment' };
  }
};

// Attendance Lock
export const getAttendanceLockStatus = async (month: number, year: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/attendance-lock/?month=${month}&year=${year}`, {
      method: 'GET'
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error fetching attendance lock status' };
  }
};

export const toggleAttendanceLock = async (month: number, year: number, lock: boolean) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/attendance-lock/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year, lock })
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error toggling attendance lock' };
  }
};

// Payroll Reports
export const downloadPayrollReport = async (reportType: string, format: string, month: number, year: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/payroll/reports/?report_type=${reportType}&export_format=${format}&month=${month}&year=${year}`, {
      method: 'GET'
    });
    if (response.ok) {
      const result = await response.json();
      if (!result.success || !result.data) throw new Error("Invalid report data from server");
      
      const data = result.data;
      const filename = `${reportType}_report_${month}_${year}`;
      
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
      XLSX.writeFile(workbook, `${filename}.xlsx`);
      
      return { success: true };
    } else {
      const errData = await response.json().catch(() => ({}));
      return { success: false, message: errData.message || 'Failed to download report' };
    }
  } catch (error) {
    return { success: false, message: 'Network error downloading report' };
  }
};