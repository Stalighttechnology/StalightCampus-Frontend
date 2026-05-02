import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { manageRooms, manageHostels, manageHostelStudents, getFloorsByHostel } from '../../utils/hms_api';
import { useToast } from '../../hooks/use-toast';
import { Edit2, Trash2, Plus, LayoutGrid, Users as UsersIcon, Info } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { SkeletonCard } from '../ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

interface Hostel {
  id: number;
  name: string;
  floor_count?: number;
}

interface Room {
  id: number;
  no: string;
  name: string;
  room_type: 'S' | 'D' | 'P' | 'B';
  vacant: boolean;
  hostel: number;
  hostel_name?: string;
  student_count?: number;
  floor?: number;
}

import { useHMSContext } from "../../context/HMSContext";

const RoomManagement: React.FC = () => {
  const { hostels, loading: isLoadingHostels, getCachedFloors, getCachedRooms, refreshData, skeletonMode } = useHMSContext();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedHostel, setSelectedHostel] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomStudents, setRoomStudents] = useState<any[]>([]);
  const [roomStudentCounts, setRoomStudentCounts] = useState<{ [key: number]: number }>({});
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [formData, setFormData] = useState({
    no: '',
    name: '',
    room_type: 'S' as 'S' | 'D' | 'P' | 'B',
    vacant: true,
    hostel: 0
  });
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [selectedFloorFilter, setSelectedFloorFilter] = useState<string>("");
  const [availableFloors, setAvailableFloors] = useState<number[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();
  const { theme } = useTheme();
  const lastFetchRef = React.useRef<{hostel: number | null, floor: string}>({ hostel: null, floor: "" });

  useEffect(() => {
    if (selectedHostel) {
      fetchHostelFloors(selectedHostel);
    }
  }, [selectedHostel]);

  useEffect(() => {
    if (selectedHostel && selectedFloorFilter) {
      fetchRoomsByHostel(selectedHostel, selectedFloorFilter);
    } else {
      setRooms([]);
    }
  }, [selectedHostel, selectedFloorFilter]);

  // Auto-populate room number and name based on floor and hostel
  useEffect(() => {
    if (!editingRoom && selectedFloor !== null && formData.hostel) {
      // Find maximum room number on the same floor for auto-population
      // We can only do this accurately if we have all rooms for that floor
      // Since we now might be loading only one floor, it's safer.
      const floorRooms = rooms.filter(r => 
        r.hostel === formData.hostel && 
        (r.floor === selectedFloor || getFloorFromRoomNo(r.no) === selectedFloor)
      );
      
      let nextNo = (selectedFloor * 100) + 1;
      if (floorRooms.length > 0) {
        const roomNos = floorRooms.map(r => parseInt(r.no)).filter(n => !isNaN(n));
        if (roomNos.length > 0) {
          nextNo = Math.max(...roomNos) + 1;
        }
      } else if (selectedFloor === 0) {
        nextNo = 1;
      }
      
      const selectedHostelData = hostels.find(h => h.id === formData.hostel);
      const hostelName = selectedHostelData ? selectedHostelData.name : 'Room';
      
      setFormData(prev => ({
        ...prev,
        no: nextNo.toString(),
        name: `${hostelName}-${nextNo}`
      }));
    }
  }, [selectedFloor, formData.hostel, editingRoom, rooms, hostels]);

  const fetchStudents = async (roomId: number) => {
    setIsLoadingStudents(true);
    try {
      const response = await manageHostelStudents(undefined, undefined, 'GET', { room: roomId });
      if (response.success && response.results) {
        setRoomStudents(response.results);
      } else {
        setRoomStudents([]);
      }
    } catch (error) {
      console.error('Failed to fetch room students:', error);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const fetchHostelFloors = (hostelId: number) => {
    const hostel = hostels.find(h => h.id === hostelId);
    const floors = hostel ? Array.from({ length: hostel.floor_count || 1 }, (_, i) => i) : [];
    setAvailableFloors(floors);
  };

  const fetchRoomsByHostel = async (hostelId: number, floor?: string) => {
    setIsLoadingRooms(true);
    const results = await getCachedRooms(hostelId, floor);
    setRooms(results);
    
    const countsMap: { [key: number]: number } = {};
    results.forEach((room: any) => {
      countsMap[room.id] = room.student_count || 0;
    });
    setRoomStudentCounts(countsMap);
    setIsLoadingRooms(false);
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for duplicate room entry in the same hostel
    const duplicate = rooms.find(r => 
      r.hostel === formData.hostel && 
      r.no === formData.no && 
      (!editingRoom || r.id !== editingRoom.id)
    );

    if (duplicate) {
      toast({
        variant: "destructive",
        title: "Duplicate Room",
        description: `Room number ${formData.no} already exists in this hostel.`,
      });
      return;
    }

    const payload = { ...formData, floor: selectedFloor !== null ? selectedFloor : 0 };
    const method = editingRoom ? 'PUT' : 'POST';
    const response = await manageRooms(payload, editingRoom?.id, method);

    if (response.success) {
      const updatedRoom = response.data as Room | undefined;
      if (updatedRoom) {
        if (editingRoom) {
          setRooms(prev => prev.map(r => r.id === editingRoom.id ? updatedRoom : r));
        } else {
          setRooms(prev => [...prev, updatedRoom]);
        }
      }
      setIsDialogOpen(false);
      setEditingRoom(null);
      refreshData(true);
      toast({
        title: "Success",
        description: `Room ${editingRoom ? 'updated' : 'created'} successfully`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: response.message || "Failed to save room",
      });
    }
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      no: room.no,
      name: room.name,
      room_type: room.room_type,
      vacant: room.vacant,
      hostel: room.hostel
    });
    setSelectedFloor(room.floor !== undefined ? room.floor : getFloorFromRoomNo(room.no));
    fetchStudents(room.id);
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
      const response = await manageRooms(undefined, id, 'DELETE');
      if (response.success) {
        setRooms(prev => prev.filter(r => r.id !== id));
        refreshData(true);
        toast({
          title: "Success",
          description: "Room deleted successfully",
        });
      }
    }
  };

  const getRoomTypeLabel = (type: string) => {
    const labels = { 'S': 'Single', 'D': 'Double', 'P': 'Scholar', 'B': 'Both' };
    return labels[type as keyof typeof labels] || type;
  };

  const getRoomCapacity = (roomType: 'S' | 'D' | 'P' | 'B'): number => {
    const capacities = { 'S': 1, 'D': 2, 'P': 1, 'B': 2 };
    return capacities[roomType] || 1;
  };

  const getRoomStatus = (room: Room, studentCount: number) => {
    const capacity = getRoomCapacity(room.room_type);
    if (studentCount === 0) return { status: 'empty', color: 'green', label: 'Empty' };
    if (studentCount < capacity) return { status: 'partial', color: 'yellow', label: 'Partial' };
    return { status: 'full', color: 'red', label: 'Full' };
  };

  const getRoomColorClasses = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/20';
      case 'yellow': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20';
      case 'red': return 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20';
      default: return 'bg-muted/50 border-border text-muted-foreground';
    }
  };

  const getFloorFromRoomNo = (roomNo: string): number => Math.floor(parseInt(roomNo) / 100) || 0;
  const hostelRooms = selectedHostel ? rooms.filter(r => r.hostel === selectedHostel) : [];
  const floors = [...new Set(hostelRooms.map(r => r.floor !== undefined ? r.floor : getFloorFromRoomNo(r.no)))].sort((a, b) => a - b);

  // No early return, handle loading in CardContent for better UX

  return (
    <div className="space-y-4">
      <Card className="border-primary/10 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4 border-b">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-row items-center gap-4 w-full md:w-auto">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex flex-col w-full">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none mb-1">Current Hostel</span>
                  {isLoadingHostels || skeletonMode ? (
                    <div className="w-full md:w-[200px] h-9 rounded-md bg-muted animate-pulse border" />
                  ) : (
                    <Select value={selectedHostel?.toString() || ''} onValueChange={(v) => {
                      setSelectedHostel(parseInt(v));
                      setSelectedFloorFilter("");
                    }}>
                      <SelectTrigger className="w-full md:w-[200px] h-9 border bg-transparent p-2 focus:ring-1 font-normal text-md">
                        <SelectValue placeholder="Select Hostel" />
                      </SelectTrigger>
                      <SelectContent>
                        {hostels.map((hostel) => (
                          <SelectItem key={hostel.id} value={hostel.id.toString()} className="font-normal">
                            {hostel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Floor Filter */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex flex-col w-full">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none mb-1">Current Floor</span>
                  {isLoadingHostels || skeletonMode ? (
                    <div className="w-full md:w-[160px] h-9 rounded-md bg-muted animate-pulse border" />
                  ) : (
                    <Select value={selectedFloorFilter} onValueChange={setSelectedFloorFilter}>
                      <SelectTrigger className="w-full md:w-[160px] h-9 border bg-transparent p-2 focus:ring-1 font-normal text-md">
                        <SelectValue placeholder="Choose Floor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Floors</SelectItem>
                        {availableFloors.sort((a, b) => a - b).map(f => (
                          <SelectItem key={f} value={f.toString()}>
                            {f === 0 ? 'Ground Floor' : `Floor ${f}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-row items-center gap-3 w-full md:w-auto">
              {isLoadingHostels || skeletonMode ? (
                <div className="h-9 w-full sm:w-[120px] rounded-md bg-muted animate-pulse border" />
              ) : (
                <Button
                  variant={isEditMode ? "secondary" : "outline"}
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`h-9 px-4 font-semibold transition-all ${isEditMode ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20' : ''} w-full sm:w-auto`}
                >
                  <Edit2 className={`w-4 h-4 mr-2 ${isEditMode ? 'animate-pulse' : ''}`} />
                  {isEditMode ? "Done Editing" : "Edit Rooms"}
                </Button>
              )}

              {isLoadingHostels || skeletonMode ? (
                <div className="h-9 w-full sm:w-[120px] rounded-md bg-muted animate-pulse border" />
              ) : (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingRoom(null);
                      setSelectedFloor(null);
                      setFormData({ no: '', name: '', room_type: 'S', vacant: true, hostel: selectedHostel || 0 });
                    }} className="bg-primary hover:bg-primary/90 h-9 px-4 font-semibold shadow-sm whitespace-nowrap w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" /> Add Room
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[90vw] sm:max-w-md rounded-xl">
                    <DialogHeader>
                      <DialogTitle>{editingRoom ? 'Edit Room' : 'Add Room'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hostel</Label>
                        <Select value={formData.hostel.toString()} onValueChange={(v) => setFormData({ ...formData, hostel: parseInt(v) })}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Select hostel" /></SelectTrigger>
                          <SelectContent>
                            {hostels.map(h => <SelectItem key={h.id} value={h.id.toString()}>{h.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Floor</Label>
                        <Select value={selectedFloor?.toString() || ''} onValueChange={(v) => setSelectedFloor(parseInt(v))}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Select floor" /></SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: hostels.find(h => h.id === formData.hostel)?.floor_count || 6 }, (_, i) => i).map(f => (
                              <SelectItem key={f} value={f.toString()}>{f === 0 ? 'Ground Floor' : `${f}${f === 1 ? 'st' : f === 2 ? 'nd' : f === 3 ? 'rd' : 'th'} Floor`}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Room Number</Label>
                          <Input value={formData.no} onChange={(e) => setFormData({ ...formData, no: e.target.value })} required className="h-10" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Room Name</Label>
                          <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Optional" className="h-10" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Room Type</Label>
                        <Select value={formData.room_type} onValueChange={(v) => setFormData({ ...formData, room_type: v as any })}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="S">Single</SelectItem>
                            <SelectItem value="D">Double</SelectItem>
                            <SelectItem value="P">Triple</SelectItem>
                            <SelectItem value="B">Four Bed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {editingRoom && (
                        <div className="p-4 bg-muted/50 rounded-lg border border-dashed space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Info size={14} /> Capacity Info
                          </h4>
                          <div className="flex justify-between text-xs">
                            <span>Assigned Students:</span>
                            <span className="font-bold">{roomStudents.length} / {getRoomCapacity(formData.room_type)}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-primary h-full"
                              style={{ width: `${(roomStudents.length / getRoomCapacity(formData.room_type)) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        {editingRoom && (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 px-4 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                            onClick={() => {
                              handleDelete(editingRoom.id);
                              setIsDialogOpen(false);
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                        <Button type="submit" className="flex-1 h-10 font-bold">{editingRoom ? 'Update Room' : 'Create Room'}</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">

          {/* Legend */}
          <div className=" p-6 mb-4 rounded-2xl bg-muted/30 border-2 border-dashed">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">Room Occupancy Legend</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 border-2 border-green-500/20" />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-green-600 dark:text-green-400">Empty</span>
                  <p className="text-[10px] text-muted-foreground">0 students assigned</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border-2 border-yellow-500/20" />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">Partial</span>
                  <p className="text-[10px] text-muted-foreground">Under maximum capacity</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 border-2 border-red-500/20" />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-red-600 dark:text-red-400">Full</span>
                  <p className="text-[10px] text-muted-foreground">At maximum capacity</p>
                </div>
              </div>
            </div>
          </div>


          {/* Room Matrix View */}
          <AnimatePresence mode="wait">
            {(isLoadingRooms || skeletonMode) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <SkeletonCard className="h-48" />
                <SkeletonCard className="h-48" />
                <SkeletonCard className="h-48" />
                <SkeletonCard className="h-48" />
                <SkeletonCard className="h-48" />
                <SkeletonCard className="h-48" />
              </div>
            ) : !selectedFloorFilter ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-muted/50"
              >
                <LayoutGrid className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground font-medium text-lg text-center px-4">Select a floor to view and manage rooms</p>
                <p className="text-muted-foreground/70 text-sm text-center px-4 mt-1">Choose a floor from the dropdown above to continue</p>
              </motion.div>
            ) : (
              <motion.div
                key={selectedHostel}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {floors
                  .filter(f => selectedFloorFilter === "all" || f.toString() === selectedFloorFilter)
                  .map((floor) => {
                    const floorRooms = hostelRooms.filter(r => (r.floor !== undefined ? r.floor : getFloorFromRoomNo(r.no)) === floor).sort((a, b) => parseInt(a.no) - parseInt(b.no));
                    return (
                      <div key={floor} className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <LayoutGrid size={16} /> Floor {floor === 0 ? 'Ground' : floor}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {floorRooms.map((room) => {
                            const studentCount = roomStudentCounts[room.id] || 0;
                            const status = getRoomStatus(room, studentCount);
                            return (
                              <div
                                key={room.id}
                                className={`group relative p-4 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer overflow-hidden ${getRoomColorClasses(status.color)}`}
                              >
                                <div className="space-y-1">
                                  <div className="text-sm font-bold tracking-tight">{room.name}</div>
                                  <div className="text-[10px] uppercase opacity-70 font-semibold">{getRoomTypeLabel(room.room_type)}</div>
                                  <div className="flex items-center justify-center gap-1.5 mt-2">
                                    <UsersIcon size={12} className="opacity-70" />
                                    <span className="text-xs font-bold">{studentCount} / {getRoomCapacity(room.room_type)}</span>
                                  </div>
                                </div>

                                {/* Edit Overlay - Only in Edit Mode */}
                                <AnimatePresence>
                                  {isEditMode && (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                      className="absolute inset-0 bg-primary/5 backdrop-blur-[1px] border-2 border-primary/50 rounded-xl flex items-center justify-center z-10"
                                    >
                                      <Button
                                        size="sm"
                                        className="h-8 px-3 text-[10px] font-bold shadow-lg bg-primary hover:bg-primary/90"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEdit(room);
                                        }}
                                      >
                                        <Edit2 size={12} className="mr-1.5" /> Edit Details
                                      </Button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                }
                {hostelRooms.length === 0 && (
                  <Card className="border-dashed py-12">
                    <div className="text-center space-y-2">
                      <LayoutGrid className="w-12 h-12 mx-auto text-muted-foreground opacity-20" />
                      <p className="text-muted-foreground">No rooms found for this hostel.</p>
                    </div>
                  </Card>
                )}
                {hostelRooms.length > 0 && floors.filter(f => selectedFloorFilter === "all" || f.toString() === selectedFloorFilter).length === 0 && (
                  <Card className="border-dashed py-12">
                    <div className="text-center space-y-2">
                      <LayoutGrid className="w-12 h-12 mx-auto text-muted-foreground opacity-20" />
                      <p className="text-muted-foreground">No rooms found for the selected floor.</p>
                    </div>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoomManagement;