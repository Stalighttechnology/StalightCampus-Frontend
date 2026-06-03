import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { manageHostels, manageWardens, manageCaretakers } from '../../utils/hms_api';
import { useToast } from '../../hooks/use-toast';
import { Plus, Edit2, Trash2, Building, Search, User, Shield, MapPin, Loader2 } from 'lucide-react';
import { SkeletonTable } from '../ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useHMSContext } from '../../context/HMSContext';
import Swal from 'sweetalert2';

interface Warden {
  id: number;
  name: string;
}

interface Caretaker {
  id: number;
  name: string;
}

interface Hostel {
  id: number;
  name: string;
  gender: 'M' | 'F';
  warden: number | null;
  caretaker: number | null;
  warden_name?: string;
  caretaker_name?: string;
  floor_count?: number;
  address?: string;
}

const parseCoordinates = (addressStr?: string) => {
  if (!addressStr) return { latitude: '12.9716', longitude: '77.5946', radius: '500' };
  const parts = addressStr.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      const radius = parts.length >= 3 ? (parts[2] || '500') : '500';
      return { latitude: parts[0], longitude: parts[1], radius };
    }
  }
  return { latitude: '12.9716', longitude: '77.5946', radius: '500' };
};

const isCoordsFormat = (addressStr?: string) => {
  if (!addressStr) return false;
  const parts = addressStr.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    return !isNaN(lat) && !isNaN(lng);
  }
  return false;
};

const HostelManagement: React.FC = () => {
  const { hostels, wardens, caretakers, statistics, loading, refreshData, setHostels, setStatistics, skeletonMode } = useHMSContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHostel, setEditingHostel] = useState<Hostel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    gender: 'M' as 'M' | 'F',
    floor_count: 1,
    warden: null as number | null,
    caretaker: null as number | null,
    address: '',
    latitude: '12.9716',
    longitude: '77.5946',
    radius: '500'
  });
  const { toast } = useToast();



  const handleEdit = (hostel: Hostel) => {
    setEditingHostel(hostel);
    const coords = parseCoordinates(hostel.address);
    setFormData({
      name: hostel.name,
      gender: hostel.gender,
      floor_count: hostel.floor_count || 1,
      warden: hostel.warden,
      caretaker: hostel.caretaker,
      address: hostel.address || '',
      latitude: coords.latitude,
      longitude: coords.longitude,
      radius: coords.radius
    });
    setIsDialogOpen(true);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: 'destructive', title: 'Error', description: 'Geolocation is not supported by this browser' });
      return;
    }
    setFetchingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const roundTo6 = (num: number) => Math.round(num * 1000000) / 1000000;
        const latitude = roundTo6(position.coords.latitude).toString();
        const longitude = roundTo6(position.coords.longitude).toString();
        setFormData((prev) => ({
          ...prev,
          latitude,
          longitude
        }));
        setFetchingLocation(false);
        toast({ title: 'Success', description: 'Current location set successfully' });
      },
      (error) => {
        setFetchingLocation(false);
        toast({ variant: 'destructive', title: 'Error', description: 'Unable to get location: ' + error.message });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
      try {
        const response = await manageHostels(undefined, id, 'DELETE');
        if (response.success) {
          toast({ title: 'Success', description: 'Hostel deleted successfully' });
          await refreshData(true);
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete hostel' });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingHostel ? 'PUT' : 'POST';
      const serializedAddress = `${formData.latitude},${formData.longitude},${formData.radius}`;
      const payload = {
        ...formData,
        address: serializedAddress
      };
      const response = await manageHostels(payload, editingHostel?.id, method);

      if (response.success) {
        toast({
          title: 'Success',
          description: `Hostel ${editingHostel ? 'updated' : 'created'} successfully`
        });
        setIsDialogOpen(false);
        await refreshData(true);

        setEditingHostel(null);
        setFormData({ name: '', gender: 'M', floor_count: 1, warden: null, caretaker: null, address: '', latitude: '12.9716', longitude: '77.5946', radius: '500' });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to save hostel",
        });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save hostel' });
    }
  };

  const filteredHostels = hostels.filter(h =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.warden_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.caretaker_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader id="hms-hostels-card" className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" />
              Registered Hostels
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                {loading || skeletonMode ? (
                  <div className="h-10 w-full rounded-md bg-muted animate-pulse border" />
                ) : (
                  <Input
                    placeholder="Search hostels..."
                    className="pl-10 h-10 bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                )}
              </div>

              {loading || skeletonMode ? (
                <div className="h-10 w-full sm:w-[130px] rounded-md bg-muted animate-pulse border" />
              ) : (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingHostel(null);
                      setFormData({ name: '', gender: 'M', floor_count: 1, warden: null, caretaker: null, address: '', latitude: '12.9716', longitude: '77.5946', radius: '500' });
                    }} className="bg-primary hover:bg-primary/90 h-10 whitespace-nowrap w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" /> Add Hostel
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95%] sm:max-w-[600px] rounded-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <DialogHeader>
                      <DialogTitle>{editingHostel ? 'Edit Hostel' : 'Add Hostel'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hostel Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          placeholder="e.g. Aryabhata Block"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hostel Type</Label>
                        <Select value={formData.gender} onValueChange={(value: 'M' | 'F') => setFormData({ ...formData, gender: value })}>
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">Boys Hostel</SelectItem>
                            <SelectItem value="F">Girls Hostel</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="floor_count" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Floor Count</Label>
                        <Input
                          id="floor_count"
                          type="number"
                          min="1"
                          max="20"
                          value={formData.floor_count}
                          onChange={(e) => setFormData({ ...formData, floor_count: parseInt(e.target.value) || 1 })}
                          required
                          className="h-10"
                        />
                      </div>
                      
                      {editingHostel && editingHostel.address && !isCoordsFormat(editingHostel.address) && (
                        <div className="space-y-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                          <Label className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Legacy Address (Plain Text)</Label>
                          <p className="text-xs text-muted-foreground mt-1 break-words">{editingHostel.address}</p>
                          <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-1 italic font-medium">Note: Setting coordinates below will update this to the map coordinate format.</p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="latitude" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Center Latitude *</Label>
                          <Input
                            id="latitude"
                            type="number"
                            step="any"
                            value={formData.latitude}
                            onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                            required
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="longitude" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Center Longitude *</Label>
                          <Input
                            id="longitude"
                            type="number"
                            step="any"
                            value={formData.longitude}
                            onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                            required
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="radius" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Radius (meters) *</Label>
                          <Input
                            id="radius"
                            type="number"
                            min="10"
                            max="5000"
                            value={formData.radius}
                            onChange={(e) => setFormData({ ...formData, radius: e.target.value })}
                            required
                            className="h-10"
                          />
                        </div>
                      </div>

                      <div className="flex justify-start">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={getCurrentLocation}
                          className="flex items-center gap-2 whitespace-nowrap"
                          disabled={fetchingLocation}
                        >
                          {fetchingLocation ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Fetching...
                            </>
                          ) : (
                            <>
                              <MapPin className="w-4 h-4" />
                              Current Location
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="w-full h-[180px] border rounded-lg overflow-hidden relative">
                        <iframe
                          src={`https://maps.google.com/maps?q=${parseFloat(formData.latitude) || 12.9716},${parseFloat(formData.longitude) || 77.5946}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                          className="absolute inset-0 w-full h-full"
                          style={{ border: 0, objectFit: 'cover' }}
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title="Hostel Location Map"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="warden" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Warden</Label>
                          <Select value={formData.warden?.toString() || 'unset'} onValueChange={(value) => setFormData({ ...formData, warden: value === 'unset' ? null : parseInt(value) })}>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select warden" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unset">Not Assigned</SelectItem>
                              {wardens.map((warden) => (
                                <SelectItem key={warden.id} value={warden.id.toString()}>
                                  {warden.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="caretaker" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Caretaker</Label>
                          <Select value={formData.caretaker?.toString() || 'unset'} onValueChange={(value) => setFormData({ ...formData, caretaker: value === 'unset' ? null : parseInt(value) })}>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select caretaker" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unset">Not Assigned</SelectItem>
                              {caretakers.map((caretaker) => (
                                <SelectItem key={caretaker.id} value={caretaker.id.toString()}>
                                  {caretaker.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button type="submit" className="w-full h-10 mt-2">{editingHostel ? 'Update Hostel' : 'Create Hostel'}</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading || skeletonMode ? (
            <SkeletonTable rows={5} columns={5} />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold">Hostel Name</TableHead>
                    <TableHead className="font-bold">Type</TableHead>
                    <TableHead className="font-bold">Location</TableHead>
                    <TableHead className="font-bold">Warden</TableHead>
                    <TableHead className="font-bold">Caretaker</TableHead>
                    <TableHead className="text-right font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHostels.length > 0 ? (
                    filteredHostels.map((hostel) => (
                      <TableRow key={hostel.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">{hostel.name}</TableCell>
                        <TableCell>
                          <Badge variant={hostel.gender === 'M' ? 'default' : 'secondary'} className={hostel.gender === 'M' ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200' : 'bg-pink-500/10 text-pink-600 hover:bg-pink-500/20 border-pink-200'}>
                            {hostel.gender === 'M' ? 'Boys' : 'Girls'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-[150px] truncate">
                          {hostel.address && isCoordsFormat(hostel.address)
                            ? hostel.address.split(',').slice(0, 2).join(', ')
                            : (hostel.address || '—')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Shield size={14} className="text-primary opacity-70" />
                            {hostel.warden_name || 'Not Assigned'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <User size={14} className="text-muted-foreground" />
                            {hostel.caretaker_name || 'Not Assigned'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon" onClick={() => handleEdit(hostel)} className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200">
                              <Edit2 size={14} />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => handleDelete(hostel.id)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200">
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        {searchQuery ? 'No hostels match your search.' : 'No hostels found.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

      </Card>
    </div>
  );
};

export default HostelManagement;