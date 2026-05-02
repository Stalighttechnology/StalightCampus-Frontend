import { ReactNode } from "react";
import { motion } from "framer-motion";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-cover bg-center relative overflow-hidden"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1497604401993-f2e922e5cb0a?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80')",
      }}
    >
      {/* Animated background overlay */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-indigo-900/60 to-purple-900/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      />
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/10 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0.1, 0.5, 0.1],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      <div className="container relative z-10 px-4 mx-auto flex flex-col items-center">
        {/* Animated brand header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.h1 
            className="text-4xl md:text-5xl font-bold mb-2 text-white drop-shadow-lg bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            NEURO CAMPUS
          </motion.h1>
          <motion.p 
            className="text-xl text-blue-100 font-light tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            AI-powered campus management system
          </motion.p>
          <motion.p 
            className="text-sm text-blue-200 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            Developed under Stalight Technology
          </motion.p>
        </motion.div>
        
        {/* Animated main card */}
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            duration: 0.6, 
            delay: 0.3,
            ease: "easeOut"
          }}
        >
          <div className="backdrop-blur-xl bg-white/20 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.37)] rounded-xl p-6 relative overflow-hidden">
            {/* Subtle animated background pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            </div>
            
            <div className="relative z-10">
              <motion.div 
                className="text-center mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
                <p className="text-blue-100 text-sm">{subtitle}</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                {children}
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Animated footer */}
        <motion.div 
          className="mt-6 text-xs text-center text-blue-200/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
        >
          © {new Date().getFullYear()} NEURO CAMPUS. All rights reserved.
        </motion.div>
      </div>
    </div>
  );
};

export default AuthLayout;
