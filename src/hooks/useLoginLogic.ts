import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../utils/authService";
import { useAuth } from "../context/AuthContext";

export interface UseLoginProps {
  setRole: (role: string) => void;
  setPage: (page: string) => void;
  setUser: (user: any) => void;
}

export const useLoginLogic = ({ setRole, setPage, setUser }: UseLoginProps) => {
  const navigate = useNavigate();
  const { setTokens } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setError("Please enter both username and password");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await loginUser({
        username: trimmedUsername,
        password: trimmedPassword
      });

      // Handle forced password reset on first login
      if (response && (response as any).password_reset_required) {
        sessionStorage.setItem("temp_user_id", (response as any).user_id || "");
        sessionStorage.setItem("password_reset_email", trimmedUsername);
        setPage("forgot-password");
        setLoading(false);
        return;
      }

      if (response.success) {
        if (response.message === "OTP sent") {
          // OTP path — user_id already written to sessionStorage by loginUser()
          sessionStorage.setItem("temp_user_id", response.user_id || "");
          setPage("otp");
        } else {
          // Direct login (no OTP) — hydrate AuthContext immediately
          if (response.access && response.role && response.profile) {
            setTokens(response.access, response.role, response.profile as Record<string, any>);
          }

          if ((response as any).matched_child_id) {
            localStorage.setItem('selectedStudentId', String((response as any).matched_child_id));
          }

          const userRole = response.role;
          switch (userRole) {
            case "admin":
            case "principal":
              navigate("/admin", { replace: true });
              break;
            case "hod":
              navigate("/hod", { replace: true });
              break;
            case "fees_manager":
              navigate("/fees-manager", { replace: true });
              break;
            case "hms_admin":
              navigate("/hms", { replace: true });
              break;
            case "warden":
              navigate("/warden", { replace: true });
              break;
            case "teacher":
              navigate("/faculty", { replace: true });
              break;
            case "dean":
              navigate("/dean", { replace: true });
              break;
            case "library_admin":
              navigate("/library-admin", { replace: true });
              break;
            case "inventory_manager":
              navigate("/inventory-manager", { replace: true });
              break;
            case "admission_manager":
              navigate("/admission-manager", { replace: true });
              break;
            case "counsellor":
              navigate("/counsellor", { replace: true });
              break;
            case "coe":
              navigate("/coe", { replace: true });
              break;
            case "parent":
            case "student":
              navigate("/dashboard", { replace: true });
              break;
            case "outside_student":
              navigate("/student-hostel-details", { replace: true });
              break;
            default:
              navigate("/", { replace: true });
          }
        }
      } else {
        if (response.password_reset_required) {
          sessionStorage.setItem("temp_user_id", response.user_id || "");
          sessionStorage.setItem("password_reset_email", trimmedUsername);
          setPage("forgot-password");
          return;
        }
        setError(response.message || "Login failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setPage("forgot-password");
  };

  return {
    username,
    setUsername,
    password,
    setPassword,
    error,
    setError,
    loading,
    showPassword,
    setShowPassword,
    handleLogin,
    handleForgotPassword
  };
};