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
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  IndianRupee,
  DollarSign
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext'; // Added theme context import
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import {
  getFeeComponents,
  createFeeComponent,
  updateFeeComponent,
  deleteFeeComponent
} from "../../utils/fees_manager_api";

interface FeeComponent {
  id: number;
  name: string;
  amount: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const MySwal = withReactContent(Swal);

const FeeComponents: React.FC = () => {
  const { theme } = useTheme(); // Using theme context
  const [components, setComponents] = useState<FeeComponent[]>([]);
  const [componentsPage, setComponentsPage] = useState(1);
  const [componentsPageSize] = useState(25);
  const [componentsTotalPages, setComponentsTotalPages] = useState(1);
  const [componentsTotalCount, setComponentsTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<FeeComponent | null>(null);

  // Form states
  const [componentName, setComponentName] = useState('');
  const [componentAmount, setComponentAmount] = useState('');
  const [componentDescription, setComponentDescription] = useState('');

  useEffect(() => {
    fetchComponents(componentsPage);
  }, []);

  const fetchComponents = async (page: number = componentsPage) => {
    try {
      setLoading(true);
      const data = await getFeeComponents(page, componentsPageSize);

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch fee components');
      }

      const items = (data.data || []).map((it: any) => ({
        ...it,
        amount: (it.amount_cents != null ? Number(it.amount_cents) : (it.amount ? Math.round(it.amount * 100) : 0)) / 100,
      }));
      setComponents(items);
      const meta = data.meta || {};
      setComponentsPage(meta.page || page);
      setComponentsTotalPages(meta.totalPages || Math.max(1, Math.ceil((meta.count || 0) / componentsPageSize)));
      setComponentsTotalCount(meta.count || (data.data || []).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setComponentName('');
    setComponentAmount('');
    setComponentDescription('');
    setEditingComponent(null);
  };

  const handleCreateComponent = async () => {
    if (!componentName.trim() || !componentAmount) return;

    try {
      const componentData = {
        name: componentName.trim(),
        amount_cents_write: Math.round(parseFloat(componentAmount) * 100),
        description: componentDescription.trim() || undefined,
      };

      const resp = await createFeeComponent(componentData);

      if (!resp.success) {
        throw new Error(resp.message || 'Failed to create fee component');
      }
      const created = resp.data;
      const item = {
        ...created,
        amount: (created.amount_cents != null ? Number(created.amount_cents) / 100 : (created.amount ? Math.round(created.amount * 100) / 100 : 0)),
      };
      setComponents(prev => [item, ...prev]);
      setComponentsTotalCount(c => c + 1);
      try { window.dispatchEvent(new CustomEvent('feeComponents:changed', { detail: { action: 'create', item } })); } catch (e) { }
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create component');
    }
  };

  const handleEditComponent = (component: FeeComponent) => {
    setEditingComponent(component);
    setComponentName(component.name);
    setComponentAmount(component.amount.toString());
    setComponentDescription(component.description || '');
    setIsCreateDialogOpen(true);
  };

  const handleUpdateComponent = async () => {
    if (!editingComponent || !componentName.trim() || !componentAmount) return;

    try {
      const componentData = {
        name: componentName.trim(),
        amount_cents_write: Math.round(parseFloat(componentAmount) * 100),
        description: componentDescription.trim() || undefined,
      };

      const resp = await updateFeeComponent(editingComponent.id, componentData);

      if (!resp.success) {
        throw new Error(resp.message || 'Failed to update fee component');
      }
      const updated = resp.data;
      const item = {
        ...updated,
        amount: (updated.amount_cents != null ? Number(updated.amount_cents) / 100 : (updated.amount ? Math.round(updated.amount * 100) / 100 : 0)),
      };
      setComponents(prev => prev.map(c => (c.id === item.id ? item : c)));
      // no change in total count for updates
      try { window.dispatchEvent(new CustomEvent('feeComponents:changed', { detail: { action: 'update', item } })); } catch (e) { }
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update component');
    }
  };

  const handleDeleteComponent = async (componentId: number) => {
    const currentTheme = theme === 'dark' ? 'dark' : 'light';
    const result = await MySwal.fire({
      title: 'Delete Fee Component?',
      text: 'This may affect existing fee templates.',
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
      const response = await deleteFeeComponent(componentId);

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete fee component');
      }

      // Remove locally without refetch
      setComponents(prev => prev.filter(c => c.id !== componentId));
      setComponentsTotalCount(c => Math.max(0, c - 1));
      await MySwal.fire({
        title: 'Deleted!',
        text: 'Fee component deleted successfully.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: currentTheme === 'dark' ? '#ffffff' : '#000000',
      });
      try { window.dispatchEvent(new CustomEvent('feeComponents:changed', { detail: { action: 'delete', id: componentId } })); } catch (e) { }
    } catch (err) {
      await MySwal.fire({
        title: 'Error!',
        text: err instanceof Error ? err.message : 'Failed to delete component',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: currentTheme === 'dark' ? '#ffffff' : '#000000',
      });
      setError(err instanceof Error ? err.message : 'Failed to delete component');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading fee components...</span>
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
        <CardHeader className="flex flex-row items-center justify-between max-[480px]:flex-col max-[480px]:items-start gap-4">
          <div>
            <CardTitle className={`${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Fee Components List
            </CardTitle>
            <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Manage basic fee building blocks used in templates</p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  resetForm();
                  setIsCreateDialogOpen(true);
                }}
                className="bg-primary hover:bg-primary/90 text-white max-[480px]:w-full max-[480px]:min-h-11 shadow-lg shadow-primary/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Component
              </Button>
            </DialogTrigger>
            <DialogContent className={`${theme === 'dark' ? 'bg-background text-foreground' : 'bg-white text-gray-900'} p-6 max-w-md max-[480px]:w-[90vw] max-[480px]:max-w-[340px] max-[480px]:rounded-xl max-[480px]:p-4 shadow-2xl`}>
              <DialogHeader className="mb-4">
                <DialogTitle className="max-[480px]:text-[20px]">
                  {editingComponent ? 'Edit Fee Component' : 'Create New Fee Component'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="componentName">Component Name</Label>
                  <Input
                    id="componentName"
                    value={componentName}
                    onChange={(e) => setComponentName(e.target.value)}
                    placeholder="e.g., Tuition Fee, Library Fee"
                    className={`${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'} mt-1`}
                  />
                </div>
                <div>
                  <Label htmlFor="componentAmount">Amount (₹)</Label>
                  <Input
                    id="componentAmount"
                    type="number"
                    value={componentAmount}
                    onChange={(e) => setComponentAmount(e.target.value)}
                    placeholder="0.00"
                    className={`${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'} mt-1`}
                  />
                </div>
                <div>
                  <Label htmlFor="componentDescription">Description (Optional)</Label>
                  <Textarea
                    id="componentDescription"
                    value={componentDescription}
                    onChange={(e) => setComponentDescription(e.target.value)}
                    placeholder="Brief description of this fee component"
                    className={`${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'} mt-1 h-32 resize-none overflow-y-auto thin-scrollbar`}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 max-[480px]:flex-col">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 max-[480px]:min-h-10 max-[480px]:w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={editingComponent ? handleUpdateComponent : handleCreateComponent}
                    className="bg-primary hover:bg-primary/90 text-white max-[480px]:min-h-10 max-[480px]:w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingComponent ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="max-[480px]:px-3 max-[480px]:py-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className={theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}>
                  <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800'}>Name</TableHead>
                  <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800'}>Amount</TableHead>
                  <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800'}>Description</TableHead>
                  <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800'}>Status</TableHead>
                  <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-gray-800 text-right pr-10'}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {components.map((component) => (
                  <TableRow
                    key={component.id}
                    className={theme === 'dark' ? 'border-border' : 'border-gray-200'}
                  >
                    <TableCell className="font-medium">{component.name}</TableCell>
                    <TableCell>{formatCurrency(component.amount)}</TableCell>
                    <TableCell>{component.description || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={component.is_active ? "default" : "secondary"}>
                        {component.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditComponent(component)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteComponent(component.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {components.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <DollarSign className="h-12 w-12 text-muted-foreground mb-2" />
                        <h3 className="font-medium text-lg mb-1">No fee components found</h3>
                        <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          Create your first fee component to get started
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination controls */}
          <div className="mt-4 flex items-center justify-between max-[480px]:flex-col max-[480px]:items-stretch max-[480px]:gap-3">
            <div className="text-sm text-gray-600 max-[480px]:text-center">Page {componentsPage} of {componentsTotalPages}</div>
            <div className="flex items-center space-x-2 max-[480px]:justify-center">
              <Button size="sm" className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 max-[480px]:h-11 max-[480px]:flex-1" onClick={() => {
                if (componentsPage > 1) {
                  const next = componentsPage - 1;
                  setComponentsPage(next);
                  fetchComponents(next);
                }
              }} disabled={componentsPage === 1}>Prev</Button>
              <span className={`min-w-8 text-center text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>
                {componentsPage}
              </span>
              <Button size="sm" className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 max-[480px]:h-11 max-[480px]:flex-1" onClick={() => {
                if (componentsPage < componentsTotalPages) {
                  const next = componentsPage + 1;
                  setComponentsPage(next);
                  fetchComponents(next);
                }
              }} disabled={componentsPage === componentsTotalPages}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeeComponents;