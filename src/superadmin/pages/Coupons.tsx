import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { manageCoupons } from '@/utils/authService';
import { Plus, Tag, Calendar, Users, Activity, Trash2, Loader2, IndianRupee } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Coupon {
  id: number;
  code: string;
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discount_value: string;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  created_at: string;
}

export const AdminCoupons: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'PERCENTAGE',
    discount_value: '',
    valid_days: '',
    max_uses: ''
  });

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await manageCoupons('GET');
      if (res.success) {
        setCoupons(res.coupons);
      } else {
        toast({ title: 'Error', description: res.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.discount_value) {
      toast({ title: 'Validation Error', description: 'Code and Discount value are required', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      const res = await manageCoupons('POST', formData);
      if (res.success) {
        toast({ title: 'Success', description: 'Coupon created successfully' });
        setIsCreateOpen(false);
        setFormData({ code: '', discount_type: 'PERCENTAGE', discount_value: '', valid_days: '', max_uses: '' });
        if (res.coupon) {
          setCoupons(prev => [res.coupon, ...prev]);
        }
      } else {
        toast({ title: 'Error', description: res.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      const res = await manageCoupons('PATCH', { is_active: !currentStatus }, id);
      if (res.success) {
        setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
        toast({ title: 'Success', description: 'Coupon status updated' });
      } else {
        toast({ title: 'Error', description: res.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const deleteCoupon = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const res = await manageCoupons('DELETE', null, id);
      if (res.success) {
        setCoupons(prev => prev.filter(c => c.id !== id));
        toast({ title: 'Success', description: 'Coupon deleted' });
      } else {
        toast({ title: 'Error', description: res.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Coupon Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage discount coupons for organizations.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus size={16} /> Create Coupon
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="bg-muted/20 border-b pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" /> Active Coupons
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No coupons found. Create your first coupon above.</p>
            </div>
          ) : (
            <div className="divide-y">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="p-4 flex flex-col md:flex-row items-center justify-between hover:bg-muted/10 transition-colors gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg font-mono bg-primary/10 text-primary px-3 py-1 rounded-md">
                        {coupon.code}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${coupon.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {coupon.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Tag size={14} className="text-primary/70" />
                        <span className="font-medium text-foreground">
                          {coupon.discount_type === 'PERCENTAGE' ? `${coupon.discount_value}% OFF` : `₹${Number(coupon.discount_value).toLocaleString('en-IN')} OFF`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        {coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString() : 'No Expiry'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Activity size={14} />
                        Used: {coupon.current_uses} {coupon.max_uses ? `/ ${coupon.max_uses}` : '(Unlimited)'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`status-${coupon.id}`} className="text-xs text-muted-foreground cursor-pointer">
                        {coupon.is_active ? 'Disable' : 'Enable'}
                      </Label>
                      <Switch
                        id={`status-${coupon.id}`}
                        checked={coupon.is_active}
                        onCheckedChange={() => toggleStatus(coupon.id, coupon.is_active)}
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteCoupon(coupon.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Coupon</DialogTitle>
            <DialogDescription>
              Generate a new discount code for organizational purchases.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Coupon Code</Label>
              <Input 
                placeholder="e.g. WELCOME50" 
                value={formData.code} 
                onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                required
                className="font-mono uppercase"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select 
                  value={formData.discount_type} 
                  onValueChange={(v: 'PERCENTAGE' | 'FIXED_AMOUNT') => setFormData({...formData, discount_type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                    <SelectItem value="FIXED_AMOUNT">Fixed Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <div className="relative">
                  {formData.discount_type === 'FIXED_AMOUNT' && <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
                  <Input 
                    type="number" 
                    min="1" 
                    step={formData.discount_type === 'PERCENTAGE' ? '1' : '100'} 
                    max={formData.discount_type === 'PERCENTAGE' ? '100' : undefined}
                    placeholder={formData.discount_type === 'PERCENTAGE' ? '20' : '5000'}
                    value={formData.discount_value}
                    onChange={e => setFormData({...formData, discount_value: e.target.value})}
                    className={formData.discount_type === 'FIXED_AMOUNT' ? 'pl-9' : ''}
                    required
                  />
                  {formData.discount_type === 'PERCENTAGE' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valid For (Days)</Label>
                <Input 
                  type="number" 
                  min="1" 
                  placeholder="e.g. 13" 
                  value={formData.valid_days} 
                  onChange={e => setFormData({...formData, valid_days: e.target.value})}
                />
                <p className="text-[10px] text-muted-foreground">Leave blank for no expiry</p>
              </div>
              <div className="space-y-2">
                <Label>Max Uses</Label>
                <Input 
                  type="number" 
                  min="1" 
                  placeholder="e.g. 100" 
                  value={formData.max_uses} 
                  onChange={e => setFormData({...formData, max_uses: e.target.value})}
                />
                <p className="text-[10px] text-muted-foreground">Leave blank for unlimited</p>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Coupon
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoupons;
