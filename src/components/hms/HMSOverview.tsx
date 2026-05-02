import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Users, Grid3X3, Shield, AlertCircle, Eye } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { useTheme } from "../../context/ThemeContext";
import { useHMSContext } from "../../context/HMSContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from "@/components/ui/dialog";
import { getRoomDetail } from "../../utils/hms_api";
import DashboardCard from "../common/DashboardCard";
import { 
  SkeletonStatsGrid, 
  SkeletonCard 
} from "../ui/skeleton";

interface Hostel {
  id: number;
  name: string;
  capacity: number;
  warden?: number;
  caretaker?: number;
  floor_count?: number;
}

interface Room {
  id: number;
  hostel: number;
  hostel_name?: string;
  room_number: string;
  room_type: 'S' | 'D' | 'P' | 'B';
  capacity: number;
  student_count: number;
  floor?: number;
  residents?: {
    id: number;
    name: string;
    usn: string;
    branch_name: string;
  }[];
}

interface Stats {
  totalHostels: number;
  totalRooms: number;
  totalStudents: number;
  totalWardens: number;
  totalCaretakers: number;
  occupancyRate: number;
}

const HMSOverview = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const { hostels, statistics, loading, getCachedFloors, getCachedRooms, skeletonMode } = useHMSContext();
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedHostel, setSelectedHostel] = useState<number | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string>("");
  const [availableFloors, setAvailableFloors] = useState<number[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loadingRoomDetails, setLoadingRoomDetails] = useState(false);

  // Map backend stats to component stats
  const stats = {
    totalHostels: statistics.total_hostels,
    totalRooms: statistics.total_rooms,
    totalStudents: statistics.total_students,
    totalWardens: statistics.total_wardens,
    totalCaretakers: statistics.total_caretakers,
    occupancyRate: statistics.occupancy_rate,
  };

  // Fetch floors when hostel is selected
  useEffect(() => {
    if (selectedHostel) {
      fetchHostelFloors(selectedHostel);
      setRooms([]); // Clear rooms when hostel changes
    } else {
      setAvailableFloors([]);
      setRooms([]);
    }
  }, [selectedHostel]);

  // Fetch rooms when both hostel and floor are selected
  useEffect(() => {
    if (selectedHostel && selectedFloor) {
      fetchHostelRooms(selectedHostel, selectedFloor);
    } else {
      setRooms([]);
    }
  }, [selectedHostel, selectedFloor]);

  const fetchHostelFloors = (hostelId: number) => {
    const hostel = hostels.find(h => h.id === hostelId);
    const floors = hostel ? Array.from({ length: hostel.floor_count || 1 }, (_, i) => i) : [];
    setAvailableFloors(floors);
  };

  const fetchHostelRooms = async (hostelId: number, floor?: string) => {
    setLoadingRooms(true);
    const results = await getCachedRooms(hostelId, floor);
    setRooms(results);
    setLoadingRooms(false);
  };
  
  const handleRoomClick = async (room: Room) => {
    setSelectedRoom(room);
    setIsDialogOpen(true);
    setLoadingRoomDetails(true);
    try {
      const result = await getRoomDetail(room.id);
      if (result.success) {
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
    if (occupancyPercent === 100) return "bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-400"; // Full
    if (occupancyPercent >= 50) return "bg-yellow-500/10 border-yellow-500/50 text-yellow-600 dark:text-yellow-400"; // Half full
    return "bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400"; // Available
  };

  const getRoomStatusLabel = (occupied: number, capacity: number) => {
    const occupancyPercent = (occupied / capacity) * 100;
    if (occupancyPercent === 100) return "FULL";
    if (occupancyPercent >= 50) return "HALF";
    return "AVAIL";
  };

  // Helper: derive floor number from room_number like H1-101 -> 1, H1-001 -> 0
  const getFloorFromRoomNumber = (roomNumber: string) => {
    if (!roomNumber) return 0;
    const m = roomNumber.match(/(\d+)$/);
    if (!m) return 0;
    const num = parseInt(m[1], 10);
    if (isNaN(num)) return 0;
    return Math.floor(num / 100);
  };

  // Group rooms by floor for display and sort within floors
  const roomsByFloor = rooms.reduce((acc, room) => {
    const floor = room.floor !== undefined ? room.floor : getFloorFromRoomNumber(room.room_number || '');
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {} as Record<number, Room[]>);

  // Ensure rooms in each floor are sorted by room_number
  Object.keys(roomsByFloor).forEach((f) => {
    roomsByFloor[Number(f)].sort((a, b) => (a.room_number).localeCompare(b.room_number, undefined, {numeric: true}));
  });

  // No variants needed anymore

  // No early return for loading to keep titles visible
  const isSkeleton = loading || skeletonMode;

  return (
    <div className="space-y-8">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <DashboardCard
          title="Total Hostels"
          value={isSkeleton ? <div className="h-8 w-12 bg-muted animate-pulse rounded" /> : stats.totalHostels}
          description="Managed properties"
          icon={<Building2 size={20} />}
        />
        <DashboardCard
          title="Total Rooms"
          value={isSkeleton ? <div className="h-8 w-16 bg-muted animate-pulse rounded" /> : stats.totalRooms}
          description="Total capacity"
          icon={<Grid3X3 size={20} />}
        />
        <DashboardCard
          title="Total Students"
          value={isSkeleton ? <div className="h-8 w-14 bg-muted animate-pulse rounded" /> : stats.totalStudents}
          description="Active residents"
          icon={<Users size={20} />}
        />
        <DashboardCard
          title="Wardens"
          value={isSkeleton ? <div className="h-8 w-10 bg-muted animate-pulse rounded" /> : stats.totalWardens}
          description="Hostel supervisors"
          icon={<Shield size={20} />}
        />
        <DashboardCard
          title="Occupancy"
          value={isSkeleton ? (
            <div className="flex items-baseline gap-1">
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              <span className="text-xl font-bold text-muted-foreground">%</span>
            </div>
          ) : `${stats.occupancyRate}%`}
          description="Current utilization"
          icon={<AlertCircle size={20} />}
        />
      </div>

      {/* Room Matrix Visualization */}
      <div
        className={`rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden`}
      >
        <div className="p-6 border-b bg-muted/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Room Occupancy Matrix</h2>
              <p className="text-sm text-muted-foreground">Visual breakdown of room availability by floor.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {/* Hostel Filter */}
              <div className="w-full sm:w-48 md:w-64">
                {isSkeleton ? (
                  <div className="h-10 w-full rounded-md bg-muted animate-pulse border" />
                ) : (
                  <Select
                    value={selectedHostel?.toString() || ''}
                    onValueChange={(v) => {
                      setSelectedHostel(Number(v));
                      setSelectedFloor("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose Hostel" />
                    </SelectTrigger>
                    <SelectContent>
                      {hostels.map((hostel) => (
                        <SelectItem key={hostel.id} value={hostel.id.toString()}>
                          {hostel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Floor Filter */}
              <div className="w-full sm:w-40 md:w-48">
                {isSkeleton ? (
                  <div className="h-10 w-full rounded-md bg-muted animate-pulse border" />
                ) : (
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
                )}
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
          {loadingRooms || skeletonMode ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg border bg-muted animate-pulse" />
              ))}
            </div>
          ) : selectedHostel ? (
            !selectedFloor ? (
              <div className="text-center py-12 text-muted-foreground">
                Select a floor to view room occupancy.
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
                            variants={itemVariants}
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
              Select a hostel to view room occupancy.
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
    </div>
  );
};

export default HMSOverview;
