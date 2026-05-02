import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

declare global {
  interface Window {
    google: any;
  }
}

const CampusLocationManager: React.FC = () => {
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingLocation, setEditingLocation] = useState<CampusLocation | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

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

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);


  const [useIframe, setUseIframe] = useState(false);
  const [iframeUrl, setIframeUrl] = useState('');

  const [searchBox, setSearchBox] = useState<any>(null);
  const searchBoxRef = useRef<HTMLInputElement>(null);

  // Generate iframe URL from coordinates
  const generateIframeUrl = (lat: number, lng: number, zoom: number = 16) => {
    return `https://www.google.com/maps/embed/v1/view?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&center=${lat},${lng}&zoom=${zoom}&maptype=roadmap`;
  };

  // Update iframe URL when coordinates change
  useEffect(() => {
    if (useIframe) {
      setIframeUrl(generateIframeUrl(formData.center_latitude, formData.center_longitude));
    }
  }, [formData.center_latitude, formData.center_longitude, useIframe]);

  // Load Google Maps API with Places library
  useEffect(() => {
    if (!window.google && !document.querySelector('script[src*="maps.googleapis.com"]')) {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

      if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
        setMapError('Google Maps API key is not configured. Please add a valid API key to your .env file.');
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      // Set up error handling
      script.onerror = () => {
        setMapError('Failed to load Google Maps. Please check your internet connection and API key.');
      };

      (window as any).initMap = () => {
        setMapLoaded(true);
        setMapError(null);
      };

      // Timeout for loading
      const timeout = setTimeout(() => {
        if (!mapLoaded) {
          setMapError('Google Maps took too long to load. Please check your API key and try again.');
        }
      }, 10000);

      return () => clearTimeout(timeout);
    } else if (window.google) {
      setMapLoaded(true);
      setMapError(null);
    }
  }, []);

  const reloadGoogleMaps = () => {
    // Remove existing maps script and retry loading
    const existing = document.querySelectorAll('script[src*="maps.googleapis.com"]');
    existing.forEach(s => s.remove());
    setMapLoaded(false);
    setMapError(null);
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      setMapError('Google Maps API key is not configured. Please add a valid API key to your .env file.');
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
    script.async = true;
    script.defer = true;
    script.onerror = () => setMapError('Failed to load Google Maps. Check API key, billing, referer restrictions, or disable adblockers.');
    document.head.appendChild(script);
  };

  // Initialize map when component mounts and Google Maps is loaded
  useEffect(() => {
    if (mapLoaded && mapRef.current && !mapInstanceRef.current && !mapError) {
      initializeMap();
    }
  }, [mapLoaded, showForm, mapError]);

  // Update map when form data changes
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      updateMapPosition();
    }
  }, [formData.center_latitude, formData.center_longitude, formData.radius_meters]);

  const initializeMap = () => {
    if (!mapRef.current || !window.google || mapError) return;

    try {
      const center = {
        lat: formData.center_latitude,
        lng: formData.center_longitude
      };

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 16,
        center: center,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      });

      // Create marker
      markerRef.current = new window.google.maps.Marker({
        position: center,
        map: mapInstanceRef.current,
        draggable: true,
        title: 'Campus Center'
      });

      // Create circle
      circleRef.current = new window.google.maps.Circle({
        map: mapInstanceRef.current,
        radius: formData.radius_meters,
        fillColor: '#FF0000',
        fillOpacity: 0.2,
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        center: center
      });

      // Initialize search box
      if (searchBoxRef.current && window.google && window.google.maps && window.google.maps.places) {
        try {
          const input = searchBoxRef.current;
          const searchBoxInstance = new window.google.maps.places.SearchBox(input);
          setSearchBox(searchBoxInstance);

          // Style the search box
          input.style.boxSizing = 'border-box';
          input.style.border = '1px solid #ccc';
          input.style.borderRadius = '4px';
          input.style.fontSize = '14px';
          input.style.outline = 'none';
          input.style.padding = '8px 12px';
          input.style.textOverflow = 'ellipses';
          input.style.width = '100%';
          input.style.position = 'relative';

          // Bias the SearchBox results towards current map's viewport
          mapInstanceRef.current.addListener('bounds_changed', () => {
            try {
              searchBoxInstance.setBounds(mapInstanceRef.current.getBounds());
            } catch (error) {
              console.warn('Error setting search bounds:', error);
            }
          });

          // Listen for the event fired when the user selects a prediction
          searchBoxInstance.addListener('places_changed', () => {
            try {
              const places = searchBoxInstance.getPlaces();
              if (!places || places.length === 0) {
                console.warn('No places found');
                return;
              }

              const place = places[0];
              if (!place.geometry || !place.geometry.location) {
                console.warn('Place has no geometry');
                return;
              }

              const location = place.geometry.location;
              const newPosition = {
                lat: location.lat(),
                lng: location.lng()
              };

              // Update marker and map
              if (markerRef.current) {
                markerRef.current.setPosition(newPosition);
              }
              if (circleRef.current) {
                circleRef.current.setCenter(newPosition);
              }
              mapInstanceRef.current.setCenter(newPosition);
              mapInstanceRef.current.setZoom(18);

              // Update form data
              setFormData(prev => ({
                ...prev,
                center_latitude: newPosition.lat,
                center_longitude: newPosition.lng
              }));

              // Clear the search box
              input.value = '';

              toast.success(`Location set to: ${place.formatted_address || place.name}`);
            } catch (error) {
              console.error('Error handling place selection:', error);
              toast.error('Error setting location from search');
            }
          });

          console.log('Search box initialized successfully');
        } catch (error) {
          console.error('Error initializing search box:', error);
          toast.error('Search functionality is not available. Places API may not be enabled.');
        }
      } else {
        console.warn('Places API not available - search functionality disabled');
        // Don't show error toast here as it might be annoying, just log it
      }

      // Add event listeners
      markerRef.current.addListener('dragend', handleMarkerDrag);
      mapInstanceRef.current.addListener('click', handleMapClick);
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
      setMapError('Failed to initialize Google Maps. Please check your API key and try again.');
    }
  };

  const updateMapPosition = () => {
    if (!markerRef.current || !circleRef.current || !mapInstanceRef.current) return;

    const position = {
      lat: formData.center_latitude,
      lng: formData.center_longitude
    };

    markerRef.current.setPosition(position);
    circleRef.current.setCenter(position);
    circleRef.current.setRadius(formData.radius_meters);
    mapInstanceRef.current.setCenter(position);
  };

  const handleMarkerDrag = (event: any) => {
    const position = event.latLng;
    setFormData(prev => ({
      ...prev,
      center_latitude: position.lat(),
      center_longitude: position.lng()
    }));
  };

  const handleMapClick = (event: any) => {
    const position = event.latLng;
    setFormData(prev => ({
      ...prev,
      center_latitude: position.lat(),
      center_longitude: position.lng()
    }));
  };

  const handleRadiusChange = (value: string) => {
    const radius = parseInt(value);
    if (!isNaN(radius) && radius > 0 && radius <= 5000) {
      setFormData(prev => ({ ...prev, radius_meters: radius }));
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

      const response = editingLocation
        ? await manageCampusLocation(data, editingLocation.id, 'PUT')
        : await manageCampusLocation(data, undefined, 'POST');

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
        setFormData(prev => ({
          ...prev,
          center_latitude: latitude,
          center_longitude: longitude
        }));

        // Update map if it's loaded
        if (mapInstanceRef.current && markerRef.current && circleRef.current) {
          const newPosition = { lat: latitude, lng: longitude };
          markerRef.current.setPosition(newPosition);
          circleRef.current.setCenter(newPosition);
          mapInstanceRef.current.setCenter(newPosition);
          mapInstanceRef.current.setZoom(18);
        }

        toast.success('Current location set successfully');
      },
      (error) => {
        console.error('Error getting current location:', error);
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
        setMapError(prev => prev || errorMessage);
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

  return (
    <div className={`flex flex-col h-[100dvh] overflow-hidden p-4 sm:p-6 text-sm sm:text-base w-full max-w-[412px] sm:max-w-none mx-auto ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200 rounded-lg'}`}>
      {/* Header area (fixed) */}
      <div className="shrink-0 space-y-6">
        <div className="flex items-start justify-between w-full">
          <div>
            <h2 className={`text-lg sm:text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Campus Location Management</h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Set and manage campus boundaries for geolocation-based attendance</p>
          </div>
          <div>
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white">
              <Plus className="h-4 w-4" />
              Add Location
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden w-full min-h-0">
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className={theme === 'dark' ? 'bg-card border border-border text-foreground w-[95%] max-w-[400px] sm:max-w-[720px] max-h-[90dvh] flex flex-col overflow-hidden rounded-lg mx-auto' : 'bg-white border border-gray-200 text-gray-900 w-[95%] max-w-[400px] sm:max-w-[720px] max-h-[90dvh] flex flex-col overflow-hidden rounded-lg mx-auto'}>
            <DialogHeader className="shrink-0">
              <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>{editingLocation ? 'Edit' : 'Add'} Campus Location</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto min-h-0 w-full min-w-0 p-4 sm:p-6 overscroll-contain thin-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
              <form onSubmit={handleSubmit} className="space-y-4 w-full min-w-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full min-w-0">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={2} />
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full min-w-0">
                  <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))} />
                  <Label htmlFor="is_active">Active Location</Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full min-w-0">
                  <div>
                    <Label htmlFor="center_latitude">Center Latitude *</Label>
                    <Input id="center_latitude" type="number" step="any" value={formData.center_latitude} onChange={(e) => setFormData(prev => ({ ...prev, center_latitude: parseFloat(e.target.value) || 0 }))} required />
                  </div>
                  <div>
                    <Label htmlFor="center_longitude">Center Longitude *</Label>
                    <Input id="center_longitude" type="number" step="any" value={formData.center_longitude} onChange={(e) => setFormData(prev => ({ ...prev, center_longitude: parseFloat(e.target.value) || 0 }))} required />
                  </div>
                  <div>
                    <Label htmlFor="radius_meters">Radius (meters) *</Label>
                    <Input id="radius_meters" type="number" min="10" max="5000" value={formData.radius_meters} onChange={(e) => handleRadiusChange(e.target.value)} required />
                  </div>
                </div>

                <Alert>
                  <MapPin className="h-4 w-4" />
                  <AlertDescription>
                    {useIframe ? (
                      "Use the coordinate fields above to set the campus center location. The map shows the current location."
                    ) : (
                      "Use the map below to set the campus center location. Click on the map or drag the marker to position it. The red circle shows the attendance boundary area."
                    )}
                  </AlertDescription>
                </Alert>

                <div className="flex items-center justify-between mb-4 w-full min-w-0">
                  <div className="flex items-center space-x-2">
                    <Switch id="map-mode" checked={useIframe} onCheckedChange={setUseIframe} />
                    <Label htmlFor="map-mode">Use Simple Map View (Iframe)</Label>
                  </div>
                  {useIframe && (
                    <div className="text-sm text-gray-600">Note: Iframe mode has limited interactivity. Use coordinates above to set location.</div>
                  )}
                </div>

                {!useIframe && (
                  <div className="flex gap-2 mb-4 w-full min-w-0">
                    <div className="flex-1 relative min-w-0">
                      <Input ref={searchBoxRef} type="text" placeholder="Search for a location (e.g., 'Bangalore University')..." className="w-full pr-10" />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                    <Button type="button" variant="outline" onClick={getCurrentLocation} className="flex items-center gap-2 whitespace-nowrap">
                      <MapPin className="w-4 h-4" />
                      Current Location
                    </Button>
                  </div>
                )}

                <div className="w-full h-[180px] sm:h-[260px] md:h-[360px] border rounded-lg overflow-hidden relative min-w-0">
                  {useIframe ? (
                    <iframe src={iframeUrl} className="absolute inset-0 w-full h-full" style={{ border: 0, objectFit: 'cover' }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Campus Location Map" />
                  ) : mapError ? (
                    <div className="absolute inset-0 bg-red-50 border-2 border-red-200 rounded-lg p-2">
                      <div className="h-full w-full overflow-auto flex flex-col items-center justify-center text-center gap-3 p-3">
                        <MapPin className="w-12 h-12 mb-2 text-red-600" />
                        <h3 className="text-lg font-semibold">Google Maps Error</h3>
                        <p className="text-sm text-gray-700 max-w-full break-words">{mapError}</p>
                        <div className="flex flex-wrap gap-2 justify-center mt-2">
                          <Button size="sm" variant="ghost" onClick={() => setUseIframe(true)}>Open Simple Map View</Button>
                          <Button size="sm" variant="outline" onClick={() => reloadGoogleMaps()}>Retry Maps</Button>
                          <Button size="sm" variant="ghost" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${formData.center_latitude},${formData.center_longitude}`, '_blank')}>Open Google Maps</Button>
                        </div>
                        <div className="text-xs text-left mt-3 text-gray-600 w-full max-w-full break-words">
                          <p>If you have an adblocker or privacy extension, try disabling it for this site. Ensure the Maps API key has the Maps JavaScript API and Places API enabled and allows localhost in referer restrictions while testing.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div ref={mapRef} className="absolute inset-0 w-full h-full" />
                      {!mapLoaded && !mapError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-zinc-900">
                          <Skeleton className="w-full h-full rounded-none" />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-sm font-medium text-muted-foreground">Loading Google Maps...</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving}>
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
            <CardTitle className={`text-base sm:text-lg ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Campus Locations</CardTitle>
          </CardHeader>
          <CardContent className="h-[50vh] sm:h-auto">{/* mobile: constrained height; desktop/tablet keep auto */}
            <div className="flex flex-col h-full w-full min-h-0">
              <div className="flex-1 overflow-auto w-full min-w-0 min-h-0 overflow-y-auto overscroll-contain thin-scrollbar">
                {loading ? (
                  <SkeletonList items={3} />
                ) : locations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No campus locations configured yet.</div>
                ) : (
                  <div className="space-y-4 w-full">
                    {locations.map((location) => (
                      <div key={location.id} className="border rounded-lg p-4 w-full">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{location.name}</h3>
                              {location.is_active && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Active</span>}
                            </div>
                            {location.description && <p className="text-gray-600 mt-1">{location.description}</p>}
                            <div className="mt-2 text-sm text-gray-500">
                              <p>Center: {location.center_latitude.toFixed(6)}, {location.center_longitude.toFixed(6)}</p>
                              <p>Radius: {location.radius_meters} meters</p>
                              <p>Created: {new Date(location.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(location)} disabled={showForm}><Edit className="w-4 h-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(location)} className="text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CampusLocationManager;