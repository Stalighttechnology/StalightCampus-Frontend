import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { useTheme } from "../../context/ThemeContext";

interface DashboardCardProps {
  title: string;
  description?: string;
  value?: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
  className?: string;
}

const DashboardCard = ({ title, description, value, icon, trend, onClick, className }: DashboardCardProps) => {
  const { theme } = useTheme();
  
  return (
    <motion.div
      className={`rounded-lg ${className || ""}`}
      whileHover={onClick ? { scale: 1.01, y: -2 } : {}}
      whileTap={onClick ? { scale: 0.99 } : {}}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Card
        className={`h-full flex flex-col transition-all duration-300 ${onClick ? "cursor-pointer" : "cursor-default"} backdrop-blur-sm shadow-sm hover:shadow-md ${
          theme === 'dark'
            ? "bg-card/40 border-border hover:bg-card/60 hover:border-primary/40"
            : "bg-white border-gray-100 hover:bg-gray-50/80 hover:border-blue-200"
        }`}
        onClick={onClick}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>{title}</CardTitle>
          {icon && (
            <motion.div 
              className={theme === 'dark' ? "w-5 h-5 text-primary" : "w-5 h-5 text-blue-500"}
              whileHover={{ rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              {icon}
            </motion.div>
          )}
        </CardHeader>
        <CardContent className="flex-1">
          {(value !== undefined && value !== null) && (
            <motion.div 
              className={`text-2xl font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              {value}
            </motion.div>
          )}
          {description && (
            <motion.p 
              className={`text-xs mt-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              {description}
            </motion.p>
          )}
          {trend && (
            <motion.div
              className={`text-xs mt-1 ${
                trend.isPositive 
                  ? (theme === 'dark' ? "text-green-400" : "text-green-600") 
                  : (theme === 'dark' ? "text-red-400" : "text-red-600")
              }`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DashboardCard;