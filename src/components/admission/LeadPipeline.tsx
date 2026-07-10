import React, { useState, useEffect, useRef } from 'react';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../ui/skeleton';
import LeadDetailsView from './LeadDetailsView';
import { User as UserIcon, AlertCircle, Clock, Plus } from 'lucide-react';
import { useAuth } from "../../context/AuthContext";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Swal from 'sweetalert2';

const STAGES = [
  { id: 'new', label: 'New Enquiry' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'interested', label: 'Interested' },
  { id: 'application_started', label: 'Application Started' },
  { id: 'documents_pending', label: 'Docs Pending' },
  { id: 'documents_verified', label: 'Docs Verified' },
  { id: 'fee_pending', label: 'Fee Pending' },
  { id: 'admission_confirmed', label: 'Confirmed' },
  { id: 'enrolled', label: 'Enrolled' },
  { id: 'rejected', label: 'Rejected' }
];

const isValidTransition = (currentStatus: string, newStatus: string): { valid: boolean; reason?: string } => {
  if (currentStatus === newStatus) {
    return { valid: true };
  }

  // 1. Enrolled is final
  if (currentStatus === 'enrolled') {
    return { valid: false, reason: 'Enrolled students cannot be moved to other stages.' };
  }

  // 2. Admission Confirmed can only go to enrolled
  if (currentStatus === 'admission_confirmed') {
    if (newStatus === 'enrolled') return { valid: true };
    return { valid: false, reason: 'Confirmed admissions can only transition to Enrolled.' };
  }

  // 3. Fee Pending can only go to admission_confirmed
  if (currentStatus === 'fee_pending') {
    if (newStatus === 'admission_confirmed') return { valid: true };
    return { valid: false, reason: 'Leads with pending fees can only transition to Confirmed.' };
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
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/enquiries/`);
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
    setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    try {
      await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/enquiries/${leadId}/update_status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      console.error("Error moving lead", err);
      fetchLeads(); // Revert on failure
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
      <CardHeader id="lead-pipeline-header" className="border-b pb-4 flex flex-row justify-between items-center">
        <div>
          <CardTitle className="text-lg md:text-xl font-semibold">Lead Pipeline</CardTitle>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">Manage and track your applicant pipelines by dragging stages.</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} size="sm" className="shadow-sm bg-primary hover:bg-primary/90 text-white">
          <Plus size={16} className="mr-2" /> Add Lead
        </Button>
      </CardHeader>
      
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
            const stageLeads = leads.filter(l => l.status === stage.id);
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
                      const validation = isValidTransition(lead.status, stage.id);
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
                      moveLead(leadId, stage.id);
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
