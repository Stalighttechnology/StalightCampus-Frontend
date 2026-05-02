import React, { useState, useEffect } from 'react';
import {
  getMenus,
  manageMenu,
  getMenuItems,
  manageMenuItem,
} from '../../utils/hms_api';
import { useHMSContext } from '../../context/HMSContext';

import { useToast } from '../../hooks/use-toast';
import {
  Plus,
  Trash2,
  Edit,
  ChefHat,
  UtensilsCrossed,
  Calendar,
  Clock,
  Search,
  Filter,
  Save,
  X,
  History,
  Repeat
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SkeletonPageHeader, SkeletonCard } from '../ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { showConfirmAlert } from '@/utils/sweetalert';

interface MealType {
  id: number;
  name: string;
  time_from?: string;
  time_to?: string;
}

interface MenuItem {
  id?: number;
  name: string;
  description?: string;
  vegetarian: boolean;
  is_active?: boolean;
}

interface Menu {
  id: number;
  hostel: number;
  hostel_name: string;
  day_of_week: string;
  day_name: string;
  meal_type_detail?: MealType;
  items: MenuItem[];
  is_recurring: boolean;
  date?: string;
}

interface Hostel {
  id: number;
  name: string;
}

const DAY_OPTIONS = [
  { value: '0', label: 'Monday' },
  { value: '1', label: 'Tuesday' },
  { value: '2', label: 'Wednesday' },
  { value: '3', label: 'Thursday' },
  { value: '4', label: 'Friday' },
  { value: '5', label: 'Saturday' },
  { value: '6', label: 'Sunday' },
];

const MEAL_TYPE_DISPLAY = {
  'BR': { label: 'Breakfast', time_from: '07:30', time_to: '09:00', color: 'bg-orange-500/10 text-orange-600 border-orange-200' },
  'LN': { label: 'Lunch', time_from: '12:00', time_to: '14:00', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  'SN': { label: 'Snacks', time_from: '16:00', time_to: '17:30', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  'DN': { label: 'Dinner', time_from: '19:00', time_to: '21:00', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200' },
};

const DEFAULT_MEAL_TYPES = [
  { name: 'BR', time_from: '07:30', time_to: '09:00' },
  { name: 'LN', time_from: '12:00', time_to: '14:00' },
  { name: 'SN', time_from: '16:00', time_to: '17:30' },
  { name: 'DN', time_from: '19:00', time_to: '21:00' },
];

const getMealTypeLabel = (code: string) => {
  return MEAL_TYPE_DISPLAY[code as keyof typeof MEAL_TYPE_DISPLAY]?.label || code;
};

const MenuManagement: React.FC = () => {
  const { toast } = useToast();
  const { hostels, skeletonMode } = useHMSContext();

  const [menus, setMenus] = useState<Menu[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [selectedHostel, setSelectedHostel] = useState<string>('');
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [showFoodForm, setShowFoodForm] = useState(false);
  const [editingFoodItem, setEditingFoodItem] = useState<MenuItem | null>(null);
  const [foodFormData, setFoodFormData] = useState({
    name: '',
    description: '',
    vegetarian: true,
  });

  const [formData, setFormData] = useState({
    hostel: '',
    day_of_week: '0',
    meal_type: '',
    date: '',
    items: [] as number[],
    is_recurring: true,
  });

  useEffect(() => {
    // Initial loading state only for UI consistency
    setInitialLoading(false);
  }, []);

  // No longer auto-selecting the first hostel to give user explicit control
  useEffect(() => {
    // If we have only one hostel, we could potentially auto-select it, 
    // but the user requested "do not auto select".
  }, [hostels]);

  // Reactive menu loading
  useEffect(() => {
    if (selectedHostel) {
      loadMenusForHostel(selectedHostel);
    }
  }, [selectedHostel]);

  const loadMenusForHostel = async (hostelId: string) => {
    if (!hostelId) {
      setMenus([]);
      return;
    }
    setLoading(true);
    try {
      const res = await getMenus({ hostel: hostelId });
      if (res.success && res.results) setMenus(res.results);
      else setMenus([]);
    } catch (e) {
      console.error('Failed to load menus for hostel', e);
      setMenus([]);
    } finally {
      setLoading(false);
    }
  };

  // Lazy loaders


  // Load menu items only when form is opened
  const loadMenuItems = async () => {
    try {
      const itemsRes = await getMenuItems();
      if (itemsRes.success && itemsRes.results) {
        setMenuItems(itemsRes.results);
      }
    } catch (error) {
      console.error('Failed to load menu items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load food items',
        variant: 'destructive',
      });
    }
  };

  // meal types are mocked on frontend; no API call required

  // Reload menu items after food item changes (no menus fetch)
  const reloadMenuData = async () => {
    try {
      const itemsRes = await getMenuItems();
      if (itemsRes.success && itemsRes.results) setMenuItems(itemsRes.results);
    } catch (error) {
      console.error('Failed to reload menu items:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hostel || !formData.meal_type) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate menu (client-side validation)
    if (!editingMenu) {
      const duplicate = menus.find(
        (m) =>
          m.hostel === parseInt(formData.hostel) &&
          m.day_of_week === formData.day_of_week &&
          m.meal_type_detail?.name === formData.meal_type
      );

      if (duplicate) {
        toast({
          title: 'Menu Already Exists',
          description: `A menu already exists for this hostel on ${DAY_OPTIONS.find((d) => d.value === formData.day_of_week)?.label} for ${formData.meal_type}. Click "Edit" to modify it.`,
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      const data: any = {
        hostel: parseInt(formData.hostel),
        day_of_week: formData.day_of_week,
        // frontend uses mocked meal type codes (e.g., 'BR','LN')
        meal_type: formData.meal_type || null,
        items: formData.items,
        is_recurring: formData.is_recurring,
      };

      // include date when provided (for one-time menus)
      if (formData.date && !formData.is_recurring) {
        data.date = formData.date; // YYYY-MM-DD
      } else {
        data.date = null;
      }

      console.log('Submitting menu data:', data);

      let response;
      if (editingMenu) {
        response = await manageMenu(data, editingMenu.id, 'PUT');
      } else {
        response = await manageMenu(data, undefined, 'POST');
      }

      if (response.success) {
        toast({
          title: 'Success',
          description: editingMenu ? 'Menu updated successfully' : 'Menu created successfully',
        });
        setShowForm(false);
        setEditingMenu(null);
        setFormData({
          hostel: '',
          day_of_week: '0',
          meal_type: '',
          date: '',
          items: [],
          is_recurring: true,
        });
        // Update local menus state so no extra GET is required
        const updatedMenu = response.data;
        if (updatedMenu) {
          // Find existing menu to preserve derived fields like `meal_type_detail` and `hostel_name`
          const existing = menus.find((m) => m.id === updatedMenu.id);

          // Convert items into full MenuItem objects when possible.
          // The backend may return either an array of IDs or an array of full item objects.
          const fullItems = Array.isArray(updatedMenu.items)
            ? updatedMenu.items.map((it: any) => {
              if (typeof it === 'number') {
                return menuItems.find((m) => m.id === it) || { id: it, name: 'Unknown', vegetarian: false };
              }
              if (it && typeof it === 'object' && it.id) {
                // already a full item object returned by backend
                return it;
              }
              return { id: it, name: 'Unknown', vegetarian: false };
            })
            : [];

          const merged = {
            ...existing,
            ...updatedMenu,
            items: fullItems,
            // Preserve meal_type_detail if available locally
            // Prefer server-provided nested meal_type_detail when available
            meal_type_detail: (updatedMenu.meal_type_detail) || (existing && existing.meal_type_detail) || null,
            hostel_name: (updatedMenu.hostel_name) || (existing && existing.hostel_name) || '',
          };

          if (editingMenu) {
            setMenus((prev) => prev.map((m) => (m.id === merged.id ? merged : m)));
          } else {
            setMenus((prev) => [merged, ...prev]);
          }
        }
      } else {
        throw new Error(response.message || 'Failed to save menu');
      }
    } catch (error) {
      console.error('Menu submit error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save menu',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (menu: Menu) => {
    setEditingMenu(menu);
    setFormData({
      hostel: selectedHostel, // Use selectedHostel instead of menu.hostel
      day_of_week: menu.day_of_week,
      // Get meal_type code from meal_type_detail.name
      meal_type: menu.meal_type_detail?.name || '',
      date: menu.date || '',
      items: menu.items.map((item) => item.id),
      is_recurring: menu.is_recurring,
    });
    setShowForm(true);
    // Load required data for editing lazily
    loadMenuItems();
  };

  const handleDelete = async (menuId: number) => {
    const result = await showConfirmAlert(
      'Are you sure?',
      "You won't be able to revert this!",
      'Yes, delete it!'
    );

    if (!result.isConfirmed) return;

    try {
      const response = await manageMenu(undefined, menuId, 'DELETE');
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Menu deleted successfully',
        });
        // Remove deleted menu locally to avoid extra GET
        setMenus((prev) => prev.filter((m) => m.id !== menuId));
      } else {
        throw new Error(response.message || 'Failed to delete menu');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete menu',
        variant: 'destructive',
      });
    }
  };

  const toggleItemSelection = (itemId: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.includes(itemId)
        ? prev.items.filter((id) => id !== itemId)
        : [...prev.items, itemId],
    }));
  };

  // Food Item Handlers
  const handleFoodItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodFormData.name) {
      toast({
        title: 'Validation Error',
        description: 'Name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const data = {
        name: foodFormData.name,
        description: foodFormData.description,
        vegetarian: foodFormData.vegetarian,
      };

      let response;
      if (editingFoodItem) {
        response = await manageMenuItem(data, editingFoodItem.id, 'PUT');
      } else {
        response = await manageMenuItem(data, undefined, 'POST');
      }

      if (response.success) {
        toast({
          title: 'Success',
          description: editingFoodItem ? 'Food item updated' : 'Food item created',
        });
        setShowFoodForm(false);
        setEditingFoodItem(null);
        setFoodFormData({
          name: '',
          description: '',
          vegetarian: true,
        });
        // Reload only menu items (no need to fetch all menus)
        await loadMenuItems();
      } else {
        throw new Error(response.message || 'Failed to save food item');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save food item',
        variant: 'destructive',
      });
    }
  };

  const handleEditFoodItem = (item: MenuItem) => {
    setEditingFoodItem(item);
    setFoodFormData({
      name: item.name,
      description: item.description || '',
      vegetarian: item.vegetarian,
    });
    setShowFoodForm(true);
  };

  const handleDeleteFoodItem = async (itemId: number) => {
    const result = await showConfirmAlert(
      'Are you sure?',
      "You won't be able to revert this food item?",
      'Yes, delete it!'
    );

    if (!result.isConfirmed) return;

    try {
      const response = await manageMenuItem(undefined, itemId, 'DELETE');
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Food item deleted successfully',
        });
        // Reload only menu items (no need to fetch all menus)
        await loadMenuItems();
      } else {
        throw new Error(response.message || 'Failed to delete food item');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete food item',
        variant: 'destructive',
      });
    }
  };

  const filteredMenus = selectedHostel
    ? menus.filter((m) => m.hostel === parseInt(selectedHostel))
    : menus;

  // Apply day filter (supports recurring weekly menus and one-time date menus)
  const applyDayFilter = (menuList: Menu[]) => {
    if (dayFilter === 'all') return menuList;
    return menuList.filter((m) => {
      // If menu has explicit date (one-time), compute its weekday
      if (m.date) {
        const d = new Date(m.date);
        if (isNaN(d.getTime())) return false;
        // JS getDay(): 0=Sun..6=Sat ; map to our 0=Mon..6=Sun
        const mapped = ((d.getDay() + 6) % 7).toString();
        return mapped === dayFilter;
      }
      // Otherwise use menu.day_of_week (assumed to be '0'..'6' as string)
      return m.day_of_week === dayFilter;
    });
  };

  const displayedMenus = applyDayFilter(filteredMenus);

  // Handle loading within the main return for better context visibility

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <Card className="border-primary/10 shadow-sm overflow-hidden">
        <CardHeader className="pb-6 border-b bg-muted/30">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-semibold tracking-tight">Menu Management</CardTitle>
              <CardDescription>Plan and manage daily mess menus and food items.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <div className="flex items-center gap-2">
                {initialLoading || skeletonMode ? (
                  <div className="w-[180px] h-9 rounded-md bg-muted animate-pulse border" />
                ) : (
                  <Select value={selectedHostel} onValueChange={setSelectedHostel}>
                    <SelectTrigger className="w-[180px] bg-background">
                      <SelectValue placeholder="Select Hostel" />
                    </SelectTrigger>
                    <SelectContent>
                      {hostels.map((h) => (
                        <SelectItem key={h.id} value={h.id.toString()}>{h.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {initialLoading || skeletonMode ? (
                  <div className="w-[150px] h-9 rounded-md bg-muted animate-pulse border" />
                ) : (
                  <Select value={dayFilter} onValueChange={setDayFilter}>
                    <SelectTrigger className="w-[150px] bg-background">
                      <SelectValue placeholder="All Days" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Days</SelectItem>
                      {DAY_OPTIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex items-center gap-2">
                {initialLoading || skeletonMode ? (
                  <>
                    <div className="w-[130px] h-9 rounded-md bg-muted animate-pulse border" />
                    <div className="w-[130px] h-9 rounded-md bg-muted animate-pulse border" />
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowFoodForm(true);
                        setEditingFoodItem(null);
                        setFoodFormData({ name: '', description: '', vegetarian: true });
                        loadMenuItems();
                      }}
                      className="border-primary/20 hover:bg-primary/5 bg-background"
                    >
                      <UtensilsCrossed className="w-4 h-4 mr-2" /> Food Items
                    </Button>
                    <Button onClick={() => {
                      setShowForm(true);
                      setEditingMenu(null);
                      setFormData({ hostel: selectedHostel, day_of_week: '0', meal_type: '', date: '', items: [], is_recurring: true });
                      loadMenuItems();
                    }} className="bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-2" /> Add Menu
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Menu Grid */}
          {(loading || skeletonMode || initialLoading) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : selectedHostel ? (
            displayedMenus.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedMenus.map((menu) => (
                  <Card key={menu.id} className="group hover:shadow-md transition-all shadow-sm">
                    <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className={MEAL_TYPE_DISPLAY[menu.meal_type_detail?.name as keyof typeof MEAL_TYPE_DISPLAY]?.color}>
                            {getMealTypeLabel(menu.meal_type_detail?.name || '')}
                          </Badge>
                          {menu.is_recurring ? (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-muted/50">
                              <Repeat className="w-3 h-3 mr-1" /> Weekly
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-orange-50 text-orange-600 border-orange-100">
                              <Calendar className="w-3 h-3 mr-1" /> Special
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg font-semibold pt-1">{DAY_OPTIONS.find(d => d.value === menu.day_of_week)?.label}</CardTitle>
                        {menu.date && <CardDescription>{menu.date}</CardDescription>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-50" onClick={() => handleEdit(menu)}>
                          <Edit size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleDelete(menu.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-40 pr-4">
                        <div className="space-y-2">
                          {menu.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30 group/item hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.vegetarian ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="truncate font-medium">{item.name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <Separator className="my-4" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {MEAL_TYPE_DISPLAY[menu.meal_type_detail?.name as keyof typeof MEAL_TYPE_DISPLAY]?.time_from} - {MEAL_TYPE_DISPLAY[menu.meal_type_detail?.name as keyof typeof MEAL_TYPE_DISPLAY]?.time_to}
                        </div>
                        <div className="font-medium text-primary">
                          {menu.items.length} Items
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="border-dashed border-2 py-20 rounded-xl">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="bg-muted rounded-full p-6 mb-4">
                    <Calendar className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold">No menus planned</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                    There are no menus scheduled for {dayFilter === 'all' ? 'any day' : DAY_OPTIONS.find(d => d.value === dayFilter)?.label}.
                  </p>
                  <Button className="mt-6" onClick={() => { setShowForm(true); setEditingMenu(null); }}>
                    <Plus className="w-4 h-4 mr-2" /> Add First Menu
                  </Button>
                </div>
              </div>
            )
          ) : (
            <div className="border-dashed border-2 py-20 rounded-xl">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="bg-muted rounded-full p-6 mb-4">
                  <Search className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold">Select a hostel</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                  Choose a hostel from the dropdown above to view and manage its mess menus.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Menu Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[500px] w-[90vw] rounded-xl max-h-[80vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" />
              {editingMenu ? 'Edit Menu' : 'Create New Menu'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hostel</Label>
                <Select value={formData.hostel} onValueChange={(val) => setFormData({ ...formData, hostel: val })}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select Hostel" />
                  </SelectTrigger>
                  <SelectContent>
                    {hostels.map((h) => (
                      <SelectItem key={h.id} value={h.id.toString()}>{h.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select value={formData.day_of_week} onValueChange={(val) => setFormData({ ...formData, day_of_week: val })}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_OPTIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Meal Type</Label>
                <Select value={formData.meal_type} onValueChange={(val) => setFormData({ ...formData, meal_type: val })}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_MEAL_TYPES.map((m) => (
                      <SelectItem key={m.name} value={m.name}>
                        {getMealTypeLabel(m.name)} ({m.time_from}-{m.time_to})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date (Optional)</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.date && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {formData.date ? format(new Date(formData.date), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={formData.date ? new Date(formData.date) : undefined}
                      onSelect={(date) => {
                        setFormData({ ...formData, date: date ? format(date, "yyyy-MM-dd") : "" });
                        setIsCalendarOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-primary/5">
              <input
                type="checkbox"
                id="recurring"
                checked={formData.is_recurring}
                onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="recurring" className="font-medium cursor-pointer">Recurring Weekly Menu</Label>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center justify-between">
                Select Food Items
                <Badge variant="secondary" className="font-normal">{formData.items.length} Selected</Badge>
              </Label>
              <div className="border rounded-lg p-2 max-h-[300px] overflow-y-auto bg-muted/10 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {menuItems.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => toggleItemSelection(item.id!)}
                      className={`flex items-center gap-3 p-3 rounded-md cursor-pointer border transition-all ${
                        formData.items.includes(item.id!) 
                          ? 'bg-primary/5 border-primary/30 shadow-sm ring-1 ring-primary/20' 
                          : 'bg-background hover:bg-muted/50 border-transparent'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${item.vegetarian ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{item.name}</p>
                      </div>
                      {formData.items.includes(item.id!) && <Save className="w-3.5 h-3.5 text-primary" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" className="flex-1">{editingMenu ? 'Update Menu Plan' : 'Save Menu Plan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Food Item Dialog */}
      <Dialog open={showFoodForm} onOpenChange={setShowFoodForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFoodItem ? 'Edit Food Item' : 'Add New Food Item'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFoodItemSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input value={foodFormData.name} onChange={(e) => setFoodFormData({ ...foodFormData, name: e.target.value })} placeholder="e.g. Paneer Butter Masala" required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={foodFormData.description} onChange={(e) => setFoodFormData({ ...foodFormData, description: e.target.value })} placeholder="Ingredients, taste, etc." />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="veg"
                checked={foodFormData.vegetarian}
                onChange={(e) => setFoodFormData({ ...foodFormData, vegetarian: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary"
              />
              <Label htmlFor="veg" className="cursor-pointer">Vegetarian Item</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowFoodForm(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary">{editingFoodItem ? 'Update Item' : 'Create Item'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuManagement;
