import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Loader2, Plus, Edit, Users, BookOpen, Award, FileText, Printer, ExternalLink, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { SkeletonCard } from '../ui/skeleton';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdmissionSeatMatrix() {
  const [seatMatrix, setSeatMatrix] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Options for dropdowns
  const [branches, setBranches] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Report state
  const [reportLoading, setReportLoading] = useState(false);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Form fields
  const [formBranchId, setFormBranchId] = useState('');
  const [formBatchId, setFormBatchId] = useState('');
  const [formTotalCapacity, setFormTotalCapacity] = useState('60');
  const [formFilledSeats, setFormFilledSeats] = useState('0');
  const [formMaleSeats, setFormMaleSeats] = useState('0');
  const [formFemaleSeats, setFormFemaleSeats] = useState('0');
  const [formMeritQuota, setFormMeritQuota] = useState('0');
  const [formMgmtQuota, setFormMgmtQuota] = useState('0');

  // Filter
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('all');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');

  // Report filters (inside modal)
  const [reportBatchFilter, setReportBatchFilter] = useState<string>('all');
  const [reportBranchFilter, setReportBranchFilter] = useState<string>('all');

  useEffect(() => {
    fetchSeatMatrix();
    fetchOptions();
  }, []);

  const fetchSeatMatrix = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/seat-matrix/`);
      if (response.ok) {
        const data = await response.json();
        setSeatMatrix(Array.isArray(data) ? data : data.results || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/enrollment-options/`);
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
        setBatches(data.batches || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openAllocateModal = () => {
    setEditingId(null);
    setFormBranchId('');
    setFormBatchId('');
    setFormTotalCapacity('60');
    setFormFilledSeats('0');
    setFormMaleSeats('0');
    setFormFemaleSeats('0');
    setFormMeritQuota('0');
    setFormMgmtQuota('0');
    setModalOpen(true);
  };

  const openEditModal = (matrix: any) => {
    setEditingId(matrix.id);
    setFormBranchId(String(matrix.branch));
    setFormBatchId(matrix.batch ? String(matrix.batch) : '');
    setFormTotalCapacity(String(matrix.total_capacity));
    setFormFilledSeats(String(matrix.filled_seats ?? 0));
    setFormMaleSeats(String(matrix.male_count ?? matrix.male_seats ?? 0));
    setFormFemaleSeats(String(matrix.female_count ?? matrix.female_seats ?? 0));
    setFormMeritQuota(String(matrix.merit_quota));
    setFormMgmtQuota(String(matrix.management_quota));
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formBranchId || !formBatchId) {
      toast.error('Please select both a Branch and a Batch.');
      return;
    }
    const totalCap = Math.max(0, parseInt(formTotalCapacity) || 0);
    const filled = Math.max(0, parseInt(formFilledSeats) || 0);
    const male = Math.max(0, parseInt(formMaleSeats) || 0);
    const female = Math.max(0, parseInt(formFemaleSeats) || 0);
    const merit = Math.max(0, parseInt(formMeritQuota) || 0);
    const mgmt = Math.max(0, parseInt(formMgmtQuota) || 0);

    if (totalCap <= 0) {
      toast.error('Total Intake must be greater than 0.');
      return;
    }

    if (filled > totalCap) {
      toast.error(`Enrolled seats (${filled}) cannot exceed Total Intake (${totalCap}).`);
      return;
    }

    if (male + female > totalCap) {
      toast.error(`Male (${male}) + Female (${female}) candidates cannot exceed Total Intake (${totalCap}).`);
      return;
    }

    if (filled > 0 && male + female > filled) {
      toast.error(`Total Male (${male}) + Female (${female}) candidates cannot exceed Enrolled seats (${filled}).`);
      return;
    }

    if (merit + mgmt > totalCap) {
      toast.error(`Sum of Merit Quota (${merit}) and Mgmt Quota (${mgmt}) cannot exceed Total Intake (${totalCap}).`);
      return;
    }

    const payload = {
      branch: Number(formBranchId),
      batch: Number(formBatchId),
      total_capacity: totalCap,
      filled_seats: filled,
      male_seats: male,
      female_seats: female,
      merit_quota: merit,
      management_quota: mgmt,
    };

    setIsSaving(true);
    try {
      let response;
      if (editingId) {
        response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/seat-matrix/${editingId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/seat-matrix/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (response.ok) {
        toast.success(editingId ? 'Seat matrix updated!' : 'Seats allocated successfully!');
        setModalOpen(false);
        fetchSeatMatrix();
      } else {
        const err = await response.json();
        const msg = err.non_field_errors?.[0] || err.detail || err.filled_seats?.[0] || err.total_capacity?.[0] || 'Failed to save seat allocation.';
        toast.error(msg);
      }
    } catch (err) {
      toast.error('An error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchReportData = async (batchId: string, branchId: string) => {
    setReportLoading(true);
    try {
      const url = `${API_ENDPOINT}/admission/manager/seat-matrix/caste-report/?batch_id=${batchId}&branch_id=${branchId}`;
      const res = await fetchWithTokenRefresh(url);
      if (res.ok) {
        const data = await res.json();
        setReportHtml(data.html);
      } else {
        toast.error('Failed to generate admission caste details report');
      }
    } catch (e) {
      toast.error('Error generating report');
    } finally {
      setReportLoading(false);
    }
  };

  const handleOpenReportModal = () => {
    setReportBatchFilter(selectedBatchFilter);
    setReportBranchFilter(selectedBranchFilter);
    setReportModalOpen(true);
    fetchReportData(selectedBatchFilter, selectedBranchFilter);
  };

  const handleReportBatchChange = (newBatch: string) => {
    setReportBatchFilter(newBatch);
    fetchReportData(newBatch, reportBranchFilter);
  };

  const handleReportBranchChange = (newBranch: string) => {
    setReportBranchFilter(newBranch);
    fetchReportData(reportBatchFilter, newBranch);
  };

  const handlePrintReport = () => {
    if (!reportHtml) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  };

  const handleOpenInNewTab = () => {
    if (!reportHtml) return;
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(reportHtml);
      newWindow.document.close();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const filteredMatrix = seatMatrix.filter(m => {
    const matchBatch = selectedBatchFilter === 'all' || String(m.batch) === selectedBatchFilter;
    const matchBranch = selectedBranchFilter === 'all' || String(m.branch) === selectedBranchFilter;
    return matchBatch && matchBranch;
  });

  return (
    <>
      <Card id="admission-seat-matrix-container" className="w-full">
        <CardHeader id="admission-seat-matrix-header" className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 pb-4 border-b">
          <div>
            <CardTitle className="text-lg md:text-xl font-semibold">Seat Matrix</CardTitle>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">Monitor seat allocations and availability per batch and branch.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            {/* 2 Filter Dropdowns: Side-by-side on Mobile */}
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-3">
              <Select value={selectedBatchFilter} onValueChange={setSelectedBatchFilter}>
                <SelectTrigger className="w-full sm:w-[160px] text-xs h-9">
                  <SelectValue placeholder="Filter by Batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Batches</SelectItem>
                  {batches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id.toString()} className="text-xs">{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter}>
                <SelectTrigger className="w-full sm:w-[170px] text-xs h-9">
                  <SelectValue placeholder="Filter by Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Branches</SelectItem>
                  {branches.map((br: any) => (
                    <SelectItem key={br.id} value={br.id.toString()} className="text-xs">{br.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons: 2-column grid on mobile, inline on desktop */}
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto h-9 text-xs whitespace-nowrap gap-1 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 justify-center px-2"
                onClick={handleOpenReportModal}
                disabled={reportLoading}
              >
                {reportLoading ? <Loader2 size={14} className="animate-spin shrink-0" /> : <FileText size={14} className="shrink-0" />}
                <span className="truncate">Report</span>
              </Button>
              <Button size="sm" className="w-full sm:w-auto h-9 text-xs shadow-sm whitespace-nowrap justify-center px-2 bg-primary text-white" onClick={openAllocateModal}>
                <Plus size={15} className="mr-1 shrink-0" /> <span className="truncate">Allocate Seats</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-6">
          {filteredMatrix.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <BookOpen className="w-12 h-12 mb-4 opacity-30" />
              <p className="mb-2 font-medium">No seat matrix records found for this batch.</p>
              <p className="text-sm">Click "Allocate Seats" to define intake capacity.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {filteredMatrix.map(matrix => {
                const fillPercentage = matrix.total_capacity > 0
                  ? Math.min(Math.round((matrix.filled_seats / matrix.total_capacity) * 100), 100)
                  : 0;
                const remaining = matrix.total_capacity - matrix.filled_seats;
                const isFull = remaining <= 0;
                return (
                  <div key={matrix.id} className="border border-border rounded-xl p-5 bg-muted/5 hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="flex items-start justify-between pb-4 border-b mb-4">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">{matrix.branch_name}</h3>
                        {matrix.batch_name && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full mt-1 inline-block">{matrix.batch_name}</span>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => openEditModal(matrix)}>
                        <Edit size={15} />
                      </Button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 mb-4">
                      <div className="p-3 bg-card rounded-lg text-center border shadow-2xs">
                        <p className="text-[11px] text-muted-foreground uppercase mb-1 font-semibold">Total Intake</p>
                        <p className="text-2xl font-bold text-foreground">{matrix.total_capacity}</p>
                      </div>
                      <div className={`p-3 rounded-lg text-center border shadow-2xs ${isFull ? 'bg-red-500/10 border-red-500/20' : 'bg-primary/10 border-primary/20'}`}>
                        <p className={`text-[11px] uppercase font-bold mb-1 ${isFull ? 'text-red-500' : 'text-primary'}`}>Enrolled</p>
                        <p className={`text-2xl font-bold ${isFull ? 'text-red-500' : 'text-primary'}`}>{matrix.filled_seats}</p>
                      </div>
                      <div className={`p-3 rounded-lg text-center border shadow-2xs ${remaining > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-neutral-100 dark:bg-neutral-800/40 text-muted-foreground'}`}>
                        <p className="text-[11px] uppercase font-bold mb-1">Available</p>
                        <p className="text-2xl font-bold">{Math.max(0, remaining)}</p>
                      </div>
                      <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg text-center border border-blue-200/70 dark:border-blue-800/50 shadow-2xs">
                        <p className="text-[11px] text-blue-600 dark:text-blue-400 uppercase mb-1 font-semibold flex items-center justify-center gap-1">
                          <User size={11} className="shrink-0" /> Male
                        </p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{matrix.male_count ?? 0}</p>
                      </div>
                      <div className="p-3 bg-rose-50/50 dark:bg-rose-950/30 rounded-lg text-center border border-rose-200/70 dark:border-rose-800/50 shadow-2xs">
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 uppercase mb-1 font-semibold flex items-center justify-center gap-1">
                          <User size={11} className="shrink-0" /> Female
                        </p>
                        <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{matrix.female_count ?? 0}</p>
                      </div>
                      <div className="p-3 bg-card rounded-lg text-center border shadow-2xs">
                        <p className="text-[11px] text-muted-foreground uppercase mb-1 font-semibold flex items-center justify-center gap-1"><Award size={11} /> Merit Quota</p>
                        <p className="text-2xl font-bold text-foreground">{matrix.merit_quota}</p>
                      </div>
                      <div className="p-3 bg-card rounded-lg text-center border shadow-2xs">
                        <p className="text-[11px] text-muted-foreground uppercase mb-1 font-semibold flex items-center justify-center gap-1"><Users size={11} /> Mgmt Quota</p>
                        <p className="text-2xl font-bold text-foreground">{matrix.management_quota}</p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm font-medium">
                        <span>Occupancy</span>
                        <span className={isFull ? 'text-red-500' : ''}>{fillPercentage}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${isFull ? 'bg-red-500' : fillPercentage > 80 ? 'bg-amber-500' : 'bg-primary'}`}
                          style={{ width: `${fillPercentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-right">
                        {isFull ? <span className="text-red-500 font-medium">No seats remaining</span> : `${remaining} seat${remaining !== 1 ? 's' : ''} available`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allocate / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Seat Allocation' : 'Allocate Seats'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Batch *</Label>
              <Select value={formBatchId} onValueChange={setFormBatchId} disabled={!!editingId}>
                <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                <SelectContent>
                  {batches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Branch *</Label>
              <Select value={formBranchId} onValueChange={setFormBranchId} disabled={!!editingId}>
                <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Summary Banner */}
            {(() => {
              const liveTotal = Math.max(0, parseInt(formTotalCapacity) || 0);
              const liveFilled = Math.max(0, parseInt(formFilledSeats) || 0);
              const liveMale = Math.max(0, parseInt(formMaleSeats) || 0);
              const liveFemale = Math.max(0, parseInt(formFemaleSeats) || 0);
              const liveMerit = Math.max(0, parseInt(formMeritQuota) || 0);
              const liveMgmt = Math.max(0, parseInt(formMgmtQuota) || 0);
              const liveRemaining = Math.max(0, liveTotal - liveFilled);
              const isGenderExceeded = (liveMale + liveFemale) > (liveFilled > 0 ? liveFilled : liveTotal);
              const isIntakeExceeded = liveFilled > liveTotal;
              const isQuotaExceeded = (liveMerit + liveMgmt) > liveTotal;

              return (
                <>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border text-xs">
                    <span className="text-muted-foreground font-medium">Calculated Available Seats:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{liveRemaining} / {liveTotal}</span>
                  </div>

                  {(isIntakeExceeded || isGenderExceeded || isQuotaExceeded) && (
                    <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1 flex flex-col">
                      {isIntakeExceeded && (
                        <div className="flex items-center gap-1.5 font-medium">
                          <AlertCircle size={13} className="shrink-0" />
                          Enrolled seats ({liveFilled}) exceed Total Intake ({liveTotal}).
                        </div>
                      )}
                      {isGenderExceeded && (
                        <div className="flex items-center gap-1.5 font-medium">
                          <AlertCircle size={13} className="shrink-0" />
                          Male ({liveMale}) + Female ({liveFemale}) = {liveMale + liveFemale} exceeds {liveFilled > 0 ? `Enrolled seats (${liveFilled})` : `Total Intake (${liveTotal})`}.
                        </div>
                      )}
                      {isQuotaExceeded && (
                        <div className="flex items-center gap-1.5 font-medium">
                          <AlertCircle size={13} className="shrink-0" />
                          Merit ({liveMerit}) + Mgmt ({liveMgmt}) Quota exceeds Total Intake ({liveTotal}).
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Total Intake *</Label>
                <Input type="number" min={1} value={formTotalCapacity} onChange={e => setFormTotalCapacity(e.target.value)} placeholder="60" />
              </div>
              <div className="space-y-2">
                <Label>Enrolled Seats</Label>
                <Input type="number" min={0} value={formFilledSeats} onChange={e => setFormFilledSeats(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-blue-700 dark:text-blue-400 font-medium">
                  <User size={13} className="shrink-0" /> Male Candidates
                </Label>
                <Input type="number" min={0} value={formMaleSeats} onChange={e => setFormMaleSeats(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-rose-700 dark:text-rose-400 font-medium">
                  <User size={13} className="shrink-0" /> Female Candidates
                </Label>
                <Input type="number" min={0} value={formFemaleSeats} onChange={e => setFormFemaleSeats(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Merit Quota</Label>
                <Input type="number" min={0} value={formMeritQuota} onChange={e => setFormMeritQuota(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Mgmt Quota</Label>
                <Input type="number" min={0} value={formMgmtQuota} onChange={e => setFormMgmtQuota(e.target.value)} placeholder="0" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">The "Enrolled", "Male", and "Female" counts are auto-tracked during student enrollment and can also be adjusted within valid seat limits.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || !formBranchId || !formBatchId}>
              {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : editingId ? 'Save Changes' : 'Allocate Seats'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Caste-wise Admission Details Report Preview Modal */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b">
            <div>
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                Admission Details Report
                {reportLoading && <Loader2 size={16} className="animate-spin text-purple-600" />}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Official Caste-wise & Department-wise Admission Statistics
              </DialogDescription>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Select value={reportBatchFilter} onValueChange={handleReportBatchChange}>
                <SelectTrigger className="h-8 text-xs w-[140px]">
                  <SelectValue placeholder="Batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {batches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={reportBranchFilter} onValueChange={handleReportBranchChange}>
                <SelectTrigger className="h-8 text-xs w-[140px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {branches.map((br: any) => (
                    <SelectItem key={br.id} value={br.id.toString()}>{br.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={handleOpenInNewTab}
                disabled={!reportHtml || reportLoading}
              >
                <ExternalLink size={13} /> New Tab
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handlePrintReport}
                disabled={!reportHtml || reportLoading}
              >
                <Printer size={13} /> Print / Save PDF
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto bg-neutral-100 dark:bg-neutral-900 rounded-lg p-2 sm:p-4 my-2 border relative">
            {reportLoading && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            )}
            {reportHtml ? (
              <div 
                className="bg-white text-black shadow-lg mx-auto rounded overflow-auto"
                style={{ width: '100%', minWidth: '900px' }}
                dangerouslySetInnerHTML={{ __html: reportHtml }} 
              />
            ) : !reportLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No report data found for the selected filters.
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
