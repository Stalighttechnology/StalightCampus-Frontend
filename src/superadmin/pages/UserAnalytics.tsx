import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/utils/config";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useTheme } from "../../context/ThemeContext";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { fetchWithSuperadminTokenRefresh } from "../../utils/authService";

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e'];

const UserAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/analytics/users/`, {
          headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
        });
        const res = await response.json();
        setData(res);
      } catch (error) {

      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {loading ? <div className="h-64 flex items-center justify-center">Loading...</div> :
      <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className={`backdrop-blur-sm shadow-sm transition-all duration-300 border ${theme === 'dark' ? 'bg-card/40 border-border text-foreground' : 'bg-white border-gray-100 text-gray-900'}`}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{data?.total_users}</div>
              </CardContent>
            </Card>
            <Card className={`backdrop-blur-sm shadow-sm transition-all duration-300 border ${theme === 'dark' ? 'bg-card/40 border-border text-foreground' : 'bg-white border-gray-100 text-gray-900'}`}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-500">{data?.active_users}</div>
              </CardContent>
            </Card>
            <Card className={`backdrop-blur-sm shadow-sm transition-all duration-300 border ${theme === 'dark' ? 'bg-card/40 border-border text-foreground' : 'bg-white border-gray-100 text-gray-900'}`}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Inactive Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500">{data?.inactive_users}</div>
              </CardContent>
            </Card>
          </div>
          
          <Card className={`shadow-sm backdrop-blur-sm transition-all duration-300 border mt-6 ${theme === 'dark' ? 'bg-card/40 border-border text-foreground' : 'bg-white border-gray-100 text-gray-900'}`}>
            <CardHeader>
              <CardTitle className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Role Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-80 mx-2 mb-6">
              {data?.roles_distribution && data.roles_distribution.length > 0 ?
            <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.roles_distribution} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                      {data.roles_distribution.map((entry: any, index: number) =>
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  )}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1f2937' : '#fff', borderRadius: '8px', border: 'none' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer> :

            <div className="h-full flex items-center justify-center text-muted-foreground">No role data available</div>
            }
            </CardContent>
          </Card>
        </>
      }
    </div>);

};
export default UserAnalytics;