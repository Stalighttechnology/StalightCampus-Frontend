import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { useTheme } from "../../context/ThemeContext";

const Billing = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/superadmin/billing/`, {
          headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
        });
        const res = await response.json();
        setData(res.billing || []);
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
        <h1 className={`text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Billing & Payments</h1>
        <p className="text-muted-foreground mt-1">Track organization payments and revenue.</p>
      </div>
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell></TableRow> : data.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.org_name}</TableCell>
                <TableCell>{item.plan}</TableCell>
                <TableCell>{item.amount}</TableCell>
                <TableCell>
                  <Badge variant={item.status === 'Paid' ? 'default' : 'secondary'} className={item.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : ''}>
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{item.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
export default Billing;
