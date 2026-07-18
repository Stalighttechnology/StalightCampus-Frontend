import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { showConfirmAlert, showSweetAlert } from "@/utils/sweetalert";
import Swal from 'sweetalert2';
import DashboardCard from '../common/DashboardCard';
import { 
  IndianRupee, 
  Settings, 
  Users, 
  FileCheck, 
  Plus, 
  Trash2, 
  Search, 
  CreditCard,
  Percent,
  Calendar,
  CheckCircle,
  XCircle,
  ChevronRight,
  Eye,
  Download,
  Filter,
  Lock,
  Unlock,
  FileBarChart2,
  SlidersHorizontal,
  UserCheck,
  AlertTriangle,
  AlertCircle,
  ClipboardCheck,
  Loader2
} from 'lucide-react';
import {
  getPayrollSettings,
  savePayrollSettings,
  getSalaryStructures,
  saveSalaryStructure,
  getTaxDeclarations,
  verifyTaxDeclaration,
  getReimbursementClaims,
  updateReimbursementClaim,
  getLoanRequests,
  updateLoanRequest,
  getPayrollRuns,
  initiatePayrollRun,
  getPayrollRunDetails,
  updatePayrollRunStatus,
  disbursePayrollRun,
  downloadPayslipPDF,
  getPayrollAdjustments,
  createPayrollAdjustment,
  deletePayrollAdjustment,
  getAttendanceLockStatus,
  toggleAttendanceLock,
  downloadPayrollReport
} from "../../utils/fees_manager_api";

const FeesManagerPayroll: React.FC<{ user: any }> = ({ user }) => {
  const { theme } = useTheme();
  
  // Tab states: 'overview', 'structures', 'settings', 'reimbursements', 'loans', 'runs'
  const [activeTab, setActiveTab] = useState<'overview' | 'structures' | 'settings' | 'reimbursements' | 'loans' | 'runs' | 'adjustments' | 'attendance-lock' | 'reports'>('overview');
  
  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  
  const setError = (msg: string | null) => {
    if (msg) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: msg,
        confirmButtonColor: '#ef4444',
      });
    }
  };
  const setSuccessMsg = (msg: string | null) => {
    if (msg) {
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: msg,
        confirmButtonColor: '#6366f1',
      });
    }
  };
  
  // Pagination & Search States per Tab
  const [structuresPage, setStructuresPage] = useState(1);
  const [structuresTotalPages, setStructuresTotalPages] = useState(1);
  const [structuresSearch, setStructuresSearch] = useState('');
  
  const [claimsPage, setClaimsPage] = useState(1);
  const [claimsTotalPages, setClaimsTotalPages] = useState(1);

  const [loansPage, setLoansPage] = useState(1);
  const [loansTotalPages, setLoansTotalPages] = useState(1);

  const [runsPage, setRunsPage] = useState(1);
  const [runsTotalPages, setRunsTotalPages] = useState(1);

  const [runDetailsPage, setRunDetailsPage] = useState(1);
  const [runDetailsTotalPages, setRunDetailsTotalPages] = useState(1);
  const [runDetailsSearch, setRunDetailsSearch] = useState('');

  // Filter Dropdowns
  const roleFilterRef = useRef<HTMLDivElement>(null);
  const [showRoleFilter, setShowRoleFilter] = useState(false);
  const runDetailsRoleFilterRef = useRef<HTMLDivElement>(null);
  const [showRunDetailsRoleFilter, setShowRunDetailsRoleFilter] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleFilterRef.current && !roleFilterRef.current.contains(event.target as Node)) {
        setShowRoleFilter(false);
      }
    };
    if (showRoleFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRoleFilter]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (runDetailsRoleFilterRef.current && !runDetailsRoleFilterRef.current.contains(event.target as Node)) {
        setShowRunDetailsRoleFilter(false);
      }
    };
    if (showRunDetailsRoleFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRunDetailsRoleFilter]);

  const rolesList = [
    { value: "", label: "All Roles" },
    { value: "teacher", label: "Teacher" },
    { value: "hod", label: "HOD" },
    { value: "principal", label: "Principal" },
    { value: "coe", label: "COE" },
    { value: "fees_manager", label: "Fees Manager" },
    { value: "warden", label: "Warden" },
    { value: "caretaker", label: "Caretaker" },
    { value: "placement_officer", label: "Placement Officer" },
    { value: "transport_admin", label: "Transport Admin" },
    { value: "driver", label: "Driver" },
    { value: "library_admin", label: "Library Admin" },
    { value: "dean", label: "Dean" },
    { value: "org_admin", label: "Org Admin" }
  ];

  // Data states
  const [payrollSettings, setPayrollSettings] = useState<any>({
    pf_enabled: true,
    pf_employee_percent: 12,
    pf_employer_percent: 12,
    pf_wage_ceiling: 15000,
    esi_enabled: true,
    esi_employee_percent: 0.75,
    esi_employer_percent: 3.25,
    esi_wage_limit: 21000,
    pt_slabs: {
      "Karnataka": [
        { min: 0, max: 25000, amount: 0 },
        { min: 25001, max: 9999999, amount: 200 }
      ]
    },
    lwf_enabled: false,
    lwf_employee_amount: 0,
    lwf_employer_amount: 0,
    lop_calculation_basis: 'calendar_days'
  });
  
  const [structures, setStructures] = useState<any[]>([]);
  const [configuredStructuresCount, setConfiguredStructuresCount] = useState<number | null>(null);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [selectedRunDetailsRoleFilter, setSelectedRunDetailsRoleFilter] = useState('');
  const [reimbursements, setReimbursements] = useState<any[]>([]);
  const [descriptionModal, setDescriptionModal] = useState<{ open: boolean; text: string; employee: string; type: string } | null>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [runDetails, setRunDetails] = useState<any[]>([]);
  
  const [structuresCount, setStructuresCount] = useState(0);
  const [claimsCount, setClaimsCount] = useState(0);
  const [runsCount, setRunsCount] = useState(0);
  const [runDetailsCount, setRunDetailsCount] = useState(0);

  // Adjustments state
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [adjustmentsPage, setAdjustmentsPage] = useState(1);
  const [adjustmentsTotalPages, setAdjustmentsTotalPages] = useState(1);
  const [adjustmentsCount, setAdjustmentsCount] = useState(0);
  const [adjustmentsSearch, setAdjustmentsSearch] = useState('');
  const [newAdjustment, setNewAdjustment] = useState({ employee_id: '', type: 'bonus', amount: '', reason: '', apply_month: new Date().getMonth() + 1, apply_year: new Date().getFullYear() });
  const [adjustmentEmployees, setAdjustmentEmployees] = useState<any[]>([]);
  const [showAddAdjustment, setShowAddAdjustment] = useState(false);

  // Attendance Lock state
  const [lockMonth, setLockMonth] = useState(new Date().getMonth() + 1);
  const [lockYear, setLockYear] = useState(new Date().getFullYear());
  const [lockStatus, setLockStatus] = useState<any>(null);
  const [lockLoading, setLockLoading] = useState(false);

  // Reports state
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportDownloading, setReportDownloading] = useState<string | null>(null);
  const [downloadingPayslipId, setDownloadingPayslipId] = useState<number | null>(null);
  
  // Modal / Slide-over state for Editing Structure
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [editStructureData, setEditStructureData] = useState<any>({
    employment_type: 'permanent',
    salary_type: 'monthly',
    basic_salary: 0,
    hra: 0,
    special_allowance: 0,
    travel_allowance: 0,
    medical_allowance: 0,
    food_allowance: 0,
    internet_allowance: 0,
    other_allowance: 0,
    variable_pay: 0,
    employer_pf: 0,
    employer_esi: 0,
    pan: '',
    uan: '',
    pf_number: '',
    esi_number: '',
    bank_name: '',
    bank_account_number: '',
    bank_ifsc: ''
  });

  // Calculate Draft Payroll inputs
  const [runMonth, setRunMonth] = useState(new Date().getMonth() + 1);
  const [runYear, setRunYear] = useState(new Date().getFullYear());

  // Automatically fetch only when tab, page or query changes
  useEffect(() => {
    fetchTabInitialData();
  }, [activeTab, structuresPage, claimsPage, loansPage, runsPage]);

  // Handle Search Input debouncing or immediate fetches
  const searchTimeout = useRef<any>(null);
  const handleStructuresSearchChange = (val: string) => {
    setStructuresSearch(val);
    if (val.trim()) {
      setSelectedRoleFilter("");
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setStructuresPage(1);
      fetchStructures(1, val, val.trim() ? "" : selectedRoleFilter);
    }, 400);
  };

  const handleRoleFilterChange = (role: string) => {
    setSelectedRoleFilter(role);
    setStructuresSearch("");
    setStructuresPage(1);
    fetchStructures(1, "", role);
  };

  const handleRunDetailsSearchChange = (val: string) => {
    setRunDetailsSearch(val);
    if (val.trim()) {
      setSelectedRunDetailsRoleFilter("");
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setRunDetailsPage(1);
      if (selectedRun) fetchRunDetails(selectedRun.id, 1, val, val.trim() ? "" : selectedRunDetailsRoleFilter);
    }, 400);
  };

  const handleRunDetailsRoleFilterChange = (role: string) => {
    setSelectedRunDetailsRoleFilter(role);
    setRunDetailsSearch("");
    setRunDetailsPage(1);
    if (selectedRun) fetchRunDetails(selectedRun.id, 1, "", role);
  };

  const fetchTabInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'overview') {
        const res = await getPayrollRuns(1);
        if (res.success) setRuns(res.data || []);
        const structRes = await getSalaryStructures(1, '');
        if (structRes.success) {
          setStructures(structRes.data || []);
          setConfiguredStructuresCount(structRes.configured_count ?? 0);
        }
      } else if (activeTab === 'settings') {
        const res = await getPayrollSettings();
        if (res.success) setPayrollSettings(res.data);
      } else if (activeTab === 'structures') {
        await fetchStructures(structuresPage, structuresSearch);
        // Pre-load employees for adjustment dropdown
        const empRes = await getSalaryStructures(1, '', '', 999);
        if (empRes.success) setAdjustmentEmployees(empRes.data || []);
      } else if (activeTab === 'reimbursements') {
        const res = await getReimbursementClaims(claimsPage);
        if (res.success) {
          setReimbursements(res.data || []);
          setClaimsTotalPages(res.total_pages || 1);
          setClaimsCount(res.count || 0);
        }
      } else if (activeTab === 'runs') {
        const res = await getPayrollRuns(runsPage);
        if (res.success) {
          setRuns(res.data || []);
          setRunsTotalPages(res.total_pages || 1);
          setRunsCount(res.count || 0);
        }
      } else if (activeTab === 'adjustments') {
        await fetchAdjustments(adjustmentsPage, adjustmentsSearch);
        const empRes = await getSalaryStructures(1, '');
        if (empRes.success) setAdjustmentEmployees(empRes.data || []);
      } else if (activeTab === 'attendance-lock') {
        await fetchLockStatus();
      }
    } catch (err) {
      setError("Failed to fetch data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdjustments = async (page: number, search: string) => {
    const res = await getPayrollAdjustments(page, search);
    if (res.success) {
      setAdjustments(res.data || []);
      setAdjustmentsTotalPages(res.total_pages || 1);
      setAdjustmentsCount(res.count || 0);
    }
  };

  const fetchLockStatus = async () => {
    setLockLoading(true);
    const res = await getAttendanceLockStatus(lockMonth, lockYear);
    if (res.success) setLockStatus(res.data);
    setLockLoading(false);
  };

  const handleCreateAdjustment = async () => {
    if (!newAdjustment.employee_id || !newAdjustment.amount || !newAdjustment.reason) {
      showSweetAlert('Validation Error', 'Please fill all required fields.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await createPayrollAdjustment({
        employee_id: newAdjustment.employee_id,
        adjustment_type: newAdjustment.type,
        amount: Number(newAdjustment.amount),
        reason: newAdjustment.reason,
        apply_month: newAdjustment.apply_month,
        apply_year: newAdjustment.apply_year,
      });
      if (res.success) {
        showSweetAlert('Success', 'Adjustment created successfully.', 'success');
        setShowAddAdjustment(false);
        setNewAdjustment({ employee_id: '', type: 'bonus', amount: '', reason: '', apply_month: new Date().getMonth() + 1, apply_year: new Date().getFullYear() });
        fetchAdjustments(adjustmentsPage, adjustmentsSearch);
      } else {
        showSweetAlert('Error', res.message || 'Failed to create adjustment.', 'error');
      }
    } catch { showSweetAlert('Error', 'An error occurred.', 'error'); }
    finally { setLoading(false); }
  };

  const handleDeleteAdjustment = async (id: number) => {
    const result = await showConfirmAlert('Delete Adjustment?', 'This will permanently remove this adjustment.', 'Yes, Delete', 'warning');
    if (!result.isConfirmed) return;
    setLoading(true);
    try {
      const res = await deletePayrollAdjustment(id);
      if (res.success) { showSweetAlert('Deleted', 'Adjustment removed.', 'success'); fetchAdjustments(adjustmentsPage, adjustmentsSearch); }
      else showSweetAlert('Error', res.message || 'Failed to delete.', 'error');
    } catch { showSweetAlert('Error', 'An error occurred.', 'error'); }
    finally { setLoading(false); }
  };

  const handleToggleLock = async (shouldLock: boolean) => {
    const label = shouldLock ? 'Lock' : 'Unlock';
    const result = await showConfirmAlert(
      `${label} Attendance for ${new Date(0, lockMonth - 1).toLocaleString('en-US', { month: 'long' })} ${lockYear}?`,
      shouldLock ? 'Once locked, faculty will not be able to edit attendance for this period.' : 'Unlocking will allow attendance edits again.',
      `Yes, ${label}`,
      'warning'
    );
    if (!result.isConfirmed) return;
    setLockLoading(true);
    try {
      const res = await toggleAttendanceLock(lockMonth, lockYear, shouldLock);
      if (res.success) { showSweetAlert('Success', `Attendance ${shouldLock ? 'locked' : 'unlocked'} successfully.`, 'success'); await fetchLockStatus(); }
      else showSweetAlert('Error', res.message || 'Operation failed.', 'error');
    } catch { showSweetAlert('Error', 'An error occurred.', 'error'); }
    finally { setLockLoading(false); }
  };

  const handleDownloadReport = async (reportType: string, format: string) => {
    setReportDownloading(`${reportType}_${format}`);
    try {
      const res = await downloadPayrollReport(reportType, format, reportMonth, reportYear);
      if (!res.success) showSweetAlert('Error', res.message || 'Failed to download report.', 'error');
    } catch { showSweetAlert('Error', 'An error occurred while downloading.', 'error'); }
    finally { setReportDownloading(null); }
  };

  const fetchStructures = async (page: number, search: string, roleFilter: string = selectedRoleFilter) => {
    const effectiveRole = search.trim() ? "" : roleFilter;
    const res = await getSalaryStructures(page, search, effectiveRole);
    if (res.success) {
      setStructures(res.data || []);
      setStructuresTotalPages(res.total_pages || 1);
      setStructuresCount(res.count || 0);
      setConfiguredStructuresCount(res.configured_count ?? 0);
    }
  };

  const fetchRunDetails = async (runId: number, page: number, search: string, roleFilter: string = selectedRunDetailsRoleFilter) => {
    setLoading(true);
    try {
      const effectiveRole = search.trim() ? "" : roleFilter;
      const res = await getPayrollRunDetails(runId, page, search, effectiveRole);
      if (res.success) {
        setSelectedRun(res.run);
        setRunDetails(res.details || []);
        setRunDetailsTotalPages(res.total_pages || 1);
        setRunDetailsCount(res.count || 0);
      }
    } catch (err) {
      setError("Failed to load run details");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const res = await savePayrollSettings(payrollSettings);
      if (res.success) {
        setSuccessMsg("Payroll configurations updated successfully.");
      } else {
        setError(res.message || "Failed to save settings");
      }
    } catch (err) {
      setError("An error occurred while saving configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleEditStructure = (emp: any) => {
    setSelectedEmployee(emp);
    if (emp.salary_structure) {
      setEditStructureData({ ...emp.salary_structure });
    } else {
      setEditStructureData({
        employment_type: 'permanent',
        salary_type: 'monthly',
        basic_salary: 0,
        hra: 0,
        special_allowance: 0,
        travel_allowance: 0,
        medical_allowance: 0,
        food_allowance: 0,
        internet_allowance: 0,
        other_allowance: 0,
        variable_pay: 0,
        employer_pf: 0,
        employer_esi: 0,
        pan: '',
        uan: '',
        pf_number: '',
        esi_number: '',
        bank_name: '',
        bank_account_number: '',
        bank_ifsc: ''
      });
    }
  };

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSaveStructure = async () => {
    const errors: Record<string, string> = {};
    const missingLabels: string[] = [];

    // Basic Salary
    if (!editStructureData.basic_salary || editStructureData.basic_salary <= 0) {
      errors['basic_salary'] = 'Required & must be greater than 0';
      missingLabels.push('Basic Salary (must be > ₹0)');
    }

    // PAN — exactly 10 chars if provided
    const pan = String(editStructureData.pan || '').trim();
    if (pan && pan.length !== 10) {
      errors['pan'] = 'PAN must be exactly 10 characters (e.g. ABCDE1234F)';
      missingLabels.push('PAN Card Number (must be exactly 10 characters)');
    }

    // Bank fields — required
    if (!editStructureData.bank_name || !String(editStructureData.bank_name).trim()) {
      errors['bank_name'] = 'Required';
      missingLabels.push('Bank Name');
    }
    const acct = String(editStructureData.bank_account_number || '').trim();
    if (!acct) {
      errors['bank_account_number'] = 'Required';
      missingLabels.push('Bank Account Number');
    } else if (acct.length < 9 || acct.length > 18) {
      errors['bank_account_number'] = 'Must be 9–18 digits';
      missingLabels.push('Bank Account Number (must be 9–18 digits)');
    }
    const ifsc = String(editStructureData.bank_ifsc || '').trim();
    if (!ifsc) {
      errors['bank_ifsc'] = 'Required';
      missingLabels.push('Bank IFSC Code');
    } else if (ifsc.length !== 11) {
      errors['bank_ifsc'] = 'IFSC must be exactly 11 characters';
      missingLabels.push('Bank IFSC Code (must be exactly 11 characters)');
    }

    // UAN — exactly 12 digits if provided
    const uan = String(editStructureData.uan || '').trim();
    if (uan && uan.length !== 12) {
      errors['uan'] = 'UAN must be exactly 12 digits';
      missingLabels.push('UAN Number (must be exactly 12 digits)');
    }

    // Numeric allowances — no negatives
    const numericFields = ['hra', 'special_allowance', 'travel_allowance', 'medical_allowance', 'food_allowance', 'internet_allowance', 'other_allowance', 'variable_pay', 'employer_pf', 'employer_esi'];
    for (const field of numericFields) {
      if ((editStructureData[field as keyof typeof editStructureData] as number) < 0) {
        errors[field] = 'Cannot be negative';
        missingLabels.push(`${field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} (cannot be negative)`);
      }
    }

    setFieldErrors(errors);

    if (missingLabels.length > 0) {
      const listHtml = missingLabels.map(l => `<li style="text-align:left;padding:2px 0">• ${l}</li>`).join('');
      Swal.fire({
        icon: 'error',
        title: 'Validation Errors',
        html: `<p style="margin-bottom:8px;text-align:left">Please fix the following before saving:</p><ul style="margin:0;padding-left:8px">${listHtml}</ul>`,
        confirmButtonText: 'Fix Now',
        confirmButtonColor: '#6366f1',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        employee_id: selectedEmployee.employee_id,
        ...editStructureData
      };
      const res = await saveSalaryStructure(payload);
      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Salary structure updated successfully.',
          confirmButtonColor: '#6366f1',
        });
        setSelectedEmployee(null);
        fetchStructures(structuresPage, structuresSearch);
      } else {
        setError(res.message || "Failed to update salary structure");
      }
    } catch (err) {
      setError("An error occurred while updating salary structure");
    } finally {
      setLoading(false);
    }
  };

  const handleReimbursementAction = async (claimId: number, action: 'approve' | 'reject') => {
    const label = action === 'approve' ? 'Approve' : 'Reject';
    const result = await showConfirmAlert(
      `${label} this claim?`,
      action === 'approve'
        ? 'This claim will be marked as approved and included in the next payroll run.'
        : 'This claim will be permanently rejected. The employee will need to resubmit if required.',
      `Yes, ${label}`,
      'question'
    );
    if (!result.isConfirmed) return;
    setLoading(true);
    try {
      const res = await updateReimbursementClaim(claimId, action);
      if (res.success) {
        showSweetAlert(
          action === 'approve' ? 'Approved!' : 'Rejected!',
          `Claim has been successfully ${action}d.`,
          action === 'approve' ? 'success' : 'info'
        );
        fetchTabInitialData();
      } else {
        showSweetAlert('Failed', res.message || 'Could not update claim. Please try again.', 'error');
      }
    } catch {
      showSweetAlert('Error', 'An unexpected error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLoanAction = async (loanId: number, action: 'approve' | 'cancel') => {
    setLoading(true);
    try {
      const res = await updateLoanRequest(loanId, action);
      if (res.success) {
        setSuccessMsg(`Loan was successfully ${action}d.`);
        fetchTabInitialData();
      } else {
        setError(res.message || "Failed to update loan status");
      }
    } catch (err) {
      setError("An error occurred during updating loan");
    } finally {
      setLoading(false);
    }
  };

  const handleInitiatePayroll = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await initiatePayrollRun(runMonth, runYear);
      if (res.success) {
        setSuccessMsg("Draft payroll calculations computed successfully.");
        await fetchRunDetails(res.run_id, 1, '');
        setActiveTab('runs');
      } else {
        setError(res.message || "Failed to calculate payroll run");
      }
    } catch (err) {
      setError("An error occurred during calculations");
    } finally {
      setLoading(false);
    }
  };

  const handleViewRun = async (runId: number) => {
    setRunDetailsPage(1);
    await fetchRunDetails(runId, 1, '');
  };

  const handleApproveRun = async (runId: number) => {
    setLoading(true);
    try {
      const res = await updatePayrollRunStatus(runId, 'approve');
      if (res.success) {
        setSuccessMsg("Payroll run successfully approved.");
        fetchRunDetails(runId, runDetailsPage, runDetailsSearch);
      } else {
        setError(res.message || "Failed to approve run");
      }
    } catch (err) {
      setError("Failed to approve run");
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutRun = async (runId: number) => {
    setLoading(true);
    try {
      const res = await disbursePayrollRun(runId);
      if (res.success) {
        setSuccessMsg(res.message || "Payout disbursements initiated successfully via RazorpayX.");
        fetchRunDetails(runId, runDetailsPage, runDetailsSearch);
      } else {
        setError(res.message || "Failed to trigger payouts");
      }
    } catch (err) {
      setError("Failed to initiate payout");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: any) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Number(val || 0));
  };

  // Reusable Pagination Controls UI Component
  const PaginationControls = ({ currentPage, totalPages, totalCount, onPageChange }: { currentPage: number, totalPages: number, totalCount: number, onPageChange: (p: number) => void }) => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-4">
        <div>
          Showing {Math.min((currentPage - 1) * 10 + 1, totalCount)} to {Math.min(currentPage * 10, totalCount)} of {totalCount} records
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || loading}
            className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
          >
            Previous
          </Button>

          <div className="flex items-center justify-center min-w-[2rem]">
            <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              {currentPage}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || loading}
            className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  // Reusable form input layout to replace the hardcoded "black boxes" in light mode
  const formInputClass = "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-6 pb-10">
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader id="fees-manager-payroll-header" className="border-b mb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl sm:text-2xl font-semibold mb-2">Payroll Management</CardTitle>
              <CardDescription>Manage employee salaries, statutory PF/ESI compliance, TDS taxes, loans, and Razorpay payouts.</CardDescription>
            </div>
            {!selectedRun && (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="gap-2 w-full sm:w-auto bg-primary text-white hover:bg-primary/80 hover:text-white"
                  onClick={async () => {
                    setLoading(true);
                    const res = await getPayrollSettings();
                    if (res.success) setPayrollSettings(res.data);
                    setLoading(false);
                    setConfigModalOpen(true);
                  }}
                >
                  <Settings size={16} /> Configurations
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Tabs */}
          <div className={`flex border-b overflow-x-auto gap-4 dark:border-slate-800`}>
        {([
          { id: 'overview', label: 'Overview' },
          { id: 'structures', label: 'Salary Structures' },
          { id: 'reimbursements', label: 'Reimbursements' },
          { id: 'adjustments', label: 'Adjustments' },
          { id: 'attendance-lock', label: 'Attendance Lock' },
          { id: 'runs', label: 'Payroll Batches' },
          { id: 'reports', label: 'Reports' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setSelectedRun(null); }}
            className={`pb-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${
              activeTab === tab.id && !selectedRun
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alert panels (managed via modal overlays now) */}

      {/* TAB CONTENT: Overview */}
      {activeTab === 'overview' && !selectedRun && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <DashboardCard
              title="Active Salary Structures"
              value={configuredStructuresCount !== null ? configuredStructuresCount.toString() : "Checking..."}
              description="Configured employees"
              icon={<Users className="text-blue-500" />}
            />
            <DashboardCard
              title="Disbursements Pending"
              value={runs.filter(r => r.status === 'approved').length || "0"}
              description="Payroll runs approved"
              icon={<CreditCard className="text-amber-500" />}
            />
            <DashboardCard
              title="Recent Net Payout"
              value={formatCurrency(runs[0]?.total_net_payout || 0)}
              description={runs[0] ? `For Period ${runs[0].month}/${runs[0].year}` : 'No payouts yet'}
              icon={<IndianRupee className="text-emerald-500" />}
            />
            <DashboardCard
              title="Statutory Status"
              value="Compliant"
              description="PF / ESI config active"
              icon={<FileCheck className="text-teal-500" />}
            />
          </div>

          {/* Quick Actions */}
          <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="text-lg font-semibold mb-4">Calculate Salary Run</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2">Select Month</label>
                <Select value={String(runMonth)} onValueChange={(val) => setRunMonth(Number(val))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {new Date(0, i).toLocaleString('en-US', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2">Select Year</label>
                <Select value={String(runYear)} onValueChange={(val) => setRunYear(Number(val))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2027">2027</SelectItem>
                    <SelectItem value="2028">2028</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => handleInitiatePayroll()} className="w-full" disabled={loading}>
                Draft Calculations Run
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Salary Structures */}
      {activeTab === 'structures' && !selectedEmployee && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff, designation, or roles..."
                value={structuresSearch}
                onChange={(e) => handleStructuresSearchChange(e.target.value)}
                className="w-full pl-9 pr-12 py-2 text-sm bg-transparent border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-blue-500 focus:outline-none"
              />
              {structuresSearch && (
                <button
                  onClick={() => handleStructuresSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="relative flex-shrink-0" ref={roleFilterRef}>
              <Button
                onClick={() => setShowRoleFilter((prev) => !prev)}
                className="w-full sm:w-auto h-10 text-sm font-medium flex items-center justify-center gap-1.5 shadow-sm transition-all duration-200 bg-primary text-white hover:bg-primary/90 hover:text-white px-4 py-2 border-none rounded-md"
              >
                <Filter className="w-4 h-4 text-white" />
                <span>
                  {selectedRoleFilter === "" ? "All Roles" : rolesList.find(r => r.value === selectedRoleFilter)?.label || selectedRoleFilter}
                </span>
              </Button>
              {showRoleFilter && (
                <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg z-20 border ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
                  <div className="py-1 max-h-60 overflow-y-auto custom-scrollbar">
                    {rolesList.map((role) => (
                      <button
                        key={role.value}
                        type="button"
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-accent cursor-pointer ${
                          theme === 'dark' ? 'hover:bg-accent text-foreground' : 'hover:bg-gray-100 text-gray-700'
                        } ${selectedRoleFilter === role.value ? 'font-semibold bg-accent/50 text-primary' : ''}`}
                        onClick={() => {
                          handleRoleFilterChange(role.value);
                          setShowRoleFilter(false);
                        }}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {structures.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-20 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-slate-800 bg-slate-900/30' : 'border-gray-200 bg-gray-50/50'}`}>
              <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                <Search className="w-10 h-10 text-primary opacity-50" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                No Staff Structures Found
              </h3>
              <p className={`text-center max-w-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                We couldn't find any staff matching the selected criteria. Try adjusting your filters or search query.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-slate-300 dark:border-slate-850">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Structure</th>
                      <th className="px-6 py-4 text-right">Basic Salary</th>
                      <th className="px-6 py-4 text-right">Monthly Gross</th>
                      <th className="px-6 py-4 text-right">Annual CTC</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {structures.map((emp, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{emp.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{emp.designation}</div>
                        </td>
                        <td className="px-6 py-4 capitalize text-slate-700 dark:text-slate-300">{emp.role}</td>
                        <td className="px-6 py-4 capitalize">
                          {emp.salary_structure ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-none">
                              {emp.salary_structure.employment_type} ({emp.salary_structure.salary_type})
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-none">Not Configured</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-800 dark:text-slate-200">
                          {emp.salary_structure ? formatCurrency(emp.salary_structure.basic_salary) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-800 dark:text-slate-200">
                          {emp.salary_structure ? formatCurrency(emp.salary_structure.gross) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-blue-600 dark:text-blue-400">
                          {emp.salary_structure ? formatCurrency(emp.salary_structure.ctc) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button size="sm" className="bg-primary text-white hover:bg-primary/90" onClick={() => handleEditStructure(emp)}>
                            {emp.salary_structure ? 'Edit Structure' : 'Configure Structure'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <PaginationControls
                currentPage={structuresPage}
                totalPages={structuresTotalPages}
                totalCount={structuresCount}
                onPageChange={setStructuresPage}
              />
            </>
          )}
        </div>
      )}


      {/* TAB CONTENT: Reimbursements & Claims */}
      {activeTab === 'reimbursements' && (
        <div className="space-y-4">
          {/* Mobile View: Stacked Cards */}
          <div className="md:hidden space-y-4">
            {reimbursements.map((claim, i) => (
              <div key={i} className={`p-4 rounded-lg border space-y-3 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/50 border-slate-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white text-base">{claim.employee_name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{claim.type} Claim</div>
                  </div>
                  <Badge variant="outline" className={`capitalize border-none ${
                    claim.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                    claim.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {claim.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-850 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Amount</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(claim.amount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Receipt</span>
                    {claim.receipt_file ? (
                      <a href={claim.receipt_file} target="_blank" rel="noreferrer" className="text-blue-500 flex items-center gap-1 hover:underline font-semibold text-xs">
                        <Eye size={12} /> View File
                      </a>
                    ) : (
                      <span className="text-slate-500 italic">No attachment</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-center my-3">
                  {claim.description ? (
                    <button
                      onClick={() => setDescriptionModal({ open: true, text: claim.description, employee: claim.employee_name, type: claim.type })}
                      className={`w-full sm:w-32 h-8 text-sm font-semibold flex items-center justify-center gap-1.5 rounded-lg shadow-sm transition-all duration-200 cursor-pointer
                      ${theme === 'dark' ?
                          'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20' :
                          'bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10'}`}
                    >
                      <Eye size={14} /> View Reason
                    </button>
                  ) : (
                    <span className="text-slate-500 italic text-xs">No description provided</span>
                  )}
                </div>

                {claim.status === 'pending' && (
                  <div className="flex flex-row gap-2 mt-4">
                    <Button
                      variant="outline"
                      className={`flex-1 h-9 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all duration-200
                      ${theme === 'dark' ?
                          'text-green-400 border-green-400/50 bg-green-400/5 hover:bg-green-400/20 hover:text-green-400' :
                          'text-green-700 border-green-200 bg-green-50 hover:bg-green-100 hover:text-green-700'}`
                      }
                      onClick={() => handleReimbursementAction(claim.id, 'approve')}
                    >
                      <CheckCircle size={14} /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      className={`flex-1 h-9 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all duration-200
                      ${theme === 'dark' ?
                          'text-red-400 border-red-400/50 bg-red-400/5 hover:bg-red-400/20 hover:text-red-400' :
                          'text-red-700 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700'}`
                      }
                      onClick={() => handleReimbursementAction(claim.id, 'reject')}
                    >
                      <XCircle size={14} /> Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {!reimbursements.length && (
              <div className={`border-2 border-dashed flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-lg ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
                <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-accent/10' : 'bg-primary/10'}`}>
                  <Filter className={`w-8 h-8 ${theme === 'dark' ? 'text-primary/70' : 'text-primary/70'}`} />
                </div>
                <div className="max-w-xs mx-auto">
                  <h3 className={`text-md font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    No Reimbursement Claims Found
                  </h3>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    There are no reimbursement claims matching the selected filters.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-350 dark:border-slate-800">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Claim Type</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4">Receipt</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {reimbursements.map((claim, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{claim.employee_name}</td>
                    <td className="px-6 py-4 capitalize text-slate-700 dark:text-slate-300">{claim.type}</td>
                    <td className="px-6 py-4">
                      {claim.description ? (
                        <button
                          onClick={() => setDescriptionModal({ open: true, text: claim.description, employee: claim.employee_name, type: claim.type })}
                          className={`text-sm font-medium px-2.5 py-1 rounded-md transition border cursor-pointer ${
                            theme === 'dark'
                              ? 'border-purple-500/20 text-purple-400 bg-purple-950/20 hover:bg-purple-950/40'
                              : 'border-purple-100 text-purple-600 bg-purple-50 hover:bg-purple-100/80'
                          }`}
                        >
                          View
                        </button>
                      ) : (
                        <span className="text-slate-400 italic text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900 dark:text-white">{formatCurrency(claim.amount)}</td>
                    <td className="px-6 py-4">
                      {claim.receipt_file ? (
                        <a href={claim.receipt_file} target="_blank" rel="noreferrer" className="text-blue-500 flex items-center gap-1 hover:underline text-xs">
                          <Eye size={12} /> View File
                        </a>
                      ) : (
                        <span className="text-slate-500 italic text-xs">No attachment</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={`capitalize border-none ${
                        claim.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                        claim.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {claim.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      {claim.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            className={`px-3 py-1 text-xs flex items-center gap-1 ${theme === 'dark' ?
                                'text-green-400 border-green-400 hover:bg-green-900/20 hover:text-green-400 bg-transparent' :
                                'text-green-700 border-green-600 hover:bg-green-100 hover:text-green-700 bg-transparent'}`
                            }
                            onClick={() => handleReimbursementAction(claim.id, 'approve')}
                          >
                            <CheckCircle size={16} /> Approve
                          </Button>
                          <Button
                            variant="outline"
                            className={`px-3 py-1 text-xs flex items-center gap-1 ${theme === 'dark' ?
                                'text-red-400 border-red-400 hover:bg-red-900/20 hover:text-red-400 bg-transparent' :
                                'text-red-700 border-red-600 hover:bg-red-100 hover:text-red-700 bg-transparent'}`
                            }
                            onClick={() => handleReimbursementAction(claim.id, 'reject')}
                          >
                            <XCircle size={16} /> Reject
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {!reimbursements.length && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 italic">No reimbursement claims recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <PaginationControls
            currentPage={claimsPage}
            totalPages={claimsTotalPages}
            totalCount={claimsCount}
            onPageChange={setClaimsPage}
          />
        </div>
      )}


      {/* TAB CONTENT: Payroll Batches (Runs) */}
      {activeTab === 'runs' && !selectedRun && (
        <div className="space-y-4">
          {runs.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-lg border border-slate-350 dark:border-slate-800">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="px-6 py-4">Period</th>
                      <th className="px-6 py-4">Calculation Date</th>
                      <th className="px-6 py-4 text-right">Headcount</th>
                      <th className="px-6 py-4 text-right">Total Net Payout</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {runs.map((run, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                          {new Date(0, run.month - 1).toLocaleString('en-US', { month: 'long' })} {run.year}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{run.created_at}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-750 dark:text-slate-250">{run.employee_count} staff</td>
                        <td className="px-6 py-4 text-right font-semibold text-blue-600 dark:text-blue-400">
                          {formatCurrency(run.total_net_payout)}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={`capitalize border-none ${
                            run.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                            run.status === 'approved' ? 'bg-blue-500/10 text-blue-500' :
                            run.status === 'calculated' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'
                          }`}>
                            {run.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => handleViewRun(run.id)}>
                            View Details <ChevronRight size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <PaginationControls
                currentPage={runsPage}
                totalPages={runsTotalPages}
                totalCount={runsCount}
                onPageChange={setRunsPage}
              />
            </>
          ) : (
            <div className={`border-2 border-dashed flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-lg ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
              <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-accent/10' : 'bg-primary/10'}`}>
                <Calendar className={`w-8 h-8 ${theme === 'dark' ? 'text-primary/70' : 'text-primary/70'}`} />
              </div>
              <div className="max-w-xs mx-auto">
                <h3 className={`text-md font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  No Payroll Calculation Runs Found
                </h3>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  No payroll calculation runs processed yet.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Adjustments */}
      {activeTab === 'adjustments' && !selectedRun && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search adjustments by employee or reason..."
                value={adjustmentsSearch}
                onChange={(e) => {
                  setAdjustmentsSearch(e.target.value);
                  setAdjustmentsPage(1);
                  fetchAdjustments(1, e.target.value);
                }}
                className="w-full pl-9 pr-12 py-2 text-sm bg-transparent border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-blue-500 focus:outline-none"
              />
              {adjustmentsSearch && (
                <button
                  onClick={() => {
                    setAdjustmentsSearch("");
                    setAdjustmentsPage(1);
                    fetchAdjustments(1, "");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <Button
              className="bg-primary text-white hover:bg-primary/90 gap-2"
              onClick={() => setShowAddAdjustment(true)}
            >
              <Plus size={16} /> Add Adjustment
            </Button>
          </div>

          {adjustments.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-20 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-slate-800 bg-slate-900/30' : 'border-gray-200 bg-gray-50/50'}`}>
              <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                <Search className="w-10 h-10 text-primary opacity-50" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                No Payroll Adjustments Found
              </h3>
              <p className={`text-center max-w-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                We couldn't find any payroll adjustments matching the selected criteria. Try adjusting your filters or search query.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-slate-300 dark:border-slate-800">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Reason</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4">Apply Period</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {adjustments.map((adj, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{adj.employee_name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{adj.role}</div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={`capitalize border-none ${
                            adj.adjustment_type === 'bonus' ? 'bg-emerald-500/10 text-emerald-500' :
                            adj.adjustment_type === 'deduction' ? 'bg-red-500/10 text-red-500' :
                            adj.adjustment_type === 'arrears' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {adj.adjustment_type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{adj.reason}</td>
                        <td className={`px-6 py-4 text-right font-semibold ${
                          adj.adjustment_type === 'bonus' || adj.adjustment_type === 'arrears' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                        }`}>
                          {adj.adjustment_type === 'deduction' ? '-' : '+'}{formatCurrency(adj.amount)}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          {new Date(0, adj.apply_month - 1).toLocaleString('en-US', { month: 'short' })} {adj.apply_year}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={`capitalize border-none ${
                            adj.is_applied ? 'bg-slate-500/10 text-slate-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {adj.is_applied ? 'Applied' : 'Pending'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {!adj.is_applied && (
                            <Button
                              size="sm" variant="outline"
                              className="text-red-500 border-red-400/50 hover:bg-red-50 dark:hover:bg-red-900/20 gap-1"
                              onClick={() => handleDeleteAdjustment(adj.id)}
                            >
                              <Trash2 size={14} /> Delete
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PaginationControls
                currentPage={adjustmentsPage}
                totalPages={adjustmentsTotalPages}
                totalCount={adjustmentsCount}
                onPageChange={(p) => { setAdjustmentsPage(p); fetchAdjustments(p, adjustmentsSearch); }}
              />
            </>
          )}
        </div>
      )}

      {/* TAB CONTENT: Attendance Lock */}
      {activeTab === 'attendance-lock' && !selectedRun && (
        <div className="space-y-6">
          <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2"><Lock size={18} className="text-primary" /> Attendance Lock Control</h3>
            <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Lock attendance for a specific month to prevent faculty from editing records after payroll generation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2">Month</label>
                <Select value={String(lockMonth)} onValueChange={(v) => setLockMonth(Number(v))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {new Date(0, i).toLocaleString('en-US', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2">Year</label>
                <Select value={String(lockYear)} onValueChange={(v) => setLockYear(Number(v))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2027">2027</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={fetchLockStatus} variant="outline" className="w-full bg-primary text-white hover:bg-primary/90 hover:text-white" disabled={lockLoading}>
                Check Status
              </Button>
            </div>
          </div>

          {lockStatus && (
            <div className={`rounded-lg border p-6 ${
              lockStatus.is_locked
                ? theme === 'dark' ? 'border-red-500/30 bg-red-950/10' : 'border-red-200 bg-red-50'
                : theme === 'dark' ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-emerald-200 bg-emerald-50'
            }`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {lockStatus.is_locked
                    ? <Lock className="text-red-500" size={28} />
                    : <Unlock className="text-emerald-500" size={28} />}
                  <div>
                    <h4 className={`font-semibold text-lg ${
                      lockStatus.is_locked ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {lockStatus.is_locked ? 'Attendance Locked' : 'Attendance Open'}
                    </h4>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {new Date(0, lockMonth - 1).toLocaleString('en-US', { month: 'long' })} {lockYear} —
                      {lockStatus.is_locked
                        ? ` Locked by ${lockStatus.locked_by || 'Admin'} on ${lockStatus.locked_at ? new Date(lockStatus.locked_at).toLocaleDateString() : 'N/A'}`
                        : ' Faculty can still edit attendance for this period.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {lockStatus.is_locked ? (
                    <div className="flex flex-col items-end gap-1">
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 w-full md:w-auto"
                        onClick={() => handleToggleLock(false)}
                        disabled={lockLoading || lockStatus.locked_runs_count > 0}
                      >
                        <Unlock size={16} /> Unlock Attendance
                      </Button>
                      {lockStatus.locked_runs_count > 0 && (
                        <span className="text-[10px] text-red-500 font-medium max-w-[200px] text-right leading-tight">
                          Cannot unlock: Payroll is already finalized. Use Adjustments instead.
                        </span>
                      )}
                    </div>
                  ) : (
                    <Button
                      className="bg-red-600 hover:bg-red-700 text-white gap-2"
                      onClick={() => handleToggleLock(true)}
                      disabled={lockLoading}
                    >
                      <Lock size={16} /> Lock Attendance
                    </Button>
                  )}
                </div>
              </div>
              {lockStatus.locked_runs_count !== undefined && (
                <div className={`mt-4 pt-4 border-t text-sm ${
                  lockStatus.is_locked ? 'border-red-200 dark:border-red-800/30' : 'border-emerald-200 dark:border-emerald-800/30'
                } ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  <span className="font-semibold">{lockStatus.frozen_records_count || 0}</span> attendance records frozen for this period.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Reports */}
      {activeTab === 'reports' && !selectedRun && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-2">Report Month</label>
              <Select value={String(reportMonth)} onValueChange={(v) => setReportMonth(Number(v))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {new Date(0, i).toLocaleString('en-US', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-2">Report Year</label>
              <Select value={String(reportYear)} onValueChange={(v) => setReportYear(Number(v))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { type: 'monthly', label: 'Monthly Payroll Summary', desc: 'Full breakdown of all employee salaries for the selected month', icon: <FileBarChart2 size={20} className="text-blue-500" /> },
              { type: 'pf', label: 'PF Report', desc: 'Provident Fund contributions (Employee + Employer) for the period', icon: <ClipboardCheck size={20} className="text-purple-500" /> },
              { type: 'esi', label: 'ESI Report', desc: 'Employee State Insurance deductions and contributions', icon: <UserCheck size={20} className="text-indigo-500" /> },
              { type: 'tds', label: 'TDS / Tax Report', desc: 'Income tax deductions at source for the pay period', icon: <SlidersHorizontal size={20} className="text-amber-500" /> },
              { type: 'bank_transfer', label: 'Bank Transfer Sheet', desc: 'Bulk bank transfer NEFT/RTGS sheet for salary disbursement', icon: <IndianRupee size={20} className="text-emerald-500" /> },
              { type: 'annual', label: 'Annual Salary Register', desc: 'Full annual salary register for the current financial year', icon: <FileBarChart2 size={20} className="text-rose-500" /> },
            ].map((report) => (
              <div
                key={report.type}
                className={`rounded-lg border p-5 flex flex-col gap-3 ${
                  theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
                    {report.icon}
                  </div>
                  <div>
                    <h4 className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{report.label}</h4>
                  </div>
                </div>
                <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{report.desc}</p>
                <div className="flex gap-2 mt-auto">
                  <Button
                    size="sm" className="w-full gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleDownloadReport(report.type, 'excel')}
                    disabled={reportDownloading === `${report.type}_excel`}
                  >
                    <Download size={13} />
                    {reportDownloading === `${report.type}_excel` ? 'Downloading...' : 'Download Excel'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW: Payroll Run Detailed Lines / Disbursal Panel */}
      {selectedRun && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Payroll Details: {new Date(0, selectedRun.month - 1).toLocaleString('en-US', { month: 'long' })} {selectedRun.year}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant="outline" className={`capitalize border-none ${
                  selectedRun.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                  selectedRun.status === 'approved' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {selectedRun.status}
                </Badge>
                <span className="text-xs text-slate-500 dark:text-slate-400">Total Payout: {formatCurrency(runDetails.reduce((a, b) => a + Number(b.net_salary), 0))}</span>
              </div>
              {/* Audit Trail */}
              <div className={`mt-3 flex flex-wrap gap-3 text-xs ${ theme === 'dark' ? 'text-slate-400' : 'text-slate-500' }`}>
                {selectedRun.calculated_by && (
                  <span className="flex items-center gap-1"><ClipboardCheck size={12} className="text-blue-400" /> Calculated by <strong className="text-slate-700 dark:text-slate-200">{selectedRun.calculated_by}</strong></span>
                )}
                {selectedRun.approved_by && (
                  <span className="flex items-center gap-1"><CheckCircle size={12} className="text-emerald-400" /> Approved by <strong className="text-slate-700 dark:text-slate-200">{selectedRun.approved_by}</strong></span>
                )}
                {selectedRun.paid_by && (
                  <span className="flex items-center gap-1"><IndianRupee size={12} className="text-purple-400" /> Paid by <strong className="text-slate-700 dark:text-slate-200">{selectedRun.paid_by}</strong></span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedRun(null)}>Back to batches</Button>
              {selectedRun.status === 'calculated' && (
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handleApproveRun(selectedRun.id)}>
                  Approve Payroll Run
                </Button>
              )}
              {selectedRun.status === 'approved' && (
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handlePayoutRun(selectedRun.id)}>
                  Disburse via RazorpayX
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search detail list by employee name or role..."
                value={runDetailsSearch}
                onChange={(e) => handleRunDetailsSearchChange(e.target.value)}
                className="w-full pl-9 pr-12 py-2 text-sm bg-transparent border border-slate-355 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-blue-500 focus:outline-none"
              />
              {runDetailsSearch && (
                <button
                  onClick={() => handleRunDetailsSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="relative flex-shrink-0" ref={runDetailsRoleFilterRef}>
              <Button
                onClick={() => setShowRunDetailsRoleFilter((prev) => !prev)}
                className="w-full sm:w-auto h-10 text-sm font-medium flex items-center justify-center gap-1.5 shadow-sm transition-all duration-200 bg-primary text-white hover:bg-primary/90 hover:text-white px-4 py-2 border-none rounded-md"
              >
                <Filter className="w-4 h-4 text-white" />
                <span>
                  {selectedRunDetailsRoleFilter === "" ? "All Roles" : rolesList.find(r => r.value === selectedRunDetailsRoleFilter)?.label || selectedRunDetailsRoleFilter}
                </span>
              </Button>
              {showRunDetailsRoleFilter && (
                <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg z-20 border ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
                  <div className="py-1 max-h-60 overflow-y-auto custom-scrollbar">
                    {rolesList.map((role) => (
                      <button
                        key={role.value}
                        type="button"
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-accent cursor-pointer ${
                          theme === 'dark' ? 'hover:bg-accent text-foreground' : 'hover:bg-gray-100 text-gray-700'
                        } ${selectedRunDetailsRoleFilter === role.value ? 'font-semibold bg-accent/50 text-primary' : ''}`}
                        onClick={() => {
                          handleRunDetailsRoleFilterChange(role.value);
                          setShowRunDetailsRoleFilter(false);
                        }}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-350 dark:border-slate-800">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4 text-center">Days (Present/LOP)</th>
                  <th className="px-6 py-4 text-right">Gross Salary</th>
                  <th className="px-6 py-4 text-right">Approved Reimbursements</th>
                  <th className="px-6 py-4 text-right">PF Deduction</th>
                  <th className="px-6 py-4 text-right">ESI Deduction</th>
                  <th className="px-6 py-4 text-right">TDS (Tax)</th>
                  <th className="px-6 py-4 text-right">Loans/Recovery</th>
                  <th className="px-6 py-4 text-right">Net Takehome</th>
                  <th className="px-6 py-4 text-center">Payout</th>
                  <th className="px-6 py-4 text-right">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {runDetails.map((det, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{det.employee_name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{det.role}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-700 dark:text-slate-300">
                      {det.days_present} present / {det.days_absent} LOP
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900 dark:text-white">{formatCurrency(det.gross_salary)}</td>
                    <td className="px-6 py-4 text-right font-medium text-blue-600 dark:text-blue-400">
                      {Number(det.reimbursements) > 0 ? `+${formatCurrency(det.reimbursements)}` : '₹0'}
                    </td>
                    <td className="px-6 py-4 text-right text-red-500">{formatCurrency(det.pf_deduction)}</td>
                    <td className="px-6 py-4 text-right text-red-500">{formatCurrency(det.esi_deduction)}</td>
                    <td className="px-6 py-4 text-right text-red-500">{formatCurrency(det.tds_deduction)}</td>
                    <td className="px-6 py-4 text-right text-red-500">{formatCurrency(Number(det.loan_emi) + Number(det.advance_recovery))}</td>
                    <td className="px-6 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(det.net_salary)}</td>
                    <td className="px-6 py-4 text-center">
                      {det.payout_id ? (
                        <div className="space-y-1">
                          <Badge variant="outline" className={`capitalize border-none ${
                            det.payout_status === 'processed' || det.payout_status === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                            det.payout_status === 'failed' || det.payout_status === 'reversed' ? 'bg-red-500/10 text-red-500' :
                            det.payout_status === 'queued' ? 'bg-slate-500/10 text-slate-400' :
                            'bg-blue-500/10 text-blue-500'
                          }`}>
                            {det.payout_status}
                          </Badge>
                          {det.transaction_id && (
                            <div className="text-xs text-slate-400 font-mono truncate max-w-[120px]" title={det.transaction_id}>TXN: {det.transaction_id.slice(0, 10)}...</div>
                          )}
                          {det.utr && (
                            <div className="text-xs text-slate-400 font-mono">UTR: {det.utr}</div>
                          )}
                          {det.failure_reason && (
                            <div className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={10} />{det.failure_reason}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs">Unpaid</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      <button
                        onClick={async () => {
                          setDownloadingPayslipId(det.id);
                          try {
                            const filename = `payslip_${det.employee_name.replace(/\s+/g, '_')}_${selectedRun.month}_${selectedRun.year}.pdf`;
                            const res = await downloadPayslipPDF(det.id, filename);
                            if (!res.success) {
                              alert(res.message || "Failed to download PDF");
                            }
                          } finally {
                            setDownloadingPayslipId(null);
                          }
                        }}
                        disabled={downloadingPayslipId === det.id}
                        className="text-blue-500 hover:text-blue-600 inline-flex items-center gap-1 hover:underline font-semibold bg-transparent border-none cursor-pointer disabled:opacity-50 disabled:no-underline"
                      >
                        {downloadingPayslipId === det.id ? (
                          <><Loader2 className="animate-spin" size={14} /> Downloading...</>
                        ) : (
                          <><Download size={14} /> PDF</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <PaginationControls
            currentPage={runDetailsPage}
            totalPages={runDetailsTotalPages}
            totalCount={runDetailsCount}
            onPageChange={(p) => {
              setRunDetailsPage(p);
              if (selectedRun) fetchRunDetails(selectedRun.id, p, runDetailsSearch);
            }}
          />
        </div>
      )}
        </CardContent>
      </Card>
      <Dialog open={showAddAdjustment} onOpenChange={setShowAddAdjustment}>
        <DialogContent className={`max-w-lg w-[95%] max-h-[85vh] overflow-y-auto custom-scrollbar rounded-xl p-6 ${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Add Payroll Adjustment</DialogTitle>
            <DialogDescription>Apply a one-time bonus, deduction, or arrears to an employee's payroll.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-2">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Employee *</label>
              <select
                value={newAdjustment.employee_id}
                onChange={(e) => setNewAdjustment({ ...newAdjustment, employee_id: e.target.value })}
                className={`w-full rounded-md p-2 text-sm border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
              >
                <option value="">Select Employee</option>
                {adjustmentEmployees.map((emp) => (
                  <option key={emp.employee_id} value={emp.employee_id}>{emp.name} ({emp.role})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Type *</label>
                <select
                  value={newAdjustment.type}
                  onChange={(e) => setNewAdjustment({ ...newAdjustment, type: e.target.value })}
                  className={`w-full rounded-md p-2 text-sm border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                >
                  <option value="bonus">Bonus</option>
                  <option value="deduction">Deduction</option>
                  <option value="arrears">Arrears</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={newAdjustment.amount}
                  onChange={(e) => setNewAdjustment({ ...newAdjustment, amount: e.target.value })}
                  className={`w-full rounded-md p-2 text-sm border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Apply Month</label>
                <select
                  value={newAdjustment.apply_month}
                  onChange={(e) => setNewAdjustment({ ...newAdjustment, apply_month: Number(e.target.value) })}
                  className={`w-full rounded-md p-2 text-sm border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('en-US', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Apply Year</label>
                <select
                  value={newAdjustment.apply_year}
                  onChange={(e) => setNewAdjustment({ ...newAdjustment, apply_year: Number(e.target.value) })}
                  className={`w-full rounded-md p-2 text-sm border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Reason *</label>
              <textarea
                rows={3}
                placeholder="Describe the reason for this adjustment..."
                value={newAdjustment.reason}
                onChange={(e) => setNewAdjustment({ ...newAdjustment, reason: e.target.value })}
                className={`w-full rounded-md p-2 text-sm border resize-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setShowAddAdjustment(false)}>Cancel</Button>
            <Button onClick={handleCreateAdjustment} disabled={loading}>Create Adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>

        <DialogContent className={`max-w-4xl w-[90%] md:w-[95%] max-h-[85vh] overflow-y-auto custom-scrollbar rounded-xl p-6 ${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'}`}>
          <DialogHeader className="pb-2">
            <DialogTitle className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Payroll Statutory Configurations</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 my-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* PF details card */}
              <Card className={`p-5 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/50 border-slate-200'}`}>
                <div className="space-y-4">
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    <Percent size={18} className="text-primary" /> Provident Fund (PF) Settings
                  </h3>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="pf_enabled"
                      checked={payrollSettings.pf_enabled}
                      onCheckedChange={(checked) => setPayrollSettings({ ...payrollSettings, pf_enabled: !!checked })}
                    />
                    <label htmlFor="pf_enabled" className="text-sm font-semibold cursor-pointer">Enable Employer & Employee PF Contributions</label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Employee PF Contribution (%)</label>
                      <input
                        type="number"
                        value={payrollSettings.pf_employee_percent}
                        onChange={(e) => setPayrollSettings({ ...payrollSettings, pf_employee_percent: Number(e.target.value) })}
                        className={formInputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Employer PF Contribution (%)</label>
                      <input
                        type="number"
                        value={payrollSettings.pf_employer_percent}
                        onChange={(e) => setPayrollSettings({ ...payrollSettings, pf_employer_percent: Number(e.target.value) })}
                        className={formInputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">PF Wage Ceiling limit (INR)</label>
                    <input
                      type="number"
                      value={payrollSettings.pf_wage_ceiling}
                      onChange={(e) => setPayrollSettings({ ...payrollSettings, pf_wage_ceiling: Number(e.target.value) })}
                      className={formInputClass}
                    />
                  </div>
                </div>
              </Card>

              {/* ESI details card */}
              <Card className={`p-5 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/50 border-slate-200'}`}>
                <div className="space-y-4">
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    <Percent size={18} className="text-primary" /> Employee State Insurance (ESI) Settings
                  </h3>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="esi_enabled"
                      checked={payrollSettings.esi_enabled}
                      onCheckedChange={(checked) => setPayrollSettings({ ...payrollSettings, esi_enabled: !!checked })}
                    />
                    <label htmlFor="esi_enabled" className="text-sm font-semibold cursor-pointer">Enable Employee ESI Contributions</label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Employee ESI Contribution (%)</label>
                      <input
                        type="number"
                        value={payrollSettings.esi_employee_percent}
                        onChange={(e) => setPayrollSettings({ ...payrollSettings, esi_employee_percent: Number(e.target.value) })}
                        className={formInputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Employer ESI Contribution (%)</label>
                      <input
                        type="number"
                        value={payrollSettings.esi_employer_percent}
                        onChange={(e) => setPayrollSettings({ ...payrollSettings, esi_employer_percent: Number(e.target.value) })}
                        className={formInputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">ESI Income Threshold Ceiling Limit (INR)</label>
                    <input
                      type="number"
                      value={payrollSettings.esi_wage_limit}
                      onChange={(e) => setPayrollSettings({ ...payrollSettings, esi_wage_limit: Number(e.target.value) })}
                      className={formInputClass}
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* LOP/Calculation settings card */}
            <Card className={`p-5 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/50 border-slate-200'}`}>
              <div className="space-y-4">
                <h3 className="font-semibold text-base mb-2">Calculation Configurations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-2">Loss of Pay (LOP) Daily Wage Basis</label>
                    <Select
                      value={payrollSettings.lop_calculation_basis}
                      onValueChange={(val) => setPayrollSettings({ ...payrollSettings, lop_calculation_basis: val })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select LOP Basis" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="calendar_days">Calendar Days in Month (e.g. 30/31)</SelectItem>
                        <SelectItem value="working_days">Working Days (excluding Weekends/Holidays)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <DialogFooter className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setConfigModalOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              await handleSaveSettings();
              setConfigModalOpen(false);
            }} disabled={loading}>Save Configurations</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedEmployee} onOpenChange={(open) => { if (!open) setSelectedEmployee(null); }}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className={`max-w-5xl w-[90%] md:w-[95%] max-h-[85vh] overflow-y-auto custom-scrollbar rounded-xl p-6 ${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'}`}>
          <DialogHeader className="pb-2">
            <DialogTitle className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {selectedEmployee?.salary_structure ? 'Edit Salary Structure' : 'Configure Salary Structure'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {selectedEmployee?.name} - {selectedEmployee?.designation}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 my-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Employment Info Card */}
              <Card className={`p-5 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/50 border-slate-200'}`}>
                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-primary border-b border-slate-200 dark:border-slate-800 pb-2">Employment Info</h3>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Employment Type</label>
                    <Select
                      value={editStructureData.employment_type}
                      onValueChange={(val) => setEditStructureData({ ...editStructureData, employment_type: val })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Employment Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="permanent">Permanent</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                        <SelectItem value="freelancer">Freelancer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Salary Payment Cycle</label>
                    <Select
                      value={editStructureData.salary_type}
                      onValueChange={(val) => setEditStructureData({ ...editStructureData, salary_type: val })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Salary Cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly Salary</SelectItem>
                        <SelectItem value="daily">Daily Wage</SelectItem>
                        <SelectItem value="hourly">Hourly Rate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">PAN Card Number <span className="text-slate-400 font-normal">(10 chars)</span></label>
                    <input
                      type="text"
                      maxLength={10}
                      value={editStructureData.pan}
                      onChange={(e) => { setEditStructureData({ ...editStructureData, pan: e.target.value.toUpperCase() }); setFieldErrors(p => ({...p, pan: ''})); }}
                      className={`${formInputClass} ${fieldErrors['pan'] ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                      placeholder="e.g. ABCDE1234F"
                    />
                    <p className={`text-[10px] mt-0.5 ${fieldErrors['pan'] ? 'text-red-500' : 'text-slate-400'}`}>
                      {fieldErrors['pan'] || `${String(editStructureData.pan||'').length}/10`}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Salary Allowances Card */}
              <Card className={`p-5 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/50 border-slate-200'}`}>
                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-primary border-b border-slate-200 dark:border-slate-800 pb-2">Salary Allowances</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Basic Salary <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        min={0}
                        value={editStructureData.basic_salary}
                        onChange={(e) => { setEditStructureData({ ...editStructureData, basic_salary: Number(e.target.value) }); setFieldErrors(p => ({...p, basic_salary: false})); }}
                        className={`${formInputClass} ${fieldErrors['basic_salary'] ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                      />
                      {fieldErrors['basic_salary'] && <p className="text-[10px] text-red-500 mt-0.5">Required &amp; must be greater than 0</p>}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">HRA Allowance</label>
                      <input
                        type="number"
                        value={editStructureData.hra}
                        onChange={(e) => setEditStructureData({ ...editStructureData, hra: Number(e.target.value) })}
                        className={formInputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Travel Allowance</label>
                      <input
                        type="number"
                        value={editStructureData.travel_allowance}
                        onChange={(e) => setEditStructureData({ ...editStructureData, travel_allowance: Number(e.target.value) })}
                        className={formInputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Medical Allowance</label>
                      <input
                        type="number"
                        value={editStructureData.medical_allowance}
                        onChange={(e) => setEditStructureData({ ...editStructureData, medical_allowance: Number(e.target.value) })}
                        className={formInputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Special Allowance</label>
                      <input
                        type="number"
                        value={editStructureData.special_allowance}
                        onChange={(e) => setEditStructureData({ ...editStructureData, special_allowance: Number(e.target.value) })}
                        className={formInputClass}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Other Allowance</label>
                      <input
                        type="number"
                        value={editStructureData.other_allowance}
                        onChange={(e) => setEditStructureData({ ...editStructureData, other_allowance: Number(e.target.value) })}
                        className={formInputClass}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Bank & Compliance Card */}
              <Card className={`p-5 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/50 border-slate-200'}`}>
                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-primary border-b border-slate-200 dark:border-slate-800 pb-2">Bank & Compliance</h3>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Bank Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={editStructureData.bank_name}
                      onChange={(e) => { setEditStructureData({ ...editStructureData, bank_name: e.target.value }); setFieldErrors(p => ({...p, bank_name: false})); }}
                      className={`${formInputClass} ${fieldErrors['bank_name'] ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                      placeholder="e.g. HDFC Bank"
                    />
                    {fieldErrors['bank_name'] && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Bank Account Number <span className="text-red-500">*</span> <span className="text-slate-400 font-normal">(9–18 digits)</span></label>
                    <input
                      type="text"
                      maxLength={18}
                      value={editStructureData.bank_account_number}
                      onChange={(e) => { setEditStructureData({ ...editStructureData, bank_account_number: e.target.value.replace(/\D/g, '') }); setFieldErrors(p => ({...p, bank_account_number: ''})); }}
                      className={`${formInputClass} ${fieldErrors['bank_account_number'] ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                      placeholder="9 to 18 digit account number"
                    />
                    <p className={`text-[10px] mt-0.5 ${fieldErrors['bank_account_number'] ? 'text-red-500' : 'text-slate-400'}`}>
                      {fieldErrors['bank_account_number'] || `${String(editStructureData.bank_account_number||'').length}/18`}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Bank IFSC Code <span className="text-red-500">*</span> <span className="text-slate-400 font-normal">(11 chars)</span></label>
                    <input
                      type="text"
                      maxLength={11}
                      value={editStructureData.bank_ifsc}
                      onChange={(e) => { setEditStructureData({ ...editStructureData, bank_ifsc: e.target.value.toUpperCase() }); setFieldErrors(p => ({...p, bank_ifsc: ''})); }}
                      className={`${formInputClass} ${fieldErrors['bank_ifsc'] ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                      placeholder="e.g. HDFC0001234"
                    />
                    <p className={`text-[10px] mt-0.5 ${fieldErrors['bank_ifsc'] ? 'text-red-500' : 'text-slate-400'}`}>
                      {fieldErrors['bank_ifsc'] || `${String(editStructureData.bank_ifsc||'').length}/11`}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">UAN Number <span className="text-slate-400 font-normal">(12 digits)</span></label>
                    <input
                      type="text"
                      maxLength={12}
                      value={editStructureData.uan}
                      onChange={(e) => { setEditStructureData({ ...editStructureData, uan: e.target.value.replace(/\D/g, '') }); setFieldErrors(p => ({...p, uan: ''})); }}
                      className={`${formInputClass} ${fieldErrors['uan'] ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                      placeholder="12 digit UAN"
                    />
                    <p className={`text-[10px] mt-0.5 ${fieldErrors['uan'] ? 'text-red-500' : 'text-slate-400'}`}>
                      {fieldErrors['uan'] || `${String(editStructureData.uan||'').length}/12`}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">PF Code</label>
                    <input
                      type="text"
                      maxLength={30}
                      value={editStructureData.pf_number}
                      onChange={(e) => setEditStructureData({ ...editStructureData, pf_number: e.target.value })}
                      className={formInputClass}
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setSelectedEmployee(null)}>Cancel</Button>
            <Button onClick={() => handleSaveStructure()} disabled={loading}>Save Structure</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Description View Modal */}
      <Dialog open={!!descriptionModal?.open} onOpenChange={(open) => { if (!open) setDescriptionModal(null); }}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6`}>
          <DialogHeader>
            <DialogTitle className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Claim Description
            </DialogTitle>
            <DialogDescription className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className="font-medium capitalize">{descriptionModal?.type}</span> claim by <span className="font-medium">{descriptionModal?.employee}</span>
            </DialogDescription>
          </DialogHeader>

          <div
            className={`p-3 text-base leading-relaxed whitespace-pre-wrap break-words 
                      max-h-64 overflow-y-auto rounded-md ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}
          >
            {descriptionModal?.text || <span className="italic text-slate-400">No description provided.</span>}
          </div>

          <DialogFooter>
            <Button
              className="bg-primary hover:bg-primary/90 text-white font-semibold transition-all duration-200 shadow-lg shadow-primary/20 px-6"
              onClick={() => setDescriptionModal(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeesManagerPayroll;
