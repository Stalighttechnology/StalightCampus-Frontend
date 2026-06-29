import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { showConfirmAlert, showSweetAlert } from "@/utils/sweetalert";
import Swal from 'sweetalert2';
import DashboardCard from '../common/DashboardCard';
import { 
  IndianRupee, 
  Settings, 
  Users, 
  FileCheck, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Search, 
  CreditCard,
  Percent,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Eye,
  Download
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
  downloadPayslipPDF
} from "../../utils/fees_manager_api";

const FeesManagerPayroll: React.FC<{ user: any }> = ({ user }) => {
  const { theme } = useTheme();
  
  // Tab states: 'overview', 'structures', 'settings', 'reimbursements', 'loans', 'runs'
  const [activeTab, setActiveTab] = useState<'overview' | 'structures' | 'settings' | 'reimbursements' | 'loans' | 'runs'>('overview');
  
  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [modalNotification, setModalNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const setError = (msg: string | null) => {
    if (msg) setModalNotification({ type: 'error', message: msg });
  };
  const setSuccessMsg = (msg: string | null) => {
    if (msg) setModalNotification({ type: 'success', message: msg });
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
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setStructuresPage(1);
      fetchStructures(1, val);
    }, 400);
  };

  const handleRoleFilterChange = (role: string) => {
    setSelectedRoleFilter(role);
    setStructuresPage(1);
    fetchStructures(1, structuresSearch, role);
  };

  const handleRunDetailsSearchChange = (val: string) => {
    setRunDetailsSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setRunDetailsPage(1);
      if (selectedRun) fetchRunDetails(selectedRun.id, 1, val);
    }, 400);
  };

  const handleRunDetailsRoleFilterChange = (role: string) => {
    setSelectedRunDetailsRoleFilter(role);
    setRunDetailsPage(1);
    if (selectedRun) fetchRunDetails(selectedRun.id, 1, runDetailsSearch, role);
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
      } else if (activeTab === 'reimbursements') {
        const res = await getReimbursementClaims(claimsPage);
        if (res.success) {
          setReimbursements(res.data || []);
          setClaimsTotalPages(res.total_pages || 1);
        }
      } else if (activeTab === 'runs') {
        const res = await getPayrollRuns(runsPage);
        if (res.success) {
          setRuns(res.data || []);
          setRunsTotalPages(res.total_pages || 1);
        }
      }
    } catch (err) {
      setError("Failed to fetch data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStructures = async (page: number, search: string, roleFilter: string = selectedRoleFilter) => {
    const res = await getSalaryStructures(page, search, roleFilter);
    if (res.success) {
      setStructures(res.data || []);
      setStructuresTotalPages(res.total_pages || 1);
      setConfiguredStructuresCount(res.configured_count ?? 0);
    }
  };

  const fetchRunDetails = async (runId: number, page: number, search: string, roleFilter: string = selectedRunDetailsRoleFilter) => {
    setLoading(true);
    try {
      const res = await getPayrollRunDetails(runId, page, search, roleFilter);
      if (res.success) {
        setSelectedRun(res.run);
        setRunDetails(res.details || []);
        setRunDetailsTotalPages(res.total_pages || 1);
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
        setSuccessMsg("Salary structure updated successfully.");
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
  const PaginationControls = ({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (p: number) => void }) => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex justify-between items-center mt-4">
        <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
            Previous
          </Button>
          <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>
            Next
          </Button>
        </div>
      </div>
    );
  };

  // Reusable form input layout to replace the hardcoded "black boxes" in light mode
  const formInputClass = "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="space-y-6 pb-10">
      {/* Title section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Payroll Management
          </h1>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage employee salaries, statutory PF/ESI compliance, TDS taxes, loans, and Razorpay payouts.
          </p>
        </div>
        {activeTab !== 'settings' && !selectedRun && (
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setActiveTab('settings')}>
              <Settings size={16} /> Configurations
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex border-b overflow-x-auto gap-4 dark:border-slate-800`}>
        {(['overview', 'structures', 'reimbursements', 'runs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSelectedRun(null); }}
            className={`pb-3 text-sm font-semibold capitalize whitespace-nowrap transition-all border-b-2 ${
              activeTab === tab && !selectedRun
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab === 'structures' ? 'Salary Structures' : tab === 'reimbursements' ? 'Reimbursements & Claims' : tab === 'runs' ? 'Payroll Batches' : tab}
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
                className="w-full pl-9 pr-4 py-2 text-sm bg-transparent border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-blue-500 focus:outline-none"
              />
            </div>
            <select
              value={selectedRoleFilter}
              onChange={(e) => handleRoleFilterChange(e.target.value)}
              className="px-3 py-2 text-sm bg-transparent dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-md focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Roles</option>
              <option value="teacher" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Teacher</option>
              <option value="hod" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">HOD</option>
              <option value="principal" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Principal</option>
              <option value="coe" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">COE</option>
              <option value="fees_manager" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Fees Manager</option>
              <option value="warden" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Warden</option>
              <option value="caretaker" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Caretaker</option>
              <option value="placement_officer" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Placement Officer</option>
              <option value="transport_admin" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Transport Admin</option>
              <option value="driver" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Driver</option>
              <option value="library_admin" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Library Admin</option>
              <option value="org_admin" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Org Admin</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-300 dark:border-slate-850">
            <table className="w-full text-sm text-left">
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
                      <Button size="sm" variant="outline" onClick={() => handleEditStructure(emp)}>
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
            onPageChange={setStructuresPage}
          />
        </div>
      )}

      {/* SUB-VIEW: Configure / Edit Salary Structure Form */}
      {activeTab === 'structures' && selectedEmployee && (
        <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee.salary_structure ? 'Edit Salary Structure' : 'Configure Salary Structure'}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{selectedEmployee.name} - {selectedEmployee.designation}</p>
            </div>
            <Button variant="ghost" onClick={() => setSelectedEmployee(null)}>Back to list</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* General Settings */}
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-blue-500 border-b border-slate-200 dark:border-slate-800 pb-2">Employment Info</h3>
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

            {/* Income and Allowances */}
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-blue-500 border-b border-slate-200 dark:border-slate-800 pb-2">Salary Allowances</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
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
                <div>
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

            {/* Bank Details & Statutory Accounts */}
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-blue-500 border-b border-slate-200 dark:border-slate-800 pb-2">Bank & Compliance</h3>
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
              <div className="grid grid-cols-2 gap-4">
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
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-8">
            <Button variant="outline" onClick={() => setSelectedEmployee(null)}>Cancel</Button>
            <Button onClick={() => handleSaveStructure()} disabled={loading}>Save Structure</Button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Reimbursements & Claims */}
      {activeTab === 'reimbursements' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-slate-350 dark:border-slate-800">
            <table className="w-full text-sm text-left">
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
                          className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 hover:underline transition-colors"
                        >
                          <Eye size={13} /> View
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
                          <Button size="sm" variant="outline" className="border-emerald-500 text-emerald-500 hover:bg-emerald-500/10" onClick={() => handleReimbursementAction(claim.id, 'approve')}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10" onClick={() => handleReimbursementAction(claim.id, 'reject')}>
                            Reject
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
            onPageChange={setClaimsPage}
          />
        </div>
      )}

      {/* TAB CONTENT: Configurations / Settings */}
      {activeTab === 'settings' && (
        <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h2 className="text-xl font-bold mb-6 text-blue-500">Payroll Statutory Configurations</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* PF details */}
            <div className="space-y-4 border-r border-slate-200 dark:border-slate-800 pr-6">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Percent size={18} /> Provident Fund (PF) Settings
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pf_enabled"
                  checked={payrollSettings.pf_enabled}
                  onChange={(e) => setPayrollSettings({ ...payrollSettings, pf_enabled: e.target.checked })}
                  className="rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
                <label htmlFor="pf_enabled" className="text-sm font-semibold">Enable Employer & Employee PF Contributions</label>
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

            {/* ESI details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Percent size={18} /> Employee State Insurance (ESI) Settings
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="esi_enabled"
                  checked={payrollSettings.esi_enabled}
                  onChange={(e) => setPayrollSettings({ ...payrollSettings, esi_enabled: e.target.checked })}
                  className="rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
                <label htmlFor="esi_enabled" className="text-sm font-semibold">Enable Employee ESI Contributions</label>
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
          </div>

          <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
            <h3 className="font-semibold text-lg mb-4">Calculation Configurations</h3>
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

          <div className="flex justify-end gap-2 mt-8">
            <Button variant="outline" onClick={() => setActiveTab('overview')}>Cancel</Button>
            <Button onClick={() => handleSaveSettings()} disabled={loading}>Save Configurations</Button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Payroll Batches (Runs) */}
      {activeTab === 'runs' && !selectedRun && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-slate-350 dark:border-slate-800">
            <table className="w-full text-sm text-left">
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
                {!runs.length && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">No payroll calculation runs processed yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <PaginationControls
            currentPage={runsPage}
            totalPages={runsTotalPages}
            onPageChange={setRunsPage}
          />
        </div>
      )}

      {/* SUB-VIEW: Payroll Run Detailed Lines / Disbursal Panel */}
      {selectedRun && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Payroll Details: {new Date(0, selectedRun.month - 1).toLocaleString('en-US', { month: 'long' })} {selectedRun.year}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`capitalize border-none ${
                  selectedRun.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                  selectedRun.status === 'approved' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {selectedRun.status}
                </Badge>
                <span className="text-xs text-slate-500 dark:text-slate-400">Total Payout: {formatCurrency(runDetails.reduce((a, b) => a + Number(b.net_salary), 0))}</span>
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
                className="w-full pl-9 pr-4 py-2 text-sm bg-transparent border border-slate-355 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-blue-500 focus:outline-none"
              />
            </div>
            <select
              value={selectedRunDetailsRoleFilter}
              onChange={(e) => handleRunDetailsRoleFilterChange(e.target.value)}
              className="px-3 py-2 text-sm bg-transparent dark:bg-slate-900 border border-slate-305 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-md focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Roles</option>
              <option value="teacher" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Teacher</option>
              <option value="hod" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">HOD</option>
              <option value="principal" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Principal</option>
              <option value="coe" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">COE</option>
              <option value="fees_manager" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Fees Manager</option>
              <option value="warden" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Warden</option>
              <option value="caretaker" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Caretaker</option>
              <option value="placement_officer" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Placement Officer</option>
              <option value="transport_admin" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Transport Admin</option>
              <option value="driver" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Driver</option>
              <option value="library_admin" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Library Admin</option>
              <option value="org_admin" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Org Admin</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-350 dark:border-slate-800">
            <table className="w-full text-sm text-left">
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
                    <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(det.net_salary)}</td>
                    <td className="px-6 py-4 text-center">
                      {det.payout_id ? (
                        <Badge variant="outline" className={`capitalize border-none ${
                          det.payout_status === 'processed' ? 'bg-emerald-500/10 text-emerald-500' :
                          det.payout_status === 'failed' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {det.payout_status}
                        </Badge>
                      ) : (
                        <span className="text-slate-500 text-xs">Unpaid</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      <button
                        onClick={async () => {
                          const filename = `payslip_${det.employee_name.replace(/\s+/g, '_')}_${selectedRun.month}_${selectedRun.year}.pdf`;
                          const res = await downloadPayslipPDF(det.id, filename);
                          if (!res.success) {
                            alert(res.message || "Failed to download PDF");
                          }
                        }}
                        className="text-blue-500 hover:text-blue-600 inline-flex items-center gap-1 hover:underline font-semibold bg-transparent border-none cursor-pointer"
                      >
                        <Download size={14} /> PDF
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
            onPageChange={(p) => {
              setRunDetailsPage(p);
              if (selectedRun) fetchRunDetails(selectedRun.id, p, runDetailsSearch);
            }}
          />
        </div>
      )}
      <Dialog open={!!modalNotification} onOpenChange={(open) => { if (!open) setModalNotification(null); }}>
        <DialogContent className={`w-[90vw] sm:max-w-sm rounded-xl p-6 shadow-2xl border ${
          theme === 'dark' ? 'bg-[#0f172a] text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200'
        }`}>
          <div className="flex flex-col items-center text-center space-y-4 pt-4">
            {modalNotification?.type === 'success' ? (
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center animate-in zoom-in-50 duration-300">
                <CheckCircle size={28} />
              </div>
            ) : (
              <div className="h-12 w-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center animate-in zoom-in-50 duration-300">
                <AlertCircle size={28} />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold capitalize text-slate-900 dark:text-white">
                {modalNotification?.type}
              </h3>
              <p className="text-sm mt-2 text-slate-500 dark:text-slate-400">
                {modalNotification?.message}
              </p>
            </div>
            <Button 
              onClick={() => setModalNotification(null)}
              className="w-full mt-2"
            >
              Dismiss
            </Button>
          </div>
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
