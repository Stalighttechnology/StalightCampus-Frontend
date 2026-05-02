import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, Users, Grid3X3, AlertCircle, ClipboardList, Eye } from "lucide-react";
import { useWardenContext } from "../../context/WardenContext";
import { useToast } from "../../hooks/use-toast";
import DashboardCard from "../common/DashboardCard";
import { 
  SkeletonPageHeader, 
  SkeletonStatsGrid, 
  SkeletonCard 
} from "../ui/skeleton";

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
import { getWardenRooms } from "../../utils/warden_api";
import { getRoomDetail } from "../../utils/hms_api";

interface Hostel {
  id: number;
  name: string;
  gender: string;
  room_count: number;
  student_count: number;
}

interface Resident {
  id: number;
  name: string;
  usn: string;
  branch_name: string;
}

interface Room {
  id: number;
  hostel: number;
  name: string;
  room_number: string;
  room_type: 'S' | 'D' | 'P' | 'B';
  capacity: number;
  student_count: number;
  floor: number;
  residents?: Resident[];
}

const WardenDashboard = () => {
  const { toast } = useToast();
  const { 
    managedHostels: hostels, 
    wardenFloorsMap, 
    wardenName, 
    stats, 
    loading: contextLoading 
  } = useWardenContext();
  const [selectedHostel, setSelectedHostel] = useState<number | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string>("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [availableFloors, setAvailableFloors] = useState<number[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loadingRoomDetails, setLoadingRoomDetails] = useState(false);

  useEffect(() => {
    if (hostels.length > 0 && selectedHostel === null) {
      setSelectedHostel(hostels[0].id);
    }
  }, [hostels, selectedHostel]);

  useEffect(() => {
    if (selectedHostel) {
      setRooms([]);
      setSelectedFloor(""); // Reset floor when hostel changes
      const floors = wardenFloorsMap[selectedHostel] || [];
      setAvailableFloors(floors);
    }
  }, [selectedHostel, wardenFloorsMap]);

  useEffect(() => {
    if (selectedHostel && selectedFloor) {
      fetchRooms(selectedHostel, selectedFloor);
    } else {
      setRooms([]);
    }
  }, [selectedHostel, selectedFloor]);

  const fetchRooms = async (hostelId: number, floor: string) => {
    setLoadingRooms(true);
    try {
      const result = await getWardenRooms(hostelId, floor);
      if (result.success) {
        setRooms(result.rooms);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleRoomClick = async (room: Room) => {
    setSelectedRoom(room);
    setIsDialogOpen(true);
    setLoadingRoomDetails(true);
    try {
      const result = await getRoomDetail(room.id);
      if (result.success) {
        // Use the detailed data which includes residents
        setSelectedRoom(result.data);
      }
    } catch (error) {
      console.error("Error fetching room details:", error);
    } finally {
      setLoadingRoomDetails(false);
    }
  };

  const getRoomColor = (occupied: number, capacity: number) => {
    const occupancyPercent = (occupied / capacity) * 100;
    if (occupancyPercent === 100) return "bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-400";
    if (occupancyPercent >= 50) return "bg-yellow-500/10 border-yellow-500/50 text-yellow-600 dark:text-yellow-400";
    return "bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400";
  };

  const roomsByFloor = rooms.reduce((acc, room) => {
    if (!acc[room.floor]) acc[room.floor] = [];
    acc[room.floor].push(room);
    return acc;
  }, {} as Record<number, Room[]>);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  if (contextLoading) {
    return (
      <div className="space-y-8">
        <SkeletonPageHeader />
        <SkeletonStatsGrid items={4} />
        <SkeletonCard className="h-[400px]" />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Overview & Hostels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Hostel Selection Cards */}
        {hostels.map((hostel) => (
          <motion.div
            key={hostel.id}
            whileHover={{ y: -5 }}
            onClick={() => setSelectedHostel(hostel.id)}
            className={`p-4 rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all cursor-pointer ${
              selectedHostel === hostel.id ? "border-primary ring-1 ring-primary/20" : "border-border/40"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-base leading-tight">{hostel.name}</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  {hostel.gender === 'M' ? 'Boys Hostel' : 'Girls Hostel'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="text-center p-2 rounded-lg bg-muted/20">
                <div className="text-xl font-bold text-primary">{hostel.room_count}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Rooms</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/20">
                <div className="text-xl font-bold text-primary">{hostel.student_count}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Students</div>
              </div>
            </div>
          </motion.div>
        ))}
        {/* Global Stats Cards */}
        <DashboardCard
          title="Pending Issues"
          value={stats?.pending_issues || 0}
          description="Awaiting resolution"
          icon={<AlertCircle size={20} className="text-amber-500" />}
        />
        <DashboardCard
          title="Occupancy Rate"
          value={`${stats?.occupancy_rate || 0}%`}
          description="Room utilization"
          icon={<ClipboardList size={20} className="text-green-500" />}
        />
      </div>

      {/* Room Matrix Visualization (Mirroring HMS Admin) */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Room Occupancy Matrix</h2>
              <p className="text-sm text-muted-foreground">Visual breakdown of room availability by floor.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {/* Floor Filter */}
              <div className="w-full sm:w-40 md:w-48">
                <Select
                  value={selectedFloor}
                  onValueChange={setSelectedFloor}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose Floor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    {availableFloors
                      .sort((a, b) => a - b)
                      .map((floor) => (
                        <SelectItem key={floor} value={floor.toString()}>
                          Floor {floor === 0 ? 'Ground' : floor}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center gap-2 text-xs font-medium">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Half Full</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Full</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loadingRooms ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg border bg-muted animate-pulse" />
              ))}
            </div>
          ) : selectedHostel ? (
            !selectedFloor ? (
              <div className="text-center py-12 text-muted-foreground">
                <Grid3X3 size={48} className="mx-auto mb-4 opacity-10" />
                <p>Select a floor to view the room occupancy matrix.</p>
              </div>
            ) : Object.keys(roomsByFloor).length > 0 ? (
              <div className="space-y-8">
                {Object.keys(roomsByFloor)
                  .map((k) => Number(k))
                  .sort((a, b) => a - b)
                  .filter((f) => selectedFloor === "all" || f.toString() === selectedFloor)
                  .map((floorNum) => (
                    <div key={floorNum}>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                        Floor {floorNum === 0 ? 'Ground' : floorNum}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                        {roomsByFloor[floorNum].map((room) => (
                          <motion.div
                            key={room.id}
                            whileHover={{ scale: 1.05 }}
                            onClick={() => handleRoomClick(room)}
                            className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${getRoomColor(
                              room.student_count,
                              room.capacity
                            )} font-medium shadow-sm hover:shadow-md`}
                            title={`${room.room_number}: ${room.student_count}/${room.capacity} students. Click to view.`}
                          >
                            <div className="text-[10px] opacity-70 mb-1">ROOM</div>
                            <div className="text-sm font-bold">{room.room_number}</div>
                            <div className="text-[10px] mt-1 font-bold">
                              {room.student_count}/{room.capacity}
                            </div>
                            <div className="mt-2 pt-2 border-t border-current/10 flex items-center justify-center gap-1 text-[12px] uppercase tracking-wider font-bold opacity-60 group-hover:opacity-100 transition-all">
                              <Eye size={15} />
                              <span>View</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No rooms available for this hostel.
              </div>
            )
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Select a hostel card above to view room occupancy.
            </div>
          )}
        </div>
      </div>

      {/* Room Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[92vw] max-w-[400px] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${selectedRoom ? getRoomColor(selectedRoom.student_count, selectedRoom.capacity).split(' ')[0].replace('/10', '') : ''}`} />
              Room {selectedRoom?.room_number} Residents
            </DialogTitle>
            <DialogDescription>
              {selectedRoom?.student_count} of {selectedRoom?.capacity} beds occupied.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {loadingRoomDetails ? (
              <div className="space-y-3">
                <div className="h-16 w-full rounded-xl bg-muted animate-pulse" />
                <div className="h-16 w-full rounded-xl bg-muted animate-pulse" />
              </div>
            ) : selectedRoom?.residents && selectedRoom.residents.length > 0 ? (
              <div className="grid gap-3">
                {selectedRoom.residents.map((resident) => (
                  <div 
                    key={resident.id} 
                    className="flex items-center justify-between p-3 rounded-xl border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {resident.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{resident.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-tight">
                          {resident.branch_name}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono bg-muted px-2 py-1 rounded border">
                      {resident.usn}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users size={32} className="mx-auto mb-2 opacity-20" />
                <p>No residents assigned to this room.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default WardenDashboard;
