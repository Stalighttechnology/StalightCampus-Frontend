import React, { useState, useEffect } from 'react';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

const STAGES = [
  { id: 'new', label: 'New Enquiry' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'interested', label: 'Interested' },
  { id: 'application_started', label: 'App Started' },
  { id: 'documents_pending', label: 'Docs Pending' },
  { id: 'documents_verified', label: 'Docs Verified' },
  { id: 'fee_pending', label: 'Fee Pending' },
  { id: 'admission_confirmed', label: 'Confirmed' },
  { id: 'enrolled', label: 'Enrolled' },
  { id: 'rejected', label: 'Rejected' }
];

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

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-3xl font-bold mb-8">Lead Pipeline</h1>
      
      <div className="flex space-x-4 overflow-x-auto pb-4 flex-1 items-start min-h-[600px] thin-scrollbar">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter(l => l.status === stage.id);
          return (
            <div 
              key={stage.id} 
              className="min-w-[300px] bg-muted/30 rounded-lg p-4 border border-border flex flex-col max-h-full"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const leadId = e.dataTransfer.getData('leadId');
                if (leadId) moveLead(parseInt(leadId), stage.id);
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-sm uppercase tracking-wider">{stage.label}</h3>
                <Badge variant="secondary">{stageLeads.length}</Badge>
              </div>
              <div className="space-y-3 overflow-y-auto thin-scrollbar flex-1 pr-1">
                {stageLeads.map(lead => (
                  <Card 
                    key={lead.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('leadId', lead.id.toString())}
                    className="cursor-move hover:border-primary/50 transition-colors bg-card"
                  >
                    <CardContent className="p-3 flex flex-col gap-1">
                      <p className="font-medium truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>
                      <p className="text-xs text-primary mt-1 truncate">{lead.course_name || 'General Enquiry'}</p>
                    </CardContent>
                  </Card>
                ))}
                {stageLeads.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center p-4 border-2 border-dashed border-border rounded bg-background/50">
                    Drop leads here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default LeadPipeline;
