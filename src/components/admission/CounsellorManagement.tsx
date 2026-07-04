import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Loader2, Plus, UserPlus, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function CounsellorManagement() {
  const [counsellors, setCounsellors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    phone: '',
    designation: '',
    first_name: '',
    first_name: '',
    last_name: ''
  });

  const [editingCounsellor, setEditingCounsellor] = useState<any>(null);
  const [deletingCounsellor, setDeletingCounsellor] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchCounsellors();
  }, []);

  const fetchCounsellors = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/users/?role=counsellor`);
      const data = await response.json();
      if (response.ok) {
        setCounsellors(
          Array.isArray(data.users) ? data.users 
          : Array.isArray(data.results) ? data.results 
          : Array.isArray(data) ? data 
          : []
        );
      } else {
        toast.error(data.detail || "Failed to load counsellors");
        setCounsellors([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCounsellor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/enroll-user/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUser, role: 'counsellor' })
      });
      if (response.ok) {
        toast.success("Counsellor account created successfully!");
        setNewUser({ username: '', email: '', phone: '', designation: '', first_name: '', last_name: '' });
        setShowAddDialog(false);
        fetchCounsellors();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to create counsellor.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCounsellor) return;
    setActionLoading(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: editingCounsellor.id, 
          action: 'edit',
          updates: {
            username: editingCounsellor.username,
            email: editingCounsellor.email,
            first_name: editingCounsellor.first_name,
            last_name: editingCounsellor.last_name
          }
        })
      });
      if (response.ok) {
        toast.success("Counsellor updated successfully!");
        setEditingCounsellor(null);
        fetchCounsellors();
      } else {
        const errData = await response.json();
        toast.error(errData.message || "Failed to update counsellor.");
      }
    } catch (err) {
      toast.error("An error occurred while updating.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCounsellor) return;
    setActionLoading(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: deletingCounsellor.id, action: 'delete' })
      });
      if (response.ok) {
        toast.success("Counsellor deleted successfully!");
        setDeletingCounsellor(null);
        fetchCounsellors();
      } else {
        const errData = await response.json();
        toast.error(errData.message || "Failed to delete counsellor.");
      }
    } catch (err) {
      toast.error("An error occurred while deleting.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Counsellors</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Manage admission counsellors and their accounts.</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="hidden sm:flex gap-2">
              <UserPlus className="w-4 h-4" /> Add Counsellor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Counsellor Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCounsellor} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input type="email" id="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input type="tel" id="phone" value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation (Optional)</Label>
                  <Input id="designation" value={newUser.designation} onChange={e => setNewUser({ ...newUser, designation: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={newUser.first_name} onChange={e => setNewUser({ ...newUser, first_name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={newUser.last_name} onChange={e => setNewUser({ ...newUser, last_name: e.target.value })} required />
                </div>
              </div>
              <div className="pt-2">
                <p className="text-xs text-muted-foreground text-center mb-3">
                  Note: The password will default to <strong>stalight@123</strong>. They will be required to change it on their first login.
                </p>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Account"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Counsellors</CardTitle>
          <CardDescription>View all counsellors registered in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : counsellors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
              <p>No counsellors found.</p>
              <Button variant="link" onClick={() => setShowAddDialog(true)}>Add your first counsellor</Button>
            </div>
          ) : (
            <div className="divide-y border rounded-md">
              {counsellors.map(counsellor => (
                <div key={counsellor.id} className="flex justify-between items-center p-4 bg-card">
                  <div>
                    <p className="font-medium text-sm">{counsellor.first_name} {counsellor.last_name}</p>
                    <p className="text-xs text-muted-foreground">{counsellor.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-xs px-2 py-1 bg-secondary rounded text-secondary-foreground font-medium hidden sm:block">
                      {counsellor.username}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setEditingCounsellor({ ...counsellor })}>
                      <Edit className="w-4 h-4 text-muted-foreground hover:text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingCounsellor(counsellor)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingCounsellor} onOpenChange={(open) => !open && setEditingCounsellor(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Counsellor</DialogTitle>
          </DialogHeader>
          {editingCounsellor && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input id="edit-username" value={editingCounsellor.username} onChange={e => setEditingCounsellor({ ...editingCounsellor, username: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input type="email" id="edit-email" value={editingCounsellor.email} onChange={e => setEditingCounsellor({ ...editingCounsellor, email: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First Name</Label>
                  <Input id="edit-firstName" value={editingCounsellor.first_name} onChange={e => setEditingCounsellor({ ...editingCounsellor, first_name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input id="edit-lastName" value={editingCounsellor.last_name} onChange={e => setEditingCounsellor({ ...editingCounsellor, last_name: e.target.value })} required />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingCounsellor(null)}>Cancel</Button>
                <Button type="submit" disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deletingCounsellor} onOpenChange={(open) => !open && setDeletingCounsellor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the counsellor account for <strong>{deletingCounsellor?.first_name} {deletingCounsellor?.last_name}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeleteConfirm(); }} className="bg-destructive hover:bg-destructive/90" disabled={actionLoading}>
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Counsellor"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
