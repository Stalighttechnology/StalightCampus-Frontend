import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { getCOEFeeSettings, saveCOEFeeSettings } from '@/utils/coe_api';
import { useTheme } from '../../context/ThemeContext';
import { Edit3, Save, X, Coins, FileText, Layers, IndianRupee, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';

const COEFeeSettings = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Store confirmed amounts
  const [reval, setReval] = useState<number | null>(null);
  const [photocopy, setPhotocopy] = useState<number | null>(null);
  const [makeup, setMakeup] = useState<number | null>(null);

  // Temporary editing inputs
  const [tempReval, setTempReval] = useState<string>('');
  const [tempPhotocopy, setTempPhotocopy] = useState<string>('');
  const [tempMakeup, setTempMakeup] = useState<string>('');

  // Validation errors
  const [errors, setErrors] = useState({ reval: '', photocopy: '', makeup: '' });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await getCOEFeeSettings();
      if (res.success && res.data) {
        const r = Number(res.data.revaluation_fee ?? 0);
        const p = Number(res.data.photocopy_fee ?? 0);
        const m = Number(res.data.makeup_fee ?? 0);
        setReval(r);
        setPhotocopy(p);
        setMakeup(m);
        setTempReval(r.toString());
        setTempPhotocopy(p.toString());
        setTempMakeup(m.toString());
      }
    } catch (e) {
      toast.error('Failed to load fee settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleEditClick = () => {
    setTempReval(reval !== null ? reval.toString() : '0');
    setTempPhotocopy(photocopy !== null ? photocopy.toString() : '0');
    setTempMakeup(makeup !== null ? makeup.toString() : '0');
    setErrors({ reval: '', photocopy: '', makeup: '' });
    setIsEditing(true);
  };

  const handleCancelClick = async () => {
    const result = await Swal.fire({
      title: 'Discard Changes?',
      text: 'Any unsaved fee setting modifications will be lost.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, discard',
      background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
      color: theme === 'dark' ? '#ffffff' : '#000000'
    });
    if (result.isConfirmed) {
      setIsEditing(false);
      setErrors({ reval: '', photocopy: '', makeup: '' });
    }
  };

  const validate = () => {
    const newErrors = { reval: '', photocopy: '', makeup: '' };
    let isValid = true;

    // Validate Revaluation
    if (tempReval.trim() === '') {
      newErrors.reval = 'Revaluation fee is required';
      isValid = false;
    } else {
      const val = Number(tempReval);
      if (isNaN(val) || val < 0) {
        newErrors.reval = 'Enter a valid non-negative number';
        isValid = false;
      }
    }

    // Validate Photocopy
    if (tempPhotocopy.trim() === '') {
      newErrors.photocopy = 'Photocopy fee is required';
      isValid = false;
    } else {
      const val = Number(tempPhotocopy);
      if (isNaN(val) || val < 0) {
        newErrors.photocopy = 'Enter a valid non-negative number';
        isValid = false;
      }
    }

    // Validate Makeup
    if (tempMakeup.trim() === '') {
      newErrors.makeup = 'Makeup exam fee is required';
      isValid = false;
    } else {
      const val = Number(tempMakeup);
      if (isNaN(val) || val < 0) {
        newErrors.makeup = 'Enter a valid non-negative number';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Please correct the validation errors first');
      return;
    }
    const result = await Swal.fire({
      title: 'Save Fee Settings?',
      text: 'This will update the fee amounts charged to students.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#22c55e',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, save',
      background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
      color: theme === 'dark' ? '#ffffff' : '#000000'
    });
    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const payload = {
        revaluation_fee_cents_write: Math.round(Number(tempReval) * 100),
        photocopy_fee_cents_write: Math.round(Number(tempPhotocopy) * 100),
        makeup_fee_cents_write: Math.round(Number(tempMakeup) * 100),
      };
      const res = await saveCOEFeeSettings(payload);
      if (res.success) {
        setReval(Number(tempReval));
        setPhotocopy(Number(tempPhotocopy));
        setMakeup(Number(tempMakeup));
        setIsEditing(false);
        toast.success('Fee settings updated successfully');
      } else {
        toast.error(res.message || 'Save failed');
      }
    } catch (e) {
      toast.error('Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <Card className={`${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} shadow-md`}>
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight">COE Fee Configuration</CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Configure and manage standard fee charges for revaluation, photocopy, and makeup exams.
            </p>
          </div>
          {!isEditing && (
            <Button
              onClick={handleEditClick}
              disabled={loading}
              className="bg-primary hover:bg-primary/95 text-white flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" /> Edit Settings
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          {isEditing ? (
            // Edit Mode Form
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Revaluation Fee Input */}
                <div className="space-y-2">
                  <Label htmlFor="reval" className="font-semibold text-sm flex items-center gap-2">
                    <Coins className="w-4 h-4 text-primary" /> Revaluation Fee (₹)
                  </Label>
                  <div className="relative">
                    <Input
                      id="reval"
                      type="number"
                      step="0.01"
                      min="0"
                      value={tempReval}
                      onChange={(e) => setTempReval(e.target.value)}
                      className={`h-11 ${errors.reval ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      placeholder="e.g. 1000"
                    />
                  </div>
                  {errors.reval && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.reval}
                    </p>
                  )}
                </div>

                {/* Photocopy Fee Input */}
                <div className="space-y-2">
                  <Label htmlFor="photocopy" className="font-semibold text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Photocopy Fee (₹)
                  </Label>
                  <div className="relative">
                    <Input
                      id="photocopy"
                      type="number"
                      step="0.01"
                      min="0"
                      value={tempPhotocopy}
                      onChange={(e) => setTempPhotocopy(e.target.value)}
                      className={`h-11 ${errors.photocopy ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      placeholder="e.g. 500"
                    />
                  </div>
                  {errors.photocopy && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.photocopy}
                    </p>
                  )}
                </div>

                {/* Makeup Exam Fee Input */}
                <div className="space-y-2">
                  <Label htmlFor="makeup" className="font-semibold text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" /> Makeup Exam Fee (₹)
                  </Label>
                  <div className="relative">
                    <Input
                      id="makeup"
                      type="number"
                      step="0.01"
                      min="0"
                      value={tempMakeup}
                      onChange={(e) => setTempMakeup(e.target.value)}
                      className={`h-11 ${errors.makeup ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      placeholder="e.g. 300"
                    />
                  </div>
                  {errors.makeup && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.makeup}
                    </p>
                  )}
                </div>

              </div>

              {/* Edit Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button variant="ghost" onClick={handleCancelClick} disabled={loading} className="h-11 px-5">
                  <X className="w-4 h-4 mr-2" /> Cancel
                </Button>
                <Button onClick={handleSave} disabled={loading} className="bg-primary hover:bg-primary/95 text-white h-11 px-6 font-semibold">
                  <Save className="w-4 h-4 mr-2" /> Save Changes
                </Button>
              </div>
            </div>
          ) : (
            // View Mode Cards
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Revaluation Fee Card */}
              <div className={`p-6 md:p-8 min-h-[180px] rounded-2xl border flex flex-col justify-between ${theme === 'dark' ? 'bg-secondary/15 border-border' : 'bg-slate-50/50 border-gray-100'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revaluation</p>
                    <h4 className="text-sm font-semibold text-foreground/80 mt-1">Revaluation Request Fee</h4>
                  </div>
                  <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-primary/5 text-primary'}`}>
                    <Coins className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <IndianRupee className="w-4 h-4 opacity-75 self-center" />
                  <span className="text-3xl font-bold tracking-tight">{reval !== null ? reval.toLocaleString('en-IN') : '—'}</span>
                </div>
              </div>

              {/* Photocopy Fee Card */}
              <div className={`p-6 md:p-8 min-h-[180px] rounded-2xl border flex flex-col justify-between ${theme === 'dark' ? 'bg-secondary/15 border-border' : 'bg-slate-50/50 border-gray-100'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Photocopy</p>
                    <h4 className="text-sm font-semibold text-foreground/80 mt-1">Subject Copy Request Fee</h4>
                  </div>
                  <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-primary/5 text-primary'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <IndianRupee className="w-4 h-4 opacity-75 self-center" />
                  <span className="text-3xl font-bold tracking-tight">{photocopy !== null ? photocopy.toLocaleString('en-IN') : '—'}</span>
                </div>
              </div>

              {/* Makeup Exam Fee Card */}
              <div className={`p-6 md:p-8 min-h-[180px] rounded-2xl border flex flex-col justify-between ${theme === 'dark' ? 'bg-secondary/15 border-border' : 'bg-slate-50/50 border-gray-100'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Makeup Exam</p>
                    <h4 className="text-sm font-semibold text-foreground/80 mt-1">Makeup Examination Fee</h4>
                  </div>
                  <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-primary/5 text-primary'}`}>
                    <Layers className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <IndianRupee className="w-4 h-4 opacity-75 self-center" />
                  <span className="text-3xl font-bold tracking-tight">{makeup !== null ? makeup.toLocaleString('en-IN') : '—'}</span>
                </div>
              </div>

            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default COEFeeSettings;
