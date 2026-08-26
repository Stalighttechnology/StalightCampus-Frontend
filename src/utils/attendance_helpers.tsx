import React from 'react';
import { CheckpointState, CheckpointDetails, TodayAttendanceState } from '@/types/attendance';

export const getCheckpointDisplay = (
  state: CheckpointState,
  timestamp: string | null,
  delayMinutes: number = 0,
  theme: string = 'light'
) => {
  switch (state) {
    case 'COMPLETED':
      return (
        <div className="flex items-center gap-2">
          <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {timestamp ? new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'Completed'}
          </span>
          {delayMinutes > 0 && (
            <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full shadow-sm">
              +{delayMinutes}m
            </span>
          )}
        </div>
      );
    case 'MISSED':
      return <span className="text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded">Missed</span>;
    case 'NOT_REQUIRED':
    case 'NOT_REQUIRED_LEAVE':
    case 'NOT_REQUIRED_EARLY_CHECKOUT':
      return <span className="text-gray-500 font-semibold bg-gray-500/10 px-2 py-0.5 rounded">Not Required</span>;
    case 'PENDING':
    case 'ACTIVE':
      return <span className="text-gray-400 italic">Pending</span>;
    default:
      return <span className="text-gray-400 italic">Pending</span>;
  }
};
