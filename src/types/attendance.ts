export type AttendanceAction = 'first_half_in' | 'first_half_out' | 'second_half_in' | 'second_half_out' | 'check_in' | 'check_out' | 'early_checkout';

export type CheckpointState = 'COMPLETED' | 'MISSED' | 'NOT_REQUIRED' | 'NOT_REQUIRED_LEAVE' | 'NOT_REQUIRED_EARLY_CHECKOUT' | 'PENDING' | 'ACTIVE';

export interface CheckpointDetails {
  state: CheckpointState;
  timestamp: string | null;
}

export interface TodayAttendanceState {
  is_holiday: boolean;
  is_weekly_off: boolean;
  is_full_day_leave: boolean;
  is_half_day_leave: boolean;
  half_day_leave_session: string | null;
  is_early_checkout: boolean;
  off_campus_duty: boolean | string;
  is_completed: boolean;
  next_action: AttendanceAction | null;
  checkpoints: Record<string, CheckpointDetails>;
}
