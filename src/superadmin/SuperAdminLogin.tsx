import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { LockKeyhole, User, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { useToast } from "../hooks/use-toast";

interface Props {
  setIsAuthenticated: (val: boolean) => void;
}

const SuperAdminLogin = ({ setIsAuthenticated }: Props) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username || !password) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/superadmin/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("superadmin_token", data.access);
        localStorage.setItem("superadmin_refresh", data.refresh);
        localStorage.setItem("superadmin_role", data.role);

        setIsAuthenticated(true);
        navigate("/stalightcampus/admin/dashboard");
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: data.error || "Invalid credentials",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      {/* Right Section - Welcome & Illustration */}
      <motion.div
        className="flex-1 bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-8 relative overflow-hidden"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Decorative Blur Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/40 rounded-full blur-xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/40 rounded-full blur-xl" />
          <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-white/30 rounded-full blur-lg" />
        </div>

        {/* Text Content */}
        <div className="relative z-10 text-center text-gray-900 max-w-lg">
          <motion.h2
            className="text-3xl md:text-4xl font-bold mb-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            Welcome to <br />
            <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
              SUPER ADMIN HQ
            </span>
          </motion.h2>
          <motion.p
            className="text-lg text-gray-600 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            Restricted access for system administrators
          </motion.p>

          <motion.div
            className="mx-auto w-48 md:w-64 max-w-lg bg-white/60 p-8 rounded-full border border-red-200 flex items-center justify-center shadow-xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 1 }}
          >
            <ShieldAlert className="w-24 h-24 text-red-600 drop-shadow-md" />
          </motion.div>

          <motion.div
            className="mt-12 text-gray-500 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            Authorized personnel only. All access is logged and monitored.
            <br />
            <span className="text-xs text-gray-400 mt-2 block">© {new Date().getFullYear()} Stalight - Neuro Campus</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Left Section - Login Form */}
      <motion.div
        className="flex-1 bg-white flex items-center justify-center p-8"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="w-full max-w-md">
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Super Admin Login</h1>
            <p className="text-gray-600 text-sm">Enter your system credentials</p>
          </motion.div>

          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {/* Username */}
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-gray-900">Admin Username</label>
              <div className="relative">
                <User className="absolute left-3 top-4 h-4 w-4 text-gray-500" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="Enter your username"
                  disabled={isLoading}
                  className="pl-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500/20 rounded-lg h-12 transition-all duration-300 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-900">Password</label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-4 h-4 w-4 text-gray-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="pl-10 pr-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500/20 rounded-lg h-12 transition-all duration-300 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-4 text-gray-500 disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              onClick={(e) => handleLogin(e as any)}
              disabled={isLoading || !username || !password}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg h-12 shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </div>
              ) : (
                "Login to System"
              )}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default SuperAdminLogin;
