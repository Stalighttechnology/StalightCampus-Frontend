import { useState, useEffect } from "react";
import { FaUserGraduate, FaChalkboardTeacher, FaUserTie, FaUserCheck, FaBuilding } from "react-icons/fa";
import { FiDownload, FiSearch } from "react-icons/fi";
import { motion } from "framer-motion";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend } from
"chart.js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import DashboardCard from "../common/DashboardCard";
import { getAdminStats } from "../../utils/admin_api";
import { useToast } from "../../hooks/use-toast";
import { useTheme } from "../../context/ThemeContext";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import {
  Users,
  User,
  ClipboardList,
  Bell,
  GitBranch,
  UserCheck,
  Loader2 } from
"lucide-react";
import {
  SkeletonPageHeader,
  SkeletonStatsGrid,
  SkeletonChart,
  SkeletonTable } from
"../ui/skeleton";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

interface AdminStatsProps {
  setError: (error: string | null) => void;
  onNavigate?: (page: string) => void;
}

const AdminStats = ({ setError, onNavigate }: AdminStatsProps) => {
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { theme } = useTheme();

  const handleCardClick = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };
  const normalize = (str: string) => str.toLowerCase().trim();
  const allLabels = Array.isArray(stats?.branch_distribution) ?
  stats.branch_distribution.map((b: any) => b.name || "N/A") :
  [];

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getAdminStats();

        if (response.success) {
          setStats(response.data);
        } else {
          setError(response.message || "Failed to fetch stats");
          toast({
            variant: "destructive",
            title: "Error",
            description: response.message || "Failed to fetch stats"
          });
        }
      } catch (err) {

        setError("Network error");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Network error"
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [setError, toast]);

  const filteredBranches = Array.isArray(stats?.branch_distribution) ?
  stats.branch_distribution.
  filter(
    (branch: any) =>
    branch?.name &&
    typeof branch.name === "string" &&
    normalize(branch.name).includes(normalize(search))
  ).
  sort((a: any, b: any) => {
    const aName = normalize(a.name);
    const bName = normalize(b.name);
    const s = normalize(search);

    // 1. Prioritize startsWith over includes
    const aStarts = aName.startsWith(s);
    const bStarts = bName.startsWith(s);
    if (aStarts && !bStarts) return -1;
    if (bStarts && !aStarts) return 1;

    // 2. Prioritize by index of match (earlier is better)
    const aIndex = aName.indexOf(s);
    const bIndex = bName.indexOf(s);
    if (aIndex !== bIndex) return aIndex - bIndex;

    // 3. If equal relevance, sort alphabetically
    return aName.localeCompare(bName);
  }) :
  [];


  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleExportPDF = async () => {
    setDownloadingPDF(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/branch-stats-pdf/`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `branch_statistics_current_term.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast({
          title: "Success",
          description: "Branch statistics PDF exported successfully",
        });
      } else {
        const result = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to export PDF",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error while exporting PDF",
      });
    } finally {
      setDownloadingPDF(false);
    }
  };

  const filteredLabels = filteredBranches.map((b: any) => b.name);

  const studentMap = Object.fromEntries(
    filteredBranches.map((b: any) => [b.name, b.students || 0])
  );

  const facultyMap = Object.fromEntries(
    filteredBranches.map((b: any) => [b.name, b.faculty || 0])
  );

  const barData = {
    labels: filteredLabels,
    datasets: [
    {
      label: "Students",
      data: filteredLabels.map((label: string) => studentMap[label] || 0),
      backgroundColor: "rgba(59, 130, 246, 0.6)",
      borderColor: "rgba(59, 130, 246, 1)",
      borderWidth: 1
    },
    {
      label: "Faculty",
      data: filteredLabels.map((label: string) => facultyMap[label] || 0),
      backgroundColor: "rgba(168, 85, 247, 0.6)",
      borderColor: "rgba(168, 85, 247, 1)",
      borderWidth: 1
    }]

  };

  // Pie chart data for role distribution
  const pieData = {
    labels: ["Students", "Faculty", "HODs", "COE", "Fees Managers", "Principals"],
    datasets: [
    {
      data: [
      stats?.role_distribution?.students || 0,
      stats?.role_distribution?.faculty || 0,
      stats?.role_distribution?.hods || 0,
      stats?.role_distribution?.coe || 0,
      stats?.role_distribution?.fees_managers || 0,
      stats?.role_distribution?.principals || 0],

      backgroundColor: [
      "rgba(59, 130, 246, 0.6)",
      "rgba(168, 85, 247, 0.6)",
      "rgba(234, 179, 8, 0.6)",
      "rgba(34, 197, 94, 0.6)",
      "rgba(249, 115, 22, 0.6)",
      "rgba(236, 72, 153, 0.6)"],

      borderColor: [
      "rgba(59, 130, 246, 1)",
      "rgba(168, 85, 247, 1)",
      "rgba(234, 179, 8, 1)",
      "rgba(34, 197, 94, 1)",
      "rgba(249, 115, 22, 1)",
      "rgba(236, 72, 153, 1)"],

      borderWidth: 1
    }]

  };


  if (loading) {
    return (
      <div className="space-y-8">
        <SkeletonPageHeader />
        <SkeletonStatsGrid items={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <SkeletonTable rows={5} cols={3} />
      </div>);

  }

  if (!stats) {
    return (
      <div className={`text-center py-6 ${theme === 'dark' ? 'text-destructive' : 'text-red-600'}`}>
        No statistics available
      </div>);

  }

  return (
    <div className={`space-y-8 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <div>
        
        {/* Dashboard Cards */}
        <div id="admin-stats-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard
            title="Branches"
            value={stats.total_branches || 0}
            description="Active branches"
            icon={<FaBuilding className={theme === 'dark' ? "text-indigo-400 text-3xl" : "text-indigo-500 text-3xl"} />} />
          
          <DashboardCard
            title="Total Students"
            value={stats.total_students || 0}
            description="Across branches"
            icon={<FaUserGraduate className={theme === 'dark' ? "text-blue-400 text-3xl" : "text-blue-500 text-3xl"} />} />
          
          <DashboardCard
            title="Total Faculty"
            value={stats.total_faculty || 0}
            description="Teaching staff"
            icon={<FaChalkboardTeacher className={theme === 'dark' ? "text-purple-400 text-3xl" : "text-purple-500 text-3xl"} />} />
          
          <DashboardCard
            title="HODs"
            value={stats.total_hods || 0}
            description="Dept heads"
            icon={<FaUserTie className={theme === 'dark' ? "text-yellow-400 text-3xl" : "text-yellow-500 text-3xl"} />} />
          
          <DashboardCard
            title="COE"
            value={stats.total_coe || 0}
            description="Exams controller"
            icon={<FaUserCheck className={theme === 'dark' ? "text-green-400 text-3xl" : "text-green-500 text-3xl"} />} />
          
          <DashboardCard
            title="Principals"
            value={stats.total_principals || 0}
            description="Institution heads"
            icon={<FaUserTie className={theme === 'dark' ? "text-pink-400 text-3xl" : "text-pink-500 text-3xl"} />} />
        </div>

        {/* Search and Export */}
        <div className="flex justify-between items-center flex-wrap gap-4 mt-8">
          <div id="admin-search-bar" className={`flex items-center w-full sm:w-1/2 rounded-lg px-4 py-2 shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
            <FiSearch className={theme === 'dark' ? "text-foreground mr-3" : "text-gray-500 mr-3"} />
            <input
              type="text"
              placeholder="Search by branch name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full outline-none text-sm bg-transparent ${theme === 'dark' ? 'text-foreground placeholder:text-muted-foreground' : 'text-gray-900 placeholder:text-gray-500'}`} />
            
          </div>
          <button
            onClick={handleExportPDF}
            disabled={downloadingPDF}
            className="flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-lg shadow-md transition duration-200 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
            
            {downloadingPDF ? <Loader2 className="animate-spin" size={16} /> : <FiDownload />}
            {downloadingPDF ? "Exporting..." : "Export PDF"}
          </button>
        </div>

        {/* Charts Section */}
        <div id="admin-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Bar Chart */}
          <div
            id="branch-distribution-chart"
            className={`rounded-lg shadow p-6 ${theme === 'dark' ? 'border border-border' : 'border border-gray-200'}`}>
            
            <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Branch Distribution
            </h3>
            <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Students and faculty across branches
            </p>

            <div className="h-80 flex items-center justify-center">
              {filteredBranches.length > 0 ? (() => {
                const filteredLabels = filteredBranches.map((b: any) => b.name);

                const barData = {
                  labels: filteredLabels,
                  datasets: [
                  {
                    label: "Students",
                    data: filteredLabels.map((label: string) => studentMap[label] || 0),
                    backgroundColor: "rgba(59, 130, 246, 0.6)",
                    borderColor: "rgba(59, 130, 246, 1)",
                    borderWidth: 1
                  },
                  {
                    label: "Faculty",
                    data: filteredLabels.map((label: string) => facultyMap[label] || 0),
                    backgroundColor: "rgba(168, 85, 247, 0.6)",
                    borderColor: "rgba(168, 85, 247, 1)",
                    borderWidth: 1
                  }]

                };

                const hasData = barData.datasets.some((d) =>
                d.data.some((val) => val > 0)
                );

                return hasData ?
                <Bar
                  data={barData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                      duration: 800,
                      easing: "easeInOutQuart"
                    },
                    plugins: {
                      legend: {
                        position: "top",
                        labels: {
                          color: theme === 'dark' ? "#fff" : "#000"
                        }
                      },
                      tooltip: { enabled: true }
                    },
                    scales: {
                      x: {
                        ticks: {
                          color: theme === 'dark' ? "#fff" : "#000"
                        }
                      },
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: "Count",
                          color: theme === 'dark' ? "#fff" : "#000"
                        },
                        ticks: {
                          color: theme === 'dark' ? "#fff" : "#000"
                        }
                      }
                    }
                  }} /> :


                <div
                  className={`text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  
                    <p className="text-lg font-semibold">No data</p>
                    <p className="text-sm">This branch has no records</p>
                  </div>;

              })() :
              <div
                className={`text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                
                  <p className="text-lg font-semibold">No results found</p>
                  <p className="text-sm">Try a different search term</p>
                </div>
              }
            </div>
          </div>

          {/* Pie Chart */}
          <div
            id="role-distribution-chart"
            className={`rounded-lg shadow p-6 ${theme === 'dark' ? 'border border-border' : 'border border-gray-200'}`}>
            
            <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Role Distribution
            </h3>
            <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Breakdown of users by role
            </p>
            <div className="h-80">
              <Pie
                data={pieData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "right",
                      labels: {
                        color: theme === 'dark' ? "#fff" : "#000"
                      }
                    },
                    tooltip: { enabled: true }
                  }
                }} />
              
            </div>
        </div>
      </div>

        {/* Branch Statistics Table */}
        <div
          id="branch-statistics-table"
          className={`rounded-lg shadow p-6 mt-5 ${theme === 'dark' ? 'border border-border' : 'border border-gray-200'}`}>
          
          <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            Branch Statistics
          </h3>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
            Detailed distribution of students and faculty
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className={`border-b ${theme === 'dark' ? 'border-border text-foreground' : 'border-gray-200 text-gray-900'}`}>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Student Count</th>
                  <th className="py-3 px-4">Faculty Count</th>
                </tr>
              </thead>
              <tbody>
                {filteredBranches.length > 0 ?
                filteredBranches.map((branch: any, index: number) =>
                <tr
                  key={index}
                  className={`border-b ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-200 hover:bg-gray-50'} transition`}>
                  
                      <td className="py-3 px-4">{branch.name || "N/A"}</td>
                      <td className="py-3 px-4">{branch.students || 0}</td>
                      <td className="py-3 px-4">{branch.faculty || 0}</td>
                    </tr>
                ) :

                <tr>
                    <td colSpan={3} className={`text-center py-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      No branches match your search.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Action Cards */}
        <div
        id="admin-action-cards"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        
          <DashboardCard
          id="enroll-user-card"
          title="Enroll User"
          description="Add new HOD or faculty"
          icon={<User size={20} />}
          onClick={() => handleCardClick("enroll-user")} />
        
          <DashboardCard
          id="bulk-upload-card"
          title="Bulk Upload Faculty"
          description="Upload faculty list"
          icon={<ClipboardList size={20} />}
          onClick={() => handleCardClick("bulk-upload")} />
        
          <DashboardCard
          id="manage-branches-card"
          title="Manage Branches"
          description="View or edit branches"
          icon={<GitBranch size={20} />}
          onClick={() => handleCardClick("branches")} />
        
          <DashboardCard
          id="faculty-assignments-card"
          title="Faculty Assignments"
          description="Assign teachers to branches & subjects"
          icon={<UserCheck size={20} />}
          onClick={() => handleCardClick("teacher-assignments")} />
        
          <DashboardCard
          id="manage-batches-card"
          title="Manage Batches"
          description="View or manage batches"
          icon={<ClipboardList size={20} />}
          onClick={() => handleCardClick("batches")} />
        
          <DashboardCard
          id="notifications-card"
          title="Notifications"
          description="Send or view notifications"
          icon={<Bell size={20} />}
          onClick={() => handleCardClick("notifications")} />
        
          <DashboardCard
          id="hod-leaves-card"
          title="HOD Leaves"
          description="Manage HOD leave requests"
          icon={<UserCheck size={20} />}
          onClick={() => handleCardClick("hod-leaves")} />
        
          <DashboardCard
          id="users-management-card"
          title="Users Management"
          description="Manage all system users"
          icon={<Users size={20} />}
          onClick={() => handleCardClick("users")} />
        
        </div>
      </div>);

};

export default AdminStats;