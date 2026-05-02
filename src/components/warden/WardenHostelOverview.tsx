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
  GraduationCap
} from "lucide-react";
import { getWardenStudents } from "../../utils/warden_api";
import { useWardenContext } from "../../context/WardenContext";
import { useToast } from "../../hooks/use-toast";
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

const WardenHostelOverview = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFloor, setSelectedFloor] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { wardenFloorsMap, loading: contextLoading } = useWardenContext();
  const [hostelFloors, setHostelFloors] = useState<number[]>([]);

  useEffect(() => {
    // Consolidate floors from all managed hostels in the map
    const allFloors = Object.values(wardenFloorsMap).flat() as number[];
    const uniqueFloors = Array.from(new Set(allFloors)).sort((a, b) => a - b);
    setHostelFloors(uniqueFloors);
  }, [wardenFloorsMap]);

  useEffect(() => {
    if (selectedFloor) {
      fetchStudents(selectedFloor);
    } else {
      setStudents([]);
    }
  }, [selectedFloor]);

  const fetchStudents = async (floor: string) => {
    setLoading(true);
    try {
      const result = await getWardenStudents(undefined, floor);
      if (result.success) {
        setStudents(result.students);
      }
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search residents..." 
            className="pl-10 h-10 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={selectedFloor} onValueChange={setSelectedFloor}>
          <SelectTrigger className="w-full md:w-[220px] h-10 rounded-xl">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredStudents.map((student) => (
          <motion.div
            key={student.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => {
              setSelectedStudent(student);
              setIsDialogOpen(true);
            }}
            className="group p-4 rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all border-border/40 flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-base">
                    {student.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                      {student.name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider truncate">
                      {student.usn}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
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

            <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 p-2 rounded-lg">
              <Building2 size={12} className="shrink-0" />
              <span className="truncate">{student.branch_name}</span>
            </div>
          </motion.div>
        ))}
      </div>

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

      {/* Resident Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary p-6 text-primary-foreground relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150">
              <GraduationCap size={120} />
            </div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl font-semibold border border-white/30">
                {selectedStudent?.name?.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-semibold">{selectedStudent?.name}</h2>
                <p className="text-primary-foreground/70 font-mono tracking-widest text-sm uppercase">
                  {selectedStudent?.usn}
                </p>
                <div className="mt-2 flex gap-2">
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-none text-[10px]">
                    {selectedStudent?.branch_name}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 bg-background">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Hostel Location</p>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin size={14} className="text-primary" />
                  {selectedStudent?.room_hostel_name}, Room {selectedStudent?.room_name}
                </div>
                <p className="text-[10px] text-muted-foreground ml-6">Floor {selectedStudent?.room_floor ?? 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Personal Contact</p>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Phone size={14} className="text-primary" />
                  {selectedStudent?.phone || "N/A"}
                </div>
                <p className="text-[10px] text-muted-foreground ml-6 truncate">{selectedStudent?.user_email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Guardian Info</p>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <UserIcon size={14} className="text-primary" />
                  {selectedStudent?.parent_name || "N/A"}
                </div>
                <p className="text-[10px] text-muted-foreground ml-6">
                  {selectedStudent?.parent_contact ? `Ph: ${selectedStudent.parent_contact}` : 'No contact provided'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Medical Status</p>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <HeartPulse size={14} className="text-primary" />
                  Blood: {selectedStudent?.blood_group || "N/A"}
                </div>
                <div className="flex items-center gap-1.5 ml-6">
                  <div className={`w-1.5 h-1.5 rounded-full ${selectedStudent?.no_dues ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-[10px] text-muted-foreground">
                    {selectedStudent?.no_dues ? 'Dues Cleared' : 'Fees Pending'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="pt-2">
              <Button 
                variant="outline" 
                className="w-full rounded-xl gap-2 text-xs h-9"
                onClick={() => setIsDialogOpen(false)}
              >
                Close Profile
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WardenHostelOverview;
