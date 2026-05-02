import React, { useState, useEffect } from "react";
import { Users, UserCheck, Search, Edit2, Trash2, Mail, Phone, Briefcase, Award, Plus, Save, X, MapPin } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { getStaffEnrollment, manageWardens, manageCaretakers } from "../../utils/hms_api";
import Swal from 'sweetalert2';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SkeletonTable, SkeletonStatsGrid } from "../ui/skeleton";
import DashboardCard from "../common/DashboardCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useHMSContext } from "../../context/HMSContext";

interface Warden {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  designation?: string;
  experience?: string;
  address?: string;
}

interface Caretaker {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  experience?: string;
}

const StaffManagementOverview: React.FC = () => {
  const { toast } = useToast();
  const { skeletonMode } = useHMSContext();
  const [loading, setLoading] = useState(true);
  const [wardens, setWardens] = useState<Warden[]>([]);
  const [caretakers, setCaretakers] = useState<Caretaker[]>([]);
  const [wardensTotal, setWardensTotal] = useState(0);
  const [caretakersTotal, setCaretakersTotal] = useState(0);

  // Modal state
  const [isWardenModalOpen, setIsWardenModalOpen] = useState(false);
  const [isCaretakerModalOpen, setIsCaretakerModalOpen] = useState(false);
  const [editingWarden, setEditingWarden] = useState<Warden | null>(null);
  const [editingCaretaker, setEditingCaretaker] = useState<Caretaker | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Search state
  const [wardenSearch, setWardenSearch] = useState('');
  const [caretakerSearch, setCaretakerSearch] = useState('');

  // Pagination state
  const [wardensPage, setWardensPage] = useState(1);
  const [caretakersPage, setCaretakersPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    fetchStaffData();
  }, [wardensPage, caretakersPage]);

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const response = await getStaffEnrollment(wardensPage, pageSize);
      if (response.success) {
        const actualData = response.data?.data || response.data;
        const { wardens: wardensData, caretakers: caretakersData } = actualData;
        setWardens(wardensData?.items || []);
        setWardensTotal(wardensData?.total || 0);
        setCaretakers(caretakersData?.items || []);
        setCaretakersTotal(caretakersData?.total || 0);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load staff data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveWarden = async () => {
    if (!editingWarden) return;
    try {
      setActionLoading(true);
      const response = await manageWardens(editingWarden, editingWarden.id, "PUT");
      if (response.success) {
        toast({ title: "Success", description: "Warden details updated." });
        setIsWardenModalOpen(false);
        fetchStaffData();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to save warden.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const deleteWarden = async (id: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    try {
      const response = await manageWardens(undefined, id, "DELETE");
      if (response.success) {
        toast({ title: "Success", description: "Warden deleted." });
        fetchStaffData();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete warden.", variant: "destructive" });
    }
  };

  const saveCaretaker = async () => {
    if (!editingCaretaker) return;
    try {
      setActionLoading(true);
      const response = await manageCaretakers(editingCaretaker, editingCaretaker.id, "PUT");
      if (response.success) {
        toast({ title: "Success", description: "Caretaker details updated." });
        setIsCaretakerModalOpen(false);
        fetchStaffData();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to save caretaker.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const deleteCaretaker = async (id: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    try {
      const response = await manageCaretakers(undefined, id, "DELETE");
      if (response.success) {
        toast({ title: "Success", description: "Caretaker deleted." });
        fetchStaffData();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete caretaker.", variant: "destructive" });
    }
  };

  const filteredWardens = wardens.filter(w => w.name.toLowerCase().includes(wardenSearch.toLowerCase()));
  const filteredCaretakers = caretakers.filter(c => c.name.toLowerCase().includes(caretakerSearch.toLowerCase()));

  const isSkeleton = loading || skeletonMode;

  return (
    <div className="space-y-8">

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardCard
          title="Total Wardens"
          value={isSkeleton ? <div className="h-8 w-12 bg-muted animate-pulse rounded" /> : wardensTotal.toString()}
          icon={<UserCheck className="w-6 h-6 text-primary" />}
        />
        <DashboardCard
          title="Total Caretakers"
          value={isSkeleton ? <div className="h-8 w-12 bg-muted animate-pulse rounded" /> : caretakersTotal.toString()}
          icon={<Users className="w-6 h-6 text-blue-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Wardens List */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                Wardens
              </CardTitle>
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                {isSkeleton ? (
                  <div className="h-8 w-full rounded bg-muted animate-pulse border" />
                ) : (
                  <Input
                    placeholder="Search..."
                    className="pl-9 h-8 text-xs"
                    value={wardenSearch}
                    onChange={(e) => setWardenSearch(e.target.value)}
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Staff Details</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isSkeleton ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="space-y-2 py-2">
                            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                            <div className="space-y-1">
                              <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                              <div className="h-3 w-40 bg-muted animate-pulse rounded" />
                              <div className="h-3 w-56 bg-muted animate-pulse rounded" />
                              <div className="h-3 w-36 bg-muted animate-pulse rounded" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right"><div className="h-8 w-16 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredWardens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">No wardens found</TableCell>
                    </TableRow>
                  ) : (
                    filteredWardens.map((warden) => (
                      <TableRow key={warden.id} className="group">
                        <TableCell>
                          <div className="space-y-1 py-1">
                            <div className="font-semibold flex items-center gap-2">
                              {warden.name}
                              <Badge variant="outline" className="text-[10px] py-0">{warden.designation || 'Warden'}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
                              <span className="flex items-center gap-1.5"><Mail size={12} /> {warden.email || 'N/A'}</span>
                              <span className="flex items-center gap-1.5"><Phone size={12} /> {warden.phone || 'N/A'}</span>
                              <span className="flex items-center gap-1.5"><MapPin size={12} /> {warden.address || 'N/A'}</span>
                              <span className="flex items-center gap-1.5 font-medium text-primary/70"><Award size={12} /> {warden.experience || '0'} Years Experience</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-top pt-4">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingWarden(warden); setIsWardenModalOpen(true); }}>
                              <Edit2 size={14} className="text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteWarden(warden.id)}>
                              <Trash2 size={14} className="text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Caretakers List */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Caretakers
              </CardTitle>
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                {isSkeleton ? (
                  <div className="h-8 w-full rounded bg-muted animate-pulse border" />
                ) : (
                  <Input
                    placeholder="Search..."
                    className="pl-9 h-8 text-xs"
                    value={caretakerSearch}
                    onChange={(e) => setCaretakerSearch(e.target.value)}
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Staff Details</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isSkeleton ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="space-y-2 py-2">
                            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                            <div className="space-y-1">
                              <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                              <div className="h-3 w-40 bg-muted animate-pulse rounded" />
                              <div className="h-3 w-56 bg-muted animate-pulse rounded" />
                              <div className="h-3 w-36 bg-muted animate-pulse rounded" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right"><div className="h-8 w-16 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredCaretakers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">No caretakers found</TableCell>
                    </TableRow>
                  ) : (
                    filteredCaretakers.map((caretaker) => (
                      <TableRow key={caretaker.id} className="group">
                        <TableCell>
                          <div className="space-y-1 py-1">
                            <div className="font-semibold flex items-center gap-2">
                              {caretaker.name}
                            </div>
                            <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
                              <span className="flex items-center gap-1.5"><Mail size={12} /> {caretaker.email || 'N/A'}</span>
                              <span className="flex items-center gap-1.5"><Phone size={12} /> {caretaker.phone || 'N/A'}</span>
                              <span className="flex items-center gap-1.5"><MapPin size={12} /> {caretaker.address || 'N/A'}</span>
                              <span className="flex items-center gap-1.5 font-medium text-blue-500/70"><Briefcase size={12} /> {caretaker.experience || '0'} Years Experience</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-top pt-4">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCaretaker(caretaker); setIsCaretakerModalOpen(true); }}>
                              <Edit2 size={14} className="text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteCaretaker(caretaker.id)}>
                              <Trash2 size={14} className="text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warden Edit Modal */}
      <Dialog open={isWardenModalOpen} onOpenChange={setIsWardenModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Edit Warden Details
            </DialogTitle>
          </DialogHeader>
          {editingWarden && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={editingWarden.name} onChange={e => setEditingWarden({...editingWarden, name: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" value={editingWarden.email} onChange={e => setEditingWarden({...editingWarden, email: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Phone</Label>
                <Input id="phone" value={editingWarden.phone} onChange={e => setEditingWarden({...editingWarden, phone: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="designation" className="text-right">Designation</Label>
                <Input id="designation" value={editingWarden.designation} onChange={e => setEditingWarden({...editingWarden, designation: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="experience" className="text-right">Experience</Label>
                <Input id="experience" type="number" value={editingWarden.experience} onChange={e => setEditingWarden({...editingWarden, experience: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="address" className="text-right mt-2">Address</Label>
                <Textarea id="address" value={editingWarden.address} onChange={e => setEditingWarden({...editingWarden, address: e.target.value})} className="col-span-3 min-h-[100px]" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWardenModalOpen(false)}>Cancel</Button>
            <Button onClick={saveWarden} disabled={actionLoading}>
              {actionLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Caretaker Edit Modal */}
      <Dialog open={isCaretakerModalOpen} onOpenChange={setIsCaretakerModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Edit Caretaker Details
            </DialogTitle>
          </DialogHeader>
          {editingCaretaker && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="c_name" className="text-right">Name</Label>
                <Input id="c_name" value={editingCaretaker.name} onChange={e => setEditingCaretaker({...editingCaretaker, name: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="c_email" className="text-right">Email</Label>
                <Input id="c_email" value={editingCaretaker.email} onChange={e => setEditingCaretaker({...editingCaretaker, email: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="c_phone" className="text-right">Phone</Label>
                <Input id="c_phone" value={editingCaretaker.phone} onChange={e => setEditingCaretaker({...editingCaretaker, phone: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="c_experience" className="text-right">Experience</Label>
                <Input id="c_experience" type="number" value={editingCaretaker.experience} onChange={e => setEditingCaretaker({...editingCaretaker, experience: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="c_address" className="text-right mt-2">Address</Label>
                <Textarea id="c_address" value={editingCaretaker.address} onChange={e => setEditingCaretaker({...editingCaretaker, address: e.target.value})} className="col-span-3 min-h-[100px]" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCaretakerModalOpen(false)}>Cancel</Button>
            <Button onClick={saveCaretaker} disabled={actionLoading}>
              {actionLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffManagementOverview;
