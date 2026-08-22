import React, { useState, useEffect, useRef, useMemo } from 'react';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  User as UserIcon, 
  AlertCircle, 
  Clock, 
  Plus, 
  FileText, 
  Upload, 
  CheckCircle, 
  ExternalLink,
  Kanban,
  ListFilter,
  Search,
  SlidersHorizontal,
  Eye,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../ui/skeleton';
import LeadDetailsView from './LeadDetailsView';
import { useAuth } from "../../context/AuthContext";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import Swal from 'sweetalert2';
import { getR2PresignedUrl, uploadFileToR2 } from '../../utils/common_api';
import { cn } from '@/lib/utils';

export interface PipelineStage {
  id: string;
  label: string;
  badgeClass?: string;
  dotColor?: string;
}

const STAGES: PipelineStage[] = [
  { id: 'new', label: 'New Enquiry', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800', dotColor: 'bg-blue-500' },
  { id: 'contacted', label: 'Contacted', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800', dotColor: 'bg-purple-500' },
  { id: 'interested', label: 'Interested', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800', dotColor: 'bg-amber-500' },
  { id: 'application_started', label: 'Application Started', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800', dotColor: 'bg-indigo-500' },
  { id: 'documents_pending', label: 'Docs Pending', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800', dotColor: 'bg-orange-500' },
  { id: 'documents_verified', label: 'Docs Verified', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800', dotColor: 'bg-teal-500' },
  { id: 'admission_confirmed', label: 'Confirmed', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800', dotColor: 'bg-emerald-500' },
  { id: 'rejected', label: 'Rejected', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800', dotColor: 'bg-rose-500' }
];

const isValidTransition = (currentStatus: string, newStatus: string): { valid: boolean; reason?: string } => {
  if (currentStatus === newStatus) {
    return { valid: true };
  }

  // 1. Admission Confirmed is final in the pipeline (enrollment happens via Applications page)
  if (currentStatus === 'admission_confirmed') {
    return { valid: false, reason: 'Confirmed admissions can only be enrolled via the Applications tab.' };
  }

  // 2. Fee Pending can transition to admission_confirmed or documents_verified
  if (currentStatus === 'fee_pending') {
    if (['admission_confirmed', 'documents_verified'].includes(newStatus)) return { valid: true };
    return { valid: false, reason: 'Leads with pending fees can only transition to Confirmed or Docs Verified.' };
  }

  // 4. Enquiry-based stages can only go to other enquiry stages, application_started, or rejected
  const enquiryStages = ['new', 'contacted', 'interested'];
  if (enquiryStages.includes(currentStatus)) {
    const allowed = [...enquiryStages, 'application_started', 'rejected'];
    if (allowed.includes(newStatus)) return { valid: true };
    return { valid: false, reason: 'Enquiry leads must start an application before moving to verification/admission stages.' };
  }

  // 5. Active application stages cannot go back to enquiry stages
  const activeAppStages = ['application_started', 'documents_pending', 'documents_verified'];
  if (activeAppStages.includes(currentStatus)) {
    if (enquiryStages.includes(newStatus)) {
      return { valid: false, reason: 'Cannot move active applications back to the enquiry stage.' };
    }
  }

  return { valid: true };
};

const LeadPipeline: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { role } = useAuth();

  // View Mode: 'pipeline' (Sliding Kanban) or 'filtered_list' (Rows by Filter)
  const [viewMode, setViewMode] = useState<'pipeline' | 'filtered_list'>('pipeline');
  
  // Filtering View Controls
  const [activeFilterStage, setActiveFilterStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [listPage, setListPage] = useState<number>(1);
  const PAGE_SIZE = 15;
  
  const scrollRef = useRef<{ id: number | null }>({ id: null });
  const startScrolling = (container: HTMLDivElement, direction: 'left' | 'right') => {
    if (scrollRef.current.id) return;
    const scrollSpeed = 8;
    const step = () => {
      if (direction === 'left') {
        container.scrollLeft -= scrollSpeed;
      } else {
        container.scrollLeft += scrollSpeed;
      }
      scrollRef.current.id = requestAnimationFrame(step);
    };
    scrollRef.current.id = requestAnimationFrame(step);
  };
  const stopScrolling = () => {
    if (scrollRef.current.id) {
      cancelAnimationFrame(scrollRef.current.id);
      scrollRef.current.id = null;
    }
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', email: '', phone: '', city: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docModalLead, setDocModalLead] = useState<any>(null);
  const [docModalApp, setDocModalApp] = useState<any>(null);
  const [fetchingApp, setFetchingApp] = useState(false);
  const [uploadingDocKey, setUploadingDocKey] = useState<string | null>(null);

  const openDocumentVerificationModal = async (lead: any) => {
    setDocModalLead(lead);
    setFetchingApp(true);
    setDocModalOpen(true);
    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/?search=${encodeURIComponent(lead.email || lead.name)}`);
      if (res.ok) {
        const data = await res.json();
        const list = data?.results || (Array.isArray(data) ? data : []);
        const found = list.find((a: any) => a.enquiry?.id === lead.id || a.enquiry_details?.email === lead.email) || list[0] || null;
        setDocModalApp(found);
      } else {
        setDocModalApp(null);
      }
    } catch (err) {
      console.error(err);
      setDocModalApp(null);
    } finally {
      setFetchingApp(false);
    }
  };

  const handleDocumentUploadInPipeline = async (docKey: string, file: File) => {
    if (!docModalApp?.id) {
      toast.error("No active application form found for this applicant.");
      return;
    }

    const isPhotoOrSign = docKey === 'photo' || docKey === 'signature';
    const maxSizeBytes = isPhotoOrSign ? 2 * 1024 * 1024 : 5 * 1024 * 1024; // 2MB for photo/sign, 5MB for certificates
    const maxSizeStr = isPhotoOrSign ? "2MB" : "5MB";

    if (file.size > maxSizeBytes) {
      toast.error(`File "${file.name}" exceeds the maximum allowed size of ${maxSizeStr}. Please select a smaller file.`);
      return;
    }

    try {
      setUploadingDocKey(docKey);
      const res = await getR2PresignedUrl(file.name, file.type, 'admission_documents');
      let finalFileUrl = "";
      if (res.success && res.data?.url) {
        const uploaded = await uploadFileToR2(file, res.data.url, file.type);
        if (!uploaded) {
          toast.error(`Failed to upload ${file.name}`);
          setUploadingDocKey(null);
          return;
        }
        finalFileUrl = res.data.file_url;
      } else {
        toast.error(res.message || "Failed to generate upload URL");
        setUploadingDocKey(null);
        return;
      }

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/${docModalApp.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [docKey]: finalFileUrl })
      });

      if (response.ok) {
        toast.success("Document uploaded successfully!");
        setDocModalApp((prev: any) => prev ? ({ ...prev, [docKey]: finalFileUrl }) : null);
      } else {
        toast.error("Failed to update application document.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error uploading document.");
    } finally {
      setUploadingDocKey(null);
    }
  };

  const completeDocumentVerification = async () => {
    if (!docModalLead) return;
    try {
      await moveLead(docModalLead.id, 'documents_verified');
      if (docModalApp?.id) {
        await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/${docModalApp.id}/update_status/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'documents_verified' })
        });
      }
      toast.success("Documents verified successfully & Lead moved to Docs Verified!");
      setDocModalOpen(false);
      setDocModalLead(null);
      setDocModalApp(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to verify documents.");
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/enquiries/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newLead, status: 'new' })
      });
      if (response.ok) {
        toast.success("Lead added successfully!");
        setShowAddModal(false);
        setNewLead({ name: '', email: '', phone: '', city: '' });
        fetchLeads();
      } else {
        toast.error("Failed to add lead");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/enquiries/?no_pagination=true`);
      if (response.ok) {
        const data = await response.json();
        setLeads(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const moveLead = async (leadId: number, newStatus: string) => {
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/enquiries/${leadId}/update_status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok && newStatus === 'admission_confirmed') {
        Swal.fire({
          title: 'Admission Confirmed',
          text: 'To enroll this student, please go to the Applications tab and complete the assignment of Batch, Semester, Branch, and Section.',
          icon: 'info',
          confirmButtonText: 'Got it',
          confirmButtonColor: '#3b82f6',
        });
      }
    } catch (err) {
      console.error("Error moving lead", err);
      fetchLeads(); // Revert on failure
    }
  };

  const handleStageChangeWithValidation = async (lead: any, targetStageId: string) => {
    if (lead.status === targetStageId) return;

    const validation = isValidTransition(lead.status, targetStageId);
    if (!validation.valid) {
      const result = await Swal.fire({
        title: 'Warning',
        text: validation.reason + ' Do you want to force move this lead anyway?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, force move it!'
      });
      
      if (!result.isConfirmed) {
        return;
      }
    }

    if (targetStageId === 'documents_verified') {
      openDocumentVerificationModal(lead);
      return;
    }

    moveLead(lead.id, targetStageId);
  };

  // Helper to count leads for each stage
  const getStageCount = (stageId: string) => {
    if (stageId === 'all') return leads.length;
    return leads.filter(l => l.status === stageId || (stageId === 'documents_verified' && l.status === 'fee_pending')).length;
  };

  // Filtered leads for the List View
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Stage filter
      if (activeFilterStage !== 'all') {
        const matchesStage = lead.status === activeFilterStage || 
          (activeFilterStage === 'documents_verified' && lead.status === 'fee_pending');
        if (!matchesStage) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = lead.name?.toLowerCase().includes(q);
        const emailMatch = lead.email?.toLowerCase().includes(q);
        const phoneMatch = lead.phone?.toLowerCase().includes(q);
        const cityMatch = lead.city?.toLowerCase().includes(q);
        const courseMatch = lead.course_name?.toLowerCase().includes(q);
        const counsellorMatch = lead.assigned_to_name?.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !phoneMatch && !cityMatch && !courseMatch && !counsellorMatch) {
          return false;
        }
      }

      return true;
    });
  }, [leads, activeFilterStage, searchQuery]);

  const totalListPages = Math.ceil(filteredLeads.length / PAGE_SIZE) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (listPage - 1) * PAGE_SIZE;
    return filteredLeads.slice(start, start + PAGE_SIZE);
  }, [filteredLeads, listPage]);

  useEffect(() => {
    setListPage(1);
  }, [activeFilterStage, searchQuery]);

  const getStageBadge = (status: string) => {
    const stage = STAGES.find(s => s.id === status) || { label: status, badgeClass: 'bg-muted text-muted-foreground border-border' };
    return (
      <Badge variant="outline" className={cn("text-xs font-semibold px-2.5 py-0.5 border capitalize", stage.badgeClass)}>
        {stage.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'hot':
        return <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900 text-[10px] h-5 border font-semibold">Hot</Badge>;
      case 'warm':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900 text-[10px] h-5 border font-semibold">Warm</Badge>;
      case 'cold':
      default:
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900 text-[10px] h-5 border font-semibold">Cold</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="flex flex-col h-[calc(100vh-140px)] overflow-hidden border-border">
        <CardHeader className="border-b pb-4 flex flex-row justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-80" />
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-6 flex gap-0 overflow-x-auto overflow-y-hidden items-stretch">
          {[1, 2, 3, 4].map((stageId) => (
            <div key={stageId} className="min-w-[280px] w-[280px] flex flex-col h-full border-r border-border last:border-r-0 px-4">
              <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-6" />
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {[1, 2].map((cardId) => (
                  <Card key={cardId} className="border border-border">
                    <CardContent className="p-3 flex flex-col gap-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="lead-pipeline-container" className="flex flex-col h-[calc(100vh-140px)] overflow-hidden">
      {/* Top Header with Switch Controls */}
      <CardHeader id="lead-pipeline-header" className="border-b pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <CardTitle className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <span>Lead Management</span>
            <Badge variant="secondary" className="text-xs font-normal bg-primary/10 text-primary">
              {leads.length} Enquiries
            </Badge>
          </CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {viewMode === 'pipeline' 
              ? "Manage applicant pipeline visually with drag-and-drop sliding stages."
              : "Filter and review applicant leads stage by stage in organized rows."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
          {/* Switch Button for Pipeline Sliding vs Filtering List */}
          <div className="flex items-center bg-muted p-1 rounded-lg border border-border">
            <Button
              variant={viewMode === 'pipeline' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('pipeline')}
              className={cn(
                "h-8 px-3 text-xs font-medium gap-1.5 transition-all",
                viewMode === 'pipeline' ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Pipeline Sliding</span>
            </Button>
            <Button
              variant={viewMode === 'filtered_list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('filtered_list')}
              className={cn(
                "h-8 px-3 text-xs font-medium gap-1.5 transition-all",
                viewMode === 'filtered_list' ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Filtering List</span>
            </Button>
          </div>

          <Button onClick={() => setShowAddModal(true)} size="sm" className="shadow-sm bg-primary hover:bg-primary/90 text-white h-8 px-3 text-xs">
            <Plus size={15} className="mr-1" /> Add Lead
          </Button>
        </div>
      </CardHeader>
      
      {/* Manual Add Lead Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Manual Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddLead} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <input required type="text" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} className="w-full p-2.5 border border-input rounded bg-background focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-sm" placeholder="Applicant Name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input required type="email" value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})} className="w-full p-2.5 border border-input rounded bg-background focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-sm" placeholder="Email Address" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <input required type="tel" value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} className="w-full p-2.5 border border-input rounded bg-background focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-sm" placeholder="Phone Number" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">City</label>
              <input type="text" value={newLead.city} onChange={e => setNewLead({...newLead, city: e.target.value})} className="w-full p-2.5 border border-input rounded bg-background focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-sm" placeholder="City (Optional)" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Lead'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Main Content View Switcher */}
      {viewMode === 'pipeline' ? (
        /* ================= MODE 1: PIPELINE SLIDING WITH DRAG & DROP ================= */
        <CardContent className="flex-1 min-h-0 p-0 flex overflow-hidden">
          <div 
            className="flex gap-0 overflow-x-auto overflow-y-hidden p-6 flex-1 items-stretch min-h-0 custom-scrollbar"
            onDragOver={(e) => {
              e.preventDefault();
              const container = e.currentTarget;
              const scrollThreshold = 150;
              const rect = container.getBoundingClientRect();
              const x = e.clientX - rect.left;
              
              if (x < scrollThreshold) {
                startScrolling(container, 'left');
              } else if (rect.width - x < scrollThreshold) {
                startScrolling(container, 'right');
              } else {
                stopScrolling();
              }
            }}
            onDragLeave={stopScrolling}
            onDrop={stopScrolling}
          >
            {STAGES.map((stage) => {
              const stageLeads = leads.filter(l => l.status === stage.id || (stage.id === 'documents_verified' && l.status === 'fee_pending'));
              return (
                <div
                  key={stage.id}
                  className="min-w-[280px] w-[280px] flex flex-col h-full border-r border-border last:border-r-0 px-4"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    const leadIdStr = e.dataTransfer.getData('leadId');
                    if (leadIdStr) {
                      const leadId = parseInt(leadIdStr);
                      const lead = leads.find(l => l.id === leadId);
                      if (lead) {
                        handleStageChangeWithValidation(lead, stage.id);
                      }
                    }
                  }}
                >
                  <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-3">
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">{stage.label}</h3>
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5">{stageLeads.length}</Badge>
                  </div>
                  <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-1 pb-2">
                    {stageLeads.map(lead => {
                      let borderColor = lead.priority === 'hot' ? '#ef4444' : lead.priority === 'warm' ? '#f59e0b' : '#3b82f6';
                      let deadlineBadge = null;
                      let statusBadge = null;

                      const now = new Date();
                      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

                      if (!lead.assigned_to_name) {
                        statusBadge = <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 uppercase tracking-wider">Unassigned</Badge>;
                      } else if (lead.status === 'new' && (!lead.activities || lead.activities.length === 0)) {
                        statusBadge = <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-[9px] px-1 py-0 h-4 dark:bg-yellow-900 dark:text-yellow-100 uppercase tracking-wider">Untouched</Badge>;
                      } else if (lead.activities && lead.activities.length > 0) {
                        statusBadge = <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-green-200 text-green-700 bg-green-50 dark:border-green-900 dark:text-green-400 dark:bg-green-950/30 uppercase tracking-wider">Contacted</Badge>;
                      }

                      if (lead.tasks && lead.tasks.length > 0) {
                        const incompleteTasks = lead.tasks.filter((t: any) => !t.is_completed);
                        const overdueTasks = incompleteTasks.filter((t: any) => new Date(t.due_date) < now);
                        const todayTasks = incompleteTasks.filter((t: any) => {
                          const due = new Date(t.due_date);
                          return due >= todayStart && due < todayEnd;
                        });

                        if (overdueTasks.length > 0) {
                          borderColor = '#dc2626'; // Red
                          deadlineBadge = <div className="text-[10px] text-red-600 dark:text-red-400 flex items-center font-medium mt-1"><AlertCircle className="w-3 h-3 mr-1" /> Overdue Task</div>;
                        } else if (todayTasks.length > 0) {
                          borderColor = '#ea580c'; // Orange
                          deadlineBadge = <div className="text-[10px] text-orange-600 dark:text-orange-400 flex items-center font-medium mt-1"><Clock className="w-3 h-3 mr-1" /> Due Today</div>;
                        }
                      }

                      return (
                        <Card
                          key={lead.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('leadId', lead.id.toString())}
                          onDragEnd={stopScrolling}
                          onClick={() => {
                            setSelectedLeadId(lead.id);
                            setIsDetailsOpen(true);
                          }}
                          className="cursor-move hover:border-primary/50 transition-colors bg-card shadow-sm border border-l-4"
                          style={{ borderLeftColor: borderColor }}
                        >
                          <CardContent className="p-3 flex flex-col gap-1">
                            <div className="flex justify-between items-start gap-2">
                              <p className="font-medium text-sm truncate">{lead.name}</p>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                {statusBadge}
                                {lead.assigned_to_name && (
                                  <div className="flex items-center text-xs text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded" title={`Assigned to ${lead.assigned_to_name}`}>
                                    <UserIcon className="w-3 h-3 mr-1" />
                                    <span className="truncate max-w-[60px]">{lead.assigned_to_name.split(' ')[0]}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                            <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>
                            <div className="flex justify-between items-end mt-1">
                              <p className="text-[11px] font-medium text-primary truncate bg-primary/5 w-fit px-1.5 py-0.5 rounded">{lead.course_name || 'General Enquiry'}</p>
                            </div>
                            {deadlineBadge}
                          </CardContent>
                        </Card>
                      );
                    })}
                    {stageLeads.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center p-6 border border-dashed border-border rounded bg-muted/5">
                        Drop leads here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      ) : (
        /* ================= MODE 2: FILTERING LIST VIEW IN ROWS ================= */
        <CardContent className="flex-1 min-h-0 p-4 sm:p-6 flex flex-col overflow-hidden space-y-4">
          {/* Stage Filter Buttons Bar (Pills with Counts) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 custom-scrollbar shrink-0">
            <button
              onClick={() => setActiveFilterStage('all')}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border",
                activeFilterStage === 'all'
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-background text-muted-foreground hover:text-foreground border-border hover:bg-muted"
              )}
            >
              <span>All Enquiries</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full",
                activeFilterStage === 'all' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}>
                {getStageCount('all')}
              </span>
            </button>

            {STAGES.map((stage) => {
              const count = getStageCount(stage.id);
              const isActive = activeFilterStage === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveFilterStage(stage.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border",
                    isActive
                      ? "bg-primary text-white border-primary shadow-sm font-semibold"
                      : "bg-background text-muted-foreground hover:text-foreground border-border hover:bg-muted"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", stage.dotColor || "bg-primary")} />
                  <span>{stage.label}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full",
                    isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Toolbar */}
          <div className="flex items-center justify-between gap-3 shrink-0 bg-muted/20 p-3 rounded-lg border border-border">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by applicant name, email, phone, city, course, counsellor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-background w-full"
              />
            </div>
          </div>

          {/* Leads Listed in Rows */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar border rounded-lg border-border bg-card">
            {paginatedLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                <div className="p-3 rounded-full bg-muted">
                  <SlidersHorizontal className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">No Leads Found</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {searchQuery || priorityFilter !== 'all' || activeFilterStage !== 'all'
                      ? "No applicant enquiries match the active filter criteria."
                      : "No leads available yet in this view."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {paginatedLeads.map((lead) => {
                  return (
                    <div
                      key={lead.id}
                      className="p-3.5 sm:p-4 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                    >
                      {/* Left: Applicant Details */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0 uppercase">
                          {lead.name ? lead.name.charAt(0) : 'L'}
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedLeadId(lead.id);
                                setIsDetailsOpen(true);
                              }}
                              className="font-semibold text-sm text-foreground hover:text-primary transition-colors text-left truncate"
                            >
                              {lead.name}
                            </button>
                            {getStageBadge(lead.status)}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {lead.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-muted-foreground/70" />
                                <span className="truncate">{lead.email}</span>
                              </span>
                            )}
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-muted-foreground/70" />
                                <span>{lead.phone}</span>
                              </span>
                            )}
                            {lead.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-muted-foreground/70" />
                                <span>{lead.city}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            {lead.course_name ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/5 border border-primary/10 px-2 py-0.5 rounded">
                                <GraduationCap className="w-3 h-3" />
                                {lead.course_name}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">General Enquiry</span>
                            )}

                            {lead.assigned_to_name ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                <UserIcon className="w-3 h-3 text-muted-foreground/70" />
                                Counsellor: {lead.assigned_to_name}
                              </span>
                            ) : (
                              <span className="text-[10px] text-destructive font-medium bg-destructive/10 px-1.5 py-0.5 rounded">
                                Unassigned
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Stage Mover & Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border/40 shrink-0">
                        {/* Quick Stage Change Select Dropdown */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-muted-foreground hidden lg:inline">Stage:</span>
                          <Select
                            value={lead.status}
                            onValueChange={(val) => handleStageChangeWithValidation(lead, val)}
                          >
                            <SelectTrigger className="h-8 text-xs w-[145px] sm:w-[155px] bg-background">
                              <SelectValue placeholder="Move Stage" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {STAGES.map((s) => (
                                <SelectItem key={s.id} value={s.id} className="text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span className={cn("w-1.5 h-1.5 rounded-full", s.dotColor || "bg-primary")} />
                                    <span>{s.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Verify Docs Shortcut if in Docs Pending/Verified */}
                        {['documents_pending', 'documents_verified', 'application_started'].includes(lead.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDocumentVerificationModal(lead)}
                            className="h-8 px-2.5 text-xs border-primary/20 text-primary hover:bg-primary/5"
                            title="Verify Documents"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" />
                            Docs
                          </Button>
                        )}

                        {/* View Lead Details Button */}
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setSelectedLeadId(lead.id);
                            setIsDetailsOpen(true);
                          }}
                          className="h-8 px-3 text-xs bg-primary hover:bg-primary/90 text-white shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View Details
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* List Pagination Footer */}
          {totalListPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground px-2 pt-1 shrink-0">
              <div>
                Showing {(listPage - 1) * PAGE_SIZE + 1} to {Math.min(listPage * PAGE_SIZE, filteredLeads.length)} of {filteredLeads.length} leads
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setListPage(p => Math.max(1, p - 1))}
                  disabled={listPage === 1}
                  className="h-8 px-2.5 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-0.5" /> Previous
                </Button>
                <span className="px-2 font-medium text-foreground">
                  Page {listPage} of {totalListPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setListPage(p => Math.min(totalListPages, p + 1))}
                  disabled={listPage === totalListPages}
                  className="h-8 px-2.5 text-xs"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}

      {/* Document Verification & Upload Modal */}
      <Dialog open={docModalOpen} onOpenChange={setDocModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-lg font-semibold flex items-center justify-between">
              <span>Document Verification: {docModalLead?.name}</span>
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Upload missing required applicant documents before verifying and moving to Docs Verified stage.
            </p>
          </DialogHeader>

          {fetchingApp ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" /> Loading applicant documents...
            </div>
          ) : (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4 text-xs bg-muted/20 p-3 rounded-lg border border-border">
                <div><strong className="text-muted-foreground">Applicant:</strong> {docModalLead?.name}</div>
                <div><strong className="text-muted-foreground">Email:</strong> {docModalLead?.email || 'N/A'}</div>
                <div><strong className="text-muted-foreground">Phone:</strong> {docModalLead?.phone || 'N/A'}</div>
                <div><strong className="text-muted-foreground">Course:</strong> {docModalLead?.course_name || 'N/A'}</div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Required Documents Checklist</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: '10th Marks Card', key: 'marks_card_10th' },
                    { label: '12th Marks Card', key: 'marks_card_12th' },
                    { label: 'Transfer Certificate', key: 'transfer_certificate' },
                    { label: 'Aadhaar Card', key: 'aadhaar_card' },
                    { label: 'Applicant Photo', key: 'photo' },
                    { label: 'Applicant Signature', key: 'signature' },
                  ].map((docItem) => {
                    const fileUrl = docModalApp?.[docItem.key];
                    const isUploading = uploadingDocKey === docItem.key;

                    return (
                      <div key={docItem.key} className="p-3 border border-border rounded-lg bg-card flex flex-col justify-between gap-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{docItem.label}</span>
                          {fileUrl ? (
                            <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 font-semibold px-1.5 py-0.5 rounded">Uploaded</span>
                          ) : (
                            <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 font-semibold px-1.5 py-0.5 rounded">Missing</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-border/50">
                          {fileUrl ? (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 font-medium"
                            >
                              <FileText className="w-3 h-3" /> Preview
                            </a>
                          ) : (
                            <span className="text-muted-foreground italic">Not provided</span>
                          )}

                          <label className={`cursor-pointer inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            {isUploading ? (
                              <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</span>
                            ) : (
                              <span className="flex items-center gap-1"><Upload className="w-3 h-3" /> {fileUrl ? 'Replace' : 'Upload File'}</span>
                            )}
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              disabled={isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleDocumentUploadInPipeline(docItem.key, file);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setDocModalOpen(false)}>Cancel</Button>
                <Button onClick={completeDocumentVerification} className="bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle className="w-4 h-4 mr-2" /> Complete Verification & Move Stage
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <LeadDetailsView 
        leadId={selectedLeadId}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedLeadId(null);
        }}
        onLeadUpdated={fetchLeads}
        userRole={role}
      />
    </Card>
  );
};

export default LeadPipeline;
