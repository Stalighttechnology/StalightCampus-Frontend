import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Users,
  Grid3X3,
  Search,
  Eye,
  Phone,
  ShieldCheck,
  HeartPulse,
  MapPin,
  User as UserIcon,
  ChevronRight,
  ChevronLeft,
  GraduationCap
} from "lucide-react";
import { getWardenStudents, getWardenStudentDetail } from "../../utils/warden_api";
import { useWardenContext } from "../../context/WardenContext";
import { API_BASE_URL } from "../../utils/config";
import { useToast } from "../../hooks/use-toast";
import { useTheme } from "../../context/ThemeContext";
import { Input } from "@/components/ui/input";
import { SkeletonCard } from "../ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../ui/card";

const getPhotoUrl = (photoPath?: string) => {
  if (!photoPath) return null;
  return photoPath.startsWith("http") ? photoPath : `${API_BASE_URL}${photoPath}`;
};

const WardenHostelOverview = () => {
  const { toast } = useToast();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFloor, setSelectedFloor] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleViewStudent = async (studentId: number) => {
    setDetailLoading(true);
    setIsDialogOpen(true);
    try {
      const data = await getWardenStudentDetail(studentId);
      if (data.success && data.student) {
        setSelectedStudent(data.student);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch resident details.",
          variant: "destructive",
        });
        setIsDialogOpen(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch resident details.",
        variant: "destructive",
      });
      setIsDialogOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };
  const { wardenFloorsMap, managedHostels, loading: contextLoading } = useWardenContext();
  const [selectedHostel, setSelectedHostel] = useState<string>("");
  const [hostelFloors, setHostelFloors] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (selectedHostel && selectedHostel !== "all") {
      const floors = wardenFloorsMap[Number(selectedHostel)] || [];
      const uniqueFloors = Array.from(new Set(floors)).sort((a, b) => a - b);
      setHostelFloors(uniqueFloors);
    } else {
      const allFloors = Object.values(wardenFloorsMap).flat() as number[];
      const uniqueFloors = Array.from(new Set(allFloors)).sort((a, b) => a - b);
      setHostelFloors(uniqueFloors);
    }
  }, [wardenFloorsMap, selectedHostel]);

  useEffect(() => {
    if (selectedFloor) {
      fetchStudents(selectedHostel, selectedFloor, page);
    } else {
      setStudents([]);
    }
  }, [selectedHostel, selectedFloor, page]);

  const fetchStudents = async (hostel: string, floor: string, pageNum: number = 1) => {
    setLoading(true);
    try {
      const hostelParam = hostel && hostel !== "all" ? Number(hostel) : undefined;
      const result = await getWardenStudents(hostelParam, floor, undefined, undefined, undefined, pageNum);
      const studentList = result.results || result.students || [];
      setStudents(studentList);
      const count = result.count || studentList.length;
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 50) || 1);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch student list.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const filteredStudents = students.filter(s => {
    // If no floor is selected, don't show any students
    if (!selectedFloor) return false;

    const matchesSearch = (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.usn || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.room_name || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFloor = selectedFloor === "all" || s.room_floor?.toString() === selectedFloor;

    return matchesSearch && matchesFloor;
  });

  if (contextLoading && !selectedFloor) {
    return <div className="p-8"><SkeletonCard className="h-[500px]" /></div>;
  }

  return (
    <>
      <Card className={`border-primary/10 shadow-sm overflow-hidden ${theme === 'dark' ? 'bg-card' : 'bg-white'}`}>
        <CardHeader id="warden-residents-container" className="pb-4 border-b bg-muted/30">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl sm:text-2xl font-semibold">Resident Management</CardTitle>
              <CardDescription className='text-sm'>Manage student occupancy and profiles by floor.</CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap items-end gap-3 w-full xl:w-auto">
              <div className="relative w-full sm:flex-1 xl:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search residents..."
                    className="pl-10 pr-12 h-10 rounded-xl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      Clear
                    </button>
                  )}
              </div>

              <div className="flex flex-col gap-1.5 w-full sm:w-[180px] md:w-[220px]">
                <span className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider ml-1">Select Hostel</span>
                <Select value={selectedHostel} onValueChange={(val) => { setSelectedHostel(val); setSelectedFloor(""); setPage(1); }}>
                  <SelectTrigger className="w-full h-10 rounded-xl">
                    <SelectValue placeholder="Select Hostel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Hostels</SelectItem>
                    {managedHostels?.map((hostel: any) => (
                      <SelectItem key={hostel.id} value={hostel.id.toString()}>
                        {hostel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 w-full sm:w-[180px] md:w-[220px]">
                <span className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider ml-1">Select Floor</span>
                <Select value={selectedFloor} onValueChange={(val) => { setSelectedFloor(val); setPage(1); }} disabled={!selectedHostel}>
                  <SelectTrigger className="w-full h-10 rounded-xl">
                    <SelectValue placeholder="Select Floor to View" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    {hostelFloors.map(floor => (
                      <SelectItem key={floor} value={floor.toString()}>
                        Floor {floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {selectedFloor && filteredStudents.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredStudents.map((student) => (
                <motion.div
                  key={student.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleViewStudent(student.id)}
                  className="group p-4 rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all border-border/40 flex flex-col justify-between cursor-pointer min-w-0"
                >
                  <div className="min-w-0 w-full">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-base overflow-hidden shrink-0 relative">
                          {student.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                            {student.name} {student.batch_name ? (student.batch_name.toLowerCase().startsWith("batch") ? student.batch_name : `Batch ${student.batch_name}`) : ""}
                          </h3>
                          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider truncate">
                            {student.usn}
                          </p>
                        </div>
                      </div>
                      <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[12px] gap-1 rounded-full text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 border border-transparent group-hover:border-primary/10 transition-all"
                        >
                          <Eye size={12} />
                          View
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/30">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-tight">Room</span>
                        <span className="text-md font-semibold text-primary">{student.room_name}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-tight">Floor</span>
                        <span className="text-md font-semibold">{student.room_floor ?? 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 p-2 rounded-lg min-w-0 flex-1">
                      <Building2 size={12} className="shrink-0" />
                      <span className="truncate">{student.branch_name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2.5 text-[12px] gap-1 rounded-full text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all shrink-0 sm:hidden flex items-center"
                    >
                      <Eye size={12} />
                      View
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {!selectedFloor && (
            <div className="text-center py-24 bg-card/30 rounded-3xl border-2 border-dashed border-border">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-10 h-10 text-primary animate-bounce" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Select a Floor</h3>
              <p className="text-muted-foreground max-w-xs mx-auto text-sm">
                Please choose a floor from the dropdown above to view the resident list.
              </p>
            </div>
          )}

          {selectedFloor && filteredStudents.length === 0 && (
            <div className="text-center py-20 opacity-40">
              <Users className="w-16 h-16 mx-auto mb-4" />
              <p className="text-lg font-medium">No residents found matching your criteria.</p>
            </div>
          )}
        </CardContent>

        {selectedFloor && filteredStudents.length > 0 && totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {Math.min((page - 1) * 50 + 1, totalCount)} to {Math.min(page * 50, totalCount)} of {totalCount} residents
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all rounded-xl"
              >
                Previous
              </Button>

              <div className="flex items-center justify-center min-w-[2rem]">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {page}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all rounded-xl"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Resident Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={`sm:max-w-lg w-[90%] rounded-xl p-6 max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl border ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-semibold">Resident Profile</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">Loading resident details...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 py-4">
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-2xl font-semibold text-primary overflow-hidden shrink-0 relative border border-primary/20">
                  {selectedStudent?.profile_picture ? (
                    <>
                      <img
                        src={getPhotoUrl(selectedStudent.profile_picture) || undefined}
                        alt={selectedStudent.name}
                        className="w-full h-full object-cover absolute inset-0 z-10"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-semibold text-2xl">
                        {selectedStudent?.name?.charAt(0)}
                      </span>
                    </>
                  ) : selectedStudent?.name?.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-snug">{selectedStudent?.name}</h2>
                  <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mt-0.5">
                    {selectedStudent?.usn}
                  </p>
                  <div className="mt-1.5">
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none text-[10px] py-0.5 px-2 font-medium">
                      {selectedStudent?.branch_name}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-4 border-t border-border/40">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[12px] text-muted-foreground uppercase font-semibold tracking-wider">Hostel Location</p>
                    <div className="flex items-start gap-2 text-sm font-semibold">
                      <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
                      <span className="break-words">
                        {selectedStudent?.room_hostel_name}, {selectedStudent?.room_name?.toLowerCase().startsWith('room') ? selectedStudent.room_name : `Room ${selectedStudent?.room_name}`}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">Floor {selectedStudent?.room_floor ?? 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[12px] text-muted-foreground uppercase font-semibold tracking-wider">Personal Contact</p>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Phone size={14} className="text-primary shrink-0" />
                      <span>{selectedStudent?.phone || "N/A"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6 break-all">{selectedStudent?.user_email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40">
                  <div className="space-y-1">
                    <p className="text-[12px] text-muted-foreground uppercase font-semibold tracking-wider">Guardian Info</p>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <UserIcon size={14} className="text-primary shrink-0" />
                      <span>{selectedStudent?.parent_name || "N/A"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      {selectedStudent?.parent_contact ? `Ph: ${selectedStudent.parent_contact}` : 'No contact'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[12px] text-muted-foreground uppercase font-semibold tracking-wider">Medical Status</p>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <HeartPulse size={14} className="text-primary shrink-0" />
                      <span>Blood: {selectedStudent?.blood_group || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 ml-6 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${selectedStudent?.no_dues ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-xs text-muted-foreground">
                        {selectedStudent?.no_dues ? 'Dues Cleared' : 'Fees Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full bg-primary hover:bg-primary/90 text-white hover:text-white rounded-xl gap-2 text-xs h-9 font-semibold"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Close Profile
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WardenHostelOverview;
