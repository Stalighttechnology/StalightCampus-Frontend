import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { manageHostelStudents, manageRooms } from '../../utils/hms_api';
import { useToast } from '../../hooks/use-toast';
import { Search, Filter, Edit2, CheckCircle2, XCircle, ChevronLeft, ChevronRight, UserCircle2, Building2 } from 'lucide-react';
import { SkeletonTable, SkeletonPageHeader } from '../ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useHMSContext } from "../../context/HMSContext";
import { useAcademicContext, Batch, Branch, Semester } from "../../context/AcademicContext";

interface HostelStudent {
  id: number;
  name: string;
  usn: string;
  user_email: string;
  branch_name: string;
  course_name: string;
  room: number | null;
  room_name?: string;
  room_hostel_name?: string;
  room_allotted: boolean;
  no_dues: boolean;
}





const StudentManagement: React.FC = () => {
  const { hostels, getCachedFloors, getCachedRooms, skeletonMode } = useHMSContext();
  const { batches, branches, getSemestersForBranch, loading: academicLoading } = useAcademicContext();
  const [students, setStudents] = useState<HostelStudent[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [floorsForHostel, setFloorsForHostel] = useState<number[]>([]);
  const [roomsForHostel, setRoomsForHostel] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<HostelStudent | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoadingFloors, setIsLoadingFloors] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [selectedHostelInDialog, setSelectedHostelInDialog] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    room: null as number | null,
    room_allotted: false,
    no_dues: true
  });
  const [selectedFloorInDialog, setSelectedFloorInDialog] = useState<number | null>(null);

  const getFloorFromRoomNumber = (roomNo: string): number => {
    if (!roomNo) return 0;
    // Extract the numeric part. We prioritize the last numeric sequence 
    // because room numbers like "BH1-101" often have the floor info in the last part.
    const matches = roomNo.match(/\d+/g);
    if (matches && matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const num = parseInt(lastMatch);
      // Logic: Room 101 -> Floor 1, Room 1001 -> Floor 10, Room 21 -> Floor 0
      return Math.floor(num / 100);
    }
    return 0;
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [previousPage, setPreviousPage] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState({
    batch: '',
    branch: '',
    semester: '',
    search: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 300);
    return () => clearTimeout(timer);
  }, [currentPage, filters.batch, filters.branch, filters.semester, filters.search]);





  const getFloorsForHostel = async (hostelId: number) => {
    setIsLoadingFloors(true);
    const hostel = hostels.find(h => h.id === hostelId);
    const floors = hostel ? Array.from({ length: hostel.floor_count || 1 }, (_, i) => i) : [];
    setFloorsForHostel(floors);
    setIsLoadingFloors(false);
  };

  const getRoomsForHostel = async (hostelId: number, floor?: number) => {
    if (floor === undefined || floor === null) {
      setRoomsForHostel([]);
      return;
    }
    
    setIsLoadingRooms(true);
    const results = await getCachedRooms(hostelId, floor.toString());
    setRoomsForHostel(results);
    setIsLoadingRooms(false);
  };

  const fetchSemesters = async (branchId?: string) => {
    console.log('fetchSemesters called with branchId:', branchId);
    if (!branchId) {
      setSemesters([]);
      return;
    }
    const results = await getSemestersForBranch(parseInt(branchId));
    console.log('fetchSemesters results:', results);
    setSemesters(results);
  };

  const fetchStudents = async () => {
    if (!filters.batch || !filters.branch || !filters.semester) {
      setStudents([]);
      setTotalCount(0);
      return;
    }

    setLoading(true);
    const params: Record<string, any> = {
      page: currentPage,
      page_size: pageSize,
      batch: filters.batch,
      branch: filters.branch,
      semester: filters.semester,
      search: filters.search
    };

    const response = await manageHostelStudents(undefined, undefined, 'GET', params);
    if (response.success && response.results) {
      setStudents(response.results);
      setTotalCount(response.count || 0);
      setNextPage(response.next);
      setPreviousPage(response.previous);
    }
    setLoading(false);
  };

  // Remove the automatic floor setting from room change
  // We want it to be manual and cascaded

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
    if (key === 'branch') {
      fetchSemesters(value);
      setFilters(prev => ({ ...prev, semester: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const response = await manageHostelStudents(formData, editingStudent.id, 'PUT');
    if (response.success) {
      fetchStudents();
      setIsDialogOpen(false);
      toast({ title: "Success", description: "Student details updated successfully" });
    } else {
      toast({ variant: "destructive", title: "Error", description: response.message || "Failed to update student" });
    }
  };

  const handleEdit = (student: HostelStudent) => {
    setEditingStudent(student);
    setFormData({
      room: student.room,
      room_allotted: student.room_allotted,
      no_dues: student.no_dues
    });

    if (student.room && student.room_hostel_name) {
      const hostel = hostels.find(h => h.name === student.room_hostel_name);
      if (hostel) {
        setSelectedHostelInDialog(hostel.id);
        getFloorsForHostel(hostel.id);
        
        // If we have floor info, fetch rooms for that floor
        // Since we don't have explicit floor in student object yet, we extract it from room name
        if (student.room_name) {
          const floor = getFloorFromRoomNumber(student.room_name);
          setSelectedFloorInDialog(floor);
          getRoomsForHostel(hostel.id, floor);
        }
      }
    } else {
      setSelectedHostelInDialog(null);
      setSelectedFloorInDialog(null);
      setFloorsForHostel([]);
      setRoomsForHostel([]);
    }
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/10 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4 border-b">
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col space-y-1">
              <h2 className="text-2xl font-semibold leading-none tracking-tight">Student Management</h2>
              <p className="text-md text-muted-foreground">Monitor and manage hostel student allocations and dues.</p>
            </div>

            {/* Row 1: Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none">Batch</Label>
                {loading || skeletonMode ? (
                  <div className="w-full h-9 rounded-md bg-muted animate-pulse border" />
                ) : (
                  <Select value={filters.batch || "all"} onValueChange={(v) => handleFilterChange('batch', v === "all" ? '' : v)}>
                    <SelectTrigger className="h-9 bg-background border-muted-foreground/20">
                      <SelectValue placeholder="All Batches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Batches</SelectItem>
                      {batches.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none">Branch</Label>
                {loading || skeletonMode ? (
                  <div className="w-full h-9 rounded-md bg-muted animate-pulse border" />
                ) : (
                  <Select value={filters.branch || "all"} onValueChange={(v) => handleFilterChange('branch', v === "all" ? '' : v)}>
                    <SelectTrigger className="h-9 bg-background border-muted-foreground/20">
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none">Semester</Label>
                {loading || skeletonMode ? (
                  <div className="w-full h-9 rounded-md bg-muted animate-pulse border" />
                ) : (
                  <Select value={filters.semester || "all"} onValueChange={(v) => handleFilterChange('semester', v === "all" ? '' : v)} disabled={!filters.branch}>
                    <SelectTrigger className="h-9 bg-background border-muted-foreground/20">
                      <SelectValue placeholder="All Semesters" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Semesters</SelectItem>
                      {Array.isArray(semesters) && semesters.map(s => <SelectItem key={s.id} value={s.id}>Semester {s.number}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Row 2: Search */}
            <div className="flex flex-col md:flex-row items-end gap-4">
              <div className="flex-1 w-full space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none">Search Students</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  {loading || skeletonMode ? (
                    <div className="h-9 w-full rounded-md bg-muted animate-pulse border" />
                  ) : (
                    <Input
                      placeholder="USN, Name, Email..."
                      className="h-9 pl-10 bg-background border-muted-foreground/20 focus:border-primary/50 transition-colors"
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading || skeletonMode ? (
            <div className="p-6"><SkeletonTable rows={10} columns={7} /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold">USN</TableHead>
                      <TableHead className="font-bold">Student Name</TableHead>
                      <TableHead className="font-bold">Room Allocation</TableHead>
                      <TableHead className="text-center font-bold">Status</TableHead>
                      <TableHead className="text-center font-bold">Dues</TableHead>
                      <TableHead className="text-right font-bold px-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.length > 0 ? (
                      students.map((student) => (
                        <TableRow key={student.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium">{student.usn}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold">{student.name}</span>
                              <span className="text-[10px] text-muted-foreground uppercase">{student.branch_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {student.room_name ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{student.room_hostel_name} - {student.room_name}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Not Assigned</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {student.room_allotted ?
                              <Badge className="bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20">Allotted</Badge> :
                              <Badge variant="outline" className="text-muted-foreground border-dashed">Pending</Badge>
                            }
                          </TableCell>
                          <TableCell className="text-center">
                            {student.no_dues ?
                              <CheckCircle2 size={18} className="text-green-500 mx-auto" /> :
                              <XCircle size={18} className="text-red-500 mx-auto" />
                            }
                          </TableCell>
                          <TableCell className="text-right px-6">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(student)} className="h-8 w-8 text-primary hover:bg-primary/10">
                              <Edit2 size={14} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                          {!filters.batch || !filters.branch || !filters.semester ?
                            "Select filters to view student records." :
                            "No student records found."
                          }
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalCount > pageSize && (
                <div className="p-4 border-t flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => prev - 1)} disabled={!previousPage}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => prev + 1)} disabled={!nextPage}>
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-xl rounded-xl">
          <DialogHeader>
            <DialogTitle>Update Student HMS Details</DialogTitle>
          </DialogHeader>
          {editingStudent && (
            <div className="space-y-6 pt-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-4 items-center">
                <UserCircle2 className="w-12 h-12 text-primary opacity-80" />
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 flex-1">
                  <div className="text-xs font-bold uppercase opacity-60">Name</div>
                  <div className="text-xs font-bold uppercase opacity-60">USN</div>
                  <div className="text-sm font-semibold">{editingStudent.name}</div>
                  <div className="text-sm font-semibold">{editingStudent.usn}</div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Assign Hostel</Label>
                    <Select value={selectedHostelInDialog?.toString() || ''} onValueChange={(v) => {
                      const id = parseInt(v);
                      setSelectedHostelInDialog(id);
                      setSelectedFloorInDialog(null);
                      setRoomsForHostel([]);
                      getFloorsForHostel(id);
                      setFormData(prev => ({ ...prev, room: null }));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select hostel" /></SelectTrigger>
                      <SelectContent>
                        {hostels.map(h => <SelectItem key={h.id} value={h.id.toString()}>{h.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Select Floor</Label>
                      <Select
                        value={selectedFloorInDialog?.toString() || ''}
                        onValueChange={(v) => {
                          const floor = parseInt(v);
                          setSelectedFloorInDialog(floor);
                          if (selectedHostelInDialog) {
                            getRoomsForHostel(selectedHostelInDialog, floor);
                          }
                          setFormData(prev => ({ ...prev, room: null }));
                        }}
                        disabled={!selectedHostelInDialog || isLoadingFloors}
                      >
                        <SelectTrigger>
                          {isLoadingFloors ? <span className="animate-pulse">Loading Floors...</span> : <SelectValue placeholder="Select Floor" />}
                        </SelectTrigger>
                        <SelectContent>
                          {floorsForHostel.length > 0 ? (
                            floorsForHostel.map(floor => (
                              <SelectItem key={floor} value={floor.toString()}>
                                {floor === 0 ? 'Ground Floor' : `${floor}${floor === 1 ? 'st' : floor === 2 ? 'nd' : floor === 3 ? 'rd' : 'th'} Floor`}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>No floors found</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Assign Room</Label>
                      <Select value={formData.room?.toString() || 'none'} onValueChange={(v) => setFormData(prev => ({ ...prev, room: v === 'none' ? null : parseInt(v) }))} disabled={!selectedHostelInDialog || selectedFloorInDialog === null || isLoadingRooms}>
                        <SelectTrigger>
                          {isLoadingRooms ? <span className="animate-pulse">Loading Rooms...</span> : <SelectValue placeholder="Select room" />}
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                          <SelectItem value="none">Unassigned</SelectItem>
                          {roomsForHostel.map(r => (
                            <SelectItem key={r.id} value={r.id.toString()} disabled={r.student_count >= r.capacity && editingStudent.room !== r.id}>
                              {r.name} ({r.student_count}/{r.capacity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-6 p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="room_allotted"
                      className="w-4 h-4 accent-primary"
                      checked={formData.room_allotted}
                      onChange={(e) => setFormData(prev => ({ ...prev, room_allotted: e.target.checked }))}
                    />
                    <Label htmlFor="room_allotted" className="cursor-pointer">Room Allotted</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="no_dues"
                      className="w-4 h-4 accent-primary"
                      checked={formData.no_dues}
                      onChange={(e) => setFormData(prev => ({ ...prev, no_dues: e.target.checked }))}
                    />
                    <Label htmlFor="no_dues" className="cursor-pointer">Clear Dues (No Dues)</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90 px-8">Save Changes</Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentManagement;