import React, { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Eye, Search, GraduationCap, Loader2, MousePointer2, Filter, CheckCircle } from 'lucide-react';

// ──────────────────────────────────
//  Types
// ──────────────────────────────────
interface FilterData {
  batches: { id: number; name: string }[];
  branches: { id: number; name: string; code: string }[];
  admission_modes: string[];
}
interface AlumniRow {
  usn: string; name: string; email: string; phone: string;
  semester: string; section: string; batch: string;
  mode_of_admission: string; branch: string;
}
interface AlumniDetail extends AlumniRow {
  address: string; blood_group: string; date_of_birth: string; is_graduated: boolean;
}

const authHeaders = () => ({
  Authorization: `Bearer ${sessionStorage.getItem('access_token')}`,
  'Content-Type': 'application/json',
});

// ──────────────────────────────────
//  Component
// ──────────────────────────────────
const AlumniDirectory: React.FC = () => {
  const { toast } = useToast();

  // ── filter bootstrap ──
  const [filterData, setFilterData] = useState<FilterData>({ batches: [], branches: [], admission_modes: [] });

  // ── loading states ──
  const [loadingFilters, setLoadingFilters]     = useState(false);
  const [loadingStudents, setLoadingStudents]   = useState(false);

  // ── selected filters ──
  const [filters, setFilters] = useState({
    batchId:       '',
    branchId:      '',
    admissionMode: '',
  });

  // ── search (debounced) ──
  const [searchInput, setSearchInput]   = useState('');
  const [searchQuery, setSearchQuery]   = useState('');

  // ── table data ──
  const [alumni, setAlumni]             = useState<AlumniRow[]>([]);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [totalCount, setTotalCount]     = useState(0);

  // ── detail modal ──
  const [modalOpen, setModalOpen]               = useState(false);
  const [loadingDetail, setLoadingDetail]       = useState(false);
  const [selectedAlumni, setSelectedAlumni]     = useState<AlumniDetail | null>(null);

  // ──────────────────────────────────
  //  1. Load bootstrap filters once
  // ──────────────────────────────────
  const fetchFilters = useCallback(async () => {
    setLoadingFilters(true);
    try {
      const res  = await fetchWithTokenRefresh(`${API_ENDPOINT}/alumni/filters/`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) setFilterData(json.data);
    } catch (e) {
      console.error('Alumni filters error', e);
    } finally {
      setLoadingFilters(false);
    }
  }, []);

  useEffect(() => { fetchFilters(); }, [fetchFilters]);

  // Reset dependent filters if parent is cleared
  useEffect(() => {
    if (!filters.batchId) {
      setFilters(f => ({ ...f, branchId: '', admissionMode: '' }));
    }
  }, [filters.batchId]);

  useEffect(() => {
    if (!filters.branchId) {
      setFilters(f => ({ ...f, admissionMode: '' }));
    }
  }, [filters.branchId]);

  // ──────────────────────────────────
  //  2. Debounce search
  // ──────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Clear search query when dropdown filters change
  useEffect(() => {
    setSearchInput('');
    setSearchQuery('');
  }, [
    filters.batchId,
    filters.branchId,
    filters.admissionMode
  ]);

  // ──────────────────────────────────
  //  3. Fetch alumni list
  // ──────────────────────────────────
  const fetchAlumni = useCallback(async (pg = 1) => {
    setLoadingStudents(true);
    try {
      const params = new URLSearchParams({ page: String(pg) });
      if (filters.batchId)       params.set('batch_id',       filters.batchId);
      if (filters.branchId)      params.set('branch_id',      filters.branchId);
      if (filters.admissionMode) params.set('admission_mode', filters.admissionMode);
      if (searchQuery)           params.set('search',         searchQuery);

      const res  = await fetchWithTokenRefresh(`${API_ENDPOINT}/alumni/?${params}`, { headers: authHeaders() });
      const json = await res.json();
      if (res.ok) {
        setAlumni(json.results || []);
        setTotalPages(Math.ceil((json.count || 0) / 50) || 1);
        setTotalCount(json.count || 0);
        setPage(pg);
      } else {
        toast({ title: 'Error', description: json.message || 'Failed to load alumni', variant: 'destructive' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setLoadingStudents(false);
    }
  }, [filters, searchQuery, toast]);

  const allFiltersSelected = !!(
    filters.batchId &&
    filters.branchId &&
    filters.admissionMode
  );

  // Re-fetch when filters or search changes (only if valid selection exists)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (allFiltersSelected || searchQuery.trim().length > 0) {
        fetchAlumni(1);
      } else {
        setAlumni([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, searchQuery, allFiltersSelected, fetchAlumni]);

  // ──────────────────────────────────
  //  4. View detail
  // ──────────────────────────────────
  const viewDetail = async (usn: string) => {
    setModalOpen(true);
    setLoadingDetail(true);
    setSelectedAlumni(null);
    try {
      const res  = await fetchWithTokenRefresh(`${API_ENDPOINT}/alumni/${usn}/`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) setSelectedAlumni(json.data);
      else toast({ title: 'Error', description: json.message || 'Not found', variant: 'destructive' });
    } catch (e) {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setLoadingDetail(false);
    }
  };

  // ──────────────────────────────────
  //  Helpers
  // ──────────────────────────────────
  const setFilter = (key: keyof typeof filters, val: string) =>
    setFilters(f => ({ ...f, [key]: val }));

  // ──────────────────────────────────
  //  Render
  // ──────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30">
          <GraduationCap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alumni Directory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">View and manage graduated students</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">

            {/* Batch */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-gray-400">Batch</label>
              <Select value={filters.batchId} onValueChange={v => setFilter('batchId', v)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent>
                  {filterData.batches.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Branch */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-gray-400">Branch</label>
              <Select value={filters.branchId} onValueChange={v => setFilter('branchId', v)} disabled={!filters.batchId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent>
                  {filterData.branches.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Admission Mode */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-gray-400">Admission Mode</label>
              <Select
                value={filters.admissionMode}
                onValueChange={v => setFilter('admissionMode', v)}
                disabled={!filters.branchId}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select Admission Mode" />
                </SelectTrigger>
                <SelectContent>
                  {filterData.admission_modes.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* Search Row */}
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by USN or Name..."
              className="pl-9 pr-12 bg-muted/20 border-border h-10"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-purple-600 hover:text-purple-500 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {!allFiltersSelected && !searchQuery ? (
            <div className="min-h-[400px] py-10 flex flex-col items-center justify-center bg-muted/5 dark:bg-muted/10 px-4 text-center">
              <div className="relative mb-6">
                <div className="absolute -top-3 -right-3 bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full animate-bounce sm:-top-4 sm:-right-4 sm:p-3">
                  <MousePointer2 className="h-3 w-3 text-purple-600 dark:text-purple-400 sm:h-4 sm:w-4" />
                </div>
                <div className="bg-muted/20 p-6 rounded-2xl border-2 border-dashed border-muted sm:p-8">
                  <Filter className="h-6 w-6 text-gray-400 dark:text-gray-500 sm:h-8 sm:w-8" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Selection Required</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-8 px-2">
                Please complete the cascading filter selection above to load the alumni directory.
              </p>
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 w-full max-w-3xl">
                {[
                  { label: 'Batch', active: !!filters.batchId },
                  { label: 'Branch', active: !!filters.branchId },
                  { label: 'Admission Mode', active: !!filters.admissionMode }
                ].map((step, i) => (
                  <div key={step.label} className="flex flex-col items-center gap-2 min-w-[60px] sm:min-w-[80px]">
                    <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border-2 transition-all duration-300 ${
                      step.active 
                        ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-600/25 scale-110' 
                        : 'bg-background border-muted text-gray-400 dark:text-gray-500 opacity-60'
                    }`}>
                      {step.active ? <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" /> : i + 1}
                    </div>
                    <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-colors duration-300 ${
                      step.active ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500 opacity-60'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Count bar */}
              <div className="px-4 py-3 border-b flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>
                  {loadingStudents ? 'Loading…' : `${totalCount} alumni found`}
                </span>
                {totalPages > 1 && (
                  <span>Page {page} of {totalPages}</span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 dark:bg-gray-800/50 text-left">
                      {['USN', 'Name', 'Branch', 'Batch', 'Mode', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {loadingStudents ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
                        </td>
                      </tr>
                    ) : alumni.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-gray-400 dark:text-gray-500">
                          No alumni found. Try adjusting the filters.
                        </td>
                      </tr>
                    ) : alumni.map(a => (
                      <tr key={a.usn} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">{a.usn}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{a.name}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.branch}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.batch}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                            {a.mode_of_admission}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="outline" onClick={() => viewDetail(a.usn)} className="gap-1">
                            <Eye className="h-3.5 w-3.5" /> View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 py-4 border-t">
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => fetchAlumni(page - 1)}>Prev</Button>
                  <span className="flex items-center px-3 text-sm text-gray-600 dark:text-gray-300">{page} / {totalPages}</span>
                  <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => fetchAlumni(page + 1)}>Next</Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-500" /> Alumni Details
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {loadingDetail ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : selectedAlumni ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {([
                  ['USN',            selectedAlumni.usn],
                  ['Name',           selectedAlumni.name],
                  ['Email',          selectedAlumni.email],
                  ['Phone',          selectedAlumni.phone],
                  ['Branch',         selectedAlumni.branch],
                  ['Batch',          selectedAlumni.batch],
                  ['Mode',           selectedAlumni.mode_of_admission],
                  ['Blood Group',    selectedAlumni.blood_group],
                  ['Date of Birth',  selectedAlumni.date_of_birth],
                  ['Address',        selectedAlumni.address],
                ] as [string, string | null][]).map(([label, value]) => (
                  <div key={label} className="col-span-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-gray-800 dark:text-gray-200">{value || '—'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-6">No data found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AlumniDirectory;

