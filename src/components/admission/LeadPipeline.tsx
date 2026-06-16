import React, { useState, useEffect } from 'react';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
      <Card className="flex flex-col h-[calc(100vh-140px)] overflow-hidden animate-pulse border-border">
        <CardHeader className="border-b pb-4 flex flex-row justify-between items-center">
          <div className="space-y-2">
            <div className="h-6 w-32 bg-muted rounded" />
            <div className="h-4 w-80 bg-muted rounded" />
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-6 flex gap-0 overflow-x-auto overflow-y-hidden items-stretch">
          {[1, 2, 3, 4].map((stageId) => (
            <div key={stageId} className="min-w-[280px] w-[280px] flex flex-col h-full border-r border-border last:border-r-0 px-4">
              <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-3">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-4 w-6 bg-muted rounded" />
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {[1, 2].map((cardId) => (
                  <Card key={cardId} className="border border-border">
                    <CardContent className="p-3 flex flex-col gap-2">
                      <div className="h-4 w-3/4 bg-muted rounded" />
                      <div className="h-3 w-1/2 bg-muted rounded" />
                      <div className="h-3 w-2/3 bg-muted rounded" />
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
          <CardTitle className="text-lg md:text-xl font-bold">Lead Pipeline</CardTitle>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">Manage and track your applicant pipelines by dragging stages.</p>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0 flex overflow-hidden">
        <div className="flex gap-0 overflow-x-auto overflow-y-hidden p-6 flex-1 items-stretch min-h-0 custom-scrollbar">
          {STAGES.map((stage) => {
            const stageLeads = leads.filter(l => l.status === stage.id);
            return (
              <div
                key={stage.id}
                className="min-w-[280px] w-[280px] flex flex-col h-full border-r border-border last:border-r-0 px-4"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const leadIdStr = e.dataTransfer.getData('leadId');
                  if (leadIdStr) {
                    const leadId = parseInt(leadIdStr);
                    const lead = leads.find(l => l.id === leadId);
                    if (lead) {
                      const validation = isValidTransition(lead.status, stage.id);
                      if (!validation.valid) {
                        toast.error(validation.reason || "Invalid stage transition");
                        return;
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
                  {stageLeads.map(lead => (
                    <Card
                      key={lead.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('leadId', lead.id.toString())}
                      className="cursor-move hover:border-primary/50 transition-colors bg-card shadow-sm border"
                    >
                      <CardContent className="p-3 flex flex-col gap-1">
                        <p className="font-medium text-sm truncate">{lead.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>
                        <p className="text-[11px] font-medium text-primary mt-1 truncate">{lead.course_name || 'General Enquiry'}</p>
                      </CardContent>
                    </Card>
                  ))}
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
    </Card>
  );
};
export default LeadPipeline;
