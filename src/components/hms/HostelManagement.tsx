import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { manageHostels, manageWardens, manageCaretakers } from '../../utils/hms_api';
import { useToast } from '../../hooks/use-toast';
import { Plus, Edit2, Trash2, Building, Search, User, Shield } from 'lucide-react';
import { SkeletonTable } from '../ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useHMSContext } from '../../context/HMSContext';
import Swal from 'sweetalert2';

interface Warden {
  id: number;
  name: string;
}

interface Caretaker {
  id: number;
  name: string;
}

interface Hostel {
  id: number;
  name: string;
  gender: 'M' | 'F';
  warden: number | null;
  caretaker: number | null;
  warden_name?: string;
  caretaker_name?: string;
  floor_count?: number;
}

const HostelManagement: React.FC = () => {
  const { hostels, wardens, caretakers, loading, refreshData, setHostels, skeletonMode } = useHMSContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHostel, setEditingHostel] = useState<Hostel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    gender: 'M' as 'M' | 'F',
    floor_count: 1,
    warden: null as number | null,
    caretaker: null as number | null
  });
  const { toast } = useToast();



  const handleEdit = (hostel: Hostel) => {
    setEditingHostel(hostel);
    setFormData({
      name: hostel.name,
      gender: hostel.gender,
      floor_count: hostel.floor_count || 1,
      warden: hostel.warden,
      caretaker: hostel.caretaker
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const response = await manageHostels(undefined, id, 'DELETE');
        if (response.success) {
          toast({ title: 'Success', description: 'Hostel deleted successfully' });
          refreshData(true);
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete hostel' });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingHostel ? 'PUT' : 'POST';
      const response = await manageHostels(formData, editingHostel?.id, method);
      
      if (response.success) {
        toast({ 
          title: 'Success', 
          description: `Hostel ${editingHostel ? 'updated' : 'created'} successfully` 
        });
        setIsDialogOpen(false);
        setEditingHostel(null);
        setFormData({ name: '', gender: 'M', floor_count: 1, warden: null, caretaker: null });
        refreshData(true);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to save hostel",
        });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save hostel' });
    }
  };

  const filteredHostels = hostels.filter(h =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.warden_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.caretaker_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" />
              Registered Hostels
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                {loading || skeletonMode ? (
                  <div className="h-10 w-full rounded-md bg-muted animate-pulse border" />
                ) : (
                  <Input
                    placeholder="Search hostels..."
                    className="pl-10 h-10 bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                )}
              </div>

              {loading || skeletonMode ? (
                <div className="h-10 w-full sm:w-[130px] rounded-md bg-muted animate-pulse border" />
              ) : (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingHostel(null);
                      setFormData({ name: '', gender: 'M', floor_count: 1, warden: null, caretaker: null });
                    }} className="bg-primary hover:bg-primary/90 h-10 whitespace-nowrap w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" /> Add Hostel
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-[90vw] sm:max-w-[425px] rounded-xl">
                  <DialogHeader>
                    <DialogTitle>{editingHostel ? 'Edit Hostel' : 'Add Hostel'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hostel Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="e.g. Aryabhata Block"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hostel Type</Label>
                      <Select value={formData.gender} onValueChange={(value: 'M' | 'F') => setFormData({ ...formData, gender: value })}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Boys Hostel</SelectItem>
                          <SelectItem value="F">Girls Hostel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="floor_count" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Floor Count</Label>
                      <Input
                        id="floor_count"
                        type="number"
                        min="1"
                        max="20"
                        value={formData.floor_count}
                        onChange={(e) => setFormData({ ...formData, floor_count: parseInt(e.target.value) || 1 })}
                        required
                        className="h-10"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="warden" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Warden</Label>
                        <Select value={formData.warden?.toString() || 'unset'} onValueChange={(value) => setFormData({ ...formData, warden: value === 'unset' ? null : parseInt(value) })}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select warden" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unset">Not Assigned</SelectItem>
                            {wardens.map((warden) => (
                              <SelectItem key={warden.id} value={warden.id.toString()}>
                                {warden.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="caretaker" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Caretaker</Label>
                        <Select value={formData.caretaker?.toString() || 'unset'} onValueChange={(value) => setFormData({ ...formData, caretaker: value === 'unset' ? null : parseInt(value) })}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select caretaker" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unset">Not Assigned</SelectItem>
                            {caretakers.map((caretaker) => (
                              <SelectItem key={caretaker.id} value={caretaker.id.toString()}>
                                {caretaker.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-10 mt-2">{editingHostel ? 'Update Hostel' : 'Create Hostel'}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading || skeletonMode ? (
            <SkeletonTable rows={5} columns={5} />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold">Hostel Name</TableHead>
                    <TableHead className="font-bold">Type</TableHead>
                    <TableHead className="font-bold">Warden</TableHead>
                    <TableHead className="font-bold">Caretaker</TableHead>
                    <TableHead className="text-right font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHostels.length > 0 ? (
                    filteredHostels.map((hostel) => (
                      <TableRow key={hostel.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">{hostel.name}</TableCell>
                        <TableCell>
                          <Badge variant={hostel.gender === 'M' ? 'default' : 'secondary'} className={hostel.gender === 'M' ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200' : 'bg-pink-500/10 text-pink-600 hover:bg-pink-500/20 border-pink-200'}>
                            {hostel.gender === 'M' ? 'Boys' : 'Girls'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Shield size={14} className="text-primary opacity-70" />
                            {hostel.warden_name || 'Not Assigned'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <User size={14} className="text-muted-foreground" />
                            {hostel.caretaker_name || 'Not Assigned'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon" onClick={() => handleEdit(hostel)} className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200">
                              <Edit2 size={14} />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => handleDelete(hostel.id)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200">
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        {searchQuery ? 'No hostels match your search.' : 'No hostels found.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HostelManagement;