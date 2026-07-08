import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  IndianRupee,
  Download,
  FileText,
  Shield,
  TrendingUp,
  Banknote,
  Calendar,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getEmployeePayslips,
  downloadEmployeePayslip,
  getEmployeePfEsiSummary,
} from '@/utils/faculty_api';

interface FacultyPayrollProps {
  user?: any;
}

const FacultyPayroll: React.FC<FacultyPayrollProps> = ({ user }) => {
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<'payslips' | 'pf-esi'>('payslips');

  // Payslips
  const [payslips, setPayslips] = useState<any[]>([]);
  const [payslipsPage, setPayslipsPage] = useState(1);
  const [payslipsTotalPages, setPayslipsTotalPages] = useState(1);
  const [payslipsCount, setPayslipsCount] = useState(0);
  const [payslipsLoading, setPayslipsLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // PF/ESI Summary
  const [pfEsi, setPfEsi] = useState<any>(null);
  const [pfEsiLoading, setPfEsiLoading] = useState(false);

  // Expanded payslip breakdown
  const [expandedSlip, setExpandedSlip] = useState<number | null>(null);

  const formatCurrency = (val: any) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val || 0));

  useEffect(() => {
    if (activeTab === 'payslips') fetchPayslips(payslipsPage);
    if (activeTab === 'pf-esi') fetchPfEsi();
  }, [activeTab, payslipsPage]);

  const fetchPayslips = async (page: number) => {
    setPayslipsLoading(true);
    try {
      const res = await getEmployeePayslips(page);
      if (res.success) {
        setPayslips(res.data || []);
        setPayslipsTotalPages(res.total_pages || 1);
        setPayslipsCount(res.count || 0);
      }
    } finally {
      setPayslipsLoading(false);
    }
  };

  const fetchPfEsi = async () => {
    setPfEsiLoading(true);
    try {
      const res = await getEmployeePfEsiSummary();
      // API returns { success, pf: {...}, esi: {...} } directly — no data wrapper
      if (res.success) setPfEsi(res);
    } finally {
      setPfEsiLoading(false);
    }
  };

  const handleDownload = async (slip: any) => {
    setDownloadingId(slip.id);
    const filename = `payslip_${slip.month}_${slip.year}.pdf`;
    await downloadEmployeePayslip(slip.id, filename);
    setDownloadingId(null);
  };

  const statusColor = (status: string) => {
    if (status === 'paid' || status === 'success') return 'bg-emerald-500/10 text-emerald-500';
    if (status === 'failed' || status === 'reversed') return 'bg-red-500/10 text-red-500';
    if (status === 'processing' || status === 'queued') return 'bg-blue-500/10 text-blue-500';
    return 'bg-amber-500/10 text-amber-500';
  };

  const cardClass = theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200';
  const subCardClass = theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200';

  const PaginationControls = ({ currentPage, totalPages, totalCount, onPageChange }: any) => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-2">
        <div>
          Showing {Math.min((currentPage - 1) * 10 + 1, totalCount)} – {Math.min(currentPage * 10, totalCount)} of {totalCount}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="bg-primary text-white border-primary hover:bg-primary/90 h-9 px-4"
          >Previous</Button>
          <span className="text-sm font-semibold px-2">{currentPage} / {totalPages}</span>
          <Button
            variant="outline" size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="bg-primary text-white border-primary hover:bg-primary/90 h-9 px-4"
          >Next</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-10">
      <Card className={cardClass}>
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
              <IndianRupee className="text-primary w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">My Salary & Payroll</CardTitle>
              <CardDescription>View your payslips, statutory deductions, and salary history.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {/* Tabs */}
          <div className="flex border-b gap-6 overflow-x-auto dark:border-slate-800">
            {([
              { id: 'payslips', label: 'Payslips', icon: <FileText size={14} /> },
              { id: 'pf-esi', label: 'PF / ESI Summary', icon: <Shield size={14} /> },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* TAB: Payslips */}
          {activeTab === 'payslips' && (
            <div className="space-y-4">
              {payslipsLoading && (
                <div className="py-12 text-center text-slate-400">Loading payslips...</div>
              )}
              {!payslipsLoading && payslips.length === 0 && (
                <div className={`border-2 border-dashed flex flex-col items-center justify-center p-10 min-h-[350px] text-center space-y-4 rounded-lg ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50'}`}>
                  <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                    <FileText className="w-8 h-8 text-primary/70" />
                  </div>
                  <div>
                    <h3 className="text-md font-semibold">No Payslips Yet</h3>
                    <p className="text-xs text-slate-500 mt-1">Your payslips will appear here once payroll has been processed.</p>
                  </div>
                </div>
              )}
              {!payslipsLoading && payslips.map((slip) => (
                <div
                  key={slip.id}
                  className={`rounded-lg border transition-all ${subCardClass}`}
                >
                  {/* Payslip Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg flex-shrink-0 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                        <Calendar className="text-primary w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {new Date(0, slip.month - 1).toLocaleString('en-US', { month: 'long' })} {slip.year}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {slip.days_present} working days &bull; {slip.days_absent > 0 ? `${slip.days_absent} LOP` : 'No LOP'}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
                      <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                        <div className="text-left sm:text-right">
                          <div className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{formatCurrency(slip.net_salary)}</div>
                          <div className="text-xs text-slate-400">Net Take-home</div>
                        </div>
                        <Badge variant="outline" className={`capitalize border-none ${statusColor(slip.payout_status || slip.run_status)}`}>
                          {slip.payout_status || slip.run_status || 'Pending'}
                        </Badge>
                      </div>
                      
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          size="sm" variant="outline"
                          className="gap-1.5 text-xs flex-1 sm:flex-initial h-10"
                          onClick={() => setExpandedSlip(expandedSlip === slip.id ? null : slip.id)}
                        >
                          {expandedSlip === slip.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          Details
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1.5 text-xs bg-primary text-white hover:bg-primary/90 flex-1 sm:flex-initial h-10"
                          onClick={() => handleDownload(slip)}
                          disabled={downloadingId === slip.id}
                        >
                          <Download size={13} />
                          {downloadingId === slip.id ? 'Downloading...' : 'Payslip PDF'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Breakdown */}
                  {expandedSlip === slip.id && (
                    <div className={`border-t p-4 grid grid-cols-2 md:grid-cols-4 gap-4 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">Gross Salary</div>
                        <div className="font-semibold text-slate-900 dark:text-white">{formatCurrency(slip.gross_salary)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">PF Deduction</div>
                        <div className="font-semibold text-red-500">{formatCurrency(slip.pf_deduction)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">ESI Deduction</div>
                        <div className="font-semibold text-red-500">{formatCurrency(slip.esi_deduction)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">TDS (Tax)</div>
                        <div className="font-semibold text-red-500">{formatCurrency(slip.tds_deduction)}</div>
                      </div>
                      {Number(slip.reimbursements) > 0 && (
                        <div>
                          <div className="text-xs text-slate-400 mb-0.5">Reimbursements</div>
                          <div className="font-semibold text-blue-500">+{formatCurrency(slip.reimbursements)}</div>
                        </div>
                      )}
                      {(Number(slip.loan_emi) + Number(slip.advance_recovery)) > 0 && (
                        <div>
                          <div className="text-xs text-slate-400 mb-0.5">Loan Recovery</div>
                          <div className="font-semibold text-red-500">{formatCurrency(Number(slip.loan_emi) + Number(slip.advance_recovery))}</div>
                        </div>
                      )}
                      <div className="col-span-2 md:col-span-4 pt-2 border-t dark:border-slate-800 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Net Take-home</span>
                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(slip.net_salary)}</span>
                      </div>
                      {slip.utr && (
                        <div className="col-span-2 md:col-span-4">
                          <div className="text-xs text-slate-400 mb-0.5">UTR / Transaction Reference</div>
                          <div className="font-mono text-xs text-slate-700 dark:text-slate-300">{slip.utr}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <PaginationControls
                currentPage={payslipsPage}
                totalPages={payslipsTotalPages}
                totalCount={payslipsCount}
                onPageChange={setPayslipsPage}
              />
            </div>
          )}

          {/* TAB: PF / ESI Summary */}
          {activeTab === 'pf-esi' && (
            <div className="space-y-6">
              {pfEsiLoading && (
                <div className="py-12 text-center text-slate-400">Loading statutory data...</div>
              )}
              {!pfEsiLoading && !pfEsi && (
                <div className={`border-2 border-dashed flex flex-col items-center justify-center p-10 text-center space-y-4 rounded-lg ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50'}`}>
                  <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                    <Shield className="w-8 h-8 text-primary/70" />
                  </div>
                  <div>
                    <h3 className="text-md font-semibold">No Statutory Data</h3>
                    <p className="text-xs text-slate-500 mt-1">PF and ESI contribution history will appear here once payroll is processed.</p>
                  </div>
                </div>
              )}
              {!pfEsiLoading && pfEsi && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Total PF (Employee)', value: formatCurrency(pfEsi.total_pf_employee), icon: <TrendingUp size={18} className="text-blue-500" />, color: 'text-blue-600 dark:text-blue-400' },
                      { label: 'Total PF (Employer)', value: formatCurrency(pfEsi.total_pf_employer), icon: <Banknote size={18} className="text-purple-500" />, color: 'text-purple-600 dark:text-purple-400' },
                      { label: 'Total ESI (Employee)', value: formatCurrency(pfEsi.total_esi_employee), icon: <Shield size={18} className="text-emerald-500" />, color: 'text-emerald-600 dark:text-emerald-400' },
                      { label: 'Total ESI (Employer)', value: formatCurrency(pfEsi.total_esi_employer), icon: <IndianRupee size={18} className="text-amber-500" />, color: 'text-amber-600 dark:text-amber-400' },
                    ].map((item) => (
                      <div key={item.label} className={`rounded-lg border p-4 ${subCardClass}`}>
                        <div className="flex items-center gap-2 mb-2">{item.icon}</div>
                        <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Monthly breakdown */}
                  {pfEsi.monthly_breakdown && pfEsi.monthly_breakdown.length > 0 && (
                    <div>
                      <h3 className={`font-semibold text-base mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Monthly Breakdown</h3>
                      <div className="overflow-x-auto custom-scrollbar rounded-lg border border-slate-300 dark:border-slate-800">
                        <table className="w-full text-sm text-left whitespace-nowrap ">
                          <thead className="bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300">
                            <tr>
                              <th className="px-5 py-3">Period</th>
                              <th className="px-5 py-3 text-right">Gross Salary</th>
                              <th className="px-5 py-3 text-right">PF (Emp)</th>
                              <th className="px-5 py-3 text-right">PF (Er)</th>
                              <th className="px-5 py-3 text-right">ESI (Emp)</th>
                              <th className="px-5 py-3 text-right">ESI (Er)</th>
                              <th className="px-5 py-3 text-right">TDS</th>
                              <th className="px-5 py-3 text-right">Net</th>
                              <th className="px-5 py-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {pfEsi.monthly_breakdown.map((row: any, i: number) => (
                              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                                <td className="px-5 py-3 font-semibold">
                                  {new Date(0, row.month - 1).toLocaleString('en-US', { month: 'short' })} {row.year}
                                </td>
                                <td className="px-5 py-3 text-right">{formatCurrency(row.gross_salary)}</td>
                                <td className="px-5 py-3 text-right text-red-500">{formatCurrency(row.pf_employee)}</td>
                                <td className="px-5 py-3 text-right text-slate-600 dark:text-slate-400">{formatCurrency(row.pf_employer)}</td>
                                <td className="px-5 py-3 text-right text-red-500">{formatCurrency(row.esi_employee)}</td>
                                <td className="px-5 py-3 text-right text-slate-600 dark:text-slate-400">{formatCurrency(row.esi_employer)}</td>
                                <td className="px-5 py-3 text-right text-red-500">{formatCurrency(row.tds)}</td>
                                <td className="px-5 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(row.net_salary)}</td>
                                <td className="px-5 py-3 text-center">
                                  <Badge variant="outline" className={`capitalize border-none text-xs ${
                                    row.payout_status === 'paid' || row.payout_status === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                                    row.payout_status === 'failed' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                                  }`}>
                                    {row.payout_status || 'Pending'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Info note */}
                  <div className={`rounded-lg border p-4 flex items-start gap-3 ${theme === 'dark' ? 'border-blue-500/20 bg-blue-950/10' : 'border-blue-200 bg-blue-50'}`}>
                    <AlertTriangle className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      These figures reflect your payroll deductions and employer contributions as calculated by the organisation's payroll system.
                      For PF passbook, visit <strong>www.epfindia.gov.in</strong>. For ESI card, visit <strong>www.esic.in</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FacultyPayroll;
