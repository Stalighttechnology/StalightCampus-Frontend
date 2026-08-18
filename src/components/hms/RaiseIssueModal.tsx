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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [issueType, setIssueType] = useState<string>('Internet');
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleClose = () => {
    setIssueType('Internet');
    setCustomTitle('');
    setDescription('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalTitle = issueType === 'Other' ? customTitle.trim() : issueType;

    if (!finalTitle) {
      toast({
        title: 'Validation Error',
        description: issueType === 'Other' ? 'Please enter an issue title' : 'Please select an issue type',
        variant: 'destructive'
      });
      return;
    }

    if (!description.trim()) {
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
        title: finalTitle,
        description: description.trim(),
        room: roomId
      });

      if (response.success) {
        toast({
          title: 'Issue Submitted',
          description: 'Your request has been logged successfully.',
        });
        setIssueType('Internet');
        setCustomTitle('');
        setDescription('');
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[90%] sm:max-w-[450px] p-0 overflow-hidden shadow-2xl border max-h-[90vh] flex flex-col bg-background rounded-xl">
        <DialogHeader className="p-6 pb-4 border-b shrink-0 bg-muted/10">
          <DialogTitle className="text-xl font-semibold">Raise an Issue</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Report a maintenance problem or a complaint.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar min-h-0">
          {roomName && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-dashed">
              <div className="bg-background p-1.5 rounded-md shadow-sm">
                <Building className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase text-muted-foreground tracking-wider">Affected Location</p>
                <p className="text-xs font-semibold">Room {roomName}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="issue-type" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Issue Type</Label>
              <Select value={issueType} onValueChange={(val) => setIssueType(val)}>
                <SelectTrigger id="issue-type" className="h-9 focus:ring-primary text-xs bg-background">
                  <SelectValue placeholder="Select issue category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50">
                  <SelectItem value="Internet">Internet</SelectItem>
                  <SelectItem value="Plumbing">Plumbing</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {issueType === 'Other' && (
              <div className="space-y-1 animate-in fade-in-50 duration-200">
                <Label htmlFor="title" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Issue Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Water Tap Leakage, Light Not Working"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="h-9 focus-visible:ring-primary text-xs"
                  autoFocus
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="description" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Description</Label>
              <Textarea
                id="description"
                placeholder="Please describe the issue in detail so our team can fix it faster..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none focus-visible:ring-primary text-xs"
              />
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-blue-700/80 leading-normal">
              <strong>Note:</strong> Maintenance issues are usually addressed within 24-48 hours. Urgent matters should be reported to the caretaker directly.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 font-semibold group shadow-md shadow-primary/20">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RaiseIssueModal;
