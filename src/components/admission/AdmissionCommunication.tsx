import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Loader2, Mail, Send, Plus } from 'lucide-react';
import { showSuccessAlert, showErrorAlert } from '../../utils/sweetalert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdmissionCommunication() {
  const [communications, setCommunications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMessage, setNewMessage] = useState({ target_group: 'all', subject: '', message: '', type: 'email' });

  useEffect(() => {
    fetchCommunications();
  }, []);

  const fetchCommunications = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/communications/`);
      if (response.ok) {
        const data = await response.json();
        setCommunications(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.subject || !newMessage.message) {
      showErrorAlert("Missing Fields", "Please fill in subject and message");
      return;
    }
    
    try {
      const payload = { ...newMessage, type: 'email' };
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/communications/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setNewMessage({ target_group: 'all', subject: '', message: '', type: 'email' });
        setShowAddDialog(false);
        fetchCommunications();
        showSuccessAlert("Sent!", "Email has been dispatched successfully.");
      } else {
        showErrorAlert("Error", "Failed to send email");
      }
    } catch (err) {
      console.error(err);
      showErrorAlert("Error", "Network error occurred");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
            <div className="space-y-2">
              <div className="h-6 w-48 bg-muted rounded" />
              <div className="h-3.5 w-80 bg-muted rounded" />
            </div>
            <div className="h-9 w-32 bg-muted rounded" />
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between items-start p-4 border border-border rounded-xl">
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-44 bg-muted rounded" />
                  <div className="h-3 w-5/6 bg-muted rounded" />
                  <div className="h-3 w-2/3 bg-muted rounded" />
                </div>
                <div className="h-6 w-16 bg-muted rounded-full ml-4" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div id="admission-communication-container" className="space-y-6">
      <Card>
        <CardHeader id="admission-communication-header" className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <div>
            <CardTitle className="text-lg font-semibold">Applicant Communication</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Send updates and announcements to your applicant pipelines.</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Compose Email
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] sm:max-w-[500px] max-h-[85vh] overflow-y-auto thin-scrollbar">
              <DialogHeader>
                <DialogTitle>Compose Message</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSendMessage} className="space-y-5 mt-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">To</label>
                  <Select
                    value={newMessage.target_group}
                    onValueChange={val => setNewMessage({...newMessage, target_group: val})}
                  >
                    <SelectTrigger className="w-full bg-background border-input text-sm">
                      <SelectValue placeholder="Select target group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Pending Enquiries</SelectItem>
                      <SelectItem value="verified">All Verified Applicants</SelectItem>
                      <SelectItem value="enrolled">All Enrolled Students</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Subject</label>
                  <input 
                    type="text" 
                    value={newMessage.subject}
                    onChange={e => setNewMessage({...newMessage, subject: e.target.value})}
                    className="w-full p-2.5 border border-input rounded-md bg-background focus:ring-1 focus:ring-primary focus:border-transparent outline-none transition-all text-sm" 
                    placeholder="Important update regarding your admission" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Message</label>
                  <textarea 
                    value={newMessage.message}
                    onChange={e => setNewMessage({...newMessage, message: e.target.value})}
                    className="w-full p-3 border border-input rounded-md bg-background min-h-[200px] resize-y focus:ring-1 focus:ring-primary focus:border-transparent outline-none transition-all text-sm" 
                    placeholder="Type your message here..."
                  ></textarea>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" className="px-8 font-semibold shadow-sm hover:shadow">
                    <Send className="w-4 h-4 mr-2" /> Send Email
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {communications.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm">No recent communications.</p>
                <p className="text-xs mt-2">Click "Compose Email" above to send your first message.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Subject</th>
                    <th className="px-6 py-4 font-semibold">Sent To</th>
                    <th className="px-6 py-4 font-semibold">Type</th>
                    <th className="px-6 py-4 text-right font-semibold">Date Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {communications.map((comm: any) => (
                    <tr key={comm.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-foreground">
                        {comm.subject}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        <span className="bg-muted px-2.5 py-0.5 rounded-md capitalize text-xs font-semibold">
                          {comm.target_group.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                          <Mail className="w-3 h-3" /> {comm.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-muted-foreground whitespace-nowrap">
                        {new Date(comm.sent_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
