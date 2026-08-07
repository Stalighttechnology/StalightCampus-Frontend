import { translateTerminology, getTerm, getInstitutionType } from "@/utils/institutionConfig";
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
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
  Calendar as CalendarIcon } from
'lucide-react';
import { useTheme } from '@/context/ThemeContext'; // Added theme context import
import {
  getFeeComponents,
  getFeeTemplates,
  createFeeTemplate,
  updateFeeTemplate,
  deleteFeeTemplate } from
"../../utils/fees_manager_api";
import {
  Skeleton,
  SkeletonStatsGrid,
  SkeletonTable,
  SkeletonList,
  SkeletonPageHeader,
  SkeletonCard } from
"@/components/ui/skeleton";


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
  const institutionType = getInstitutionType();
  const [templates, setTemplates] = useState<FeeTemplate[]>([]);
  const [templatesPage, setTemplatesPage] = useState(1);
  const templatesPageRef = useRef(templatesPage);
  useEffect(() => {
    templatesPageRef.current = templatesPage;
  }, [templatesPage]);

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
  const [componentOverrides, setComponentOverrides] = useState<Record<number, string>>({});

  // Available components from backend
  const [availableComponents, setAvailableComponents] = useState<FeeComponent[]>([]);

  useEffect(() => {
    fetchTemplates(templatesPage);
    const onComponentsChanged = (e: any) => {
      const detail = e?.detail || {};
      const action = detail.action;
      if (!action) return;
      if (action === 'create' && detail.item) {
        setAvailableComponents((prev) => [{
          ...detail.item,
          amount: detail.item.amount_cents != null ? Number(detail.item.amount_cents) / 100 : detail.item.amount ? Math.round(detail.item.amount * 100) / 100 : 0
        }, ...prev]);
      } else if (action === 'update' && detail.item) {
        setAvailableComponents((prev) => prev.map((c) => c.id === detail.item.id ? { ...detail.item, amount: detail.item.amount_cents != null ? Number(detail.item.amount_cents) / 100 : detail.item.amount ? Math.round(detail.item.amount * 100) / 100 : 0 } : c));
        fetchTemplates(templatesPageRef.current);
      } else if (action === 'delete' && detail.id) {
        setAvailableComponents((prev) => prev.filter((c) => c.id !== detail.id));
        fetchTemplates(templatesPageRef.current);
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
        amount: (it.amount_cents != null ? Number(it.amount_cents) : it.amount ? Math.round(it.amount * 100) : 0) / 100
      })));
    } catch (err) {

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
        total_amount: t.total_amount_cents != null ? Number(t.total_amount_cents) / 100 : t.total_amount || 0,
        components: (t.components || []).map((c: any) => ({
          id: c.component,
          component_name: c.component_name,
          amount: c.component_amount_cents != null ? Number(c.component_amount_cents) / 100 : c.component?.amount ? Math.round(c.component.amount * 100) / 100 : 0,
          amount_override: c.amount_override_cents != null ? Number(c.amount_override_cents) / 100 : c.amount_override != null ? Number(c.amount_override) : null
        }))
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
    setError(null);
  };

  const addComponent = () => {
    if (!componentName.trim() || !componentAmount) return;

    const newComponent: FeeComponent = {
      id: Date.now(), // Temporary ID for new components
      name: componentName.trim(),
      amount: parseFloat(componentAmount),
      description: componentDescription.trim() || undefined,
      is_active: true
    };

    setAvailableComponents([...availableComponents, newComponent]);
    setComponentName('');
    setComponentAmount('');
    setComponentDescription('');
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim() || selectedComponents.length === 0) return;

    if (feeType === 'other' && !templateDescription.trim()) {
      const currentTheme = theme === 'dark' ? 'dark' : 'light';
      await MySwal.fire({
        title: 'Validation Error',
        text: 'Description is required when Fee Type is set to "Other".',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: currentTheme === 'dark' ? '#ffffff' : '#000000'
      });
      return;
    }

    try {
      const templateData = {
        name: templateName.trim(),
        description: templateDescription.trim() || null,
        fee_type: feeType,
        semester: semester,
        due_date: dueDate || null,
        component_ids: selectedComponents,
        component_overrides: componentOverrides
      };

      const resp = await createFeeTemplate(templateData);

      if (!resp.success) {
        throw new Error(resp.message || 'Failed to create fee template');
      }
      const created = resp.data;
      const item = {
        ...created,
        total_amount: created.total_amount_cents != null ? Number(created.total_amount_cents) / 100 : created.total_amount || 0,
        components: (created.components || []).map((c: any) => ({
          id: c.component,
          component_name: c.component_name,
          amount: c.component_amount_cents != null ? Number(c.component_amount_cents) / 100 : c.component?.amount ? Math.round(c.component.amount * 100) / 100 : 0,
          amount_override: c.amount_override_cents != null ? Number(c.amount_override_cents) / 100 : c.amount_override != null ? Number(c.amount_override) : null
        }))
      };
      setTemplates((prev) => [item, ...prev]);
      setTemplatesTotalCount((c) => c + 1);
      try {window.dispatchEvent(new CustomEvent('feeTemplates:changed', { detail: { action: 'create', item } }));} catch (e) {}
      setIsCreateDialogOpen(false);
      resetForm();

      const currentTheme = theme === 'dark' ? 'dark' : 'light';
      await MySwal.fire({
        title: 'Success!',
        text: 'Fee template created successfully.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: currentTheme === 'dark' ? '#ffffff' : '#000000'
      });
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
    const templateComponents = template.components as unknown as any[] || [];
    const selectedIds: number[] = templateComponents.
    map((c) => Number(c.id ?? c.component?.id ?? c.component)).
    filter((id) => Number.isFinite(id));

    const overrides: Record<number, string> = {};
    templateComponents.forEach((c) => {
      const componentId = Number(c.id ?? c.component?.id ?? c.component);
      if (!Number.isFinite(componentId)) return;
      if (c.amount_override != null) {
        overrides[componentId] = String(c.amount_override);
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

    if (feeType === 'other' && !templateDescription.trim()) {
      const currentTheme = theme === 'dark' ? 'dark' : 'light';
      await MySwal.fire({
        title: 'Validation Error',
        text: 'Description is required when Fee Type is set to "Other".',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: currentTheme === 'dark' ? '#ffffff' : '#000000'
      });
      return;
    }

    try {
      const templateData = {
        name: templateName.trim(),
        description: templateDescription.trim() || null,
        fee_type: feeType,
        semester: semester,
        due_date: dueDate || null,
        component_ids: selectedComponents,
        component_overrides: componentOverrides
      };

      const resp = await updateFeeTemplate(editingTemplate.id, templateData);

      if (!resp.success) {
        throw new Error(resp.message || 'Failed to update fee template');
      }
      const updated = resp.data;
      const item = {
        ...updated,
        total_amount: updated.total_amount_cents != null ? Number(updated.total_amount_cents) / 100 : updated.total_amount || 0,
        components: (updated.components || []).map((c: any) => ({
          id: c.component,
          component_name: c.component_name,
          amount: c.component_amount_cents != null ? Number(c.component_amount_cents) / 100 : c.component?.amount ? Math.round(c.component.amount * 100) / 100 : 0,
          amount_override: c.amount_override_cents != null ? Number(c.amount_override_cents) / 100 : c.amount_override != null ? Number(c.amount_override) : null
        }))
      };

      setTemplates((prev) => prev.map((t) => t.id === item.id ? item : t));
      try {window.dispatchEvent(new CustomEvent('feeTemplates:changed', { detail: { action: 'update', item } }));} catch (e) {}
      setIsCreateDialogOpen(false);
      resetForm();

      const currentTheme = theme === 'dark' ? 'dark' : 'light';
      await MySwal.fire({
        title: 'Success!',
        text: 'Fee template updated successfully.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: currentTheme === 'dark' ? '#ffffff' : '#000000'
      });
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
      color: currentTheme === 'dark' ? '#ffffff' : '#000000'
    });

    if (!result.isConfirmed) return;

    try {
      const response = await deleteFeeTemplate(templateId);

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete fee template');
      }
      // Remove locally to avoid an extra GET
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      setTemplatesTotalCount((c) => Math.max(0, c - 1));
      await MySwal.fire({
        title: 'Deleted!',
        text: 'Fee template deleted successfully.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: currentTheme === 'dark' ? '#ffffff' : '#000000'
      });
      try {window.dispatchEvent(new CustomEvent('feeTemplates:changed', { detail: { action: 'delete', id: templateId } }));} catch (e) {}
    } catch (err) {
      await MySwal.fire({
        title: 'Error!',
        text: err instanceof Error ? err.message : 'Failed to delete template',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: currentTheme === 'dark' ? '#ffffff' : '#000000'
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const toggleComponentSelection = (componentId: number) => {
    if (selectedComponents.includes(componentId)) {
      setSelectedComponents(selectedComponents.filter((id) => id !== componentId));
      // Remove override if exists
      const newOverrides = { ...componentOverrides };
      delete newOverrides[componentId];
      setComponentOverrides(newOverrides);
    } else {
      setSelectedComponents([...selectedComponents, componentId]);
    }
  };

  const updateComponentOverride = (componentId: number, amount: string) => {
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
      </div>);

  }


  return (
    <div id="feesmanager-templates-container" className="mx-auto">
      {error &&
      <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      }

      <Card className={`${theme === 'dark' ? 'bg-card text-card-foreground' : 'bg-white text-gray-900'}`}>
        <CardHeader id="feesmanager-templates-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              Fee Templates List
            </CardTitle>
            <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Create and manage fee structures using components</p>
          </div>

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
                  }setIsCreateDialogOpen(true);
                }}
                className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 w-full sm:w-auto">
                
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
             <DialogContent
               onPointerDownOutside={(e) => e.preventDefault()}
               onEscapeKeyDown={(e) => e.preventDefault()}
               className={`flex flex-col w-[90vw] sm:w-[92vw] md:max-w-xl lg:max-w-2xl h-[80vh] sm:h-auto max-h-[80vh] sm:max-h-[90vh] overflow-hidden rounded-xl sm:rounded-2xl ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-white text-gray-900'} p-0 shadow-2xl`}
             >
              <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
                <DialogTitle>
                  {editingTemplate ? 'Edit Fee Template' : 'Create New Fee Template'}
                </DialogTitle>
              </DialogHeader>
               <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar px-6 pb-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div>
                    <Label htmlFor="templateName">Template Name</Label>
                    <Input
                      id="templateName"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder={institutionType === 'school' ? "e.g., Class 10 Mid Term 1" : translateTerminology("e.g., B.Tech Semester 1")}
                      className={`${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'} mt-1`} />
                    
                  </div>
                  <div>
                    <Label htmlFor="feeType">Fee Type</Label>
                    <Select value={feeType} onValueChange={setFeeType}>
                      <SelectTrigger
                        id="feeType"
                        className={`${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'} mt-1 w-full`}>
                        
                        <SelectValue placeholder="Select fee type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semester">{institutionType === 'school' ? 'Mid Term Fee' : 'Semester Fee'}</SelectItem>
                        <SelectItem value="annual">Annual Fee</SelectItem>
                        <SelectItem value="exam">Exam Fee</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="templateDescription">Description {feeType === 'other' ? <span className="text-red-500">*</span> : '(Optional)'}</Label>
                  <Textarea
                    id="templateDescription"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder={feeType === 'other' ? "Description is required for 'Other' fee type" : "Brief description of this fee template"}
                    className={`${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'} mt-1 h-20 resize-none overflow-y-auto custom-scrollbar`} />
                  
                </div>

                {feeType === 'semester' &&
                <div>
                    <Label htmlFor="semester">{institutionType === 'school' ? 'Term / Mid Term' : translateTerminology("Semester")}</Label>
                    <Input
                    id="semester"
                    type="number"
                    min="1"
                    max="10"
                    value={semester || ''}
                    onChange={(e) => setSemester(parseInt(e.target.value) || undefined)}
                    placeholder={institutionType === 'school' ? "Term / Mid Term number" : translateTerminology("Semester number")}
                    className={`${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'} mt-1`} />
                  
                  </div>
                }



                <div>
                  <Label className="mb-2 block font-medium">Fee Components</Label>
                  <div className="max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {availableComponents.map((component) => {
                        const isSelected = selectedComponents.includes(component.id);
                        return (
                          <div
                            key={component.id}
                            onClick={() => toggleComponentSelection(component.id)}
                            className={`group relative flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none ${
                              isSelected
                                ? theme === 'dark'
                                  ? 'border-primary bg-primary/10 shadow-lg shadow-primary/5'
                                  : 'border-primary bg-primary/5 shadow-md shadow-primary/5'
                                : theme === 'dark'
                                ? 'border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className={`flex items-center justify-center h-5 w-5 rounded border-2 transition-all duration-150 shrink-0 ${
                                  isSelected
                                    ? 'border-primary bg-primary text-white'
                                    : theme === 'dark'
                                    ? 'border-gray-600 bg-muted/20'
                                    : 'border-gray-400 bg-gray-50'
                                }`}>
                                {isSelected && (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-3 w-3"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-sm truncate group-hover:text-primary transition-colors duration-150">
                                  {component.name}
                                </div>
                                <div className={`text-xs truncate ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'} mt-0.5`}>
                                  {component.description || 'No description'}
                                </div>
                              </div>
                            </div>
                            <div className="text-right pl-3 shrink-0">
                              <span className="font-bold text-sm text-primary">
                                {formatCurrency(component.amount)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {availableComponents.length === 0 && (
                        <div className={`col-span-full text-center py-6 text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          No fee components available. Create components first.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 pb-4 px-6 border-t bg-card shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className={cn(
                      "flex-1 sm:flex-none",
                      theme === 'dark' ? 'border-border text-foreground hover:bg-muted' : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                    )}>
                    
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                    className="bg-primary hover:bg-primary/90 text-white flex-1 sm:flex-none">
                    
                    <Save className="h-4 w-4 mr-2" />
                    {editingTemplate ? 'Update' : 'Create'} Template
                  </Button>
                </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow className={theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}>
                <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800'}>Name</TableHead>
                <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800'}>Type</TableHead>
                <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800'}>Total Amount</TableHead>
                <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800'}>Status</TableHead>
                <TableHead className={`text-right ${theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800'}`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) =>
              <TableRow
                key={template.id}
                className={theme === 'dark' ? 'border-border' : 'border-gray-200'}>
                
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {template.fee_type === 'semester' 
                        ? (institutionType === 'school' ? 'Mid Term Fee' : 'Semester Fee')
                        : template.fee_type.charAt(0).toUpperCase() + template.fee_type.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(template.total_amount != null ? Number(template.total_amount) : template.total_amount_cents != null ? Number(template.total_amount_cents) / 100 : 0)}</TableCell>
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
                      onClick={() => handleEditTemplate(template)}>
                      
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteTemplate(template.id)}>
                      
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 px-4">
                    <div className={`flex flex-col items-center justify-center py-12 px-4 rounded-xl border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
                      <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                        <FileText className="w-10 h-10 text-primary opacity-50" />
                      </div>
                      <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                        No Fee Templates Found
                      </h3>
                      <p className={`text-center max-w-sm text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        Create your first fee template to get started. Templates help you bundle multiple components for quick billing.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {/* Pagination Controls */}
        {templatesTotalPages > 1 && (
          <CardFooter className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${theme === 'dark' ? 'bg-muted/10' : 'bg-gray-50/50'}`}>
            <div className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Showing Page {templatesPage} of {templatesTotalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline"
                size="sm" 
                className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 px-4 h-9 shadow-sm shadow-primary/10" 
                onClick={() => {
                  if (templatesPage > 1) {
                    const next = templatesPage - 1;
                    setTemplatesPage(next);
                    fetchTemplates(next);
                  }
                }} 
                disabled={templatesPage === 1}
              >
                Previous
              </Button>
              
              <div className={`min-w-10 h-9 flex items-center justify-center rounded-md border text-sm font-bold ${theme === 'dark' ? 'bg-muted/50 border-border text-foreground' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                {templatesPage}
              </div>
              
              <Button 
                variant="outline"
                size="sm" 
                className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 px-4 h-9 shadow-sm shadow-primary/10" 
                onClick={() => {
                  if (templatesPage < templatesTotalPages) {
                    const next = templatesPage + 1;
                    setTemplatesPage(next);
                    fetchTemplates(next);
                  }
                }} 
                disabled={templatesPage === templatesTotalPages}
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>);

};

export default FeeTemplates;