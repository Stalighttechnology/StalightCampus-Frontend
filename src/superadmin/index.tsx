import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import SuperAdminLogin from "./SuperAdminLogin";
import SuperAdminDashboard from "./SuperAdminDashboard";

const SuperAdminIndex = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("superadmin_token");
      const role = localStorage.getItem("superadmin_role");

      if (token && role === "superadmin") {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
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
            <Navigate to="/stalightcampus/admin/dashboard" replace /> :
            <SuperAdminLogin setIsAuthenticated={setIsAuthenticated} />
        }
      />
      <Route
        path="/*"
        element={
          isAuthenticated ?
            <SuperAdminDashboard setIsAuthenticated={setIsAuthenticated} /> :
            <Navigate to="/stalightcampus/admin" replace />
        }
      />
    </Routes>
  );
};

export default SuperAdminIndex;
