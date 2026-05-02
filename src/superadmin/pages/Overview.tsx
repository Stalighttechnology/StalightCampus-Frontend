import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Users, Building2, CreditCard, Activity, Clock, ShieldAlert } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e'];

const Overview = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/superadmin/stats/`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}`
          }
        });
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-32 bg-gray-200 rounded"></div>)}
      </div>
    </div>;
  }

  const statCards = [
    { title: "Total Organizations", value: stats?.total_orgs || 0, icon: <Building2 className="w-8 h-8 text-blue-500" />, desc: "Registered tenants" },
    { title: "Active Orgs", value: stats?.active_orgs || 0, icon: <Activity className="w-8 h-8 text-green-500" />, desc: "Currently active" },
    { title: "Trial Orgs", value: stats?.trial_orgs || 0, icon: <Clock className="w-8 h-8 text-amber-500" />, desc: "In trial period" },
    { title: "Total Users", value: stats?.total_users || 0, icon: <Users className="w-8 h-8 text-purple-500" />, desc: "Across all tenants" },
    { title: "Monthly Revenue", value: `₹${(stats?.total_revenue || 0).toLocaleString('en-IN')}`, icon: <CreditCard className="w-8 h-8 text-emerald-500" />, desc: "Current MRR" },
    { title: "Pending Tickets", value: stats?.pending_tickets || 0, icon: <ShieldAlert className="w-8 h-8 text-red-500" />, desc: "Requires attention" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className={`text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>System Overview</h1>
        <p className="text-muted-foreground mt-2">Welcome to the Super Admin Control Center.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, idx) => (
          <Card key={idx} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card className="col-span-1 shadow-sm border-0">
          <CardHeader>
            <CardTitle>Organization Growth</CardTitle>
          </CardHeader>
          <CardContent className="h-80 mx-2 mb-6">
            {stats?.org_growth && stats.org_growth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.org_growth} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#333' : '#e5e7eb'} />
                  <XAxis dataKey="month" stroke={theme === 'dark' ? '#888' : '#6b7280'} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke={theme === 'dark' ? '#888' : '#6b7280'} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: theme === 'dark' ? '#1f2937' : '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: theme === 'dark' ? '#fff' : '#000' }}
                  />
                  <Line type="monotone" dataKey="count" name="Organizations" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-muted/20 rounded-md">
                <p className="text-muted-foreground text-sm">Not enough data for chart</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-1 shadow-sm border-0">
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-80 mx-2 mb-6">
            {stats?.plan_distribution && stats.plan_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.plan_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.plan_distribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: theme === 'dark' ? '#1f2937' : '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-muted/20 rounded-md">
                <p className="text-muted-foreground text-sm">Not enough data for chart</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Overview;
