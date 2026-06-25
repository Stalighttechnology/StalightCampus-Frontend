import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/utils/config";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { useTheme } from "../../context/ThemeContext";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { fetchWithSuperadminTokenRefresh } from "../../utils/authService";
import { Eye, Loader2, Clock } from "lucide-react";

const Billing = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/billing/`, {
          headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
        });
        const res = await response.json();
        setData(res.billing || []);
      } catch (error) {

      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleViewHistory = async (org: any) => {
    setSelectedOrg(org);
    setIsHistoryOpen(true);
    setLoadingHistory(true);
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/billing/${org.id}/payments/`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
      });
      const res = await response.json();
      setHistoryData(res.payments || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className={`shadow-sm backdrop-blur-sm transition-all duration-300 border ${theme === 'dark' ? 'bg-card/40 border-border text-foreground' : 'bg-white border-gray-100 text-gray-900'}`}>
        <CardHeader>
          <CardTitle className={`text-2xl font-semibold leading-none tracking-tight mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            Billing & Payments
          </CardTitle>
          <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
            Track organization payments and revenue.
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Current Plan</TableHead>
                  <TableHead>Total Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell></TableRow> : data.map((item) =>
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
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleViewHistory(item)}>
                        <Eye className="h-4 w-4 mr-1" /> View History
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Payment History - {selectedOrg?.org_name}
            </DialogTitle>
            <DialogDescription>
              Complete record of all transactions, upgrades, and buffer packs.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto mt-4 pr-2">
            {loadingHistory ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : historyData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
                No payment history found for this organization.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Plan / Item</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">{tx.date}</TableCell>
                      <TableCell className="font-medium">{tx.plan_type}</TableCell>
                      <TableCell className="text-primary font-semibold">{tx.amount}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{tx.transaction_id || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={tx.status === 'success' || tx.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100'}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>);

};
export default Billing;