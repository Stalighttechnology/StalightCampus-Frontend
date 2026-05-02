import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { useTheme } from "../../context/ThemeContext";

const Subscriptions = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/superadmin/subscriptions/`, {
          headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
        });
        const res = await response.json();
        setData(res.subscriptions || []);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Active': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">Active</Badge>;
      case 'Trial': return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Trial</Badge>;
      case 'Expired': return <Badge variant="destructive">Expired</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch(plan.toLowerCase()) {
      case 'advance': return <Badge variant="outline" className="border-purple-500 text-purple-600">Advance</Badge>;
      case 'pro': return <Badge variant="outline" className="border-blue-500 text-blue-600">Pro</Badge>;
      default: return <Badge variant="outline" className="border-gray-400 text-gray-600">Basic</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Subscriptions</h1>
        <p className="text-muted-foreground mt-1">Manage active trials and subscription expirations.</p>
      </div>
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
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
            {loading ? <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell></TableRow> : data.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.org_name}</TableCell>
                <TableCell>{getPlanBadge(item.plan)}</TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell className="text-muted-foreground">{item.expires_at}</TableCell>
                <TableCell>
                  {item.auto_renew ? (
                    <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Yes</Badge>
                  ) : (
                    <Badge variant="outline" className="border-gray-200 text-gray-500 bg-gray-50">No</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
export default Subscriptions;
