import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/context/ThemeContext';
import {
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  User,
  Building2,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
} from 'lucide-react';

interface GatePassData {
  id: number;
  pass_token?: string;
  student?: number;
  student_name?: string;
  student_usn?: string;
  student_photo?: string | null;
  student_phone?: string;
  parent_phone?: string;
  emergency_contact?: string;
  branch_name?: string;
  room_number?: string;
  hostel_name?: string;
  warden_name?: string;
  reason?: string;
  out_date?: string;
  out_time?: string;
  expected_return_date?: string;
  expected_return_time?: string;
  status?: string;
  approved_by_name?: string;
  action_note?: string;
  actual_out_time?: string | null;
  checked_out_by_name?: string | null;
  actual_in_time?: string | null;
  checked_in_by_name?: string | null;
  security_note?: string | null;
  is_late?: boolean;
  late_duration_minutes?: number;
  created_at?: string;
}

interface DigitalGatePassModalProps {
  isOpen: boolean;
  onClose: () => void;
  gatePass: GatePassData | null;
}

const formatTimeToAmPm = (timeStr?: string) => {
  if (!timeStr) return '--:--';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

const formatDateTime = (dateTimeStr?: string | null) => {
  if (!dateTimeStr) return '--';
  try {
    const d = new Date(dateTimeStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateTimeStr;
  }
};

export const DigitalGatePassModal: React.FC<DigitalGatePassModalProps> = ({
  isOpen,
  onClose,
  gatePass,
}) => {
  const { theme } = useTheme();
  const printRef = useRef<HTMLDivElement>(null);

  if (!gatePass) return null;

  const qrPayload = JSON.stringify({
    type: 'GATE_PASS',
    pass_token: gatePass.pass_token || `GP-${gatePass.id}`,
    id: gatePass.id,
    usn: gatePass.student_usn,
    student: gatePass.student_name,
    out: `${gatePass.out_date} ${gatePass.out_time}`,
    return: `${gatePass.expected_return_date} ${gatePass.expected_return_time}`,
  });

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = () => {
    switch (gatePass.status) {
      case 'approved':
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1 font-semibold flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved • Ready for Gate
          </Badge>
        );
      case 'checked_out':
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 font-semibold flex items-center gap-1.5 shadow-sm">
            <ArrowRight className="w-3.5 h-3.5" />
            Checked Out • Outside Campus
          </Badge>
        );
      case 'checked_in':
        return (
          <Badge className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1 font-semibold flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            Checked In • Completed
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="text-xs px-3 py-1 font-semibold">
            Rejected
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="secondary" className="text-xs px-3 py-1 font-semibold text-muted-foreground">
            Expired
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs px-3 py-1 font-semibold bg-amber-500/10 text-amber-600 border-amber-300">
            Pending Approval
          </Badge>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border-border bg-card max-h-[90vh] flex flex-col">
        <DialogHeader className="p-5 pb-3 border-b border-border/60 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Official Digital Gate Pass
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Hostel Security Departure & Entry Verification
                </DialogDescription>
              </div>
            </div>
            <div>{getStatusBadge()}</div>
          </div>
        </DialogHeader>

        <div className="p-5 overflow-y-auto space-y-5" ref={printRef}>
          {/* QR Code & Token Header Card */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-muted/40 border border-border/80 shadow-xs">
            <div className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-200 flex-shrink-0">
              <QRCodeSVG
                value={gatePass.pass_token || qrPayload}
                size={130}
                level="H"
                includeMargin={false}
              />
            </div>
            <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Pass Token ID
              </span>
              <div className="text-lg font-mono font-extrabold text-primary tracking-wide">
                {gatePass.pass_token || `GP-${gatePass.id}`}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Present this QR code to the Security Guard at the campus gate during departure and return.
              </p>
              <div className="pt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
                <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md bg-background border border-border text-foreground">
                  Pass #{gatePass.id}
                </span>
                {gatePass.is_late && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-3 h-3" />
                    Late by {gatePass.late_duration_minutes} mins
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Student Profile Overview */}
          <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-3">
            <div className="flex items-center gap-3">
              {gatePass.student_photo ? (
                <img
                  src={gatePass.student_photo}
                  alt={gatePass.student_name}
                  className="w-12 h-12 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base border border-primary/20">
                  {gatePass.student_name ? gatePass.student_name.charAt(0).toUpperCase() : 'S'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm text-foreground truncate">
                  {gatePass.student_name || 'Student'}
                </h3>
                <p className="text-xs font-mono font-medium text-muted-foreground">
                  USN: {gatePass.student_usn || '--'} {gatePass.branch_name ? `• ${gatePass.branch_name}` : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-border/50 text-xs">
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase block">Hostel</span>
                <span className="font-medium text-foreground">{gatePass.hostel_name || '--'}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase block">Room</span>
                <span className="font-medium text-foreground">{gatePass.room_number || '--'}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase block">Approved By</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {gatePass.approved_by_name || gatePass.warden_name || 'Warden'}
                </span>
              </div>
            </div>
          </div>

          {/* Departure & Return Timelines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Outgoing */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                Departure Schedule
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled Date:</span>
                  <span className="font-semibold text-foreground">{gatePass.out_date || '--'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled Time:</span>
                  <span className="font-semibold text-foreground">{formatTimeToAmPm(gatePass.out_time)}</span>
                </div>
                {gatePass.actual_out_time && (
                  <div className="flex flex-col pt-1 border-t border-border/40 text-blue-600 dark:text-blue-400 font-medium">
                    <div className="flex justify-between">
                      <span>Gate Check-Out:</span>
                      <span>{formatDateTime(gatePass.actual_out_time)}</span>
                    </div>
                    {gatePass.checked_out_by_name && (
                      <span className="text-[10px] text-muted-foreground">Officer: {gatePass.checked_out_by_name}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Return */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5" />
                Return Schedule
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Date:</span>
                  <span className="font-semibold text-foreground">{gatePass.expected_return_date || '--'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Time:</span>
                  <span className="font-semibold text-foreground">{formatTimeToAmPm(gatePass.expected_return_time)}</span>
                </div>
                {gatePass.actual_in_time && (
                  <div className="flex flex-col pt-1 border-t border-border/40 text-purple-600 dark:text-purple-400 font-medium">
                    <div className="flex justify-between">
                      <span>Gate Check-In:</span>
                      <span>{formatDateTime(gatePass.actual_in_time)}</span>
                    </div>
                    {gatePass.checked_in_by_name && (
                      <span className="text-[10px] text-muted-foreground">Officer: {gatePass.checked_in_by_name}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reason & Action Note */}
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
              <span className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                Purpose / Reason
              </span>
              <p className="text-foreground leading-relaxed">{gatePass.reason || 'Personal / General Exit'}</p>
            </div>

            {gatePass.action_note && (
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200">
                <span className="font-semibold text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                  Warden Approval Remark
                </span>
                <p>{gatePass.action_note}</p>
              </div>
            )}

            {gatePass.security_note && (
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-blue-950 dark:text-blue-200">
                <span className="font-semibold text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                  Gate Security Log
                </span>
                <p>{gatePass.security_note}</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-9 px-4"
          >
            Close
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handlePrint}
            className="text-xs h-9 px-4 bg-primary hover:bg-primary/90 text-white font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save Pass
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DigitalGatePassModal;
