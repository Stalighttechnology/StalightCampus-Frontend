import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Loader2, Plus, UserPlus, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { SkeletonTable } from '../ui/skeleton';

export default function CounsellorManagement() {
  const [counsellors, setCounsellors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    phone: '',
    designation: '',
    first_name: '',
    last_name: ''
  });

  const [editingCounsellor, setEditingCounsellor] = useState<any>(null);
  const [deletingCounsellor, setDeletingCounsellor] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchCounsellors();
  }, [currentPage]);

  const fetchCounsellors = async () => {
    setLoading(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/users/?role=counsellor&page=${currentPage}&page_size=20`);
      const data = await response.json();
      if (response.ok) {
        const list = Array.isArray(data.users) ? data.users 
          : Array.isArray(data.results) ? data.results 
          : Array.isArray(data) ? data 
          : [];
        setCounsellors(list);
        setTotalCount(data.count !== undefined ? data.count : list.length);
      } else {
        toast.error(data.detail || "Failed to load counsellors");
        setCounsellors([]);
        setTotalCount(0);
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
    <div id="counsellor-management-container" className="space-y-6 w-full max-w-full overflow-hidden">
      <Card className="overflow-hidden w-full border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <div>
            <CardTitle className="text-lg font-semibold">Counsellors</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Manage admission counsellors and their accounts.</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="shadow-sm">
                <Plus size={16} className="mr-2" /> Add Counsellor
              </Button>
            </DialogTrigger>
            {showAddDialog && (
              <DialogContent className="w-[90vw] rounded-2xl max-h-[85vh] overflow-y-auto sm:max-w-[450px] custom-scrollbar">
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
            )}
          </Dialog>
        </CardHeader>
        
        <CardContent className={loading || counsellors.length === 0 ? "p-6" : "p-0"}>
          {loading ? (
            <SkeletonTable rows={5} cols={4} />
          ) : counsellors.length === 0 ? (
            <div className="p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center space-y-3 min-h-[350px] border-gray-200 bg-gray-50/50 dark:border-border dark:bg-accent/5">
              <div className="p-3 rounded-full bg-gray-100 dark:bg-accent/10">
                <UserPlus className="w-8 h-8 text-gray-400 dark:text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-foreground">No counsellors found</p>
                <p className="text-xs mt-1 text-gray-500 dark:text-muted-foreground">Add your first counsellor to get started.</p>
              </div>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowAddDialog(true)}>
                Add Counsellor
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Name</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Email</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Username</th>
                    <th className="px-6 py-4 text-right font-semibold whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {counsellors.map(counsellor => (
                    <tr key={counsellor.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">
                        {counsellor.first_name} {counsellor.last_name}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {counsellor.email}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-mono whitespace-nowrap">
                        {counsellor.username}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setEditingCounsellor({ ...counsellor })} className="h-8 w-8 text-primary hover:bg-primary/10">
                            <Edit size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeletingCounsellor(counsellor)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {Math.ceil(totalCount / 20) > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {Math.min((currentPage - 1) * 20 + 1, totalCount)} to {Math.min(currentPage * 20, totalCount)} of {totalCount} counsellors
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                Previous
              </Button>

              <div className="flex items-center justify-center min-w-[2rem]">
                <span className="text-sm font-semibold text-foreground">
                  {currentPage}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / 20), currentPage + 1))}
                disabled={currentPage === Math.ceil(totalCount / 20) || loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingCounsellor} onOpenChange={(open) => !open && setEditingCounsellor(null)}>
        <DialogContent className="w-[90vw] rounded-2xl max-h-[85vh] overflow-y-auto sm:max-w-[450px] custom-scrollbar">
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
