import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useTheme } from "../../context/ThemeContext";
import { Server, HardDrive, Cpu, Database } from "lucide-react";

const Monitoring = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/superadmin/monitoring/system/`, {
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
    const interval = setInterval(fetchData, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>System Monitor</h1>
        <p className="text-muted-foreground mt-1">Live server health and resource usage.</p>
      </div>
      
      {loading && !data ? <div className="h-64 flex items-center justify-center">Loading...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              <Cpu className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.cpu?.usage}%</div>
              <p className="text-xs text-muted-foreground mt-1">{data?.cpu?.cores} Cores Active</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              <Server className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.memory?.percent}%</div>
              <p className="text-xs text-muted-foreground mt-1">{data?.memory?.used} used of {data?.memory?.total}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Disk Space</CardTitle>
              <HardDrive className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.disk?.percent}%</div>
              <p className="text-xs text-muted-foreground mt-1">{data?.disk?.used} used of {data?.disk?.total}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Databases</CardTitle>
              <Database className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{data?.database}</div>
              <p className="text-xs text-muted-foreground mt-1">{data?.cache}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
export default Monitoring;
