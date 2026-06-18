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
  const { skeletonMode, setWardens: setContextWardens, setCaretakers: setContextCaretakers, setStatistics } = useHMSContext();
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
        
        // Update local and context state
        const updatedWarden = response.data || editingWarden;
        setWardens(prev => prev.map(w => w.id === editingWarden.id ? updatedWarden : w));
        setContextWardens(prev => prev.map(w => w.id === editingWarden.id ? { ...w, ...updatedWarden } : w));
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
        setWardens(prev => prev.filter(w => w.id !== id));
        setContextWardens(prev => prev.filter(w => w.id !== id));
        setWardensTotal(prev => prev - 1);
        setStatistics(prev => ({ ...prev, total_wardens: prev.total_wardens - 1 }));
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
        
        // Update local and context state
        const updatedCaretaker = response.data || editingCaretaker;
        setCaretakers(prev => prev.map(c => c.id === editingCaretaker.id ? updatedCaretaker : c));
        setContextCaretakers(prev => prev.map(c => c.id === editingCaretaker.id ? { ...c, ...updatedCaretaker } : c));
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
        setCaretakers(prev => prev.filter(c => c.id !== id));
        setContextCaretakers(prev => prev.filter(c => c.id !== id));
        setCaretakersTotal(prev => prev - 1);
        setStatistics(prev => ({ ...prev, total_caretakers: prev.total_caretakers - 1 }));
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
      <div id="hms-staff-stats-grid" className="grid grid-cols-2 sm:grid-cols-2 gap-6">
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

      <div id="hms-staff-lists-container" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Wardens List */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <UserCheck className="w-6 h-6 sm:w-5 sm:h-5 text-primary" />
                Wardens
              </CardTitle>
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                {isSkeleton ? (
                  <div className="h-8 w-full rounded bg-muted animate-pulse border" />
                ) : (
                  <Input
                    placeholder="Search..."
                    className="pl-9 h-10 sm:h-8 text-sm sm:text-xs"
                    value={wardenSearch}
                    onChange={(e) => setWardenSearch(e.target.value)}
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              {isSkeleton ? (
                <>
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead>Staff Details</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
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
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="block sm:hidden p-4 space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-4 border rounded-xl space-y-3 bg-card/50 animate-pulse">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="h-5 w-32 bg-muted rounded" />
                            <div className="h-4 w-16 bg-muted rounded" />
                          </div>
                          <div className="h-8 w-16 bg-muted rounded" />
                        </div>
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <div className="h-4 w-48 bg-muted rounded" />
                          <div className="h-4 w-40 bg-muted rounded" />
                          <div className="h-4 w-56 bg-muted rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : filteredWardens.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="p-4 rounded-full bg-primary/10 text-primary mb-3">
                    <UserCheck className="w-8 h-8 opacity-60" />
                  </div>
                  <h3 className="text-base font-semibold mb-1 text-foreground">No wardens found</h3>
                  <p className="text-xs text-muted-foreground max-w-[250px]">There are currently no wardens registered or matching the search query.</p>
                </div>
              ) : (
                <>
                  {/* Desktop View */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead>Staff Details</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredWardens.map((warden) => (
                          <TableRow key={warden.id} className="group">
                            <TableCell>
                              <div className="space-y-1 py-1">
                                <div className="text-lg sm:text-base font-semibold flex items-center gap-2">
                                  {warden.name}
                                  <Badge variant="outline" className="text-xs sm:text-[10px] py-0">{warden.designation || 'Warden'}</Badge>
                                </div>
                                <div className="text-sm sm:text-xs text-muted-foreground flex flex-col gap-0.5">
                                  <span className="flex items-center gap-1.5 text-sm"><Mail size={14} className="sm:size-[14px] mt-1 " /> {warden.email || 'N/A'}</span>
                                  <span className="flex items-center gap-1.5 text-sm"><Phone size={14} className="sm:size-[14px] mt-1" /> {warden.phone || 'N/A'}</span>
                                  <span className="flex items-center gap-1.5 text-sm"><MapPin size={14} className="sm:size-[14px] mt-1" /> {warden.address || 'N/A'}</span>
                                  <span className="flex items-center gap-1.5 font-medium text-primary/70 text-sm"><Award size={14} className="sm:size-[14px] mt-1" /> {warden.experience || '0'} Years Experience</span>
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
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="block sm:hidden p-4 space-y-4">
                    {filteredWardens.map((warden) => (
                      <div key={warden.id} className="p-4 border rounded-xl space-y-3 bg-card shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-base text-card-foreground">
                                {warden.name}
                              </h4>
                              <Badge variant="outline" className="text-[10px] mt-1 py-0">{warden.designation || 'Warden'}</Badge>
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground space-y-2 pt-2 border-t border-border/50">
                            <div className="flex items-center gap-2">
                              <Mail size={13} className="text-muted-foreground/70" />
                              <span className="truncate">{warden.email || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone size={13} className="text-muted-foreground/70" />
                              <span>{warden.phone || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin size={13} className="text-muted-foreground/70" />
                              <span className="truncate">{warden.address || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 font-medium text-primary/80">
                              <Award size={13} className="text-primary/70" />
                              <span>{warden.experience || '0'} Years Experience</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-border/50 w-full">
                          <Button variant="outline" size="sm" className="flex-1 h-8 gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20" onClick={() => { setEditingWarden(warden); setIsWardenModalOpen(true); }}>
                            <Edit2 size={12} /> Edit
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 h-8 gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => deleteWarden(warden.id)}>
                            <Trash2 size={12} /> Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Caretakers List */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold flex items-center gap-2 pr-2">
                <Users className="w-6 h-6 sm:w-5 sm:h-5 text-blue-500" />
                Caretakers
              </CardTitle>
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                {isSkeleton ? (
                  <div className="h-8 w-full rounded bg-muted animate-pulse border" />
                ) : (
                  <Input
                    placeholder="Search..."
                    className="pl-9 h-10 sm:h-8 text-sm sm:text-xs"
                    value={caretakerSearch}
                    onChange={(e) => setCaretakerSearch(e.target.value)}
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              {isSkeleton ? (
                <>
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead>Staff Details</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
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
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="block sm:hidden p-4 space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-4 border rounded-xl space-y-3 bg-card/50 animate-pulse">
                        <div className="flex justify-between items-start">
                          <div className="h-5 w-32 bg-muted rounded" />
                          <div className="h-8 w-16 bg-muted rounded" />
                        </div>
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <div className="h-4 w-48 bg-muted rounded" />
                          <div className="h-4 w-40 bg-muted rounded" />
                          <div className="h-4 w-56 bg-muted rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : filteredCaretakers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="p-4 rounded-full bg-blue-500/10 text-blue-500 mb-3">
                    <Users className="w-8 h-8 opacity-60" />
                  </div>
                  <h3 className="text-base font-semibold mb-1 text-foreground">No caretakers found</h3>
                  <p className="text-xs text-muted-foreground max-w-[250px]">There are currently no caretakers registered or matching the search query.</p>
                </div>
              ) : (
                <>
                  {/* Desktop View */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead>Staff Details</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCaretakers.map((caretaker) => (
                          <TableRow key={caretaker.id} className="group">
                            <TableCell>
                              <div className="space-y-1 py-1">
                                <div className="text-lg sm:text-base font-semibold flex items-center gap-2">
                                  {caretaker.name}
                                </div>
                                <div className="text-sm sm:text-xs text-muted-foreground flex flex-col gap-0.5">
                                  <span className="flex items-center gap-1.5 text-sm"><Mail size={14} className="sm:size-[14px] mt-1" /> {caretaker.email || 'N/A'}</span>
                                  <span className="flex items-center gap-1.5 text-sm"><Phone size={14} className="sm:size-[14px] mt-1" /> {caretaker.phone || 'N/A'}</span>
                                  <span className="flex items-center gap-1.5 text-sm"><MapPin size={14} className="sm:size-[14px] mt-1" /> {caretaker.address || 'N/A'}</span>
                                  <span className="flex items-center gap-1.5 font-medium text-blue-500/70 text-sm"><Briefcase size={14} className="sm:size-[14px] mt-1" /> {caretaker.experience || '0'} Years Experience</span>
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
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="block sm:hidden p-4 space-y-4">
                    {filteredCaretakers.map((caretaker) => (
                      <div key={caretaker.id} className="p-4 border rounded-xl space-y-3 bg-card shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-base text-card-foreground">
                                {caretaker.name}
                              </h4>
                              <Badge variant="outline" className="text-[10px] mt-1 py-0">Caretaker</Badge>
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground space-y-2 pt-2 border-t border-border/50">
                            <div className="flex items-center gap-2">
                              <Mail size={13} className="text-muted-foreground/70" />
                              <span className="truncate">{caretaker.email || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone size={13} className="text-muted-foreground/70" />
                              <span>{caretaker.phone || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin size={13} className="text-muted-foreground/70" />
                              <span className="truncate">{caretaker.address || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 font-medium text-blue-500/80">
                              <Briefcase size={13} className="text-blue-500/70" />
                              <span>{caretaker.experience || '0'} Years Experience</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-border/50 w-full">
                          <Button variant="outline" size="sm" className="flex-1 h-8 gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20" onClick={() => { setEditingCaretaker(caretaker); setIsCaretakerModalOpen(true); }}>
                            <Edit2 size={12} /> Edit
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 h-8 gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => deleteCaretaker(caretaker.id)}>
                            <Trash2 size={12} /> Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isWardenModalOpen} onOpenChange={setIsWardenModalOpen}>
        <DialogContent className="w-[90%] max-w-[90vw] h-[80vh] sm:h-auto sm:max-h-[85vh] sm:max-w-md rounded-xl overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Edit Warden Details
            </DialogTitle>
          </DialogHeader>
          {editingWarden && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</Label>
                <Input id="name" value={editingWarden.name} onChange={e => setEditingWarden({...editingWarden, name: e.target.value})} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input id="email" type="email" value={editingWarden.email} onChange={e => setEditingWarden({...editingWarden, email: e.target.value})} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</Label>
                <Input id="phone" value={editingWarden.phone} onChange={e => setEditingWarden({...editingWarden, phone: e.target.value})} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Designation</Label>
                <Input id="designation" value={editingWarden.designation} onChange={e => setEditingWarden({...editingWarden, designation: e.target.value})} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Experience (Years)</Label>
                <Input id="experience" type="number" value={editingWarden.experience} onChange={e => setEditingWarden({...editingWarden, experience: e.target.value})} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Address</Label>
                <div
                  id="address"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={e => setEditingWarden({...editingWarden, address: e.currentTarget.innerText})}
                  className="min-h-[100px] max-h-[150px] overflow-y-auto border border-input rounded-md p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-background custom-scrollbar whitespace-pre-wrap"
                >
                  {editingWarden.address}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsWardenModalOpen(false)} className="flex-1 h-10 font-bold">Cancel</Button>
                <Button type="button" onClick={saveWarden} disabled={actionLoading} className="flex-1 bg-primary hover:bg-primary/90 h-10 font-bold">
                  {actionLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCaretakerModalOpen} onOpenChange={setIsCaretakerModalOpen}>
        <DialogContent className="w-[90%] max-w-[90vw] h-[80vh] sm:h-auto sm:max-h-[75vh] sm:max-w-md rounded-xl overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Edit Caretaker Details
            </DialogTitle>
          </DialogHeader>
          {editingCaretaker && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="c_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</Label>
                <Input id="c_name" value={editingCaretaker.name} onChange={e => setEditingCaretaker({...editingCaretaker, name: e.target.value})} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c_email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input id="c_email" type="email" value={editingCaretaker.email} onChange={e => setEditingCaretaker({...editingCaretaker, email: e.target.value})} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c_phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</Label>
                <Input id="c_phone" value={editingCaretaker.phone} onChange={e => setEditingCaretaker({...editingCaretaker, phone: e.target.value})} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c_experience" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Experience (Years)</Label>
                <Input id="c_experience" type="number" value={editingCaretaker.experience} onChange={e => setEditingCaretaker({...editingCaretaker, experience: e.target.value})} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c_address" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Address</Label>
                <div
                  id="c_address"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={e => setEditingCaretaker({...editingCaretaker, address: e.currentTarget.innerText})}
                  className="min-h-[100px] max-h-[150px] overflow-y-auto border border-input rounded-md p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-background custom-scrollbar whitespace-pre-wrap"
                >
                  {editingCaretaker.address}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsCaretakerModalOpen(false)} className="flex-1 h-10 font-bold">Cancel</Button>
                <Button type="button" onClick={saveCaretaker} disabled={actionLoading} className="flex-1 bg-primary hover:bg-primary/90 h-10 font-bold">
                  {actionLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffManagementOverview;
