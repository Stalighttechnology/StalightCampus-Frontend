import React from "react";

export interface Stats { total_buses: number; total_routes: number; total_drivers: number; allocated_students: number; active_trips: number; pending_complaints: number; }
export interface BusT { id: number; bus_number: string; registration_number: string; capacity: number; model_name: string; status: string; is_active: boolean; }
export interface RouteT { id: number; route_name: string; start_location: string; end_location: string; distance: string; duration_minutes: number; morning_start_time: string; evening_start_time: string; stops: StopT[]; bus?: number | null; bus_details?: { id: number; bus_number: string; registration_number: string } | null; }
export interface StopT { id: number; stop_name: string; sequence_order: number; arrival_time_morning: string; arrival_time_evening: string; latitude: string; longitude: string; }
export interface DriverT { id: number; first_name: string; last_name: string; email: string; mobile_number: string; designation: string; }
export interface AllocationT { id: number; student: number; student_details: any; route: number; route_details: any; stop: number; stop_details: any; status: string; }
export interface IncidentT { id: number; type: string; title: string; description: string; status: string; created_at: string; reported_by_details: any; action_taken?: string; resolved_at?: string; resolved_by_details?: any; }

export const StatCard = ({ icon, label, value, accent, theme }: any) => (
  <div className={`rounded-2xl p-5 flex items-center gap-4 shadow-sm border transition-all hover:shadow-md ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100'}`}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent}`}>
      {icon}
    </div>
    <div>
      <p className={`text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{value ?? '—'}</p>
    </div>
  </div>
);

export const Badge = ({ label, color, children }: any) => {
  const colors: any = { active: 'bg-emerald-100 text-emerald-700', maintenance: 'bg-amber-100 text-amber-700', inactive: 'bg-red-100 text-red-700', allocated: 'bg-blue-100 text-blue-700', pending: 'bg-yellow-100 text-yellow-700', resolved: 'bg-green-100 text-green-700', emergency: 'bg-red-100 text-red-700', incident: 'bg-orange-100 text-orange-700', complaint: 'bg-purple-100 text-purple-700', running: 'bg-emerald-100 text-emerald-700' };
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold capitalize ${colors[color || label?.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>{children || label}</span>;
};
