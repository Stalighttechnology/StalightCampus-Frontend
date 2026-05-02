import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { Download, Building2, CreditCard, Users, BadgeCheck, Ticket, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const REPORTS = [
  {
    type: 'organizations',
    title: 'Organizations Report',
    description: 'Complete list of all tenant institutions with plan, status, user count, and subscription expiry.',
    icon: Building2,
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
    columns: ['Organization Name', 'Plan', 'Status', 'Total Users', 'Created At', 'Subscription Expiry'],
  },
  {
    type: 'billing',
    title: 'Revenue & Billing Report',
    description: 'Per-organization yearly revenue, MRR breakdown, and cumulative financial summary.',
    icon: CreditCard,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    columns: ['Organization', 'Plan', 'Yearly Price', 'MRR', 'Status'],
  },
  {
    type: 'subscriptions',
    title: 'Subscriptions Report',
    description: 'Trial and subscription status for all organizations including expiry dates and auto-renew info.',
    icon: BadgeCheck,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    columns: ['Organization', 'Plan', 'Status', 'Expires At', 'Trial Ends At', 'Auto Renew'],
  },
  {
    type: 'users',
    title: 'User Analytics Report',
    description: 'Role-wise user distribution across all tenant organizations — Admins, Faculty, HODs, COEs, Students.',
    icon: Users,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    columns: ['Organization', 'Plan', 'Total Users', 'Admins', 'Faculty', 'Students', 'HODs', 'COEs'],
  },
  {
    type: 'support',
    title: 'Support Tickets Report',
    description: 'Full log of all support tickets across every organization with status, priority, and HQ responses.',
    icon: Ticket,
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    columns: ['Ticket ID', 'Organization', 'Subject', 'Priority', 'Status', 'Date', 'HQ Response'],
  },
];

const Reports = () => {
  const { theme } = useTheme();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (type: string, title: string) => {
    setDownloading(type);
    try {
      const response = await fetch(
        `${API_BASE}/api/superadmin/reports/download/?type=${type}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('superadmin_token')}` } }
      );
      if (!response.ok) throw new Error('Failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_report_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed', e);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className={`text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Reports
        </h1>
        <p className="text-muted-foreground mt-1">
          Download platform-wide reports as CSV. All data is generated live from the database.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          const isLoading = downloading === report.type;
          return (
            <div
              key={report.type}
              className={`rounded-xl border p-6 flex flex-col gap-4 transition-all ${report.border} ${theme === 'dark' ? 'bg-zinc-900/60' : 'bg-white'} hover:shadow-md`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${report.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-6 h-6 ${report.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base">{report.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{report.description}</p>
                </div>
              </div>

              {/* Column preview */}
              <div className="flex flex-wrap gap-1.5">
                {report.columns.map((col) => (
                  <Badge key={col} variant="secondary" className="text-xs font-normal">
                    {col}
                  </Badge>
                ))}
              </div>

              <Button
                className={`w-full gap-2 mt-auto ${isLoading ? 'opacity-80' : ''}`}
                onClick={() => handleDownload(report.type, report.title)}
                disabled={!!downloading}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><Download className="w-4 h-4" /> Download CSV</>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <div className={`rounded-xl border p-5 text-sm text-muted-foreground ${theme === 'dark' ? 'bg-zinc-900/40 border-zinc-800' : 'bg-gray-50 border-gray-200'}`}>
        <strong className="text-foreground">Note:</strong> All reports are generated in real-time from the live database.
        Resolved/Closed support tickets older than 2 days are automatically excluded from the Support Tickets report.
        Revenue figures are based on active subscriptions at their yearly plan rates.
      </div>
    </div>
  );
};
export default Reports;
