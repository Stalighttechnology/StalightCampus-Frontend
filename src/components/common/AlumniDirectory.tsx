import React, { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Eye, Search, GraduationCap, Loader2, MousePointer2, Filter, CheckCircle, Edit, Save, X } from 'lucide-react';
import Swal from 'sweetalert2';

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
  id: number;
  address: string; blood_group: string; date_of_birth: string; is_graduated: boolean;
  current_company?: string; job_title?: string; industry?: string;
  linkedin_url?: string; github_portfolio_url?: string;
  higher_education?: string; university_name?: string;
  final_cgpa?: string; honors_medals?: string; major_projects?: string;
  clubs_committees?: string;
}

const authHeaders = () => ({
  Authorization: `Bearer ${sessionStorage.getItem('access_token')}`,
  'Content-Type': 'application/json',
});

// ──────────────────────────────────
//  Component
// ──────────────────────────────────
interface AlumniDirectoryProps {
  userRole?: string;
  userBranchId?: string;
}

const AlumniDirectory: React.FC<AlumniDirectoryProps> = ({ userRole, userBranchId }) => {
  const { toast } = useToast();
  console.log("AlumniDirectory props:", { userRole, userBranchId });

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

  // ── auto-trigger dropdown states ──
  const [branchOpen, setBranchOpen]     = useState(false);
  const [modeOpen, setModeOpen]         = useState(false);

  // ── detail modal ──
  const [modalOpen, setModalOpen]               = useState(false);
  const [loadingDetail, setLoadingDetail]       = useState(false);
  const [selectedAlumni, setSelectedAlumni]     = useState<AlumniDetail | null>(null);
  const [isEditing, setIsEditing]               = useState(false);
  const [editForm, setEditForm]                 = useState<Partial<AlumniDetail>>({});
  const [savingProfile, setSavingProfile]       = useState(false);

  // ──────────────────────────────────
  //  1. Load bootstrap filters once
  // ──────────────────────────────────
  const fetchFilters = useCallback(async () => {
    setLoadingFilters(true);
    try {
      const res  = await fetchWithTokenRefresh(`${API_ENDPOINT}/alumni/filters/`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) {
        setFilterData(json.data);
        if (userRole === 'hod' && userBranchId) {
          setFilters(f => ({ ...f, branchId: userBranchId }));
        }
      }
    } catch (e) {
      console.error('Alumni filters error', e);
    } finally {
      setLoadingFilters(false);
    }
  }, [userRole, userBranchId]);

  useEffect(() => { fetchFilters(); }, [fetchFilters]);

  useEffect(() => {
    if (userRole === 'hod' && userBranchId && filterData.branches.length > 0) {
      const matchedBranch = filterData.branches.find(b => 
        String(b.id) === String(userBranchId) || 
        b.name.toLowerCase() === String(userBranchId).toLowerCase()
      );
      if (matchedBranch) {
        setFilters(f => ({ ...f, branchId: String(matchedBranch.id) }));
      }
    }
  }, [userRole, userBranchId, filterData.branches]);

  // Reset dependent filters if parent is cleared
  useEffect(() => {
    if (!filters.batchId) {
      if (userRole === 'hod' && userBranchId) {
        setFilters(f => ({ ...f, admissionMode: '' }));
      } else {
        setFilters(f => ({ ...f, branchId: '', admissionMode: '' }));
      }
    }
  }, [filters.batchId, userRole, userBranchId]);

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
  const viewDetail = async (usn: string, editMode: boolean = false) => {
    setModalOpen(true);
    setLoadingDetail(true);
    setSelectedAlumni(null);
    try {
      const res  = await fetchWithTokenRefresh(`${API_ENDPOINT}/alumni/${usn}/`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) {
        setSelectedAlumni(json.data);
        if (editMode) {
          setEditForm(json.data);
          setIsEditing(true);
        } else {
          setIsEditing(false);
          setEditForm({});
        }
      } else {
        toast({ title: 'Error', description: json.message || 'Not found', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setLoadingDetail(false);
    }
  };

  // ──────────────────────────────────
  //  Helpers
  // ──────────────────────────────────
  const handleSaveProfile = async () => {
    if (!selectedAlumni) return;
    setSavingProfile(true);
    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/alumni/${selectedAlumni.usn}/profile/`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire({
          title: 'Success!',
          text: 'Alumni profile has been updated.',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#9333ea'
        });
        setSelectedAlumni(prev => prev ? { ...prev, ...editForm } : prev);
        setIsEditing(false);
      } else {
        toast({ title: 'Error', description: json.message || 'Failed to update profile', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleEditChange = (field: keyof AlumniDetail, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const startEditing = () => {
    setEditForm(selectedAlumni || {});
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({});
  };
  const setFilter = (key: keyof typeof filters, val: string) =>
    setFilters(f => ({ ...f, [key]: val }));

  // ──────────────────────────────────
  //  Render
  // ──────────────────────────────────
  return (
    <div className="space-y-6">
      <Card className="border-border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg sm:text-2xl font-semibold">Alumni Directory</CardTitle>
            <CardDescription className="text-[16px] sm:text-sm text-muted-foreground mt-1">
              View and manage graduated students
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Batch */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-gray-400">Batch</label>
              <Select value={filters.batchId} onValueChange={v => {
                setFilter('batchId', v);
                if (userRole === 'hod') {
                  setTimeout(() => setModeOpen(true), 150);
                } else {
                  setTimeout(() => setBranchOpen(true), 150);
                }
              }}>
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
              <Select
                value={filters.branchId}
                open={branchOpen}
                onOpenChange={setBranchOpen}
                onValueChange={v => {
                  setFilter('branchId', v);
                  setTimeout(() => setModeOpen(true), 150);
                }}
                disabled={(!filters.batchId) || (userRole === 'hod')}
              >
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
                open={modeOpen}
                onOpenChange={setModeOpen}
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

          {/* Results section */}
          <div className="border border-border rounded-lg overflow-hidden bg-background">
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

                {!loadingStudents && alumni.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-4 border-t border-border">
                    <GraduationCap className="w-12 h-12 text-muted-foreground/30 mb-4" />
                    <p className="font-semibold text-muted-foreground">No alumni found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting the filters.</p>
                  </div>
                ) : (
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
                          Array.from({ length: 5 }).map((_, i) => (
                            <tr key={`skeleton-${i}`}>
                              <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                              <td className="px-4 py-4"><Skeleton className="h-4 w-36" /></td>
                              <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                              <td className="px-4 py-4"><Skeleton className="h-4 w-16" /></td>
                              <td className="px-4 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                              <td className="px-4 py-4"><Skeleton className="h-8 w-16 rounded-md" /></td>
                            </tr>
                          ))
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
                            <td className="px-4 py-3 flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => viewDetail(a.usn)} className="gap-1">
                                <Eye className="h-3.5 w-3.5" /> View
                              </Button>
                              {['hod', 'principal', 'admin'].includes(userRole || '') && (
                                <Button size="sm" variant="outline" onClick={() => viewDetail(a.usn, true)} className="gap-1 text-purple-600 border-purple-200 hover:bg-purple-50">
                                  <Edit className="h-3.5 w-3.5" /> Edit
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                    <div>
                      Showing {Math.min((page - 1) * 10 + 1, totalCount)} to {Math.min(page * 10, totalCount)} of {totalCount} alumni
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchAlumni(page - 1)}
                        disabled={page === 1 || loadingStudents}
                        className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                        Previous
                      </Button>

                      <div className="flex items-center justify-center min-w-[2rem]">
                        <span className="text-sm font-semibold text-gray-900 dark:text-foreground">
                          {page}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchAlumni(page + 1)}
                        disabled={page === totalPages || loadingStudents}
                        className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                        Next
                      </Button>
                    </div>
                  </CardFooter>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => {
        setModalOpen(open);
        if (!open) cancelEditing();
      }}>
        <DialogContent className="w-[90%] h-[80vh] sm:h-auto rounded-2xl sm:max-w-[700px] max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center justify-between gap-2 pr-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-purple-500" />
                Alumni Details
              </div>
              {['hod', 'principal', 'admin'].includes(userRole || '') && selectedAlumni && !loadingDetail && (
                <div>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={cancelEditing} disabled={savingProfile}>
                        <X className="w-4 h-4 mr-1" /> Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile} className="bg-purple-600 hover:bg-purple-700 text-white">
                        {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} Save
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={startEditing}>
                      <Edit className="w-4 h-4 mr-1" /> Edit Profile
                    </Button>
                  )}
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
            {loadingDetail ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : selectedAlumni ? (
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="flex overflow-x-auto w-full mb-6 justify-start sm:grid sm:grid-cols-3 whitespace-nowrap p-1 bg-muted text-muted-foreground rounded-lg h-10 scrollbar-none">
                  <TabsTrigger value="basic" className="shrink-0 flex-1 text-xs px-2 sm:text-sm sm:px-3">Basic Info</TabsTrigger>
                  <TabsTrigger value="career" className="shrink-0 flex-1 text-xs px-2 sm:text-sm sm:px-3">Career & Networking</TabsTrigger>
                  <TabsTrigger value="academic" className="shrink-0 flex-1 text-xs px-2 sm:text-sm sm:px-3">Academic Legacy</TabsTrigger>
                </TabsList>

                {/* TAB 1: BASIC INFO */}
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
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
                </TabsContent>

                {/* TAB 2: CAREER & NETWORKING */}
                <TabsContent value="career" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    {([
                      ['current_company', 'Current Company', 'e.g. Google'],
                      ['job_title', 'Job Title', 'e.g. Software Engineer'],
                      ['industry', 'Industry', 'e.g. Technology'],
                      ['linkedin_url', 'LinkedIn URL', 'https://linkedin.com/in/...'],
                      ['github_portfolio_url', 'Portfolio / GitHub', 'https://github.com/...'],
                    ] as [keyof AlumniDetail, string, string][]).map(([field, label, placeholder]) => (
                      <div key={field} className={field.includes('url') ? "col-span-1 sm:col-span-2" : "col-span-1"}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                        {isEditing ? (
                          <Input
                            placeholder={placeholder}
                            value={(editForm[field] as string) || ''}
                            onChange={(e) => handleEditChange(field, e.target.value)}
                          />
                        ) : (
                          <p className="text-gray-800 dark:text-gray-200">
                            {field.includes('url') && selectedAlumni[field] ? (
                              <a href={selectedAlumni[field] as string} target="_blank" rel="noreferrer" className="text-purple-600 hover:underline">
                                {selectedAlumni[field] as string}
                              </a>
                            ) : (
                              (selectedAlumni[field] as string) || 'Not Provided'
                            )}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* TAB 3: ACADEMIC LEGACY & HIGHER ED */}
                <TabsContent value="academic" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    {([
                      ['higher_education', 'Further Studies', 'e.g. M.Tech, MS'],
                      ['university_name', 'University Name', 'e.g. Stanford'],
                      ['final_cgpa', 'Final CGPA', 'e.g. 9.5'],
                      ['honors_medals', 'Honors / Medals', 'e.g. Gold Medalist'],
                      ['major_projects', 'Major Projects', 'Description of projects'],
                      ['clubs_committees', 'Clubs / Committees', 'e.g. President of Coding Club'],
                    ] as [keyof AlumniDetail, string, string][]).map(([field, label, placeholder]) => (
                      <div key={field} className={['major_projects', 'clubs_committees'].includes(field as string) ? "col-span-1 sm:col-span-2" : "col-span-1"}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                        {isEditing ? (
                          <Input
                            placeholder={placeholder}
                            value={(editForm[field] as string) || ''}
                            onChange={(e) => handleEditChange(field, e.target.value)}
                          />
                        ) : (
                          <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                            {(selectedAlumni[field] as string) || 'Not Provided'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
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

