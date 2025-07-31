import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Target, TrendingUp, Award, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AnimatedProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  targetValue: number;
  actualValue: number;
  status: string;
  period: string;
  showAnimation?: boolean;
  onHover?: () => void;
  onClick?: () => void;
}

export default function AnimatedProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  targetValue,
  actualValue,
  status,
  period,
  showAnimation = true,
  onHover,
  onClick
}: AnimatedProgressRingProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

  // Animate progress on mount and when progress changes
  useEffect(() => {
    if (showAnimation) {
      const timer = setTimeout(() => {
        setAnimatedProgress(Math.min(progress, 100));
        
        // Show celebration for completed items
        if (progress >= 100 && status === "completed") {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 2000);
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedProgress(Math.min(progress, 100));
    }
  }, [progress, showAnimation, status]);

  const getProgressColor = () => {
    // Novo padrão: <85 vermelho; 85-99 amarelo; ≥100 verde
    if (progress >= 100) return "hsl(137, 62%, 42%)"; // Verde (FIERGS Green SESI)
    if (progress >= 85) return "hsl(45, 93%, 47%)"; // Amarelo (warning)
    return "hsl(0, 84%, 60%)"; // Vermelho (error)
  };

  const getMotivationalMessage = () => {
    if (progress >= 100) return "Meta alcançada!";
    if (progress >= 85) return "Quase lá!";
    if (progress >= 50) return "No caminho certo!";
    if (progress >= 25) return "Continue assim!";
    return "Precisa atenção";
  };

  const getStatusIcon = () => {
    if (progress >= 100) return <CheckCircle2 className="h-6 w-6" style={{ color: "hsl(137, 62%, 42%)" }} />;
    if (progress >= 85) return <Award className="h-6 w-6" style={{ color: "hsl(45, 93%, 47%)" }} />;
    return <Target className="h-6 w-6" style={{ color: "hsl(0, 84%, 60%)" }} />;
  };

  return (
    <motion.div
      className="relative inline-flex flex-col items-center cursor-pointer select-none z-10 checkpoint-container"
      onHoverStart={() => {
        setIsHovered(true);
        onHover?.();
      }}
      onHoverEnd={() => setIsHovered(false)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('AnimatedProgressRing clicked!', { status, progress, period });
        onClick?.();
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{ cursor: 'pointer', position: 'relative', zIndex: 10 }}
    >
      {/* Progress Ring Container */}
      <motion.div
        className="relative"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Background Circle */}
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="drop-shadow-sm"
          />
          
          {/* Progress Circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getProgressColor()}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ 
              duration: 1.5, 
              ease: "easeInOut",
              delay: 0.2 
            }}
            className="drop-shadow-md filter"
            style={{
              filter: isHovered ? "drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))" : undefined
            }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            animate={{ 
              scale: isHovered ? 1.1 : 1,
              rotate: showCelebration ? [0, 10, -10, 0] : 0 
            }}
            transition={{ duration: 0.3 }}
          >
            {getStatusIcon()}
          </motion.div>
          
          <motion.div 
            className="text-2xl font-bold mt-1"
            style={{ color: getProgressColor() }}
            animate={{ 
              scale: showCelebration ? [1, 1.2, 1] : 1 
            }}
            transition={{ duration: 0.5 }}
          >
            {Math.round(animatedProgress)}%
          </motion.div>
        </div>

        {/* Celebration Particles */}
        <AnimatePresence>
          {showCelebration && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                  initial={{ 
                    x: size / 2, 
                    y: size / 2, 
                    scale: 0,
                    opacity: 1 
                  }}
                  animate={{ 
                    x: size / 2 + (Math.cos(i * 60 * Math.PI / 180) * 40),
                    y: size / 2 + (Math.sin(i * 60 * Math.PI / 180) * 40),
                    scale: [0, 1, 0],
                    opacity: [1, 1, 0]
                  }}
                  transition={{ 
                    duration: 1.5,
                    ease: "easeOut"
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Period Label */}
      <motion.div 
        className="mt-3 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="text-sm font-medium text-gray-900">
          {period}
        </div>
        
        {/* Progress Values */}
        <div className="text-xs text-gray-500 mt-1">
          {actualValue.toFixed(1)} / {targetValue.toFixed(1)}
        </div>
      </motion.div>

      {/* Motivational Message */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 z-50 checkpoint-badge"
            style={{ zIndex: 9999, position: 'absolute' }}
          >
            <Badge 
              variant="secondary" 
              className="text-xs whitespace-nowrap bg-white border shadow-xl relative z-50 checkpoint-badge"
              style={{ zIndex: 9999, position: 'relative', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
            >
              {getMotivationalMessage()}
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulse Effect for Active Items */}
      {status === "on_track" && progress > 0 && progress < 100 && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${getProgressColor()}20 0%, transparent 70%)`,
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </motion.div>
  );
}