import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Loader2, Save, Info, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { showSuccessAlert, showErrorAlert } from '../../utils/sweetalert';

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
        setNewCampaign({ name: '', start_date: '', end_date: '', is_active: true });
        setShowAddDialog(false);
        showSuccessAlert("Success", "Admission campaign created successfully!");
        fetchCampaigns();
      } else {
        showErrorAlert("Error", "Failed to create admission campaign.");
      }
    } catch (err) {
      console.error(err);
      showErrorAlert("Error", "An unexpected error occurred.");
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
        fetchCampaigns();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="text-3xl font-bold">Admission Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your institution's admission campaigns and intake periods.</p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-4 text-sm text-blue-800 dark:text-blue-200">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">What is an Admission Campaign?</p>
          <p>
            An Admission Campaign is how you organize and track different batches of student intakes over time (e.g., <strong>"Fall 2026 Admissions"</strong> vs <strong>"Spring 2027 Admissions"</strong>). 
            When a student applies, they are automatically tagged to the currently active campaign. This allows you to generate reports and track conversion rates specifically for that one intake period, without mixing the data up with students who applied in previous years!
          </p>
        </div>
      </div>

      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manage Campaigns</CardTitle>
            <CardDescription>View and toggle active status of all your campaigns.</CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Admission Campaign</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateCampaign} className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Campaign Name</label>
                  <input type="text" required value={newCampaign.name} onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} className="w-full p-2 border border-input rounded bg-background" placeholder="e.g., Fall 2026 Admissions" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input type="date" required value={newCampaign.start_date} onChange={e => setNewCampaign({...newCampaign, start_date: e.target.value})} className="w-full p-2 border border-input rounded bg-background" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <input type="date" required value={newCampaign.end_date} onChange={e => setNewCampaign({...newCampaign, end_date: e.target.value})} className="w-full p-2 border border-input rounded bg-background" />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  <Save className="w-4 h-4 mr-2" /> Save Campaign
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3">Campaign Name</th>
                  <th className="px-4 py-3">Start Date</th>
                  <th className="px-4 py-3">End Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(camp => (
                  <tr key={camp.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{camp.name}</td>
                    <td className="px-4 py-3">{camp.start_date}</td>
                    <td className="px-4 py-3">{camp.end_date}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${camp.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {camp.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
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
