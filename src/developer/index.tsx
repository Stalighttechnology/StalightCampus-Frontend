import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import DeveloperLogin from "./DeveloperLogin";
import DeveloperDashboard from "./DeveloperDashboard";

const DeveloperIndex = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("superadmin_token");
      const role = localStorage.getItem("superadmin_role");

      if (token && role === "developer") {
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
