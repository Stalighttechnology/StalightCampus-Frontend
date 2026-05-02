import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  IndianRupee,
  Calendar as CalendarIcon
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext'; // Added theme context import
import {
  getFeeComponents,
  getFeeTemplates,
  createFeeTemplate,
  updateFeeTemplate,
  deleteFeeTemplate
} from "../../utils/fees_manager_api";
import { 
  Skeleton, 
  SkeletonStatsGrid, 
  SkeletonTable, 
  SkeletonList, 
  SkeletonPageHeader,
  SkeletonCard
} from "@/components/ui/skeleton";


interface FeeComponent {
  id: number;
  name: string;
  amount: number;
  description?: string;
  is_active: boolean;
}

interface FeeTemplate {
  id: number;
  name: string;
  description?: string;
  total_amount: number;
  fee_type: string;
  semester?: number;
  due_date?: string;
  is_active: boolean;
  components: Array<{
    component: FeeComponent;
    amount_override?: number;
  }>;
  created_at: string;
}

const MySwal = withReactContent(Swal);

const FeeTemplates: React.FC = () => {
  const { theme } = useTheme(); // Using theme context
  const [templates, setTemplates] = useState<FeeTemplate[]>([]);
  const [templatesPage, setTemplatesPage] = useState(1);
  const [templatesPageSize] = useState(25);
  const [templatesTotalPages, setTemplatesTotalPages] = useState(1);
  const [templatesTotalCount, setTemplatesTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FeeTemplate | null>(null);

  // Form states
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [feeType, setFeeType] = useState('semester');
  const [semester, setSemester] = useState<number | undefined>();
  const [dueDate, setDueDate] = useState('');
  const [components, setComponents] = useState<FeeComponent[]>([]);

  // Component form
  const [componentName, setComponentName] = useState('');
  const [componentAmount, setComponentAmount] = useState('');
  const [componentDescription, setComponentDescription] = useState('');
  const [selectedComponents, setSelectedComponents] = useState<number[]>([]);
  const [componentOverrides, setComponentOverrides] = useState<Record<number, number>>({});

  // Available components from backend
  const [availableComponents, setAvailableComponents] = useState<FeeComponent[]>([]);

  useEffect(() => {
    fetchTemplates(templatesPage);
    const onComponentsChanged = (e: any) => {
      const detail = e?.detail || {};
      const action = detail.action;
      if (!action) return;
      if (action === 'create' && detail.item) {
        setAvailableComponents(prev => [{
          ...detail.item,
          amount: (detail.item.amount_cents != null ? Number(detail.item.amount_cents) / 100 : (detail.item.amount ? Math.round(detail.item.amount * 100) / 100 : 0))
        }, ...prev]);
      } else if (action === 'update' && detail.item) {
        setAvailableComponents(prev => prev.map(c => (c.id === detail.item.id ? { ...detail.item, amount: (detail.item.amount_cents != null ? Number(detail.item.amount_cents) / 100 : (detail.item.amount ? Math.round(detail.item.amount * 100) / 100 : 0)) } : c)));
      } else if (action === 'delete' && detail.id) {
        setAvailableComponents(prev => prev.filter(c => c.id !== detail.id));
      }
    };
    window.addEventListener('feeComponents:changed', onComponentsChanged);
    return () => window.removeEventListener('feeComponents:changed', onComponentsChanged);
  }, []);

  const fetchAvailableComponents = async () => {
    try {
      const data = await getFeeComponents(1, 200);

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch fee components');
      }

      setAvailableComponents((data.data || []).map((it: any) => ({
        ...it,
        amount: (it.amount_cents != null ? Number(it.amount_cents) : (it.amount ? Math.round(it.amount * 100) : 0)) / 100,
      })));
    } catch (err) {
      console.error('Error fetching components:', err);
    }
  };

  const fetchTemplates = async (page: number = 1) => {
    try {
      setLoading(true);
      const data = await getFeeTemplates(page, templatesPageSize);

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch fee templates');
      }

      const items = (data.data || []).map((t: any) => ({
        ...t,
        total_amount: (t.total_amount_cents != null ? Number(t.total_amount_cents) / 100 : (t.total_amount || 0)),
        components: (t.components || []).map((c: any) => ({
          id: c.component,
          component_name: c.component_name,
          amount: (c.component_amount_cents != null ? Number(c.component_amount_cents) / 100 : (c.component?.amount ? Math.round(c.component.amount * 100) / 100 : 0)),
          amount_override: (c.amount_override_cents != null ? Number(c.amount_override_cents) / 100 : (c.amount_override != null ? Number(c.amount_override) : null)),
        })),
      }));
      setTemplates(items);
      const meta = data.meta || {};
      setTemplatesPage(meta.page || page);
      setTemplatesTotalPages(meta.totalPages || Math.max(1, Math.ceil((meta.count || 0) / templatesPageSize)));
      setTemplatesTotalCount(meta.count || (data.data || []).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTemplateName('');
    setTemplateDescription('');
    setFeeType('semester');
    setSemester(undefined);
    setDueDate('');
    setSelectedComponents([]);
    setComponentOverrides({});
    setComponentName('');
    setComponentAmount('');
    setComponentDescription('');
    setEditingTemplate(null);
  };

  const addComponent = () => {
    if (!componentName.trim() || !componentAmount) return;

    const newComponent: FeeComponent = {
      id: Date.now(), // Temporary ID for new components
      name: componentName.trim(),
      amount: parseFloat(componentAmount),
      description: componentDescription.trim() || undefined,
      is_active: true,
    };

    setAvailableComponents([...availableComponents, newComponent]);
    setComponentName('');
    setComponentAmount('');
    setComponentDescription('');
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim() || selectedComponents.length === 0) return;

    try {
      const templateData = {
        name: templateName.trim(),
        description: templateDescription.trim() || null,
        fee_type: feeType,
        semester: semester,
        due_date: dueDate || null,
        component_ids: selectedComponents,
        component_overrides: componentOverrides,
      };

      const resp = await createFeeTemplate(templateData);

      if (!resp.success) {
        throw new Error(resp.message || 'Failed to create fee template');
      }
      const created = resp.data;
      const item = {
        ...created,
        total_amount: (created.total_amount_cents != null ? Number(created.total_amount_cents) / 100 : (created.total_amount || 0)),
        components: (created.components || []).map((c: any) => ({
          id: c.component,
          component_name: c.component_name,
          amount: (c.component_amount_cents != null ? Number(c.component_amount_cents) / 100 : (c.component?.amount ? Math.round(c.component.amount * 100) / 100 : 0)),
          amount_override: (c.amount_override_cents != null ? Number(c.amount_override_cents) / 100 : (c.amount_override != null ? Number(c.amount_override) : null)),
        })),
      };
      setTemplates(prev => [item, ...prev]);
      setTemplatesTotalCount(c => c + 1);
      try { window.dispatchEvent(new CustomEvent('feeTemplates:changed', { detail: { action: 'create', item } })); } catch (e) { }
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    }
  };

  const handleEditTemplate = async (template: FeeTemplate) => {
    resetForm();

    try {
      await fetchAvailableComponents();
    } catch (err) {
      // fetchAvailableComponents already handles logging
    }

    const templateComponents = ((template.components as unknown) as any[]) || [];
    const selectedIds: number[] = templateComponents
      .map((c) => Number(c.id ?? c.component?.id ?? c.component))
      .filter((id) => Number.isFinite(id));

    const overrides: Record<number, number> = {};
    templateComponents.forEach((c) => {
      const componentId = Number(c.id ?? c.component?.id ?? c.component);
      if (!Number.isFinite(componentId)) return;
      if (c.amount_override != null) {
        overrides[componentId] = Number(c.amount_override);
      }
    });

    setEditingTemplate(template);
    setTemplateName(template.name || '');
    setTemplateDescription(template.description || '');
    setFeeType(template.fee_type || 'semester');
    setSemester(template.semester);
    setDueDate(template.due_date || '');
    setSelectedComponents(selectedIds);
    setComponentOverrides(overrides);
    setIsCreateDialogOpen(true);
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate || !templateName.trim() || selectedComponents.length === 0) return;

    try {
      const templateData = {
        name: templateName.trim(),
        description: templateDescription.trim() || null,
        fee_type: feeType,
        semester: semester,
        due_date: dueDate || null,
        component_ids: selectedComponents,
        component_overrides: componentOverrides,
      };

      const resp = await updateFeeTemplate(editingTemplate.id, templateData);

      if (!resp.success) {
        throw new Error(resp.message || 'Failed to update fee template');
      }
      const updated = resp.data;
      const item = {
        ...updated,
        total_amount: (updated.total_amount_cents != null ? Number(updated.total_amount_cents) / 100 : (updated.total_amount || 0)),
        components: (updated.components || []).map((c: any) => ({
          id: c.component,
          component_name: c.component_name,
          amount: (c.component_amount_cents != null ? Number(c.component_amount_cents) / 100 : (c.component?.amount ? Math.round(c.component.amount * 100) / 100 : 0)),
          amount_override: (c.amount_override_cents != null ? Number(c.amount_override_cents) / 100 : (c.amount_override != null ? Number(c.amount_override) : null)),
        })),
      };

      setTemplates(prev => prev.map(t => (t.id === item.id ? item : t)));
      try { window.dispatchEvent(new CustomEvent('feeTemplates:changed', { detail: { action: 'update', item } })); } catch (e) { }
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template');
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    const currentTheme = theme === 'dark' ? 'dark' : 'light';
    const result = await MySwal.fire({
      title: 'Delete Fee Template?',
      text: 'Are you sure you want to delete this template?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
      background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
      color: currentTheme === 'dark' ? '#ffffff' : '#000000',
    });

    if (!result.isConfirmed) return;

    try {
      const response = await deleteFeeTemplate(templateId);

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete fee template');
      }
      // Remove locally to avoid an extra GET
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      setTemplatesTotalCount(c => Math.max(0, c - 1));
      await MySwal.fire({
        title: 'Deleted!',
        text: 'Fee template deleted successfully.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: currentTheme === 'dark' ? '#ffffff' : '#000000',
      });
      try { window.dispatchEvent(new CustomEvent('feeTemplates:changed', { detail: { action: 'delete', id: templateId } })); } catch (e) { }
    } catch (err) {
      await MySwal.fire({
        title: 'Error!',
        text: err instanceof Error ? err.message : 'Failed to delete template',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: currentTheme === 'dark' ? '#ffffff' : '#000000',
      });
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const toggleComponentSelection = (componentId: number) => {
    if (selectedComponents.includes(componentId)) {
      setSelectedComponents(selectedComponents.filter(id => id !== componentId));
      // Remove override if exists
      const newOverrides = { ...componentOverrides };
      delete newOverrides[componentId];
      setComponentOverrides(newOverrides);
    } else {
      setSelectedComponents([...selectedComponents, componentId]);
    }
  };

  const updateComponentOverride = (componentId: number, amount: number) => {
    setComponentOverrides({
      ...componentOverrides,
      [componentId]: amount
    });
  };

  if (loading) {
    return (
      <div className="mx-auto space-y-6">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </CardHeader>
          <CardContent>
            <SkeletonTable rows={10} cols={7} />
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="mx-auto">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className={`${theme === 'dark' ? 'bg-card text-card-foreground' : 'bg-white text-gray-900'}`}>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            Fee Templates List
          </CardTitle>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={async () => {
                  resetForm();
                  // fetch available components only when opening create dialog
                  try {
                    await fetchAvailableComponents();
                  } catch (e) {
                    // ignore - fetchAvailableComponents already logs errors
                  }
                  setIsCreateDialogOpen(true);
                }}
                className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className={`w-[90vw] max-w-[340px] sm:w-[92vw] sm:max-w-xl lg:max-w-2xl max-h-[85vh] overflow-hidden rounded-xl sm:rounded-2xl ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-white text-gray-900'} p-0 shadow-2xl`}>
              <DialogHeader className="px-6 pt-6 pb-3 border-b">
                <DialogTitle>
                  {editingTemplate ? 'Edit Fee Template' : 'Create New Fee Template'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 overflow-y-auto custom-scrollbar px-6 pb-6 pt-4" style={{ maxHeight: 'calc(85vh - 88px)' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div>
                    <Label htmlFor="templateName">Template Name</Label>
                    <Input
                      id="templateName"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g., B.Tech Semester 1"
                      className={`${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'} mt-1`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="feeType">Fee Type</Label>
                    <Select value={feeType} onValueChange={setFeeType}>
                      <SelectTrigger
                        id="feeType"
                        className={`${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'} mt-1 w-full`}
                      >
                        <SelectValue placeholder="Select fee type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semester">Semester Fee</SelectItem>
                        <SelectItem value="annual">Annual Fee</SelectItem>
                        <SelectItem value="exam">Exam Fee</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="templateDescription">Description (Optional)</Label>
                  <Textarea
                    id="templateDescription"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Brief description of this fee template"
                    className={`${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'} mt-1 h-20 resize-none overflow-y-auto custom-scrollbar`}
                  />
                </div>

                {feeType === 'semester' && (
                  <div>
                    <Label htmlFor="semester">Semester</Label>
                    <Input
                      id="semester"
                      type="number"
                      min="1"
                      max="10"
                      value={semester || ''}
                      onChange={(e) => setSemester(parseInt(e.target.value) || undefined)}
                      placeholder="Semester number"
                      className={`${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'} mt-1`}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="dueDate">Default Due Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !dueDate && "text-muted-foreground",
                          theme === 'dark' ? 'bg-background border-border hover:bg-muted' : 'bg-white border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(new Date(dueDate), "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate ? new Date(dueDate) : undefined}
                        onSelect={(date) => setDueDate(date ? format(date, "yyyy-MM-dd") : '')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-[10px] text-muted-foreground mt-1 italic">When assigned, invoices will inherit this as their due date.</p>
                </div>

                <div>
                  <Label className="mb-2 block">Fee Components</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table className="min-w-[640px] custom-scrollbar">
                        <TableHeader>
                          <TableRow className={theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}>
                            <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800'}>Select</TableHead>
                            <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800'}>Component</TableHead>
                            <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800'}>Default Amount</TableHead>
                            <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800'}>Override Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availableComponents.map((component) => (
                            <TableRow
                              key={component.id}
                              className={theme === 'dark' ? 'border-border' : 'border-gray-200'}
                            >
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={selectedComponents.includes(component.id)}
                                  onChange={() => toggleComponentSelection(component.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{component.name}</div>
                                  <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                    {component.description || 'No description'}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{formatCurrency(component.amount)}</TableCell>
                              <TableCell>
                                {selectedComponents.includes(component.id) && (
                                  <Input
                                    type="number"
                                    value={componentOverrides[component.id] || component.amount}
                                    onChange={(e) => updateComponentOverride(component.id, parseFloat(e.target.value) || 0)}
                                    placeholder="Override amount"
                                    className={`w-24 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'} mt-1`}
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                          {availableComponents.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-4">
                                No fee components available. Create components first.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingTemplate ? 'Update' : 'Create'} Template
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className={theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}>
                <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800'}>Name</TableHead>
                <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800'}>Type</TableHead>
                <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800'}>Semester</TableHead>
                <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800'}>Due Date</TableHead>
                <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800'}>Total Amount</TableHead>
                <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800'}>Status</TableHead>
                <TableHead className={`text-right ${theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800'}`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow
                  key={template.id}
                  className={theme === 'dark' ? 'border-border' : 'border-gray-200'}
                >
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {template.fee_type.charAt(0).toUpperCase() + template.fee_type.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{template.semester || '-'}</TableCell>
                  <TableCell>{template.due_date ? new Date(template.due_date).toLocaleDateString('en-IN') : '-'}</TableCell>
                  <TableCell>{formatCurrency((template.total_amount != null ? Number(template.total_amount) : (template.total_amount_cents != null ? Number(template.total_amount_cents) / 100 : 0)))}</TableCell>
                  <TableCell>
                    <Badge variant={template.is_active ? "default" : "secondary"}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="h-12 w-12 text-muted-foreground mb-2" />
                      <h3 className="font-medium text-lg mb-1">No fee templates found</h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        Create your first fee template to get started
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {/* Pagination Controls */}
        <div className="p-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">Page {templatesPage} of {templatesTotalPages}</div>
          <div className="flex items-center space-x-2">
            <Button size="sm" className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90" onClick={() => {
              if (templatesPage > 1) {
                const next = templatesPage - 1;
                setTemplatesPage(next);
                fetchTemplates(next);
              }
            }} disabled={templatesPage === 1}>Prev</Button>
            <span className={`min-w-8 text-center text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>
              {templatesPage}
            </span>
            <Button size="sm" className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90" onClick={() => {
              if (templatesPage < templatesTotalPages) {
                const next = templatesPage + 1;
                setTemplatesPage(next);
                fetchTemplates(next);
              }
            }} disabled={templatesPage === templatesTotalPages}>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FeeTemplates;