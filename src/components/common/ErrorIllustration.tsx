import React from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Users, 
  Calendar, 
  FileText, 
  AlertCircle,
  Layout,
  PieChart
} from 'lucide-react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  x?: number;
  y?: number;
  rotate?: number;
}

const Card = ({ children, className, delay = 0, x = 0, y = 0, rotate = 0 }: CardProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, x, y, rotate }}
    animate={{ 
      opacity: 1, 
      scale: 1,
      x: [x - 5, x + 5, x - 5],
      y: [y - 5, y + 5, y - 5],
      rotate: [rotate - 2, rotate + 2, rotate - 2]
    }}
    transition={{ 
      duration: 5, 
      delay, 
      repeat: Infinity, 
      ease: "easeInOut",
      opacity: { duration: 0.5, delay }
    }}
    className={`absolute p-4 rounded-xl border border-border/50 bg-card/80 backdrop-blur-md shadow-2xl ${className}`}
  >
    {children}
  </motion.div>
);

const ErrorIllustration = () => {
  return (
    <div className="relative w-full h-[400px] flex items-center justify-center overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-primary/10 rounded-full blur-3xl" />
      
      {/* Central Glitch Text / Logo Placeholder */}
      <motion.div
        animate={{ 
          scale: [1, 1.02, 1],
          opacity: [0.8, 1, 0.8]
        }}
        transition={{ duration: 4, repeat: Infinity }}
        className="z-10"
      >
        <div className="relative">
           <AlertCircle className="w-32 h-32 text-primary opacity-20" />
           <div className="absolute inset-0 flex items-center justify-center">
             <span className="text-6xl font-bold text-primary/30 tracking-tighter">?</span>
           </div>
        </div>
      </motion.div>

      {/* Floating UI Elements */}
      <Card delay={0.2} x={-120} y={-100} rotate={-10} className="w-32">
        <div className="flex flex-col gap-2">
          <div className="h-2 w-12 bg-primary/20 rounded" />
          <div className="h-1 w-20 bg-muted rounded" />
          <div className="h-1 w-16 bg-muted rounded" />
          <BarChart3 className="w-4 h-4 text-primary mt-2" />
        </div>
      </Card>

      <Card delay={0.5} x={150} y={-80} rotate={15} className="w-28">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-3 h-3 text-primary" />
          </div>
          <div className="h-2 w-10 bg-primary/20 rounded" />
        </div>
        <div className="h-1 w-full bg-muted rounded" />
      </Card>

      <Card delay={0.8} x={-140} y={80} rotate={5} className="w-36">
        <div className="flex justify-between items-center mb-2">
          <Layout className="w-4 h-4 text-primary/60" />
          <div className="h-2 w-8 bg-destructive/10 rounded" />
        </div>
        <div className="space-y-1">
          <div className="h-1 w-full bg-muted rounded" />
          <div className="h-1 w-2/3 bg-muted rounded" />
        </div>
      </Card>

      <Card delay={1.1} x={110} y={100} rotate={-5} className="w-24">
        <Calendar className="w-5 h-5 text-primary mb-2" />
        <div className="h-2 w-full bg-primary/10 rounded" />
      </Card>

      <Card delay={1.4} x={40} y={-160} rotate={0} className="w-20">
        <FileText className="w-4 h-4 text-muted-foreground" />
      </Card>

      {/* Small random particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0.2, 0.5, 0.2],
            y: [0, -20, 0],
            x: [0, 10, 0]
          }}
          transition={{ 
            duration: 3 + i, 
            repeat: Infinity, 
            delay: i * 0.5 
          }}
          className="absolute w-1 h-1 bg-primary rounded-full"
          style={{ 
            left: `${20 + i * 15}%`, 
            top: `${30 + (i % 3) * 20}%` 
          }}
        />
      ))}
    </div>
  );
};

export default ErrorIllustration;
