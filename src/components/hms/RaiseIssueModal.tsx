import { useState } from 'react';
import { AlertCircle, Send, HelpCircle, Building, Info } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { raiseIssue } from '../../utils/hms_api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RaiseIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: number;
  roomName?: string;
  onSuccess?: () => void;
}

const RaiseIssueModal = ({
  isOpen,
  onClose,
  roomId,
  roomName,
  onSuccess
}: RaiseIssueModalProps) => {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter an issue title',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter issue description',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await raiseIssue({
        title: formData.title,
        description: formData.description,
        room: roomId
      });

      if (response.success) {
        toast({
          title: 'Issue Submitted',
          description: 'Your request has been logged successfully.',
        });
        setFormData({ title: '', description: '' });
        onClose();
        onSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to raise issue',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect to the server',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-primary/20 shadow-2xl">
        <div className="bg-primary px-6 py-8 text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <HelpCircle className="w-24 h-24 rotate-12" />
          </div>
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-2xl font-bold">Raise an Issue</DialogTitle>
            <DialogDescription className="text-primary-foreground/80 font-medium">
              Report a maintenance problem or a complaint.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {roomName && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-dashed">
              <div className="bg-background p-2 rounded-md shadow-sm">
                <Building className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Affected Location</p>
                <p className="text-sm font-bold">Room {roomName}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Issue Title</Label>
              <Input
                id="title"
                placeholder="e.g. Water Tap Leakage, Light Not Working"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="h-11 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Description</Label>
              <Textarea
                id="description"
                placeholder="Please describe the issue in detail so our team can fix it faster..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="resize-none focus-visible:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <p className="text-xs text-blue-700/80 leading-relaxed">
              <strong>Note:</strong> Maintenance issues are usually addressed within 24-48 hours. Urgent matters should be reported to the caretaker directly.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 font-bold group shadow-md shadow-primary/20">
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

export default RaiseIssueModal;
