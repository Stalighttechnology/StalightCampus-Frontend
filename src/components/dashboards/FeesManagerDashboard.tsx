import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import { TutorialController } from "../../onboarding/components/TutorialController";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import FeesManagerDashboard from "../FeesManager/FeesManagerDashboard";
import { useAuth } from "@/context/AuthContext";
import { API_ENDPOINT } from "../../utils/config";

interface FeesManagerDashboardProps {
  user: any;
  setPage: (page: string) => void;
}

const FeesManagerDashboardWrapper: React.FC<FeesManagerDashboardProps> = ({ user, setPage }) => {
  const navigate = useNavigate();
  const { clearAuth } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("access_token");
      const response = await fetch(`${API_ENDPOINT}/fees-manager/dashboard/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        // Token expired or invalid, redirect to login
        clearAuth();
        setPage("login");
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate("/", { replace: true });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-600" />
          <h2 className="text-2xl font-bold mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchDashboardData}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <TutorialController />
      <DashboardLayout
        role="fees_manager"
        user={user}
        activePage="dashboard"
        onPageChange={() => {}}
        pageTitle="Fees Manager Dashboard"
      >
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      <FeesManagerDashboard user={user} setPage={setPage} />
    </DashboardLayout>
    </>
  );
};

export default FeesManagerDashboardWrapper;