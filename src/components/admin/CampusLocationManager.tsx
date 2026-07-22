import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MapPin, Save, Plus, Edit, Trash2 } from 'lucide-react';
import { manageCampusLocation } from '@/utils/admin_api';
import { toast } from 'sonner';
import { useTheme } from '../../context/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton, SkeletonList } from '@/components/ui/skeleton';

interface CampusLocation {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  min_latitude?: number;
  max_latitude?: number;
  min_longitude?: number;
  max_longitude?: number;
  created_at: string;
  updated_at: string;
}



const CampusLocationManager: React.FC = () => {
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingLocation, setEditingLocation] = useState<CampusLocation | null>(null);
  const [showForm, setShowForm] = useState(false);
    
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    center_latitude: 12.9716, // Default to Bangalore coordinates
    center_longitude: 77.5946,
    radius_meters: 500,
    min_latitude: '',
    max_latitude: '',
    min_longitude: '',
    max_longitude: ''
  });

        
      const [iframeUrl, setIframeUrl] = useState('');

    
  // Generate iframe URL from coordinates
  const generateIframeUrl = (lat: number, lng: number, zoom: number = 15) => {
    return `https://maps.google.com/maps?q=${lat},${lng}&t=&z=${zoom}&ie=UTF8&iwloc=&output=embed`;
  };

  // Update iframe URL when coordinates change
  useEffect(() => {
    setIframeUrl(generateIframeUrl(formData.center_latitude, formData.center_longitude));
  }, [formData.center_latitude, formData.center_longitude]);

  
  const handleMarkerDrag = (event: any) => {
    const position = event.latLng;
    setFormData((prev) => ({
      ...prev,
      center_latitude: position.lat(),
      center_longitude: position.lng()
    }));
  };

  const handleMapClick = (event: any) => {
    const position = event.latLng;
    setFormData((prev) => ({
      ...prev,
      center_latitude: position.lat(),
      center_longitude: position.lng()
    }));
  };

  const handleRadiusChange = (value: string) => {
    const radius = parseInt(value);
    if (!isNaN(radius) && radius > 0 && radius <= 5000) {
      setFormData((prev) => ({ ...prev, radius_meters: radius }));
    }
  };

  const loadLocations = async () => {
    setLoading(true);
    try {
      const response = await manageCampusLocation();
      // Support multiple response shapes:
      // - { success, locations: [...] }
      // - paginated: { count, next, previous, results: [...] }
      // - paginated with wrapped results: { count, ..., results: { success, locations: [...] } }
      let locationsData: any[] = [];
      if (response.locations && Array.isArray(response.locations)) {
        locationsData = response.locations;
      } else if (response.results) {
        if (Array.isArray(response.results)) {
          locationsData = response.results;
        } else if (response.results.locations && Array.isArray(response.results.locations)) {
          locationsData = response.results.locations;
        }
      }

      if (locationsData.length > 0) {
        setLocations(locationsData);
      } else {
        toast.error(response.message || 'Failed to load campus locations');
      }
    } catch (error) {
      toast.error('Failed to load campus locations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        ...formData,
        min_latitude: formData.min_latitude ? parseFloat(formData.min_latitude) : undefined,
        max_latitude: formData.max_latitude ? parseFloat(formData.max_latitude) : undefined,
        min_longitude: formData.min_longitude ? parseFloat(formData.min_longitude) : undefined,
        max_longitude: formData.max_longitude ? parseFloat(formData.max_longitude) : undefined
      };

      const response = editingLocation ?
      await manageCampusLocation(data, editingLocation.id, 'PUT') :
      await manageCampusLocation(data, undefined, 'POST');

      if (response.success) {
        toast.success(`Campus location ${editingLocation ? 'updated' : 'created'} successfully`);
        setShowForm(false);
        setEditingLocation(null);
        resetForm();
        loadLocations();
      } else {
        toast.error(response.message || 'Failed to save campus location');
      }
    } catch (error) {
      toast.error('Failed to save campus location');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (location: CampusLocation) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      description: location.description,
      is_active: location.is_active,
      center_latitude: location.center_latitude,
      center_longitude: location.center_longitude,
      radius_meters: location.radius_meters,
      min_latitude: location.min_latitude?.toString() || '',
      max_latitude: location.max_latitude?.toString() || '',
      min_longitude: location.min_longitude?.toString() || '',
      max_longitude: location.max_longitude?.toString() || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (location: CampusLocation) => {
    if (!confirm(`Are you sure you want to delete "${location.name}"?`)) return;

    try {
      const response = await manageCampusLocation(undefined, location.id, 'DELETE');
      if (response.success) {
        toast.success('Campus location deleted successfully');
        loadLocations();
      } else {
        toast.error(response.message || 'Failed to delete campus location');
      }
    } catch (error) {
      toast.error('Failed to delete campus location');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_active: true,
      center_latitude: 12.9716,
      center_longitude: 77.5946,
      radius_meters: 500,
      min_latitude: '',
      max_latitude: '',
      min_longitude: '',
      max_longitude: ''
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingLocation(null);
    resetForm();
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData((prev) => ({
          ...prev,
          center_latitude: latitude,
          center_longitude: longitude
        }));

        

        toast.success('Current location set successfully');
      },
      (error) => {

        let errorMessage = 'Unable to get current location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. On macOS, enable Location Services for your browser (System Settings → Privacy & Security → Location Services). Also ensure Wi‑Fi is on or test on a mobile device.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        // Also show a persistent hint in the map area
        setMapError((prev) => prev || errorMessage);
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const { theme } = useTheme();

  useEffect(() => {
    loadLocations();
  }, []);

  // Inject thin scrollbar styles once for desktop/laptop views
  useEffect(() => {
    if (document.getElementById('thin-scrollbar-styles')) return;
    const style = document.createElement('style');
    style.id = 'thin-scrollbar-styles';
    style.innerHTML = `
      .thin-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.25) transparent; }
      .thin-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
      .thin-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .thin-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.25); border-radius: 9999px; }
      @media (max-width: 767px) { .thin-scrollbar::-webkit-scrollbar { width: 6px; } }
    `;
    document.head.appendChild(style);
  }, []);

  // Inject responsive modal/dialog styles scoped to this component
  useEffect(() => {
    if (document.getElementById('campus-modal-styles-admin')) return;
    const style = document.createElement('style');
    style.id = 'campus-modal-styles-admin';
    style.innerHTML = `
      /* Force modal/dialog to 80vh height and 90% width on mobile views */
      @media (max-width: 768px) {
        .DialogContent,
        .dialog-content,
        .modal,
        .dialog,
        [role="dialog"] {
          max-width: 90% !important;
          width: 90% !important;
          height: 80vh !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById('campus-modal-styles-admin');
      if (el) el.remove();
    };
  }, []);

  return (
    <div className={`flex flex-col h-[100dvh] overflow-hidden text-sm sm:text-base w-full max-w-[412px] sm:max-w-none mx-auto`}>
      {/* Header area (fixed) */}
      <Card className={`shrink-0 ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
        <CardHeader className="border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Campus Location Management</CardTitle>
            <CardDescription className="text-sm sm:text-sm text-muted-foreground mt-1">
              Set and manage campus boundaries for geolocation-based attendance
            </CardDescription>
          </div>
          <div className="w-full sm:w-auto">
            <Button onClick={() => setShowForm(true)} className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white h-9 px-3 font-semibold shadow-md w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Location
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="flex-1 overflow-hidden w-full min-h-0 pt-3">
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className={theme === 'dark' ? 'bg-card border border-border text-foreground w-[95%] max-w-[400px] sm:max-w-[720px] max-h-[90dvh] flex flex-col overflow-hidden rounded-lg mx-auto' : 'bg-white border border-gray-200 text-gray-900 w-[95%] max-w-[400px] sm:max-w-[720px] max-h-[90dvh] flex flex-col overflow-hidden rounded-lg mx-auto'}>
            <DialogHeader className="shrink-0">
              <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>{editingLocation ? 'Edit' : 'Add'} Campus Location</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto min-h-0 w-full min-w-0 p-4 sm:p-6 overscroll-contain thin-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
              <form onSubmit={handleSubmit} className="space-y-4 w-full min-w-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full min-w-0">
                  <div>
                    <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} required />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} rows={2} />
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full min-w-0">
                  <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))} />
                  <Label htmlFor="is_active">Active Location</Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full min-w-0">
                  <div>
                    <Label htmlFor="center_latitude">Center Latitude <span className="text-red-500">*</span></Label>
                    <Input id="center_latitude" type="number" step="any" value={formData.center_latitude} onChange={(e) => setFormData((prev) => ({ ...prev, center_latitude: parseFloat(e.target.value) || 0 }))} required />
                  </div>
                  <div>
                    <Label htmlFor="center_longitude">Center Longitude <span className="text-red-500">*</span></Label>
                    <Input id="center_longitude" type="number" step="any" value={formData.center_longitude} onChange={(e) => setFormData((prev) => ({ ...prev, center_longitude: parseFloat(e.target.value) || 0 }))} required />
                  </div>
                  <div>
                    <Label htmlFor="radius_meters">Radius (meters) <span className="text-red-500">*</span></Label>
                    <Input id="radius_meters" type="number" min="10" max="5000" value={formData.radius_meters} onChange={(e) => handleRadiusChange(e.target.value)} required />
                  </div>
                </div>

                

                

                <div className="flex mb-4 w-full justify-start min-w-0">
                  <Button type="button" variant="outline" onClick={getCurrentLocation} className="flex items-center gap-2 whitespace-nowrap">
                      <MapPin className="w-4 h-4" />
                      Current Location
                    </Button>
                </div>

                <div className="w-full h-[180px] sm:h-[260px] md:h-[360px] border rounded-lg overflow-hidden relative min-w-0">
                  <iframe src={iframeUrl} className="absolute inset-0 w-full h-full" style={{ border: 0, objectFit: 'cover' }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Campus Location Map" />
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 w-full mt-4">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="w-full sm:w-auto">Cancel</Button>
                  <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Save className="w-4 h-4 mr-2" />
                    {editingLocation ? 'Update' : 'Create'} Location
                  </Button>
                </div>
              </form>
            </div>
            <div className="shrink-0">
              <DialogFooter />
            </div>
          </DialogContent>
        </Dialog>

        <Card className={theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}>
          <CardHeader>
            <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Campus Locations</CardTitle>
          </CardHeader>
          <CardContent className="h-[50vh] sm:h-auto">{/* mobile: constrained height; desktop/tablet keep auto */}
            <div className="flex flex-col h-full w-full min-h-0">
              <div className="flex-1 overflow-auto w-full min-w-0 min-h-0 overflow-y-auto overscroll-contain thin-scrollbar">
                {loading ?
                <SkeletonList items={3} /> :
                locations.length === 0 ?
                <div className="text-center py-8 text-gray-500">No campus locations configured yet.</div> :

                <div className="space-y-4 w-full">
                    {locations.map((location) =>
                  <div key={location.id} className={`border rounded-lg p-4 w-full ${theme === 'dark' ? 'bg-muted/50 border-border' : 'bg-white border-gray-200'}`}>
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div className="flex-1 min-w-0 w-full">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className={`font-semibold truncate max-w-[180px] sm:max-w-none ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{location.name}</h3>
                              {location.is_active && <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'}`}>Active</span>}
                            </div>
                            {location.description && <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>{location.description}</p>}
                            <div className={`mt-2 text-xs space-y-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                              <p>Center: {location.center_latitude.toFixed(6)}, {location.center_longitude.toFixed(6)}</p>
                              <p>Radius: {location.radius_meters} meters</p>
                              <p>Created: {new Date(location.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-border/50 justify-end w-full sm:w-auto shrink-0">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(location)} disabled={showForm} className="flex-1 sm:flex-none justify-center gap-1.5"><Edit className="w-4 h-4" /><span className="sm:hidden text-xs">Edit</span></Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(location)} className="flex-1 sm:flex-none text-red-600 hover:text-red-700 border-red-200/50 hover:bg-red-50 dark:hover:bg-red-950/20 justify-center gap-1.5"><Trash2 className="w-4 h-4" /><span className="sm:hidden text-xs">Delete</span></Button>
                          </div>
                        </div>
                      </div>
                  )}
                  </div>
                }
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>);

};

export default CampusLocationManager;