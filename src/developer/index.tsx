import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import DeveloperLogin from "./DeveloperLogin";
import DeveloperDashboard from "./DeveloperDashboard";
import { refreshSuperadminToken } from "../utils/authService";

const DeveloperIndex = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("superadmin_token");
      const role = localStorage.getItem("superadmin_role");
      const refresh = localStorage.getItem("superadmin_refresh");

      if (token && role === "superadmin") {
        // Superadmin landed on developer route — redirect
        window.location.href = "/stalightcampus/admin";
        return;
      }

      if (token && role === "developer") {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // No access token but have refresh token — try to restore session
      if (!token && refresh && role === "developer") {
        try {
          const result = await refreshSuperadminToken();
          if (result.success) {
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          // Refresh failed, fall through to unauthenticated
        }
      }

      setIsAuthenticated(false);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ?
            <Navigate to="/stalightcampus/developer/assigned-issues" replace /> :
            <DeveloperLogin setIsAuthenticated={setIsAuthenticated} />
        }
      />
      <Route
        path="/*"
        element={
          isAuthenticated ?
            <DeveloperDashboard setIsAuthenticated={setIsAuthenticated} /> :
            <Navigate to="/stalightcampus/developer" replace />
        }
      />
    </Routes>
  );
};

export default DeveloperIndex;
