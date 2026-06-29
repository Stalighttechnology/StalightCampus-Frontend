import { useState, useEffect } from 'react';
import { Send, Info, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { requestGatePass } from '../../utils/hms_api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';

interface RequestGatePassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const periods = ['AM', 'PM'];

const timeTo12hOrEmpty = (time24: string) => {
  if (!time24) return { hour: '', minute: '', period: '' };
  const [hourStr, minStr] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  return {
    hour: hour.toString(),
    minute: minStr,
    period
  };
};

const timeTo24h = (hour: string, minute: string, period: string) => {
  let h = parseInt(hour, 10);
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const hStr = h.toString().padStart(2, '0');
  const mStr = minute.padStart(2, '0');
  return `${hStr}:${mStr}`;
};

const RequestGatePassModal = ({
  isOpen,
  onClose,
  onSuccess
}: RequestGatePassModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    out_date: '',
    out_time: '',
    expected_return_date: '',
    expected_return_time: '',
    reason: ''
  });
  const [outCalendarOpen, setOutCalendarOpen] = useState(false);
  const [returnCalendarOpen, setReturnCalendarOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      const now = new Date();
      
      const formatLocalDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const formatLocalTime = (d: Date) => {
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      };

      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      setFormData({
        out_date: formatLocalDate(now),
        out_time: formatLocalTime(now),
        expected_return_date: formatLocalDate(oneHourLater),
        expected_return_time: formatLocalTime(oneHourLater),
        reason: ''
      });
    }
  }, [isOpen]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minReturnDate = formData.out_date ? new Date(formData.out_date) : today;
  minReturnDate.setHours(0, 0, 0, 0);

  const outTimeParts = timeTo12hOrEmpty(formData.out_time);
  const returnTimeParts = timeTo12hOrEmpty(formData.expected_return_time);

  const handleOutTimeChange = (type: 'hour' | 'minute' | 'period', value: string) => {
    const newParts = {
      hour: outTimeParts.hour || '12',
      minute: outTimeParts.minute || '00',
      period: outTimeParts.period || 'PM',
      [type]: value
    };
    const time24 = timeTo24h(newParts.hour, newParts.minute, newParts.period);
    setFormData({ ...formData, out_time: time24 });
  };

  const handleReturnTimeChange = (type: 'hour' | 'minute' | 'period', value: string) => {
    const newParts = {
      hour: returnTimeParts.hour || '12',
      minute: returnTimeParts.minute || '00',
      period: returnTimeParts.period || 'PM',
      [type]: value
    };
    const time24 = timeTo24h(newParts.hour, newParts.minute, newParts.period);
    setFormData({ ...formData, expected_return_time: time24 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.out_date || !formData.out_time || !formData.expected_return_date || !formData.expected_return_time || !formData.reason.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields.',
        variant: 'destructive'
      });
      return;
    }

    const outDateTime = new Date(`${formData.out_date}T${formData.out_time}`);
    const returnDateTime = new Date(`${formData.expected_return_date}T${formData.expected_return_time}`);

    const now = new Date();
    if (outDateTime < new Date(now.getTime() - 5 * 60 * 1000)) {
      toast({
        title: 'Validation Error',
        description: 'Out date and time cannot be in the past.',
        variant: 'destructive'
      });
      return;
    }

    if (returnDateTime <= outDateTime) {
      toast({
        title: 'Validation Error',
        description: 'Return date and time must be after the out date and time.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await requestGatePass(formData);
      if (response.success) {
        toast({
          title: 'Gate Pass Requested',
          description: 'Your request has been submitted to your warden successfully.',
        });
        setFormData({
          out_date: '',
          out_time: '',
          expected_return_date: '',
          expected_return_time: '',
          reason: ''
        });
        setError(null);
        onClose();
        onSuccess?.();
      } else {
        setError(response.message || 'Failed to submit request.');
        toast({
          title: 'Error',
          description: response.message || 'Failed to submit request.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      setError('Failed to connect to the server.');
      toast({
        title: 'Error',
        description: 'Failed to connect to the server.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[90%] sm:max-w-[480px] p-0 overflow-hidden shadow-2xl border max-h-[80vh] sm:max-h-[90vh] flex flex-col bg-background rounded-xl">
        <DialogHeader className="p-6 pb-4 border-b shrink-0 bg-muted/10">
          <DialogTitle className="text-xl font-semibold">Request Gate Pass</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Fill in the details to request permission to leave campus.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 flex flex-col">
              <Label htmlFor="out_date" className="text-xs sm:text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Out Date *</Label>
              <Popover open={outCalendarOpen} onOpenChange={setOutCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal h-10 text-sm sm:text-xs border-border/80 bg-background"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {formData.out_date ? format(new Date(formData.out_date), "dd-MM-yyyy") : <span className="text-muted-foreground">dd-mm-yyyy</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background text-foreground border-border shadow-lg" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.out_date ? new Date(formData.out_date) : undefined}
                    onSelect={(date) => {
                      setFormData({ ...formData, out_date: date ? format(date, "yyyy-MM-dd") : '' });
                      setOutCalendarOpen(false);
                    }}
                    disabled={(date) => date < today}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5 flex flex-col">
              <Label className="text-xs sm:text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Out Time *</Label>
              <div className="flex gap-1.5">
                <Select value={outTimeParts.hour} onValueChange={(val) => handleOutTimeChange('hour', val)}>
                  <SelectTrigger className="h-10 text-sm sm:text-xs w-full bg-background border-border/80">
                    <SelectValue placeholder="HH" />
                  </SelectTrigger>
                  <SelectContent>
                    {hours.map((h) => (
                      <SelectItem key={h} value={h}>{h.padStart(2, '0')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={outTimeParts.minute} onValueChange={(val) => handleOutTimeChange('minute', val)}>
                  <SelectTrigger className="h-10 text-sm sm:text-xs w-full bg-background border-border/80">
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {minutes.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={outTimeParts.period} onValueChange={(val) => handleOutTimeChange('period', val)}>
                  <SelectTrigger className="h-10 text-sm sm:text-xs w-full bg-background border-border/80">
                    <SelectValue placeholder="AM/PM" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 flex flex-col">
              <Label htmlFor="expected_return_date" className="text-xs sm:text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Return Date *</Label>
              <Popover open={returnCalendarOpen} onOpenChange={setReturnCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal h-10 text-sm sm:text-xs border-border/80 bg-background"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {formData.expected_return_date ? format(new Date(formData.expected_return_date), "dd-MM-yyyy") : <span className="text-muted-foreground">dd-mm-yyyy</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background text-foreground border-border shadow-lg" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.expected_return_date ? new Date(formData.expected_return_date) : undefined}
                    onSelect={(date) => {
                      setFormData({ ...formData, expected_return_date: date ? format(date, "yyyy-MM-dd") : '' });
                      setReturnCalendarOpen(false);
                    }}
                    disabled={(date) => date < minReturnDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5 flex flex-col">
              <Label className="text-xs sm:text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Return Time *</Label>
              <div className="flex gap-1.5">
                <Select value={returnTimeParts.hour} onValueChange={(val) => handleReturnTimeChange('hour', val)}>
                  <SelectTrigger className="h-10 text-sm sm:text-xs w-full bg-background border-border/80">
                    <SelectValue placeholder="HH" />
                  </SelectTrigger>
                  <SelectContent>
                    {hours.map((h) => (
                      <SelectItem key={h} value={h}>{h.padStart(2, '0')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={returnTimeParts.minute} onValueChange={(val) => handleReturnTimeChange('minute', val)}>
                  <SelectTrigger className="h-10 text-sm sm:text-xs w-full bg-background border-border/80">
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {minutes.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={returnTimeParts.period} onValueChange={(val) => handleReturnTimeChange('period', val)}>
                  <SelectTrigger className="h-10 text-sm sm:text-xs w-full bg-background border-border/80">
                    <SelectValue placeholder="AM/PM" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-xs sm:text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Reason *</Label>
            <Textarea
              id="reason"
              placeholder="State the reason for leaving campus (e.g. going home, medical checkup)..."
              rows={3}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="resize-none focus-visible:ring-primary text-sm sm:text-xs border-border/80 bg-background"
            />
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs sm:text-[11px] text-blue-700/80 leading-normal">
              <strong>Info:</strong> Once submitted, this request goes to your warden's portal. You will receive an alert once they approve or reject it.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 font-semibold group shadow-md shadow-primary/20">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              )}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RequestGatePassModal;
