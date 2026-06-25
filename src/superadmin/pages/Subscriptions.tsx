import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/utils/config";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { useTheme } from "../../context/ThemeContext";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { fetchWithSuperadminTokenRefresh } from "../../utils/authService";
import { Loader2 } from "lucide-react";

const Subscriptions = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/subscriptions/`, {
          headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
        });
        const res = await response.json();
        setData(res.subscriptions || []);
      } catch (error) {

      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">Active</Badge>;
      case 'Trial':return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Trial</Badge>;
      case 'Expired':return <Badge variant="destructive">Expired</Badge>;
      default:return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'advance':return <Badge variant="outline" className="border-purple-500 text-purple-600">Advance</Badge>;
      case 'pro':return <Badge variant="outline" className="border-blue-500 text-blue-600">Pro</Badge>;
      default:return <Badge variant="outline" className="border-gray-400 text-gray-600">Basic</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card className={`shadow-sm backdrop-blur-sm transition-all duration-300 border ${theme === 'dark' ? 'bg-card/40 border-border text-foreground' : 'bg-white border-gray-100 text-gray-900'}`}>
        <CardHeader>
          <CardTitle className={`text-2xl font-semibold leading-none tracking-tight mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            Subscriptions
          </CardTitle>
          <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
            Manage active trials and subscription expirations.
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires At</TableHead>
                  <TableHead>Auto Renew</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell></TableRow> : data.map((item) =>
                <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.org_name}</TableCell>
                    <TableCell>{getPlanBadge(item.plan)}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{item.expires_at}</TableCell>
                    <TableCell>
                      {item.auto_renew ?
                      <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Yes</Badge> :
                      <Badge variant="outline" className="border-gray-200 text-gray-500 bg-gray-50">No</Badge>
                      }
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>);
};

export default Subscriptions;