import { motion } from "framer-motion";
import { useLoginLogic } from "../../hooks/useLoginLogic";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { LockKeyhole, User, Shield, Eye, EyeOff } from "lucide-react";

interface LoginProps {
  setRole: (role: string) => void;
  setPage: (page: string) => void;
  setUser: (user: any) => void;
}

const Login = ({ setRole, setPage, setUser }: LoginProps) => {
  const {
    username,
    setUsername,
    password,
    setPassword,
    error,
    loading,
    showPassword,
    setShowPassword,
    handleLogin,
    handleForgotPassword,
  } = useLoginLogic({ setRole, setPage, setUser });

  return (
    <div className="min-h-screen flex font-sans">
       {/* Right Section - Welcome & Illustration */}
      <motion.div 
        className="flex-1 bg-gradient-to-br from-[hsl(var(--primary))] to-[#7c3aed] flex items-center justify-center p-8 relative overflow-hidden"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Decorative Blur Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
          <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-white/5 rounded-full blur-lg" />
        </div>

        {/* Text Content */}
        <div className="relative z-10 text-center text-white max-w-lg">
          <motion.h2
            className="text-3xl md:text-4xl font-bold mb-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            Welcome to <br />
            <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              NEURO CAMPUS
            </span>
          </motion.h2>
          <motion.p
            className="text-lg text-white/90 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            Login to access your Campus portal
          </motion.p>

          {/* Educator SVG Illustration */}
          <motion.div
            className="mx-auto w-80 md:w-96 max-w-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 1 }}
          >
            <motion.img
              src="/undraw_educator_6dgp.svg"
              alt="Educator Illustration"
              className="w-full h-auto drop-shadow-2xl filter brightness-110 contrast-110"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                filter: 'drop-shadow(0 20px 25px rgba(0, 0, 0, 0.15)) brightness(1.1) contrast(1.1)'
              }}
            />
          </motion.div>

          <motion.div
            className="mt-6 text-white/80 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            AI-powered campus management system
            <br />
            <span className="text-xs text-white/60 mt-2 block">Developed under Stalight Technology</span>
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Login</h1>
            <p className="text-gray-600 text-sm">Sign in to access your account</p>
          </motion.div>

          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {error && (
              <motion.div 
                className={`p-3 rounded-lg text-sm border ${
                  error.includes('Password reset required') 
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {error.includes('Password reset required') ? (
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                ) : (
                  error
                )}
              </motion.div>
            )}

            {/* Username */}
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-gray-900">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-4 h-4 w-4 text-gray-500" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="Enter your username"
                  disabled={loading}
                  className="pl-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-[hsl(var(--primary))]/20 rounded-lg h-12 transition-all duration-300 disabled:opacity-50"
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
                  placeholder="Enter your password"
                  disabled={loading}
                  className="pl-10 pr-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-[hsl(var(--primary))]/20 rounded-lg h-12 transition-all duration-300 disabled:opacity-50"
                />

                {/* Eye Icon Toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
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

            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-primary hover:text-primary/80 text-sm transition-colors duration-300 disabled:opacity-50"
              >
                Forgot Password?
              </button>
            </div>

            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium rounded-lg h-12 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                "Login"
              )}
            </Button>

            <div className="text-center text-gray-400 text-sm">
              {" "}
              <span className="text-primary hover:text-primary/80 cursor-pointer transition-colors duration-300">
                
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
