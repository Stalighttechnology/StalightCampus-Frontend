import { translateTerminology, getTerm, getInstitutionType } from "@/utils/institutionConfig";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from
  "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from
  "../ui/dialog";
import { CheckCircle, XCircle, UserCheck, UserX, Users, ArrowRight, Search, X, Loader2, AlertTriangle, Lightbulb } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from
  "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from
  "../ui/table";
import { Checkbox } from "../ui/checkbox";
import {
  getSemesters,
  manageSections,
  manageProfile,
  promoteStudentsToNextSemester,
  promoteSelectedStudents,
  demoteStudent,
  bulkDemoteStudents,
  manageStudents,
  getPromotionBootstrap,
  graduateStudents,
  getPromotionHistory,
  PromotionHistoryItem
} from
  "../../utils/hod_api";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonTable } from "../ui/skeleton";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { getBatches } from "../../utils/faculty_api";

interface Semester {
  id: string;
  number: number;
}

interface Section {
  id: string;
  name: string;
  semester_id: string;
}

interface Student {
  usn: string;
  name: string;
  semester: string;
  section: string | null;
  batch: string | null;
}

export const formatSemesterOrdinal = (number: number) => {
  if (getInstitutionType() === 'school') {
    return `Class ${number}`;
  }
  const j = number % 10;
  const k = number % 100;
  if (j === 1 && k !== 11) return `${number}st Semester`;
  if (j === 2 && k !== 12) return `${number}nd Semester`;
  if (j === 3 && k !== 13) return `${number}rd Semester`;
  return `${number}th Semester`;
};

const PromotionManagement = () => {
  const getSemesterName = (number: number) => {
    if (getInstitutionType() === 'school') {
      return `Class ${number}`;
    }
    return `Semester ${number}`;
  };

  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<"overview" | "promote" | "demote">("overview");
  const [stats, setStats] = useState({
    promoted_this_month: 0,
    demoted_this_month: 0,
    active_operations: 0
  });

  const fetchStats = async () => {
    try {
      const res = await getPromotionBootstrap();
      if (res.success && res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <PromotionOverview onTabChange={setActiveTab} theme={theme} stats={stats} />;
      case "promote":
        return <PromotionPage theme={theme} onTabChange={setActiveTab} onSuccess={fetchStats} />;
      case "demote":
        return <DemotionPage theme={theme} onTabChange={setActiveTab} onSuccess={fetchStats} />;
      default:
        return <PromotionOverview onTabChange={setActiveTab} theme={theme} stats={stats} />;
    }
  };

  return (
    <div id="hod-promotion-container" className="space-y-4">
      {renderContent()}
    </div>);

};

const PromotionHistoryModal = ({ open, onOpenChange, type, theme }: { open: boolean; onOpenChange: (open: boolean) => void; type: 'promoted' | 'demoted'; theme: string; }) => {
  const [data, setData] = useState<PromotionHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchHistory(1);
    }
  }, [open, type]);

  const fetchHistory = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await getPromotionHistory({ status: type, month: 'current', page: pageNum, page_size: 10 });
      if (res.success && res.data) {
        setData(res.data.items);
        setTotalPages(res.data.pages);
        setPage(res.data.page);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/promotion-history/?status=${type}&month=current&export=true`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
        }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `promotion_history_${type}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        Swal.fire({ icon: 'error', title: 'Export Failed', text: 'Failed to export history' });
      }
    } catch (error) {
      console.error("Export error", error);
      Swal.fire({ icon: 'error', title: 'Export Failed', text: 'Network error occurred' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`w-[95vw] sm:w-[90vw] md:max-w-4xl max-h-[85vh] overflow-y-auto custom-scrollbar rounded-xl ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
        <DialogHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-4 mb-4 gap-4">
          <DialogTitle className="text-lg sm:text-xl text-left">
            Students {type === 'promoted' ? 'Promoted' : 'Demoted'} This Month
          </DialogTitle>
          <Button variant="outline" size="sm" onClick={handleExport} className="w-full sm:w-auto">
            Export CSV
          </Button>
        </DialogHeader>
        
        {loading ? (
          <SkeletonTable columns={6} rows={5} />
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No records found.</div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>USN</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>{getInstitutionType() === 'school' ? 'Classes' : 'Semesters'}</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => {
                    const formatSem = (val: string | null) => {
                      if (!val) return 'N/A';
                      if (getInstitutionType() === 'school') {
                        return val.replace(/(\d+)(?:st|nd|rd|th)\s+Semester/gi, 'Class $1').replace(/Sem\s*(\d+)/gi, 'Class $1');
                      }
                      return val;
                    };
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.usn}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{formatSem(item.from_semester)} → {formatSem(item.to_semester)}</TableCell>
                        <TableCell>{item.processed_at ? new Date(item.processed_at).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={item.remarks}>{item.remarks || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchHistory(page - 1)} 
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchHistory(page + 1)} 
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const PromotionOverview = ({ onTabChange, theme, stats }: { onTabChange: (tab: "overview" | "promote" | "demote") => void; theme: string; stats: { promoted_this_month: number; demoted_this_month: number; active_operations: number; }; }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'promoted' | 'demoted'>('promoted');

  const handleStatClick = (type: 'promoted' | 'demoted') => {
    setModalType(type);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PromotionHistoryModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        type={modalType} 
        theme={theme} 
      />
      <div id="hod-promotion-cards-wrapper" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Promotion Card */}
        <Card className={`h-full flex flex-col ${theme === 'dark' ? 'bg-card text-foreground border-border hover:border-green-500' : 'bg-white text-gray-900 border-gray-200 hover:border-green-500'}`}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-600 rounded-lg">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Student Promotion</CardTitle>
                <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Promote eligible students to next semester</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Bulk promote students</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Promote selected students</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>View promotion history</span>
              </div>
            </div>
            <Button onClick={() => onTabChange("promote")} className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white">
              Manage Promotions
            </Button>
          </CardContent>
        </Card>

        {/* Demotion Card */}
        <Card className={`h-full flex flex-col ${theme === 'dark' ? 'bg-card text-foreground border-border hover:border-red-500' : 'bg-white text-gray-900 border-gray-200 hover:border-red-500'}`}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-600 rounded-lg">
                <UserX className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Student Demotion</CardTitle>
                <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Demote students to previous semester</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Individual demotion</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Bulk demotion</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Track demotion reasons</span>
              </div>
            </div>
            <Button onClick={() => onTabChange("demote")} className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white">
              Manage Demotions
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            
            Quick Statistics
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1">Review key promotion and demotion metrics for the month.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              onClick={() => handleStatClick('promoted')}
              className={`text-center p-4 rounded-lg cursor-pointer transition-all transform hover:-translate-y-1 hover:shadow-md ${theme === 'dark' ? 'bg-muted hover:bg-muted/80' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              <div className="text-2xl font-bold text-green-400">{stats.promoted_this_month}</div>
              <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Students Promoted This Month</div>
            </div>
            <div 
              onClick={() => handleStatClick('demoted')}
              className={`text-center p-4 rounded-lg cursor-pointer transition-all transform hover:-translate-y-1 hover:shadow-md ${theme === 'dark' ? 'bg-muted hover:bg-muted/80' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              <div className="text-2xl font-bold text-red-400">{stats.demoted_this_month}</div>
              <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Students Demoted This Month</div>
            </div>
            <div className={`text-center p-4 rounded-lg ${theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}`}>
              <div className="text-2xl font-bold text-blue-400">{stats.active_operations}</div>
              <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Active Operations</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

};

const PromotionPage = ({ theme, onTabChange, onSuccess }: { theme: string; onTabChange: (tab: "overview" | "promote" | "demote") => void; onSuccess?: () => void; }) => {
  const [state, setState] = useState({
    batches: [] as any[],
    selectedBatchId: "",
    semesters: [] as Semester[],
    sections: [] as Section[],
    students: [] as Student[],
    selectedStudents: [] as string[],
    selectedSemester: "",
    selectedSection: "",
    branchId: "",
    totalSemesters: 8,
    isLoading: false,
    isPromoting: false,
    promotionResults: null as any,
    errors: [] as string[],
    // Pagination state
    currentPage: 1,
    totalPages: 1,
    totalStudents: 0,
    hasNext: false,
    hasPrevious: false,
    isSectionOpen: false,
    isSemesterOpen: false
  });

  // Debounced search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Senior batch collision warning modal state
  const [collisionDialog, setCollisionDialog] = useState<{
    isOpen: boolean;
    targetSemDisplay: string;
    targetSemValue: string;
    existingCount: number;
  }>({
    isOpen: false,
    targetSemDisplay: "",
    targetSemValue: "",
    existingCount: 0
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Helper to update state
  const updateState = (newState: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      updateState({ isLoading: true });
      try {
        const [bootstrapResponse, batchRes] = await Promise.all([
          getPromotionBootstrap(),
          getBatches()
        ]);
        
        let initialBatches = [] as any[];
        if (batchRes.success && batchRes.data) {
          initialBatches = batchRes.data;
        }

        if (bootstrapResponse.success && bootstrapResponse.data) {
          const { profile, semesters, sections } = bootstrapResponse.data;

          if (profile?.branch_id) {
            updateState({
              branchId: profile.branch_id,
              totalSemesters: profile.total_semesters || 8,
              semesters: semesters || [],
              sections: sections || [],
              batches: initialBatches
            });
          }
        } else {
          updateState({ errors: [bootstrapResponse.message || "Failed to fetch promotion data"], batches: initialBatches });
        }
      } catch (err) {
        updateState({ errors: ["Failed to load initial data"] });
      } finally {
        updateState({ isLoading: false });
      }
    };

    fetchInitialData();
  }, []);

  // When batch changes: reset semester/section, search, clear list, auto-open semester dropdown
  useEffect(() => {
    if (!state.selectedBatchId) return;
    setSearchQuery("");
    setDebouncedSearch("");
    updateState({
      selectedSemester: "",
      selectedSection: "",
      students: [],
      selectedStudents: [],
      isSemesterOpen: true
    });
  }, [state.selectedBatchId]);

  // When semester or section changes: clear search query
  useEffect(() => {
    setSearchQuery("");
    setDebouncedSearch("");
  }, [state.selectedSemester, state.selectedSection]);

  // Fetch sections when semester changes
  useEffect(() => {
    const fetchSections = async () => {
      if (!state.selectedSemester || !state.branchId) return;

      try {
        const semesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
        if (semesterId) {
          const sectionRes = await manageSections({ branch_id: state.branchId, semester_id: semesterId }, "GET");
          if (sectionRes.success && sectionRes.data?.length > 0) {
            updateState({
              sections: sectionRes.data.map((s: any) => ({
                id: s.id,
                name: s.name,
                semester_id: s.semester_id.toString()
              })),
              selectedSection: "",
              isSectionOpen: true
            });
          } else {
            updateState({ sections: [], selectedSection: "", isSectionOpen: true });
          }
        }
      } catch (err) {
        updateState({ errors: ["Failed to load sections"] });
      }
    };

    fetchSections();
  }, [state.selectedSemester, state.branchId, state.semesters]);

  // Fetch students when semester, section, batch, or debounced search change
  useEffect(() => {
    const fetchStudents = async () => {
      if (!state.selectedSemester || !state.branchId || !state.selectedSection || !state.selectedBatchId) {
        updateState({ students: [], selectedStudents: [] });
        return;
      }

      try {
        updateState({ isLoading: true });
        const semesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
        const sectionId = state.sections.find((s) => s.name === state.selectedSection)?.id;

        if (semesterId && sectionId) {
          const studentRes = await manageStudents({
            branch_id: state.branchId,
            semester_id: semesterId,
            section_id: sectionId,
            batch_id: state.selectedBatchId,
            search: debouncedSearch || undefined,
            page_size: 50 // Use AdminPagination default page size
          }, "GET");

          if (studentRes.results && Array.isArray(studentRes.results)) {
            const totalPages = Math.ceil((studentRes.count || 0) / 50);
            updateState({
              students: studentRes.results,
              selectedStudents: [],
              currentPage: 1,
              totalPages: totalPages,
              totalStudents: studentRes.count || 0,
              hasNext: !!studentRes.next,
              hasPrevious: !!studentRes.previous
            });
          } else {
            updateState({ errors: ["Failed to load students"] });
          }
          // 1) { success: true, results: [...], count }
          // 2) { success: true, data: { students: [...] } }
          // 3) plain array
          let results: any[] = [];
          if (studentRes == null) {
            results = [];
          } else if (studentRes.results && Array.isArray(studentRes.results)) {
            results = studentRes.results;
          } else if (studentRes.data && Array.isArray((studentRes.data as any).students)) {
            results = (studentRes.data as any).students;
          } else if (Array.isArray(studentRes)) {
            results = studentRes as any[];
          } else if (studentRes.success === false) {
            // Backend returned an error
            updateState({ errors: [studentRes.message || "Failed to load students"] });
            results = [];
          } else {
            // Unknown shape but try to extract 'data' array
            if (studentRes.data && Array.isArray(studentRes.data)) {
              results = studentRes.data;
            } else {
              results = [];
            }
          }

          updateState({
            students: results,
            selectedStudents: []
          });
        }
      } catch (err) {
        updateState({ errors: ["Failed to load students"] });
      } finally {
        updateState({ isLoading: false });
      }
    };

    fetchStudents();
  }, [state.selectedSemester, state.selectedSection, state.selectedBatchId, state.branchId, state.semesters, state.sections, debouncedSearch]);

  // Handle individual student selection
  const handleStudentSelect = (usn: string, checked: boolean) => {
    if (checked) {
      updateState({ selectedStudents: [...state.selectedStudents, usn] });
    } else {
      updateState({ selectedStudents: state.selectedStudents.filter((id) => id !== usn) });
    }
  };

  // Handle select all students
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      updateState({ selectedStudents: state.students.map((student) => student.usn) });
    } else {
      updateState({ selectedStudents: [] });
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= state.totalPages) {
      fetchStudentsPage(newPage);
    }
  };

  // Function to fetch students for a specific page
  const fetchStudentsPage = async (page: number = 1) => {
    try {
      updateState({ isLoading: true });
      const semesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
      const sectionId = state.sections.find((s) => s.name === state.selectedSection)?.id;

      if (semesterId && sectionId) {
        const studentRes = await manageStudents({
          branch_id: state.branchId,
          semester_id: semesterId,
          section_id: sectionId,
          batch_id: state.selectedBatchId,
          search: debouncedSearch || undefined,
          page: page,
          page_size: 50 // Use AdminPagination default page size
        }, "GET");

        if (studentRes.results && Array.isArray(studentRes.results)) {
          const totalPages = Math.ceil((studentRes.count || 0) / 50);
          updateState({
            students: studentRes.results,
            selectedStudents: [],
            currentPage: page,
            totalPages: totalPages,
            totalStudents: studentRes.count || 0,
            hasNext: !!studentRes.next,
            hasPrevious: !!studentRes.previous
          });
        } else {
          updateState({ errors: ["Failed to load students"] });
        }
      }
    } catch (err) {
      updateState({ errors: ["Failed to load students"] });
    } finally {
      updateState({ isLoading: false });
    }
  };

  // Switch to target semester from collision dialog
  const handleSwitchToSeniorSemester = () => {
    const targetVal = collisionDialog.targetSemValue;
    setCollisionDialog({
      isOpen: false,
      targetSemDisplay: "",
      targetSemValue: "",
      existingCount: 0
    });
    updateState({
      selectedSemester: targetVal,
      selectedSection: "",
      students: [],
      selectedStudents: []
    });
  };

  // Proceed with promotion despite collision
  const handleProceedAnyway = async () => {
    setCollisionDialog({
      isOpen: false,
      targetSemDisplay: "",
      targetSemValue: "",
      existingCount: 0
    });
    await proceedWithPromotion();
  };

  // Cancel collision dialog
  const handleCancelCollisionDialog = () => {
    setCollisionDialog({
      isOpen: false,
      targetSemDisplay: "",
      targetSemValue: "",
      existingCount: 0
    });
  };

  // Check collision and start promotion flow
  const handlePromoteSelectedStudents = async () => {
    if (!state.selectedSemester || !state.branchId) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please select a semester first.',
        background: theme === 'dark' ? '#0f172a' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000'
      });
      return;
    }

    const currentSemesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
    const currentSemesterNumber = state.semesters.find((s) => s.id === currentSemesterId)?.number || 0;
    const isGraduation = currentSemesterNumber === state.totalSemesters;
    const nextSemester = state.semesters.find((s) => s.number === currentSemesterNumber + 1);

    if (!currentSemesterId || currentSemesterNumber > state.totalSemesters) {
      Swal.fire({
        icon: 'error',
        title: 'Promotion Failed',
        text: `Cannot promote past Semester ${state.totalSemesters}. Please increase the Total Semesters limit in Branch Management first.`,
        background: theme === 'dark' ? '#0f172a' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000'
      });
      return;
    }

    // Check if target semester is already occupied by active students
    if (!isGraduation && nextSemester) {
      try {
        const checkTarget = await manageStudents({
          branch_id: state.branchId,
          semester_id: nextSemester.id,
          page_size: 1,
          force_refresh: true
        }, "GET");
        const existingCount = typeof checkTarget?.count === 'number'
          ? checkTarget.count
          : (Array.isArray(checkTarget?.results) ? checkTarget.results.length : 0);

        if (existingCount > 0) {
          const targetSemDisplay = formatSemesterOrdinal(nextSemester.number);
          const targetSemValue = `${nextSemester.number}th Semester`;
          setCollisionDialog({
            isOpen: true,
            targetSemDisplay,
            targetSemValue,
            existingCount
          });
          return;
        }
      } catch (err) {
        console.warn("Could not check target semester student count:", err);
      }
    }

    await proceedWithPromotion();
  };

  // Main promotion execution logic
  const proceedWithPromotion = async () => {
    const currentSemesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
    const currentSemesterNumber = state.semesters.find((s) => s.id === currentSemesterId)?.number || 0;
    const isGraduation = currentSemesterNumber === state.totalSemesters;
    const nextSemester = state.semesters.find((s) => s.number === currentSemesterNumber + 1);

    // Optimistic update: immediately remove promoted students from the list
    const studentsToPromote = state.selectedStudents.length > 0 && state.selectedStudents.length < state.students.length ?
      state.students.filter((student) => state.selectedStudents.includes(student.usn)) :
      state.students;

    const confirmRes = await Swal.fire({
      title: 'Are you sure?',
      html: isGraduation ?
        `You are about to graduate ${studentsToPromote.length} student(s).<br><br><b class="text-red-500">Warning:</b> Once graduated, their current semester attendance and marks will be archived, and their login access will be revoked.` :
        `You are about to promote ${studentsToPromote.length} student(s) to Semester ${currentSemesterNumber + 1}.<br><br><b class="text-red-500">Warning:</b> Once promoted, their current semester attendance and marks will be archived, and they will be shifted to the next semester.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, proceed',
      cancelButtonText: 'Cancel',
      background: theme === 'dark' ? '#0f172a' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000'
    });

    if (!confirmRes.isConfirmed) {
      return;
    }

    const keyword = isGraduation ? 'GRADUATE' : 'PROMOTE';
    const typedConfirm = await Swal.fire({
      title: 'Confirm Action',
      text: `To confirm, type "${keyword}" in the box below:`,
      input: 'text',
      inputPlaceholder: keyword,
      showCancelButton: true,
      confirmButtonText: isGraduation ? 'Confirm Graduation' : 'Confirm Promotion',
      background: theme === 'dark' ? '#0f172a' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000',
      inputValidator: (value) => {
        if (value !== keyword) {
          return `You must type "${keyword}" to confirm!`;
        }
      }
    });

    if (!typedConfirm.isConfirmed) {
      return;
    }

    updateState({
      students: state.students.filter((student) => !state.selectedStudents.includes(student.usn)),
      selectedStudents: [],
      promotionResults: {
        message: isGraduation ? `${studentsToPromote.length} students graduated successfully` : `${studentsToPromote.length} students promoted successfully`,
        promoted: studentsToPromote.map((student) => ({
          name: student.name,
          usn: student.usn,
          to_semester: isGraduation ? 'Alumni' : (nextSemester?.number || (currentSemesterNumber + 1))
        }))
      }
    });

    try {
      let res;
      if (isGraduation) {
        res = await graduateStudents({ student_ids: state.selectedStudents });
        // The API returns graduated_students instead of promoted, map it for consistency
        if (res.success) {
          res.promoted = res.data?.graduated_students || [];
          res.failed = res.data?.failed_students || [];
        }
      } else if (state.selectedStudents.length > 0 && state.selectedStudents.length < state.students.length) {
        // Promote selected students
        res = await promoteSelectedStudents({
          student_ids: state.selectedStudents,
          to_semester_id: nextSemester?.id,
          branch_id: state.branchId
        });
      } else {
        // Bulk promotion
        const sectionId = state.selectedSection ?
          state.sections.find((s) => s.name === state.selectedSection)?.id :
          undefined;

        res = await promoteStudentsToNextSemester({
          from_semester_id: currentSemesterId, // Pass as string
          to_semester_id: nextSemester?.id, // Pass as string
          branch_id: state.branchId,
          ...(sectionId && { section_id: sectionId }),
          ...(state.selectedBatchId && { batch_id: state.selectedBatchId })
        });
      }

      if (res.success) {
        // Update with actual results from backend
        const successfulPromotions = res.promoted || [];
        const failedPromotions = res.failed || [];

        updateState({
          students: state.students.filter((student) =>
            !successfulPromotions.some((p) => p.usn === student.usn)
          ),
          selectedStudents: [],
          promotionResults: null
        });

        Swal.fire({
          icon: 'success',
          title: 'Promotion Success',
          text: res.message || `${successfulPromotions.length} students promoted successfully${failedPromotions.length > 0 ? `, ${failedPromotions.length} failed` : ''}`,
          background: theme === 'dark' ? '#0f172a' : '#fff',
          color: theme === 'dark' ? '#fff' : '#000'
        });
        onSuccess?.();
      } else {
        // Revert optimistic update on failure
        updateState({
          students: [...state.students, ...studentsToPromote],
          selectedStudents: state.selectedStudents.length > 0 ? state.selectedStudents : studentsToPromote.map((s) => s.usn),
          promotionResults: null
        });

        Swal.fire({
          icon: 'error',
          title: 'Promotion Failed',
          text: res.message || "Failed to promote students",
          background: theme === 'dark' ? '#0f172a' : '#fff',
          color: theme === 'dark' ? '#fff' : '#000'
        });
      }
    } catch (err) {

      // Revert optimistic update on error
      updateState({
        students: [...state.students, ...studentsToPromote],
        selectedStudents: state.selectedStudents.length > 0 ? state.selectedStudents : studentsToPromote.map((s) => s.usn),
        promotionResults: null
      });

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: "Failed to promote students due to a network or server error",
        background: theme === 'dark' ? '#0f172a' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000'
      });
    }
  };

  // Promote all students in selected semester/section
  const promoteAllStudents = async () => {
    if (!state.selectedSemester || !state.branchId) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please select a semester first.',
        background: theme === 'dark' ? '#0f172a' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000'
      });
      return;
    }

    const currentSemesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
    const currentSemesterNumber = state.semesters.find((s) => s.id === currentSemesterId)?.number || 0;
    const nextSemester = state.semesters.find((s) => s.number === currentSemesterNumber + 1);

    if (!currentSemesterId || currentSemesterNumber > state.totalSemesters) {
      Swal.fire({
        icon: 'error',
        title: 'Promotion Failed',
        text: `Cannot promote past Semester ${state.totalSemesters}. Please increase the Total Semesters limit in Branch Management first.`,
        background: theme === 'dark' ? '#0f172a' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000'
      });
      return;
    }

    // Optimistic update: immediately clear the student list and show success
    const allStudents = [...state.students];

    const confirmRes = await Swal.fire({
      title: 'Are you sure?',
      html: `You are about to promote ALL ${allStudents.length} student(s) in this section to Semester ${nextSemester.number}.<br><br><b class="text-red-500">Warning:</b> Once promoted, their current semester attendance and marks will be archived, and they will be shifted to the next semester.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, proceed',
      cancelButtonText: 'Cancel',
      background: theme === 'dark' ? '#0f172a' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000'
    });

    if (!confirmRes.isConfirmed) {
      return;
    }

    const typedConfirm = await Swal.fire({
      title: 'Confirm Action',
      text: 'To confirm, type "PROMOTE" in the box below:',
      input: 'text',
      inputPlaceholder: 'PROMOTE',
      showCancelButton: true,
      confirmButtonText: 'Confirm Bulk Promotion',
      background: theme === 'dark' ? '#0f172a' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000',
      inputValidator: (value) => {
        if (value !== 'PROMOTE') {
          return 'You must type "PROMOTE" to confirm!';
        }
      }
    });

    if (!typedConfirm.isConfirmed) {
      return;
    }

    updateState({
      students: [],
      selectedStudents: [],
      promotionResults: {
        message: `${allStudents.length} students promoted successfully`,
        promoted: allStudents.map((student) => ({
          name: student.name,
          usn: student.usn,
          to_semester: nextSemester.number
        }))
      }
    });

    try {
      const sectionId = state.selectedSection ?
        state.sections.find((s) => s.name === state.selectedSection)?.id :
        undefined;

      const res = await promoteStudentsToNextSemester({
        from_semester_id: currentSemesterId, // Pass as string
        to_semester_id: nextSemester.id, // Pass as string
        branch_id: state.branchId,
        ...(sectionId && { section_id: sectionId }),
        ...(state.selectedBatchId && { batch_id: state.selectedBatchId })
      });

      if (res.success) {
        // Update with actual results from backend
        const successfulPromotions = res.promoted || [];
        const failedPromotions = res.failed || [];

        updateState({
          students: allStudents.filter((student) =>
            !successfulPromotions.some((p) => p.usn === student.usn)
          ),
          selectedStudents: [],
          promotionResults: null
        });

        Swal.fire({
          icon: 'success',
          title: 'Promotion Success',
          text: res.message || `${successfulPromotions.length} students promoted successfully${failedPromotions.length > 0 ? `, ${failedPromotions.length} failed` : ''}`,
          background: theme === 'dark' ? '#0f172a' : '#fff',
          color: theme === 'dark' ? '#fff' : '#000'
        });
        onSuccess?.();
      } else {
        // Revert optimistic update on failure
        updateState({
          students: allStudents,
          selectedStudents: [],
          promotionResults: null
        });

        Swal.fire({
          icon: 'error',
          title: 'Promotion Failed',
          text: res.message || "Failed to promote students",
          background: theme === 'dark' ? '#0f172a' : '#fff',
          color: theme === 'dark' ? '#fff' : '#000'
        });
      }
    } catch (err) {

      // Revert optimistic update on error
      updateState({
        students: allStudents,
        selectedStudents: [],
        promotionResults: null
      });

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: "Failed to promote students due to a network or server error",
        background: theme === 'dark' ? '#0f172a' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <CardTitle className={`flex flex-row items-center justify-between gap-2 w-full ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            <span className="flex items-center gap-2 whitespace-nowrap text-xl sm:text-lg">
              <UserCheck className="h-5 w-5 text-green-400 shrink-0" />
              Student Promotion
            </span>
            <Button
              onClick={() => onTabChange("overview")}
              variant="outline"
              size="sm"
              className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 shadow-md text-xs sm:text-sm shrink-0">
              <span className="hidden sm:inline">Back to Overview</span>
              <span className="inline sm:hidden">Back</span>
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>


      {/* Promotion Controls */}
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader>
          <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            {getInstitutionType() === 'school' ? 'Promote Students to Next Class' : 'Promote Students to Next Semester'}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1">
            {getInstitutionType() === 'school' ? 'Configure rules and select students to promote to the next class.' : 'Configure rules and select students to promote to the next semester.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
            <Select
              value={state.selectedBatchId}
              onValueChange={(value) => updateState({ selectedBatchId: value })}
              disabled={state.isLoading}>

              <SelectTrigger className={theme === 'dark' ? 'w-full bg-background text-foreground border-border' : 'w-full bg-white text-gray-900 border-gray-300'}>
                <SelectValue placeholder="Select Batch" />
              </SelectTrigger>
              <SelectContent className={cn("max-h-[200px]", theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300')}>
                {state.batches.length === 0 ? (
                  <SelectItem value="none" disabled className="text-muted-foreground">No Batches</SelectItem>
                ) : (
                  state.batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id.toString()} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                      {batch.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Select
              value={state.selectedSemester}
              onValueChange={(value) => updateState({ selectedSemester: value, selectedSection: "", isSectionOpen: false })}
              open={state.isSemesterOpen}
              onOpenChange={(open) => updateState({ isSemesterOpen: open })}
              disabled={state.isLoading || !state.selectedBatchId}>

              <SelectTrigger className={theme === 'dark' ? 'w-full bg-background text-foreground border-border' : 'w-full bg-white text-gray-900 border-gray-300'}>
                <SelectValue placeholder={!state.selectedBatchId ? "Select Batch first" : (getInstitutionType() === 'school' ? "Choose Class" : translateTerminology("Select Semester"))} />
              </SelectTrigger>
              <SelectContent className={cn("max-h-[200px]", theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300')}>
                {state.semesters.length === 0 ? (
                  <SelectItem value="none" disabled className="text-muted-foreground">{getInstitutionType() === 'school' ? "No Class" : "No Semester"}</SelectItem>
                ) : (
                  state.semesters.map((semester) => (
                    <SelectItem key={semester.id} value={`${semester.number}th Semester`} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                      {getInstitutionType() === 'school' ? `Class ${semester.number}` : `Semester ${semester.number}`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Select
              value={state.selectedSection}
              onValueChange={(value) => updateState({ selectedSection: value })}
              {...({ open: state.isSectionOpen, onOpenChange: (open: boolean) => updateState({ isSectionOpen: open }) } as any)}
              disabled={state.isLoading || !state.selectedSemester}>

              <SelectTrigger className={theme === 'dark' ? 'w-full bg-background text-foreground border-border' : 'w-full bg-white text-gray-900 border-gray-300'}>
                <SelectValue placeholder="Select Section" />
              </SelectTrigger>
              <SelectContent className={cn("max-h-[200px]", theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300')}>
                {(() => {
                  const semesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
                  const filteredSections = state.sections.filter((section) => semesterId ? section.semester_id === semesterId : false);
                  if (filteredSections.length === 0) {
                    return <SelectItem value="none" disabled className="text-muted-foreground">No Section</SelectItem>;
                  }
                  return filteredSections.map((section) => (
                    <SelectItem key={section.id} value={section.name} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                      Section {section.name}
                    </SelectItem>
                  ));
                })()}
              </SelectContent>
            </Select>


          </div>
        </CardContent>
      </Card>

      {state.isLoading && state.students.length === 0 &&
        <Card className="p-6">
          <SkeletonTable rows={10} cols={6} />
        </Card>
      }

      {/* Student List */}
      {(state.selectedSemester && state.selectedSection && state.selectedBatchId) ? (
        <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <CardHeader>
            <CardTitle className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400 shrink-0" />
                <span className="text-xl sm:text-semibold md:text-lg">
                  Students in {getInstitutionType() === 'school' ? state.selectedSemester.replace(/(\d+)(?:st|nd|rd|th)\s+Semester/gi, 'Class $1') : state.selectedSemester} - {state.selectedSection}
                </span>
              </span>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto border-t lg:border-t-0 pt-3 lg:pt-0">
                {/* Debounced Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by USN or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      "pl-8 pr-8 h-9 text-xs",
                      theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'
                    )}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all-students"
                      checked={state.selectedStudents.length === state.students.length && state.students.length > 0}
                      onCheckedChange={handleSelectAll}
                      className={theme === 'dark' ? 'border-border' : 'border-gray-300'} />

                    <label htmlFor="select-all-students" className={`text-sm cursor-pointer whitespace-nowrap ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Select All
                    </label>
                  </div>
                  <Button
                    onClick={handlePromoteSelectedStudents}
                    disabled={state.selectedStudents.length === 0 || state.isPromoting}
                    className={`flex-1 sm:flex-none ${state.selectedSemester === `${state.totalSemesters}th Semester` ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'} text-white h-9 px-4`}
                  >
                    {state.isPromoting ?
                      <Loader2 className="h-4 w-4 animate-spin" /> :
                      <span className="whitespace-nowrap">{state.selectedSemester === `${state.totalSemesters}th Semester` ? 'Graduate' : 'Promote'} ({state.selectedStudents.length})</span>
                    }
                  </Button>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.isLoading ? (
              <div className="py-4">
                <SkeletonTable rows={8} cols={6} />
              </div>
            ) : state.students.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className={theme === 'dark' ? 'border-border' : 'border-gray-200'}>
                      <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Select</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>USN</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Name</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Batch</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Section</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                        {getInstitutionType() === 'school' ? 'Class' : 'Sem'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.students.map((student, index) =>
                      <TableRow key={`${student.usn}-${index}`} className={theme === 'dark' ? 'border-border' : 'border-gray-200'}>
                        <TableCell>
                          <Checkbox
                            checked={state.selectedStudents.includes(student.usn)}
                            onCheckedChange={(checked) => handleStudentSelect(student.usn, checked as boolean)}
                            className={theme === 'dark' ? 'border-border' : 'border-gray-300'} />

                        </TableCell>
                        <TableCell className={`whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.usn}</TableCell>
                        <TableCell className={`whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.name}</TableCell>
                        <TableCell className={`whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          {student.batch ? (
                            getInstitutionType() === 'school'
                              ? student.batch.replace(/_Sem(\d+)/gi, ' (Class $1)').replace(/_/g, ' ')
                              : student.batch.replace(/_Sem(\d+)/gi, ' (Sem $1)').replace(/_/g, ' ')
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell className={`whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.section || 'N/A'}</TableCell>
                        <TableCell className={`whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          {getInstitutionType() === 'school' ? student.semester.replace(/(\d+)(?:st|nd|rd|th)\s+Semester/gi, 'Class $1') : student.semester}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination Controls */}
                {state.totalPages > 1 &&
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-6">
                    <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                      Showing {Math.min((state.currentPage - 1) * 50 + 1, state.totalStudents)} to {Math.min(state.currentPage * 50, state.totalStudents)} of {state.totalStudents}
                    </div>
                    <div className="flex gap-2 items-center justify-center sm:justify-end">
                      <Button
                        onClick={() => handlePageChange(state.currentPage - 1)}
                        disabled={!state.hasPrevious || state.isLoading}
                        variant="outline"
                        className="text-base font-medium px-4 py-2 text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white shadow-sm transition-all duration-200">

                        Prev
                      </Button>
                      <span className="px-3 text-base font-medium text-primary">
                        {state.currentPage}
                      </span>
                      <Button
                        onClick={() => handlePageChange(state.currentPage + 1)}
                        disabled={!state.hasNext || state.isLoading}
                        variant="outline"
                        className="text-base font-medium px-4 py-2 text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white shadow-sm transition-all duration-200">

                        Next
                      </Button>
                    </div>
                  </div>
                }
              </div>
            ) : (
              <div className="text-center py-10 space-y-2">
                <Users className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
                <h4 className={`text-base font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {debouncedSearch ? `No students found matching "${debouncedSearch}"` : "No students in this section"}
                </h4>
                {debouncedSearch && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="mt-2 text-xs"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        !state.isLoading && (
          <Card className={`border-2 border-dashed flex flex-col items-center justify-center p-12 text-center space-y-4 ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
            <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-accent/10' : 'bg-primary/10'}`}>
              <Users className={`w-10 h-10 ${theme === 'dark' ? 'text-primary/70' : 'text-primary/70'}`} />
            </div>
            <div className="max-w-xs mx-auto">
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                No Students to Display
              </h3>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                Please select a batch, semester and section to view students eligible for promotion.
              </p>
            </div>
          </Card>
        )
      )}

      {/* Senior Batch Collision Warning Modal */}
      <Dialog open={collisionDialog.isOpen} onOpenChange={(open) => !open && handleCancelCollisionDialog()}>
        <DialogContent className={cn(
          "w-[calc(100vw-2rem)] max-w-lg p-5 sm:p-6 rounded-2xl shadow-2xl border overflow-hidden",
          theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
        )}>
          {/* Header Icon + Title */}
          <div className="flex flex-col items-center text-center space-y-2.5 pt-1">
            <div className="h-13 w-13 p-3 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
              <AlertTriangle className="h-6 w-6 sm:h-7 sm:w-7 text-amber-500" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                Senior Batch in Target Semester
              </DialogTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Academic sequence recommendation notice
              </p>
            </div>
          </div>

          {/* Occupancy Banner */}
          <div className={cn(
            "flex flex-wrap items-center justify-between gap-2 p-3 sm:p-3.5 rounded-xl border w-full min-w-0 box-border mt-3",
            theme === 'dark' ? 'bg-slate-800/60 border-slate-700/60' : 'bg-amber-50/60 border-amber-200/70'
          )}>
            <span className="text-xs sm:text-sm font-medium text-foreground">
              Target: <span className="font-semibold text-primary">{collisionDialog.targetSemDisplay}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0">
              <Users className="h-3.5 w-3.5" />
              {collisionDialog.existingCount} Active Student{collisionDialog.existingCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Best Practice Explanatory Box */}
          <div className={cn(
            "p-3.5 sm:p-4 rounded-xl border-l-4 border-l-amber-500 text-xs sm:text-sm leading-relaxed space-y-1.5 mt-3 w-full min-w-0 box-border",
            theme === 'dark' ? 'bg-amber-500/10 border-amber-500/30 text-slate-300' : 'bg-amber-50/80 border-amber-300 text-amber-950'
          )}>
            <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-400">
              <Lightbulb className="h-4 w-4 shrink-0" />
              <span>Best Practice (Seniors First):</span>
            </div>
            <p className="break-words">
              Promoting junior students now will merge them into <strong className="font-semibold">{collisionDialog.targetSemDisplay}</strong> alongside the existing senior batch. In standard academic workflows, senior students are usually promoted or graduated before juniors move up.
            </p>
          </div>

          <p className="text-xs sm:text-sm text-center text-muted-foreground mt-3 px-1 break-words">
            Would you like to switch to <strong className="font-semibold text-foreground">{collisionDialog.targetSemDisplay}</strong> to promote senior students first?
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5 pt-3.5 border-t border-border mt-3.5 w-full">
            <Button
              type="button"
              onClick={handleSwitchToSeniorSemester}
              className="w-full text-xs sm:text-sm font-semibold h-10 sm:h-11 bg-primary hover:bg-primary/90 text-white shadow-sm flex items-center justify-center gap-2"
            >
              <span>Switch to {collisionDialog.targetSemDisplay} First (Recommended)</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Button>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 w-full">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancelCollisionDialog}
                className="w-full sm:w-auto text-xs sm:text-sm font-medium h-9 text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleProceedAnyway}
                className={cn(
                  "w-full sm:w-auto text-xs sm:text-sm font-medium h-9 border transition-colors",
                  theme === 'dark'
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-700/50 dark:text-amber-300'
                )}
              >
                Proceed with Promotion Anyway
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

};

const DemotionPage = ({ theme, onTabChange, onSuccess }: { theme: string; onTabChange: (tab: "overview" | "promote" | "demote") => void; onSuccess?: () => void; }) => {
  const [state, setState] = useState({
    batches: [] as any[],
    selectedBatchId: "",
    semesters: [] as Semester[],
    sections: [] as Section[],
    students: [] as Student[],
    selectedStudents: [] as string[],
    selectedSemester: "",
    selectedSection: "",
    branchId: "",
    totalSemesters: 8,
    isLoading: false,
    isDemoting: false,
    showBulkDemoteDialog: false,
    bulkDemoteReason: "",
    demotionResults: null as any,
    errors: [] as string[],
    // Pagination state
    currentPage: 1,
    totalPages: 1,
    totalStudents: 0,
    hasNext: false,
    hasPrevious: false,
    isSectionOpen: false,
    isSemesterOpen: false
  });

  // Debounced search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Helper to update state
  const updateState = (newState: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      updateState({ isLoading: true });
      try {
        const [bootstrapResponse, batchRes] = await Promise.all([
          getPromotionBootstrap(),
          getBatches()
        ]);

        let initialBatches = [] as any[];
        if (batchRes.success && batchRes.data) {
          initialBatches = batchRes.data;
        }

        if (bootstrapResponse.success && bootstrapResponse.data) {
          const { profile, semesters, sections } = bootstrapResponse.data;

          if (profile?.branch_id) {
            updateState({
              branchId: profile.branch_id,
              totalSemesters: profile.total_semesters || 8,
              semesters: semesters || [],
              sections: sections || [],
              batches: initialBatches
            });
          }
        } else {
          updateState({ errors: [bootstrapResponse.message || "Failed to fetch demotion data"], batches: initialBatches });
        }
      } catch (err) {
        updateState({ errors: ["Failed to load initial data"] });
      } finally {
        updateState({ isLoading: false });
      }
    };

    fetchInitialData();
  }, []);

  // When batch changes: reset semester/section, search, clear list, auto-open semester dropdown
  useEffect(() => {
    if (!state.selectedBatchId) return;
    setSearchQuery("");
    setDebouncedSearch("");
    updateState({
      selectedSemester: "",
      selectedSection: "",
      students: [],
      selectedStudents: [],
      isSemesterOpen: true
    });
  }, [state.selectedBatchId]);

  // When semester or section changes: clear search query
  useEffect(() => {
    setSearchQuery("");
    setDebouncedSearch("");
  }, [state.selectedSemester, state.selectedSection]);

  // Fetch sections when semester changes
  useEffect(() => {
    const fetchSections = async () => {
      if (!state.selectedSemester || !state.branchId) return;

      try {
        const semesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
        if (semesterId) {
          const sectionRes = await manageSections({ branch_id: state.branchId, semester_id: semesterId }, "GET");
          if (sectionRes.success && sectionRes.data?.length > 0) {
            updateState({
              sections: sectionRes.data.map((s: any) => ({
                id: s.id,
                name: s.name,
                semester_id: s.semester_id.toString()
              })),
              selectedSection: "",
              isSectionOpen: true
            });
          } else {
            updateState({ sections: [], selectedSection: "", isSectionOpen: true });
          }
        }
      } catch (err) {
        updateState({ errors: ["Failed to load sections"] });
      }
    };

    fetchSections();
  }, [state.selectedSemester, state.branchId, state.semesters]);

  // Fetch students when semester, section, batch, or debounced search change
  useEffect(() => {
    const fetchStudents = async () => {
      if (!state.selectedSemester || !state.branchId || !state.selectedSection || !state.selectedBatchId) {
        updateState({ students: [], selectedStudents: [] });
        return;
      }

      try {
        updateState({ isLoading: true });
        const semesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
        const sectionId = state.sections.find((s) => s.name === state.selectedSection)?.id;

        if (semesterId && sectionId) {
          const studentRes = await manageStudents({
            branch_id: state.branchId,
            semester_id: semesterId,
            section_id: sectionId,
            batch_id: state.selectedBatchId,
            search: debouncedSearch || undefined,
            page_size: 50 // Use AdminPagination default page size
          }, "GET");

          if (studentRes.results && Array.isArray(studentRes.results)) {
            const totalPages = Math.ceil((studentRes.count || 0) / 50);
            updateState({
              students: studentRes.results,
              selectedStudents: [],
              currentPage: 1,
              totalPages: totalPages,
              totalStudents: studentRes.count || 0,
              hasNext: !!studentRes.next,
              hasPrevious: !!studentRes.previous
            });
          } else {
            updateState({ errors: ["Failed to load students"] });
          }
          // 1) { success: true, results: [...], count }
          // 2) { success: true, data: { students: [...] } }
          // 3) plain array
          let results: any[] = [];
          if (studentRes == null) {
            results = [];
          } else if (studentRes.results && Array.isArray(studentRes.results)) {
            results = studentRes.results;
          } else if (studentRes.data && Array.isArray((studentRes.data as any).students)) {
            results = (studentRes.data as any).students;
          } else if (Array.isArray(studentRes)) {
            results = studentRes as any[];
          } else if (studentRes.success === false) {
            // Backend returned an error
            updateState({ errors: [studentRes.message || "Failed to load students"] });
            results = [];
          } else {
            // Unknown shape but try to extract 'data' array
            if (studentRes.data && Array.isArray(studentRes.data)) {
              results = studentRes.data;
            } else {
              results = [];
            }
          }

          updateState({
            students: results,
            selectedStudents: []
          });
        }
      } catch (err) {
        updateState({ errors: ["Failed to load students"] });
      } finally {
        updateState({ isLoading: false });
      }
    };

    fetchStudents();
  }, [state.selectedSemester, state.selectedSection, state.selectedBatchId, state.branchId, state.semesters, state.sections, debouncedSearch]);

  // Handle individual student selection
  const handleStudentSelect = (usn: string, checked: boolean) => {
    if (checked) {
      updateState({ selectedStudents: [...state.selectedStudents, usn] });
    } else {
      updateState({ selectedStudents: state.selectedStudents.filter((id) => id !== usn) });
    }
  };

  // Handle select all students
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      updateState({ selectedStudents: state.students.map((student) => student.usn) });
    } else {
      updateState({ selectedStudents: [] });
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= state.totalPages) {
      fetchStudentsPage(newPage);
    }
  };

  // Function to fetch students for a specific page
  const fetchStudentsPage = async (page: number = 1) => {
    try {
      updateState({ isLoading: true });
      const semesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
      const sectionId = state.sections.find((s) => s.name === state.selectedSection)?.id;

      if (semesterId && sectionId) {
        const studentRes = await manageStudents({
          branch_id: state.branchId,
          semester_id: semesterId,
          section_id: sectionId,
          batch_id: state.selectedBatchId,
          search: debouncedSearch || undefined,
          page: page,
          page_size: 50 // Use AdminPagination default page size
        }, "GET");

        if (studentRes.results && Array.isArray(studentRes.results)) {
          const totalPages = Math.ceil((studentRes.count || 0) / 50);
          updateState({
            students: studentRes.results,
            selectedStudents: [],
            currentPage: page,
            totalPages: totalPages,
            totalStudents: studentRes.count || 0,
            hasNext: !!studentRes.next,
            hasPrevious: !!studentRes.previous
          });
        } else {
          updateState({ errors: ["Failed to load students"] });
        }
      }
    } catch (err) {
      updateState({ errors: ["Failed to load students"] });
    } finally {
      updateState({ isLoading: false });
    }
  };

  // Bulk demote students
  const bulkDemoteAllStudents = async () => {
    if (!state.selectedSemester || !state.branchId || !state.bulkDemoteReason.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please select a semester and provide a reason for demotion first.',
        background: theme === 'dark' ? '#0f172a' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000'
      });
      return;
    }

    const currentSemesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
    const prevSemester = state.semesters.find((s) => s.number === (state.semesters.find((s) => s.id === currentSemesterId)?.number || 0) - 1);

    if (!currentSemesterId || !prevSemester) {
      Swal.fire({
        icon: 'error',
        title: 'Demotion Failed',
        text: getInstitutionType() === 'school' ? 'No previous class available to demote to.' : 'No previous semester available to demote to.',
        background: theme === 'dark' ? '#0f172a' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000'
      });
      return;
    }

    // Optimistic update: immediately remove demoted students from the list
    const studentsToDemote = state.selectedStudents.length > 0 ? state.students.filter((student) => state.selectedStudents.includes(student.usn)) : state.students;

    const confirmRes = await Swal.fire({
      title: 'Are you sure?',
      html: getInstitutionType() === 'school'
        ? `You are about to demote ${studentsToDemote.length} student(s) to Class ${prevSemester.number}.<br><br><b class="text-red-500">Warning:</b> Once demoted, they will be returned to the previous class and their current class data will be adjusted.`
        : `You are about to demote ${studentsToDemote.length} student(s) to Semester ${prevSemester.number}.<br><br><b class="text-red-500">Warning:</b> Once demoted, they will be returned to the previous semester and their current semester data will be adjusted.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, proceed',
      cancelButtonText: 'Cancel',
      background: theme === 'dark' ? '#0f172a' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000'
    });

    if (!confirmRes.isConfirmed) {
      return;
    }

    const typedConfirm = await Swal.fire({
      title: 'Confirm Action',
      text: 'To confirm, type "DEMOTE" in the box below:',
      input: 'text',
      inputPlaceholder: 'DEMOTE',
      showCancelButton: true,
      confirmButtonText: 'Confirm Demotion',
      background: theme === 'dark' ? '#0f172a' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000',
      inputValidator: (value) => {
        if (value !== 'DEMOTE') {
          return 'You must type "DEMOTE" to confirm!';
        }
      }
    });

    if (!typedConfirm.isConfirmed) {
      return;
    }

    updateState({
      students: state.students.filter((student) => !state.selectedStudents.includes(student.usn)),
      selectedStudents: [],
      showBulkDemoteDialog: false,
      bulkDemoteReason: "",
      isDemoting: true
    });

    try {
      const sectionId = state.selectedSection ?
        state.sections.find((s) => s.name === state.selectedSection)?.id :
        undefined;

      const res = await bulkDemoteStudents({
        student_ids: state.selectedStudents.length > 0 ? state.selectedStudents : studentsToDemote.map((s) => s.usn),
        to_semester_id: prevSemester.id, // Pass as string
        branch_id: state.branchId,
        reason: state.bulkDemoteReason,
        ...(sectionId && { section_id: sectionId })
      });

      if (res.success) {
        // Update with actual API response data
        const apiData = res.data || {};
        const demotedCount = apiData.demoted_count || 0;

        // Only keep students removed if some were actually demoted
        if (demotedCount === 0) {
          // Revert the optimistic removal since no students were demoted
          updateState({
            students: [...state.students, ...studentsToDemote],
            selectedStudents: state.selectedStudents.length > 0 ? state.selectedStudents : studentsToDemote.map((s) => s.usn)
          });
        }

        updateState({
          demotionResults: null
        });

        Swal.fire({
          icon: 'success',
          title: 'Demotion Success',
          text: res.message || `${demotedCount} students demoted successfully`,
          background: theme === 'dark' ? '#0f172a' : '#fff',
          color: theme === 'dark' ? '#fff' : '#000'
        });
        onSuccess?.();
      } else {
        // Revert optimistic update on failure
        updateState({
          students: [...state.students, ...studentsToDemote],
          selectedStudents: state.selectedStudents.length > 0 ? state.selectedStudents : studentsToDemote.map((s) => s.usn),
          showBulkDemoteDialog: true,
          bulkDemoteReason: state.bulkDemoteReason,
          demotionResults: null
        });

        Swal.fire({
          icon: 'error',
          title: 'Demotion Failed',
          text: res.message || "Failed to demote students",
          background: theme === 'dark' ? '#0f172a' : '#fff',
          color: theme === 'dark' ? '#fff' : '#000'
        });
      }
    } catch (err) {

      // Revert optimistic update on error
      updateState({
        students: [...state.students, ...studentsToDemote],
        selectedStudents: state.selectedStudents.length > 0 ? state.selectedStudents : studentsToDemote.map((s) => s.usn),
        showBulkDemoteDialog: true,
        bulkDemoteReason: state.bulkDemoteReason,
        demotionResults: null
      });

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: "Failed to demote students due to a network or server error",
        background: theme === 'dark' ? '#0f172a' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000'
      });
    } finally {
      updateState({ isDemoting: false });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <CardTitle className={`flex flex-row items-center justify-between gap-2 w-full ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            <span className="flex items-center gap-2 whitespace-nowrap text-xl sm:text-lg">
              <UserX className="h-5 w-5 text-red-400 shrink-0" />
              Student Demotion
            </span>
            <Button
              onClick={() => onTabChange("overview")}
              variant="outline"
              size="sm"
              className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 shadow-md text-xs sm:text-sm shrink-0">
              <span className="hidden sm:inline">Back to Overview</span>
              <span className="inline sm:hidden">Back</span>
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>


      {/* Demotion Controls */}
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader>
          <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            {getInstitutionType() === 'school' ? 'Demote Students to Previous Class' : 'Demote Students to Previous Semester'}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1">
            {getInstitutionType() === 'school' ? 'Select students to demote to the previous class.' : 'Select students to demote to the previous semester.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              <Select
                value={state.selectedBatchId}
                onValueChange={(value) => updateState({ selectedBatchId: value })}
                disabled={state.isLoading}>

                <SelectTrigger className={theme === 'dark' ? 'w-full bg-background text-foreground border-border' : 'w-full bg-white text-gray-900 border-gray-300'}>
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent className={cn("max-h-[200px]", theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300')}>
                  {state.batches.length === 0 ? (
                    <SelectItem value="none" disabled className="text-muted-foreground">No Batches</SelectItem>
                  ) : (
                    state.batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id.toString()} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                        {batch.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select
                value={state.selectedSemester}
                onValueChange={(value) => updateState({ selectedSemester: value, selectedSection: "", isSectionOpen: false })}
                open={state.isSemesterOpen}
                onOpenChange={(open) => updateState({ isSemesterOpen: open })}
                disabled={state.isLoading || !state.selectedBatchId}>

                <SelectTrigger className={theme === 'dark' ? 'w-full bg-background text-foreground border-border' : 'w-full bg-white text-gray-900 border-gray-300'}>
                  <SelectValue placeholder={!state.selectedBatchId ? "Select Batch first" : (getInstitutionType() === 'school' ? "Choose Class" : translateTerminology("Select Semester"))} />
                </SelectTrigger>
                <SelectContent className={cn("max-h-[200px]", theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300')}>
                  {state.semesters.length === 0 ? (
                    <SelectItem value="none" disabled className="text-muted-foreground">{getInstitutionType() === 'school' ? "No Class" : "No Semester"}</SelectItem>
                  ) : (
                    state.semesters
                      .filter((semester) => semester.number !== 1)
                      .map((semester) => (
                        <SelectItem key={semester.id} value={`${semester.number}th Semester`} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                          {getInstitutionType() === 'school' ? `Class ${semester.number}` : `Semester ${semester.number}`}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>

              <Select
                value={state.selectedSection}
                onValueChange={(value) => updateState({ selectedSection: value })}
                {...({ open: state.isSectionOpen, onOpenChange: (open: boolean) => updateState({ isSectionOpen: open }) } as any)}
                disabled={state.isLoading || !state.selectedSemester}>

                <SelectTrigger className={theme === 'dark' ? 'w-full bg-background text-foreground border-border' : 'w-full bg-white text-gray-900 border-gray-300'}>
                  <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent className={cn("max-h-[200px]", theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300')}>
                  {(() => {
                    const semesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
                    const filteredSections = state.sections.filter((section) => semesterId ? section.semester_id === semesterId : false);
                    if (filteredSections.length === 0) {
                      return <SelectItem value="none" disabled className="text-muted-foreground">No Section</SelectItem>;
                    }
                    return filteredSections.map((section) => (
                      <SelectItem key={section.id} value={section.name} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                        Section {section.name}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student List */}
      {(state.selectedSemester && state.selectedSection && state.selectedBatchId) ? (
        <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <CardHeader>
            <CardTitle className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5 text-red-400 shrink-0" />
                <span className="text-xl sm:text-semibold md:text-lg">
                  Students in {getInstitutionType() === 'school' ? state.selectedSemester.replace(/(\d+)(?:st|nd|rd|th)\s+Semester/gi, 'Class $1') : state.selectedSemester} - {state.selectedSection}
                </span>
              </span>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto border-t lg:border-t-0 pt-3 lg:pt-0">
                {/* Debounced Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by USN or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      "pl-8 pr-8 h-9 text-xs",
                      theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'
                    )}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all-demote-students"
                      checked={state.selectedStudents.length === state.students.length && state.students.length > 0}
                      onCheckedChange={handleSelectAll}
                      className={theme === 'dark' ? 'border-border' : 'border-gray-300'} />

                    <label htmlFor="select-all-demote-students" className={`text-sm cursor-pointer whitespace-nowrap ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Select All
                    </label>
                  </div>
                  <Button
                    onClick={() => updateState({ showBulkDemoteDialog: true })}
                    disabled={state.selectedStudents.length === 0 || state.isDemoting}
                    variant="destructive"
                    size="sm"
                    className="flex-1 sm:flex-none h-9 px-4">
                    {state.isDemoting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserX className="h-4 w-4 mr-2" />
                        <span className="whitespace-nowrap">Demote ({state.selectedStudents.length})</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.isLoading ? (
              <div className="py-4">
                <SkeletonTable rows={8} cols={6} />
              </div>
            ) : state.students.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className={theme === 'dark' ? 'border-border' : 'border-gray-200'}>
                      <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Select</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>USN</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Name</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Batch</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Section</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                        {getInstitutionType() === 'school' ? 'Class' : 'Sem'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.students.map((student, index) =>
                      <TableRow key={`${student.usn}-${index}`} className={theme === 'dark' ? 'border-border' : 'border-gray-200'}>
                        <TableCell>
                          <Checkbox
                            checked={state.selectedStudents.includes(student.usn)}
                            onCheckedChange={(checked) => handleStudentSelect(student.usn, checked as boolean)}
                            className={theme === 'dark' ? 'border-border' : 'border-gray-300'} />

                        </TableCell>
                        <TableCell className={`whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.usn}</TableCell>
                        <TableCell className={`whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.name}</TableCell>
                        <TableCell className={`whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          {student.batch ? (
                            getInstitutionType() === 'school'
                              ? student.batch.replace(/_Sem(\d+)/gi, ' (Class $1)').replace(/_/g, ' ')
                              : student.batch.replace(/_Sem(\d+)/gi, ' (Sem $1)').replace(/_/g, ' ')
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell className={`whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.section || 'N/A'}</TableCell>
                        <TableCell className={`whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          {getInstitutionType() === 'school' ? student.semester.replace(/(\d+)(?:st|nd|rd|th)\s+Semester/gi, 'Class $1') : student.semester}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination Controls */}
                {state.totalPages > 1 &&
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-6">
                    <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                      Showing {Math.min((state.currentPage - 1) * 50 + 1, state.totalStudents)} to {Math.min(state.currentPage * 50, state.totalStudents)} of {state.totalStudents}
                    </div>
                    <div className="flex gap-2 items-center justify-center sm:justify-end">
                      <Button
                        onClick={() => handlePageChange(state.currentPage - 1)}
                        disabled={!state.hasPrevious || state.isLoading}
                        variant="outline"
                        className="text-base font-medium px-4 py-2 text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white shadow-sm transition-all duration-200">

                        Prev
                      </Button>
                      <span className="px-3 text-base font-medium text-primary">
                        {state.currentPage}
                      </span>
                      <Button
                        onClick={() => handlePageChange(state.currentPage + 1)}
                        disabled={!state.hasNext || state.isLoading}
                        variant="outline"
                        className="text-base font-medium px-4 py-2 text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white shadow-sm transition-all duration-200">

                        Next
                      </Button>
                    </div>
                  </div>
                }
              </div>
            ) : debouncedSearch ? (
              <div className="py-12 text-center space-y-3">
                <Search className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
                <p className={`text-base font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  No students found matching "{debouncedSearch}"
                </p>
                <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Try adjusting your search query or clear the filter.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="mt-2"
                >
                  Clear Search
                </Button>
              </div>
            ) : (
              <div className="py-12 text-center">
                <Users className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
                <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  No students found in this {getInstitutionType() === 'school' ? 'class' : 'semester'} and section.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        !state.isLoading && (
          <Card className={`border-2 border-dashed flex flex-col items-center justify-center p-12 text-center space-y-4 ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
            <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-accent/10' : 'bg-primary/10'}`}>
              <Users className={`w-10 h-10 ${theme === 'dark' ? 'text-primary/70' : 'text-primary/70'}`} />
            </div>
            <div className="max-w-xs mx-auto">
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                No Students to Display
              </h3>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                Please select a semester, section, and batch to view students eligible for demotion.
              </p>
            </div>
          </Card>
        )
      )}

      {/* Bulk Demote Dialog */}
      <Dialog open={state.showBulkDemoteDialog} onOpenChange={(open) => updateState({ showBulkDemoteDialog: open, bulkDemoteReason: "" })}>
        <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
              {state.selectedStudents.length > 0 ? `Demote Selected Students (${state.selectedStudents.length})` : 'Bulk Demote Students'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className={`text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              <p>
                <strong>{getInstitutionType() === 'school' ? 'Class' : translateTerminology("Semester")}:</strong> {getInstitutionType() === 'school' ? state.selectedSemester.replace(/(\d+)(?:st|nd|rd|th)\s+Semester/gi, 'Class $1') : state.selectedSemester}
              </p>
              <p><strong>Section:</strong> {state.selectedSection || "All Sections"}</p>
              <p className={`mt-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                ⚠️ This will demote {state.selectedStudents.length > 0 ? `the ${state.selectedStudents.length} selected students` : 'ALL students'} in the selected {getInstitutionType() === 'school' ? 'class' : 'semester'}/section to the previous {getInstitutionType() === 'school' ? 'class' : 'semester'}.
              </p>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Reason for Demotion *
              </label>
              <Select value={state.bulkDemoteReason} onValueChange={(value) => updateState({ bulkDemoteReason: value })}>
                <SelectTrigger className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                  <SelectValue placeholder="Select reason for demotion" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="exam_failure">Exam Failure</SelectItem>
                  <SelectItem value="attendance_shortage">Attendance Shortage</SelectItem>
                  <SelectItem value="academic_misconduct">Academic Misconduct</SelectItem>
                  <SelectItem value="manual_demotion">Manual Demotion</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => updateState({ showBulkDemoteDialog: false, bulkDemoteReason: "" })}
              variant="outline"
              className={theme === 'dark' ? 'border-border text-foreground hover:bg-accent' : 'border-gray-300 text-gray-900 hover:bg-gray-100'}>

              Cancel
            </Button>
            <Button
              onClick={bulkDemoteAllStudents}
              disabled={state.isDemoting || !state.bulkDemoteReason.trim()}
              variant="destructive">

              {state.isDemoting ? "Demoting..." : state.selectedStudents.length > 0 ? `Demote Selected (${state.selectedStudents.length})` : "Demote All Students"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

};

export default PromotionManagement;