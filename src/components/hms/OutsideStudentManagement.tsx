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
import { Search, Edit2, CheckCircle2, XCircle, UserCircle2, Building2, Loader2, Plus, Upload, Trash2, Eye, ExternalLink } from 'lucide-react';
import { AdminPagination } from '../common/AdminPagination';
import { SkeletonTable } from '../ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../../utils/sweetalert';
import { useHMSContext } from "../../context/HMSContext";
import { Avatar, AvatarFallback } from '../ui/avatar';

import { translateTerminology, getInstitutionType } from '@/utils/institutionConfig';

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
  outside_aadhaar_url?: string;
  outside_consent_url?: string;
  outside_id_proof_url?: string;
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
  const institutionType = getInstitutionType();
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
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<OutsideStudent | null>(null);
  const [viewingStudent, setViewingStudent] = useState<OutsideStudent | null>(null);
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
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [consentFile, setConsentFile] = useState<File | null>(null);
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const courseOptions = institutionType === 'school' 
    ? ['Science', 'Commerce', 'Arts', 'General']
    : ['MBA', 'MCA', 'BBA', 'B.Com', 'B.Sc', 'B.A.', 'BE', 'B.Arch', 'Hostel Management', 'BCA', 'B.Tech', 'M.Tech', 'Diploma', 'Ph.D'];

  const yearOptions = institutionType === 'school'
    ? Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`)
    : ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', '6th Year', '7th Year', '8th Year'];

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
        const coursesList = rawData.courses || [];
        setAvailableCourses(Array.from(new Set(coursesList.filter(Boolean))));
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
        const yearsList = rawData.years || [];
        setAvailableYears(Array.from(new Set(yearsList.filter(Boolean))));
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
      errors.usn = `${translateTerminology("USN")} / Custom ID is required.`;
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

    if (!addFormData.parent_name.trim()) {
      errors.parent_name = "Parent's Name is required.";
    }

    const cleanParentPhone = addFormData.parent_contact.replace(/[\s\-\(\)]/g, '');
    if (!addFormData.parent_contact.trim()) {
      errors.parent_contact = "Parent's Contact Number is required.";
    } else if (!/^\d{10}$/.test(cleanParentPhone)) {
      errors.parent_contact = "Enter exactly 10 digits.";
    }

    if (!addFormData.outside_course_name.trim()) {
      errors.outside_course_name = "Course Name is required.";
    }

    if (!addFormData.outside_year.trim()) {
      errors.outside_year = "Year is required.";
    }

    if (aadhaarFile && aadhaarFile.size > 5 * 1024 * 1024) {
      errors.aadhaarFile = "File size must not exceed 5MB.";
    }

    if (consentFile && consentFile.size > 5 * 1024 * 1024) {
      errors.consentFile = "File size must not exceed 5MB.";
    }

    if (idProofFile && idProofFile.size > 5 * 1024 * 1024) {
      errors.idProofFile = "File size must not exceed 5MB.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsRegistering(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', addFormData.name.trim());
      formDataToSend.append('usn', addFormData.usn.trim());
      formDataToSend.append('email', addFormData.email.trim());
      formDataToSend.append('phone', addFormData.phone.trim());
      formDataToSend.append('parent_name', addFormData.parent_name.trim());
      formDataToSend.append('parent_contact', addFormData.parent_contact.trim());
      formDataToSend.append('outside_course_name', addFormData.outside_course_name.trim());
      formDataToSend.append('outside_year', addFormData.outside_year.trim());

      if (aadhaarFile) {
        formDataToSend.append('aadhaar_card', aadhaarFile);
      }
      if (consentFile) {
        formDataToSend.append('parent_consent', consentFile);
      }
      if (idProofFile) {
        formDataToSend.append('student_id_proof', idProofFile);
      }

      const response = await manageOutsideStudents(undefined, formDataToSend, 'POST');
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
        setAadhaarFile(null);
        setConsentFile(null);
        setIdProofFile(null);
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

  const handleViewStudent = (student: OutsideStudent) => {
    setViewingStudent(student);
    setIsViewDialogOpen(true);
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
              <DialogContent className="w-[90%] max-w-[90%] sm:max-w-[500px] rounded-xl flex flex-col max-h-[90vh]" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader className="px-1">
                  <DialogTitle>Register Outside Student</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddSubmit} className="space-y-4 pt-2 overflow-hidden flex flex-col flex-1">
                  <div className="flex-1 overflow-y-auto px-1 space-y-4 pb-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                        <Input
                          id="name"
                          value={addFormData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className={formErrors.name ? "border-red-500 focus-visible:ring-red-500 rounded-xl" : "rounded-xl"}
                        />
                        {formErrors.name && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.name}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="usn">{translateTerminology("USN")} / Custom ID <span className="text-red-500">*</span></Label>
                        <Input
                          id="usn"
                          placeholder="e.g. OUT-1001"
                          value={addFormData.usn}
                          onChange={(e) => handleInputChange('usn', e.target.value)}
                          className={formErrors.usn ? "border-red-500 focus-visible:ring-red-500 rounded-xl" : "rounded-xl"}
                        />
                        {formErrors.usn && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.usn}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                        <Input
                          id="email"
                          type="email"
                          value={addFormData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className={formErrors.email ? "border-red-500 focus-visible:ring-red-500 rounded-xl" : "rounded-xl"}
                        />
                        {formErrors.email && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.email}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                        <Input
                          id="phone"
                          value={addFormData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                          maxLength={10}
                          className={formErrors.phone ? "border-red-500 focus-visible:ring-red-500 rounded-xl" : "rounded-xl"}
                        />
                        {formErrors.phone && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.phone}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="parent_name">Parent's Name <span className="text-red-500">*</span></Label>
                        <Input
                          id="parent_name"
                          value={addFormData.parent_name}
                          onChange={(e) => handleInputChange('parent_name', e.target.value)}
                          className={formErrors.parent_name ? "border-red-500 focus-visible:ring-red-500 rounded-xl" : "rounded-xl"}
                        />
                        {formErrors.parent_name && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.parent_name}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="parent_contact">Parent's Contact Number <span className="text-red-500">*</span></Label>
                        <Input
                          id="parent_contact"
                          value={addFormData.parent_contact}
                          onChange={(e) => handleInputChange('parent_contact', e.target.value.replace(/\D/g, '').slice(0, 10))}
                          maxLength={10}
                          className={formErrors.parent_contact ? "border-red-500 focus-visible:ring-red-500 rounded-xl" : "rounded-xl"}
                        />
                        {formErrors.parent_contact && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.parent_contact}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="outside_course_name">{institutionType === 'school' ? 'Stream Name' : 'Course Name'} <span className="text-red-500">*</span></Label>
                        <Select value={addFormData.outside_course_name} onValueChange={(val) => handleInputChange('outside_course_name', val)}>
                          <SelectTrigger id="outside_course_name" className={formErrors.outside_course_name ? "border-red-500 focus-visible:ring-red-500 rounded-xl" : "rounded-xl"}>
                            <SelectValue placeholder="Select Course" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {courseOptions.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formErrors.outside_course_name && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.outside_course_name}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="outside_year">{institutionType === 'school' ? 'Class / Grade' : 'Year'} <span className="text-red-500">*</span></Label>
                        <Select value={addFormData.outside_year} onValueChange={(val) => handleInputChange('outside_year', val)}>
                          <SelectTrigger id="outside_year" className={formErrors.outside_year ? "border-red-500 focus-visible:ring-red-500 rounded-xl" : "rounded-xl"}>
                            <SelectValue placeholder="Select Year" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {yearOptions.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formErrors.outside_year && <p className="text-xs text-red-500 font-medium mt-1">{formErrors.outside_year}</p>}
                      </div>
                    </div>

                    {/* Aadhaar File Upload */}
                    <div className="space-y-2">
                      <Label>Aadhaar Card / ID Proof</Label>
                      <div className="relative border-2 border-dashed border-primary/10 rounded-xl p-3 bg-muted/5 hover:bg-muted/10 transition-colors flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Upload className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-xs text-muted-foreground truncate font-medium">
                            {aadhaarFile ? aadhaarFile.name : "Upload Aadhaar / ID Proof (PDF, PNG, JPG)"}
                          </span>
                        </div>
                        <Input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setAadhaarFile(file);
                            if (formErrors.aadhaarFile) setFormErrors(prev => ({ ...prev, aadhaarFile: '' }));
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        {aadhaarFile && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAadhaarFile(null);
                            }}
                            className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-500/10 transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {formErrors.aadhaarFile && <p className="text-xs text-red-500 font-medium mt-0.5">{formErrors.aadhaarFile}</p>}
                    </div>

                    {/* Parent Consent File Upload */}
                    <div className="space-y-2">
                      <Label>Parent Consent Document</Label>
                      <div className="relative border-2 border-dashed border-primary/10 rounded-xl p-3 bg-muted/5 hover:bg-muted/10 transition-colors flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Upload className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-xs text-muted-foreground truncate font-medium">
                            {consentFile ? consentFile.name : "Upload Parent Consent Document (PDF, PNG, JPG)"}
                          </span>
                        </div>
                        <Input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setConsentFile(file);
                            if (formErrors.consentFile) setFormErrors(prev => ({ ...prev, consentFile: '' }));
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        {consentFile && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConsentFile(null);
                            }}
                            className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-500/10 transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {formErrors.consentFile && <p className="text-xs text-red-500 font-medium mt-0.5">{formErrors.consentFile}</p>}
                    </div>

                    {/* Student ID Proof File Upload */}
                    <div className="space-y-2">
                      <Label>Student ID Proof / Verification</Label>
                      <div className="relative border-2 border-dashed border-primary/10 rounded-xl p-3 bg-muted/5 hover:bg-muted/10 transition-colors flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Upload className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-xs text-muted-foreground truncate font-medium">
                            {idProofFile ? idProofFile.name : "Upload Student ID Proof (PDF, PNG, JPG)"}
                          </span>
                        </div>
                        <Input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setIdProofFile(file);
                            if (formErrors.idProofFile) setFormErrors(prev => ({ ...prev, idProofFile: '' }));
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        {idProofFile && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIdProofFile(null);
                            }}
                            className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-500/10 transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {formErrors.idProofFile && <p className="text-xs text-red-500 font-medium mt-0.5">{formErrors.idProofFile}</p>}
                    </div>

                    <div className="text-xs text-muted-foreground italic pt-1">
                      * Hostel Enrollment No. will be automatically generated upon registration.
                    </div>
                  </div>

                  <DialogFooter className="pt-3 border-t px-1 mt-auto">
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isRegistering} className="rounded-xl">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isRegistering} className="min-w-[140px] rounded-xl">
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
                      <TableHead>ID / {translateTerminology("USN")}</TableHead>
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
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewStudent(student)}
                              className="flex items-center gap-1.5 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary transition-all duration-200"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(student)}
                              className="flex items-center gap-1.5 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary transition-all duration-200"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Allot Room
                            </Button>
                          </div>
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

      {/* Outside Student View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-2xl rounded-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserCircle2 className="w-6 h-6 text-primary" />
              Outside Student Profile
            </DialogTitle>
          </DialogHeader>
          {viewingStudent && (
            <div className="space-y-6 pt-4">
              {/* Header card */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-4 items-center">
                <Avatar className="w-14 h-14 border border-primary/10">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                    {getInitials(viewingStudent.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{viewingStudent.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{viewingStudent.usn}</p>
                  {viewingStudent.enrollment_no && (
                    <span className="inline-block text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded mt-1">
                      Enrollment: {viewingStudent.enrollment_no}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Academic & Contact Info */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Academic & Contact</h4>
                  <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Course & Year</span>
                      <span className="text-sm font-semibold text-slate-700">
                        {viewingStudent.outside_course_name || '—'} ({viewingStudent.outside_year || '—'})
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Email Address</span>
                      <span className="text-sm font-semibold text-slate-700 break-all">{viewingStudent.user_email}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Phone Number</span>
                      <span className="text-sm font-semibold text-slate-700">{viewingStudent.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Parent Info */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Parent / Guardian</h4>
                  <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Parent's Name</span>
                      <span className="text-sm font-semibold text-slate-700">{viewingStudent.parent_name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Parent's Contact</span>
                      <span className="text-sm font-semibold text-slate-700">{viewingStudent.parent_contact || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Room & Status Info */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Hostel Allocation & Status</h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Room Details</span>
                    {viewingStudent.room_allotted && viewingStudent.room_name ? (
                      <span className="text-sm font-semibold text-slate-700 block">
                        {viewingStudent.room_hostel_name} — Room {viewingStudent.room_name} (Floor {viewingStudent.room_floor})
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-slate-500 block">Unallotted</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Allocation Status</span>
                    <span className="inline-block mt-1">
                      {viewingStudent.room_allotted ? (
                        <Badge className="bg-green-50 text-green-700 border-green-200">Allotted</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500">Pending</Badge>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Dues Status</span>
                    <span className="inline-block mt-1">
                      {viewingStudent.no_dues ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">No Dues</Badge>
                      ) : (
                        <Badge variant="destructive">Has Dues</Badge>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Uploaded Verification Documents */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Verification Documents</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Aadhaar */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-between h-24">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Aadhaar Card</span>
                    {viewingStudent.outside_aadhaar_url ? (
                      <a
                        href={viewingStudent.outside_aadhaar_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-primary flex items-center gap-1 mt-2 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View Aadhaar Proof
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic block mt-2">Not Uploaded</span>
                    )}
                  </div>

                  {/* Parent Consent */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-between h-24">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Parent Consent</span>
                    {viewingStudent.outside_consent_url ? (
                      <a
                        href={viewingStudent.outside_consent_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-primary flex items-center gap-1 mt-2 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View Consent Doc
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic block mt-2">Not Uploaded</span>
                    )}
                  </div>

                  {/* Student ID Proof */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-between h-24">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Student ID Proof</span>
                    {viewingStudent.outside_id_proof_url ? (
                      <a
                        href={viewingStudent.outside_id_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-primary flex items-center gap-1 mt-2 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View ID Proof
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic block mt-2">Not Uploaded</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-6 border-t border-slate-100 pt-4">
            <Button onClick={() => setIsViewDialogOpen(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-800 border-none transition-all">
              Close Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
