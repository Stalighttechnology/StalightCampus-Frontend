import React from 'react';
import { ChevronRight, CheckCircle2, Clock, AlertCircle, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { translateTerminology } from '../../utils/institutionConfig';

interface QPWorkflowStepperProps {
  chain: string[];
  currentStatus?: string | null;
  className?: string;
}

const getRoleLabel = (role: string): string => {
  const r = (role || '').toLowerCase();
  if (r === 'hod') return translateTerminology('HOD') || 'Head of Branch';
  if (r === 'coe') return 'COE';
  if (r === 'principal') return 'Principal';
  if (r === 'dean') return 'Dean';
  if (r === 'teacher' || r === 'faculty') return 'Faculty';
  return role.charAt(0).toUpperCase() + role.slice(1);
};

export const QPWorkflowStepper: React.FC<QPWorkflowStepperProps> = ({
  chain = ['hod', 'coe', 'principal'],
  currentStatus = '',
  className = '',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const normalizedChain = chain && chain.length > 0 ? chain : ['hod', 'coe', 'principal'];
  const status = (currentStatus || '').toLowerCase();

  // Extract active role from status (e.g. "pending_hod" -> "hod", "pending_principal" -> "principal")
  let activeRole: string | null = null;
  if (status.startsWith('pending_')) {
    activeRole = status.replace('pending_', '');
  }

  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const isExpired = status === 'expired';

  const activeIndex = activeRole ? normalizedChain.indexOf(activeRole) : isApproved ? normalizedChain.length : -1;

  return (
    <div className={`w-full overflow-x-auto py-2 ${className}`}>
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
        {/* Stage 1: Faculty (Submits) */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
            isDark
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          <Check className="w-3.5 h-3.5 text-emerald-500" />
          <span>Faculty (Submits)</span>
        </div>

        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

        {/* Dynamic Chain Steps */}
        {normalizedChain.map((role, idx) => {
          const isCurrentActive = activeRole === role;
          const isPassed = isApproved || (activeIndex > -1 && idx < activeIndex);
          const label = getRoleLabel(role);

          let badgeClasses = '';
          let icon = null;

          if (isApproved || isPassed) {
            badgeClasses = isDark
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200';
            icon = <Check className="w-3.5 h-3.5 text-emerald-500" />;
          } else if (isCurrentActive) {
            badgeClasses = isDark
              ? 'bg-primary/20 text-primary border-primary ring-2 ring-primary/30 font-bold shadow-sm'
              : 'bg-primary/10 text-primary border-primary/40 ring-2 ring-primary/20 font-bold shadow-sm';
            icon = <Clock className="w-3.5 h-3.5 text-primary animate-pulse" />;
          } else {
            badgeClasses = isDark
              ? 'bg-card/60 text-muted-foreground border-border/80'
              : 'bg-white text-gray-500 border-gray-200';
          }

          return (
            <React.Fragment key={`${role}-${idx}`}>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${badgeClasses}`}
                title={isCurrentActive ? `Currently awaiting ${label} review` : label}
              >
                {icon}
                <span>{label}</span>
              </div>

              {idx < normalizedChain.length - 1 && (
                <ChevronRight
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isPassed ? 'text-emerald-500/60' : 'text-muted-foreground'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Final Stage Indicator */}
        <ChevronRight
          className={`w-3.5 h-3.5 shrink-0 ${
            isApproved ? 'text-emerald-500' : 'text-muted-foreground'
          }`}
        />

        {isApproved ? (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isDark
                ? 'bg-emerald-900/40 text-emerald-300 border-emerald-500/50 ring-2 ring-emerald-500/30'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-2 ring-emerald-400/20'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Approved ✅</span>
          </div>
        ) : isRejected ? (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isDark
                ? 'bg-red-950/40 text-red-300 border-red-500/40'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <span>Rejected / Returned</span>
          </div>
        ) : isExpired ? (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isDark
                ? 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Expired</span>
          </div>
        ) : (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isDark
                ? 'bg-card/40 text-muted-foreground/70 border-border/50'
                : 'bg-gray-50 text-gray-400 border-gray-200'
            }`}
          >
            <span>Approved ✅</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default QPWorkflowStepper;
