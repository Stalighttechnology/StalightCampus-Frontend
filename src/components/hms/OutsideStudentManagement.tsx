import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { manageOutsideStudents, getOutsideStudentFilterOptions, getFloorsByHostel, getRoomsByHostelId } from '../../utils/hms_api';
import { useToast } from '../../hooks/use-toast';
import { Search, Edit2, CheckCircle2, XCircle, UserCircle2, Building2, Loader2, Plus } from 'lucide-react';
import { AdminPagination } from '../common/AdminPagination';
import { SkeletonTable } from '../ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../../utils/sweetalert';
import { useHMSContext } from "../../context/HMSContext";
import { Avatar, AvatarFallback } from '../ui/avatar';

interface OutsideStudent {
  id: number;
  name: string;
  usn: string;
  user_email: string;
  phone: string;
  room: number | null;
  room_name?: string;
  room_hostel_name?: string;
  room_floor?: number;
  room_allotted: boolean;
  no_dues: boolean;
  parent_name?: string;
  parent_contact?: string;
  enrollment_no?: string;
  outside_course_name?: string;
  outside_year?: string;
}

const getInitials = (name: string) => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getFloorFromRoomNumber = (roomNo: string): number => {
  if (!roomNo) return 0;
  const matches = roomNo.match(/\d+/g);
  if (matches && matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    const num = parseInt(lastMatch);
    return Math.floor(num / 100);
  }
  return 0;
};

const OutsideStudentManagement: React.FC = () => {
  const { hostels, fetchHostelsOnly, updateRoomStudentCount, refreshData } = useHMSContext();
  const { toast } = useToast();

  const [students, setStudents] = useState<OutsideStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [previousPage, setPreviousPage] = useState<string | null>(null);

  // Dialog States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<OutsideStudent | null>(null);
  const navigate = useNavigate();

  // Form States for Registration
  const [addFormData, setAddFormData] = useState({
    name: '',
    email: '',
    phone: '',
    usn: '',
    parent_name: '',
    parent_contact: '',
    outside_course_name: '',
    outside_year: ''
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const handleInputChange = (field: string, value: string) => {
    setAddFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Filter States
  const [courseFilter, setCourseFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [isYearSelectOpen, setIsYearSelectOpen] = useState(false);

  // Room Allocation States
  const [formData, setFormData] = useState({
    room: null as number | null,
    room_allotted: false,
    no_dues: true
  });
  const [selectedHostelInDialog, setSelectedHostelInDialog] = useState<number | null>(null);
  const [selectedFloorInDialog, setSelectedFloorInDialog] = useState<number | null>(null);
  const [floorsForHostel, setFloorsForHostel] = useState<number[]>([]);
  const [roomsForHostel, setRoomsForHostel] = useState<any[]>([]);
  const [isLoadingFloors, setIsLoadingFloors] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  const fetchCourses = async () => {
    try {
      const res = await getOutsideStudentFilterOptions('courses');
      if (res.success && res.data) {
        const rawData = res.data.data || res.data;
        setAvailableCourses(rawData.courses || []);
      }
    } catch (err) {
      console.error("OutsideStudentManagement - Error fetching courses:", err);
    }
  };

  const fetchYears = async () => {
    try {
      const res = await getOutsideStudentFilterOptions('years');
      if (res.success && res.data) {
        const rawData = res.data.data || res.data;
        setAvailableYears(rawData.years || []);
      }
    } catch (err) {
      console.error("OutsideStudentManagement - Error fetching years:", err);
    }
  };



  useEffect(() => {
    fetchCourses();
    fetchYears();
    fetchHostelsOnly();
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [courseFilter, yearFilter]);

  const fetchStudents = async () => {
    if (!appliedSearch.trim() && (!courseFilter || !yearFilter)) {
      setStudents([]);
      setTotalCount(0);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        page_size: pageSize,
        search: appliedSearch,
      };
      if (courseFilter) {
        params.outside_course_name = courseFilter;
      }
      if (yearFilter) {
        params.outside_year = yearFilter;
      }
      console.log("OutsideStudentManagement - Fetching students with params:", params);
      const response = await manageOutsideStudents(undefined, undefined, 'GET', params);
      console.log("OutsideStudentManagement - Fetch students response:", response);
      if (response.success && response.results) {
        setStudents(response.results);
        setTotalCount(response.count || 0);
        setNextPage(response.next);
        setPreviousPage(response.previous);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to load outside students",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("OutsideStudentManagement - Error fetching students:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [currentPage, appliedSearch, courseFilter, yearFilter]);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!addFormData.name.trim()) {
      errors.name = "Full Name is required.";
    } else if (addFormData.name.trim().length < 2) {
      errors.name = "Full Name must be at least 2 characters.";
    }

    if (!addFormData.usn.trim()) {
      errors.usn = "USN / Custom ID is required.";
    }

    if (!addFormData.email.trim()) {
      errors.email = "Email Address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addFormData.email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    const cleanPhone = addFormData.phone.replace(/[\s\-\(\)]/g, '');
    if (!addFormData.phone.trim()) {
      errors.phone = "Phone Number is required.";
    } else if (!/^\d{10}$/.test(cleanPhone)) {
      errors.phone = "Enter exactly 10 digits.";
    }

    if (!addFormData.outside_course_name.trim()) {
      errors.outside_course_name = "Course Name is required.";
    }

    if (!addFormData.outside_year.trim()) {
      errors.outside_year = "Year is required.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsRegistering(true);
    try {
      const payload = {
        ...addFormData,
        name: addFormData.name.trim(),
        usn: addFormData.usn.trim(),
        email: addFormData.email.trim(),
        phone: addFormData.phone.trim(),
        outside_course_name: addFormData.outside_course_name.trim(),
        outside_year: addFormData.outside_year.trim()
      };
      const response = await manageOutsideStudents(undefined, payload, 'POST');
      if (response.success) {
        showSuccessAlert("Registered!", `Outside Student registered successfully. Enrollment No: ${response.data?.enrollment_no || response.results?.[0]?.enrollment_no || ""}. Default password is 'stalight@123'.`);
        setIsAddDialogOpen(false);
        setAddFormData({
          name: '',
          email: '',
          phone: '',
          usn: '',
          parent_name: '',
          parent_contact: '',
          outside_course_name: '',
          outside_year: ''
        });
        setFormErrors({});
        fetchStudents();
        fetchCourses();
        fetchYears();
      } else {
        if (typeof response.message === 'string' && (response.message.toLowerCase().includes('email') || response.message.toLowerCase().includes('already exists'))) {
          setFormErrors(prev => ({ ...prev, email: response.message || 'Email already registered' }));
        } else {
          showErrorAlert("Error", response.message || "Failed to register student");
        }
      }
    } catch (err: any) {
      showErrorAlert("Error", err.message || "An unexpected error occurred");
    } finally {
      setIsRegistering(false);
    }
  };

  const getFloorsForHostel = async (hostelId: number) => {
    setIsLoadingFloors(true);
    try {
      const response = await getFloorsByHostel(hostelId);
      if (response.success) {
        const rawFloors = response.results || response.data?.results || response.data || [];
        setFloorsForHostel(Array.isArray(rawFloors) ? rawFloors : []);
      } else {
        setFloorsForHostel([]);
      }
    } catch (error) {
      console.error("Error getting floors for hostel:", error);
      setFloorsForHostel([]);
    } finally {
      setIsLoadingFloors(false);
    }
  };

  const getRoomsForHostel = async (hostelId: number, floor?: number) => {
    if (floor === undefined || floor === null) {
      setRoomsForHostel([]);
      return;
    }

    setIsLoadingRooms(true);
    try {
      const response = await getRoomsByHostelId(hostelId, floor.toString());
      if (response.success) {
        const roomsList = response.data?.rooms || response.rooms || response.results || [];
        setRoomsForHostel(Array.isArray(roomsList) ? roomsList : []);
      } else {
        setRoomsForHostel([]);
      }
    } catch (error) {
      console.error("Error getting rooms for hostel:", error);
      setRoomsForHostel([]);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const handleEdit = (student: OutsideStudent) => {
    setEditingStudent(student);
    setFormData({
      room: student.room,
      room_allotted: student.room_allotted,
      no_dues: student.no_dues
    });

    if (student.room && student.room_hostel_name) {
      const hostel = hostels.find((h) => h.name === student.room_hostel_name);
      if (hostel) {
        setSelectedHostelInDialog(hostel.id);
        getFloorsForHostel(hostel.id);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const result = await showConfirmAlert(
      "Confirm Changes",
      "Are you sure you want to update the hostel details for this student?",
      "Yes, Save Changes"
    );

    if (!result.isConfirmed) return;

    const response = await manageOutsideStudents(editingStudent.id, formData, 'PATCH');
    if (response.success) {
      const selectedHostel = hostels.find((h) => h.id === selectedHostelInDialog);
      const selectedRoom = roomsForHostel.find((r) => r.id === formData.room);

      const updatedStudent: OutsideStudent = {
        ...editingStudent,
        ...response.data,
        room_name: selectedRoom?.name || (formData.room ? editingStudent.room_name : undefined),
        room_hostel_name: selectedHostel?.name || (formData.room ? editingStudent.room_hostel_name : undefined)
      };

      if (editingStudent.room !== formData.room) {
        if (editingStudent.room && editingStudent.room_hostel_name) {
          const oldHostel = hostels.find((h) => h.name === editingStudent.room_hostel_name);
          if (oldHostel) {
            updateRoomStudentCount(oldHostel.id, editingStudent.room, -1);
          }
        }
        if (formData.room && selectedHostelInDialog) {
          updateRoomStudentCount(selectedHostelInDialog, formData.room, 1);
        }
      }

      if (formData.room === null) {
        updatedStudent.room_name = undefined;
        updatedStudent.room_hostel_name = undefined;
      }

      if (refreshData) {
        await refreshData(true);
      }
      setStudents((prev) => prev.map((s) => s.id === editingStudent.id ? updatedStudent : s));
      fetchStudents();
      setIsDialogOpen(false);
      showSuccessAlert("Success", "Student details updated successfully");
    } else {
      showErrorAlert("Error", response.message || "Failed to update student");
    }
  };

  const handleToggleDues = async (student: OutsideStudent) => {
    const confirmed = await showConfirmAlert(
      "Confirm Action",
      `Are you sure you want to mark this student as having ${student.no_dues ? "dues" : "no dues"}?`,
      "Yes, change status"
    );
    if (!confirmed) return;

    try {
      const response = await manageOutsideStudents(student.id, { no_dues: !student.no_dues }, 'PATCH');
      if (response.success) {
        toast({
          title: "Status Updated",
          description: `Student marked as having ${!student.no_dues ? "no dues" : "dues"}`
        });
        fetchStudents();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to update dues status",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/10 shadow-sm overflow-hidden">
        <CardHeader id="hms-outside-students-card" className="bg-muted/30 pb-4 border-b">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col space-y-1">
              <h2 className="text-xl sm:text-2xl font-semibold leading-none tracking-tight">Outside Student Management</h2>
              <p className="text-sm text-muted-foreground">Register and manage hostel allocations for non-institutional residents.</p>
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full md:w-auto flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  Register Outside Student
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[90%] max-w-[90%] sm:max-w-[500px] rounded-xl" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle>Register Outside Student</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={addFormData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={formErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {formErrors.name && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="usn">USN / Custom ID *</Label>
                      <Input
                        id="usn"
                        placeholder="e.g. OUT-1001"
                        value={addFormData.usn}
                        onChange={(e) => handleInputChange('usn', e.target.value)}
                        className={formErrors.usn ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {formErrors.usn && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.usn}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={addFormData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={formErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {formErrors.email && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={addFormData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                        maxLength={10}
                        className={formErrors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {formErrors.phone && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.phone}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="outside_course_name">Course Name *</Label>
                      <Input
                        id="outside_course_name"
                        placeholder="e.g. MBA, MCA, Diploma"
                        value={addFormData.outside_course_name}
                        onChange={(e) => handleInputChange('outside_course_name', e.target.value)}
                        className={formErrors.outside_course_name ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {formErrors.outside_course_name && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.outside_course_name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="outside_year">Year *</Label>
                      <Input
                        id="outside_year"
                        placeholder="e.g. 1st Year, 2nd Year"
                        value={addFormData.outside_year}
                        onChange={(e) => handleInputChange('outside_year', e.target.value)}
                        className={formErrors.outside_year ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {formErrors.outside_year && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.outside_year}</p>}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground italic">
                    * Hostel Enrollment No. will be automatically generated upon registration.
                  </div>

                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isRegistering}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isRegistering} className="min-w-[140px]">
                      {isRegistering ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        "Register Student"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <CardTitle className="text-lg font-semibold">Outside Student Directory</CardTitle>
          </div>

          <div className="flex flex-col md:flex-row items-end gap-4 mb-6 w-full">
            {/* Course Filter */}
            <div className="flex flex-col gap-1.5 w-full md:w-48">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Course</span>
              <Select
                value={courseFilter}
                onValueChange={(val) => {
                  setCourseFilter(val);
                  // Auto trigger Year select content dropdown open when course is selected
                  setTimeout(() => setIsYearSelectOpen(true), 150);
                }}
                onOpenChange={(open) => {
                  if (open) fetchCourses();
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose Course" />
                </SelectTrigger>
                <SelectContent>
                  {availableCourses.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground text-center font-medium">Loading courses...</div>
                  ) : (
                    availableCourses.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Year Filter */}
            <div className="flex flex-col gap-1.5 w-full md:w-48">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Year</span>
              <Select
                value={yearFilter}
                open={isYearSelectOpen}
                onValueChange={setYearFilter}
                onOpenChange={(open) => {
                  setIsYearSelectOpen(open);
                  if (open) fetchYears();
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose Year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground text-center font-medium">Loading years...</div>
                  ) : (
                    availableYears.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="flex flex-col gap-1.5 flex-1 w-full">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Search</span>
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground opacity-40" />
                <Input
                  placeholder="Search name, USN, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-16"
                />
                {(searchQuery || courseFilter || yearFilter) && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setCourseFilter("");
                      setYearFilter("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>

          {!courseFilter || !yearFilter ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-55" />
              <p className="font-medium text-slate-700">Select Course and Year to Load Students</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please select both Course and Year filters above to load the outside student directory.
              </p>
            </div>
          ) : loading ? (
            <SkeletonTable rows={5} cols={8} />
          ) : students.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <UserCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium text-slate-700">No outside students found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {appliedSearch ? "Try refining your search query." : "No outside students match the selected filters."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="whitespace-nowrap">
                      <TableHead>Student</TableHead>
                      <TableHead>ID / USN</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Hostel & Room</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dues</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id} className="whitespace-nowrap">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                {getInitials(student.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm">{student.name}</p>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {student.outside_course_name && <span>{student.outside_course_name}</span>}
                                {student.outside_year && <span>• {student.outside_year}</span>}
                              </div>
                              {student.enrollment_no && (
                                <p className="text-[10px] text-muted-foreground bg-primary/5 px-1.5 py-0.5 rounded w-max mt-0.5">
                                  Enrollment: {student.enrollment_no}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{student.usn}</TableCell>
                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            <p className="text-slate-700">{student.user_email}</p>
                            <p className="text-muted-foreground">{student.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {student.room_allotted && student.room_name ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-primary" />
                              <div className="text-xs">
                                <p className="font-semibold text-slate-800">{student.room_hostel_name}</p>
                                <p className="text-muted-foreground">{(student.room_name || '').toLowerCase().startsWith('room') ? '' : 'Room '}{student.room_name} (Floor {student.room_floor})</p>
                              </div>
                            </div>
                          ) : (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-normal">
                              Unallotted
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {student.room_allotted ? (
                            <Badge className="bg-green-50 text-green-700 border-green-200">Allotted</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 hover:bg-transparent"
                            onClick={() => handleToggleDues(student)}
                          >
                            {student.no_dues ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> No Dues
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> Has Dues
                              </Badge>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(student)}
                            className="flex items-center gap-1.5 ml-auto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Allot Room
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {students.length > 1 && (
                <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-6">
                  <div>
                    Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} students
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1 || loading}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center justify-center min-w-[2rem]">
                      <span className="text-sm font-semibold">{currentPage}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!nextPage || loading}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                    >
                      Next
                    </Button>
                  </div>
                </CardFooter>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Room Allocation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-xl rounded-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle>Update Student HMS Details</DialogTitle>
          </DialogHeader>
          {editingStudent && (
            <div className="space-y-6 pt-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-4 items-center">
                <Avatar className="w-12 h-12 border border-primary/10">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                    {getInitials(editingStudent.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-x-8 gap-y-2 flex-1">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase opacity-60">Name</span>
                    <span className="text-sm font-semibold mt-0.5 break-words">{editingStudent.name}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase opacity-60">USN</span>
                    <span className="text-sm font-semibold mt-0.5 font-mono">{editingStudent.usn}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[18px] sm:text-[16px] font-semibold mb-2 block">Assign Hostel</Label>
                    <Select value={selectedHostelInDialog?.toString() || ''} onValueChange={(v) => {
                      const id = parseInt(v);
                      setSelectedHostelInDialog(id);
                      setSelectedFloorInDialog(null);
                      setRoomsForHostel([]);
                      getFloorsForHostel(id);
                      setFormData((prev) => ({ ...prev, room: null, room_allotted: false }));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select hostel" /></SelectTrigger>
                      <SelectContent>
                        {hostels.length > 0 ? (
                          hostels.map((h) => <SelectItem key={h.id} value={h.id.toString()}>{h.name}</SelectItem>)
                        ) : (
                          <div className="p-3 text-center space-y-2" onPointerDown={(e) => e.stopPropagation()}>
                            <p className="text-xs text-muted-foreground">No hostels found</p>
                            <Button
                              type="button"
                              size="sm"
                              className="w-full text-[11px] font-semibold h-8 bg-primary hover:bg-primary/90 text-white"
                              onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDialogOpen(false);
                                navigate('/hms/hostels', { state: { openAddHostel: true } });
                              }}
                            >
                              Add Hostel
                            </Button>
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label className="text-[18px] sm:text-[16px] font-semibold mb-2 block">Select Floor</Label>
                      <Select
                        value={selectedFloorInDialog !== null ? selectedFloorInDialog.toString() : (editingStudent?.room_floor !== undefined && editingStudent?.room_floor !== null ? editingStudent.room_floor.toString() : '')}
                        onValueChange={(v) => {
                          const floor = parseInt(v);
                          setSelectedFloorInDialog(floor);
                          if (selectedHostelInDialog) {
                            setRoomsForHostel([]);
                            setIsLoadingRooms(true);
                            getRoomsForHostel(selectedHostelInDialog, floor);
                          }
                          setFormData((prev) => ({ ...prev, room: null, room_allotted: false }));
                        }}
                        disabled={!selectedHostelInDialog || hostels.length === 0 || isLoadingFloors}>

                        <SelectTrigger>
                          <span className={(selectedHostelInDialog !== null || selectedFloorInDialog !== null || (editingStudent?.room_floor !== undefined && editingStudent?.room_floor !== null)) ? 'text-foreground text-sm' : 'text-muted-foreground text-sm'}>
                            {isLoadingFloors ? (
                              <span className="animate-pulse">Loading Floors...</span>
                            ) : (selectedFloorInDialog !== null || (editingStudent?.room_floor !== undefined && editingStudent?.room_floor !== null)) ? (
                              (() => {
                                const fl = selectedFloorInDialog !== null ? selectedFloorInDialog : editingStudent!.room_floor;
                                return fl === 0 ? 'Ground Floor' : `${fl}${fl === 1 ? 'st' : fl === 2 ? 'nd' : fl === 3 ? 'rd' : 'th'} Floor`;
                              })()
                            ) : (
                              'Choose Floor'
                            )}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {floorsForHostel.length > 0 ?
                            floorsForHostel.map((floor) =>
                              <SelectItem key={floor} value={floor.toString()}>
                                {floor === 0 ? 'Ground Floor' : `${floor}${floor === 1 ? 'st' : floor === 2 ? 'nd' : floor === 3 ? 'rd' : 'th'} Floor`}
                              </SelectItem>
                            ) :
                            <SelectItem value="none" disabled>No floors found</SelectItem>
                          }
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[18px] sm:text-[16px] font-semibold mb-2 block">Assign Room</Label>
                      <Select value={formData.room !== null ? formData.room.toString() : (editingStudent?.room !== undefined && editingStudent?.room !== null ? editingStudent.room.toString() : '')} onValueChange={(v) => {
                        const newRoom = v === '' ? null : parseInt(v);
                        setFormData((prev) => ({ ...prev, room: newRoom, room_allotted: !!newRoom }));
                      }} disabled={!selectedHostelInDialog || selectedFloorInDialog === null || hostels.length === 0 || isLoadingRooms}>
                        <SelectTrigger>
                          <span className={(selectedFloorInDialog !== null || formData.room || (formData.room == editingStudent?.room && editingStudent?.room_name)) ? 'text-foreground text-sm' : 'text-muted-foreground text-sm'}>
                            {isLoadingRooms ? (
                              <span className="animate-pulse">Loading Rooms...</span>
                            ) : (formData.room || (formData.room == editingStudent?.room && editingStudent?.room_name)) ? (
                              (() => {
                                const selectedRoomObj = roomsForHostel.find((r) => r.id == formData.room);
                                if (selectedRoomObj) {
                                  return `${selectedRoomObj.name} (${selectedRoomObj.student_count}/${selectedRoomObj.capacity})`;
                                }
                                return (formData.room == editingStudent?.room ? editingStudent?.room_name : '') || 'Choose Room';
                              })()
                            ) : (
                              'Choose Room'
                            )}
                          </span>
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                          <div className="p-2 border-b border-muted/50" onPointerDown={(e) => e.stopPropagation()}>
                            <Button
                              type="button"
                              size="sm"
                              className="w-full text-[11px] font-semibold h-8 bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-1"
                              onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDialogOpen(false);
                                navigate('/hms/rooms', {
                                  state: {
                                    openAddRoom: true,
                                    hostelId: selectedHostelInDialog,
                                    floor: selectedFloorInDialog
                                  }
                                });
                              }}
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" /> Add Room
                            </Button>
                          </div>
                          {roomsForHostel.map((r) =>
                            <SelectItem key={r.id} value={r.id.toString()} disabled={r.student_count >= r.capacity && editingStudent.room !== r.id}>
                              Room {r.name} ({r.student_count}/{r.capacity} occupied)
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-xl bg-slate-50 mt-6">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold">Room Allotted Status</Label>
                      <p className="text-xs text-muted-foreground">Mark student as currently residing</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.room_allotted}
                      onChange={(e) => setFormData((prev) => ({ ...prev, room_allotted: e.target.checked }))}
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                      disabled={!formData.room}
                    />
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OutsideStudentManagement;
