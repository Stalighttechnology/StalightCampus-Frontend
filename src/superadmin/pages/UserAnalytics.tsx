import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useTheme } from "../../context/ThemeContext";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e'];

const UserAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/superadmin/analytics/users/`, {
          headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
        });
        const res = await response.json();
        setData(res);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>User Analytics</h1>
        <p className="text-muted-foreground mt-1">Cross-tenant demographic and role distribution.</p>
      </div>
      
      {loading ? <div className="h-64 flex items-center justify-center">Loading...</div> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{data?.total_users}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold text-emerald-500">{data?.active_users}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Inactive Users</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold text-red-500">{data?.inactive_users}</div></CardContent>
            </Card>
          </div>
          
          <Card className="col-span-1 shadow-sm border-0 mt-6">
            <CardHeader>
              <CardTitle>Role Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-80 mx-2 mb-6">
              {data?.roles_distribution && data.roles_distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.roles_distribution} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                      {data.roles_distribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1f2937' : '#fff', borderRadius: '8px', border: 'none' }}/>
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No role data available</div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
export default UserAnalytics;
