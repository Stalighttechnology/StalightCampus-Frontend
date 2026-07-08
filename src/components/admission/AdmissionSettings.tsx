import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Loader2, Save, Info, Plus, CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { SkeletonForm } from '../ui/skeleton';

export default function AdmissionSettings() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', start_date: '', end_date: '', is_active: true });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/campaigns/`);
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/campaigns/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCampaign)
      });
      if (response.ok) {
        const createdCampaign = await response.json();
        setNewCampaign({ name: '', start_date: '', end_date: '', is_active: true });
        setShowAddDialog(false);
        toast.success("Admission campaign created successfully!");
        setCampaigns(prev => [...prev, createdCampaign]);
      } else {
        toast.error("Failed to create admission campaign.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    }
  };

  const toggleCampaignActive = async (id: number, current_status: boolean) => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/campaigns/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !current_status })
      });
      if (response.ok) {
        toast.success(`Campaign ${current_status ? 'deactivated' : 'activated'} successfully!`);
        setCampaigns(prev => prev.map(c => 
          c.id === id ? { ...c, is_active: !current_status } : c
        ));
      } else {
        toast.error("Failed to update campaign status.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update campaign status.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonForm fields={4} />
      </div>
    );
  }

  return (
    <Card id="admission-settings-container" className="w-full">
      <CardHeader id="admission-settings-header" className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
        <div>
          <CardTitle className="text-lg md:text-xl font-bold">Admission Settings</CardTitle>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">Manage institutional campaigns, intake timelines, and status thresholds.</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[90vw] sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Admission Campaign</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCampaign} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Campaign Name</label>
                <input type="text" required value={newCampaign.name} onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} className="w-full p-2.5 border border-input rounded bg-background text-sm focus:ring-1 focus:ring-primary focus:border-transparent outline-none" placeholder="e.g., Fall 2026 Admissions" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        type="button"
                        className={`w-full justify-start text-left font-normal border-input bg-background h-10 ${!newCampaign.start_date && "text-muted-foreground"}`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newCampaign.start_date ? (
                          new Date(newCampaign.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        ) : (
                          <span>Pick start date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newCampaign.start_date ? new Date(newCampaign.start_date) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const y = date.getFullYear();
                            const m = String(date.getMonth() + 1).padStart(2, '0');
                            const d = String(date.getDate()).padStart(2, '0');
                            setNewCampaign({...newCampaign, start_date: `${y}-${m}-${d}`});
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="flex flex-col">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        type="button"
                        className={`w-full justify-start text-left font-normal border-input bg-background h-10 ${!newCampaign.end_date && "text-muted-foreground"}`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newCampaign.end_date ? (
                          new Date(newCampaign.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        ) : (
                          <span>Pick end date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newCampaign.end_date ? new Date(newCampaign.end_date) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const y = date.getFullYear();
                            const m = String(date.getMonth() + 1).padStart(2, '0');
                            const d = String(date.getDate()).padStart(2, '0');
                            setNewCampaign({...newCampaign, end_date: `${y}-${m}-${d}`});
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <Button type="submit" className="w-full">
                <Save className="w-4 h-4 mr-2" /> Save Campaign
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        {/* Info banner explaining Admission Campaigns */}
        <div className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl flex gap-4 text-xs md:text-sm text-blue-800 dark:text-blue-200">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1 text-blue-950 dark:text-blue-100">What is an Admission Campaign?</p>
            <p className="leading-relaxed text-blue-800/95 dark:text-blue-200/90">
              An Admission Campaign is how you organize and track different batches of student intakes over time (e.g., <strong>"Fall 2026 Admissions"</strong> vs <strong>"Spring 2027 Admissions"</strong>). 
              When a student applies, they are automatically tagged to the currently active campaign. This allows you to generate reports and track conversion rates specifically for that one intake period, without mixing the data up with students who applied in previous years!
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-foreground">Manage Campaigns</h3>
            <p className="text-xs text-muted-foreground">View and toggle active status of all your campaigns.</p>
          </div>

          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Campaign Name</th>
                  <th className="px-6 py-4 font-semibold">Start Date</th>
                  <th className="px-6 py-4 font-semibold">End Date</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campaigns.map(camp => (
                  <tr key={camp.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{camp.name}</td>
                    <td className="px-6 py-4 text-muted-foreground font-mono">{camp.start_date}</td>
                    <td className="px-6 py-4 text-muted-foreground font-mono">{camp.end_date}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${camp.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {camp.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => toggleCampaignActive(camp.id, camp.is_active)}>
                        {camp.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
