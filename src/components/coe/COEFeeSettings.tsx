import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { getCOEFeeSettings, saveCOEFeeSettings } from '@/utils/coe_api';
import { useTheme } from '../../context/ThemeContext';

const COEFeeSettings = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  // store amounts in rupees for user-friendly input
  const [reval, setReval] = useState<number | null>(null);
  const [photocopy, setPhotocopy] = useState<number | null>(null);
  const [makeup, setMakeup] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getCOEFeeSettings();
        if (res.success && res.data) {
          // API exposes decimal rupee fields as `revaluation_fee`, etc.
          setReval(Number(res.data.revaluation_fee ?? 0));
          setPhotocopy(Number(res.data.photocopy_fee ?? 0));
          setMakeup(Number(res.data.makeup_fee ?? 0));
        }
      } catch (e) {
        toast.error('Failed to load fee settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload: any = {};
      if (reval !== null) payload.revaluation_fee_cents_write = Math.round(Number(reval) * 100);
      if (photocopy !== null) payload.photocopy_fee_cents_write = Math.round(Number(photocopy) * 100);
      if (makeup !== null) payload.makeup_fee_cents_write = Math.round(Number(makeup) * 100);
      const res = await saveCOEFeeSettings(payload);
      if (res.success) {
        toast.success('Saved');
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
    <Card>
      <CardHeader>
        <CardTitle>COE Fee Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
              <Label>Revaluation Fee (₹)</Label>
              <Input type="number" step="0.01" value={reval ?? ''} onChange={(e) => setReval(e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div>
              <Label>Photocopy Fee (₹)</Label>
              <Input type="number" step="0.01" value={photocopy ?? ''} onChange={(e) => setPhotocopy(e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div>
              <Label>Makeup Exam Fee (₹)</Label>
              <Input type="number" step="0.01" value={makeup ?? ''} onChange={(e) => setMakeup(e.target.value === '' ? null : Number(e.target.value))} />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={handleSave} disabled={loading} className="bg-primary text-white">Save</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default COEFeeSettings;
