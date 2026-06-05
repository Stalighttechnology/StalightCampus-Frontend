import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Loader2, Save, Info, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

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
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Admission Settings</h2>
          <p className="text-muted-foreground text-sm">Manage institutional campaigns, intake timelines, and status thresholds.</p>
        </div>
      </div>

      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-6 flex gap-4 text-sm text-blue-800 dark:text-blue-200">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">What is an Admission Campaign?</p>
            <p className="leading-relaxed">
              An Admission Campaign is how you organize and track different batches of student intakes over time (e.g., <strong>"Fall 2026 Admissions"</strong> vs <strong>"Spring 2027 Admissions"</strong>). 
              When a student applies, they are automatically tagged to the currently active campaign. This allows you to generate reports and track conversion rates specifically for that one intake period, without mixing the data up with students who applied in previous years!
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Manage Campaigns</CardTitle>
            <CardDescription className="text-xs">View and toggle active status of all your campaigns.</CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Admission Campaign</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateCampaign} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Campaign Name</label>
                  <input type="text" required value={newCampaign.name} onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} className="w-full p-2.5 border border-input rounded bg-background text-sm focus:ring-1 focus:ring-primary focus:border-transparent outline-none" placeholder="e.g., Fall 2026 Admissions" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Start Date</label>
                    <input type="date" required value={newCampaign.start_date} onChange={e => setNewCampaign({...newCampaign, start_date: e.target.value})} className="w-full p-2.5 border border-input rounded bg-background text-sm focus:ring-1 focus:ring-primary focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">End Date</label>
                    <input type="date" required value={newCampaign.end_date} onChange={e => setNewCampaign({...newCampaign, end_date: e.target.value})} className="w-full p-2.5 border border-input rounded bg-background text-sm focus:ring-1 focus:ring-primary focus:border-transparent outline-none" />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  <Save className="w-4 h-4 mr-2" /> Save Campaign
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
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
        </CardContent>
      </Card>
    </div>
  );
}
