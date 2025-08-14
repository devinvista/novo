import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, TrendingUp, Target, RotateCcw } from "lucide-react";
import AnimatedProgressRing from "./animated-progress-ring";
import { parseDecimalBR } from "@/lib/formatters";

interface CheckpointProgressGridProps {
  checkpoints: any[];
  onCheckpointClick: (checkpoint: any) => void;
  onRegenerateCheckpoints?: () => void;
  keyResultTitle?: string;
}

export default function CheckpointProgressGrid({ 
  checkpoints, 
  onCheckpointClick, 
  onRegenerateCheckpoints,
  keyResultTitle 
}: CheckpointProgressGridProps) {
  const [hoveredCheckpoint, setHoveredCheckpoint] = useState<number | null>(null);

  if (!checkpoints || checkpoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Checkpoints de Progresso
          </CardTitle>
          <CardDescription>
            Nenhum checkpoint encontrado
          </CardDescription>
        </CardHeader>
        {onRegenerateCheckpoints && (
          <CardContent>
            <Button 
              onClick={onRegenerateCheckpoints}
              variant="outline"
              className="w-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Criar Checkpoints
            </Button>
          </CardContent>
        )}
      </Card>
    );
  }

  // Calculate overall stats
  const totalCheckpoints = checkpoints.length;
  const completedCheckpoints = checkpoints.filter(cp => cp.status === "completed").length;
  const overallProgress = checkpoints.reduce((sum, cp) => {
    const targetValue = parseDecimalBR(cp.targetValue || "0");
    const actualValue = parseDecimalBR(cp.actualValue || "0");
    return sum + (targetValue > 0 ? (actualValue / targetValue) * 100 : 0);
  }, 0) / totalCheckpoints;

  const getGridColumns = () => {
    if (totalCheckpoints <= 3) return "grid-cols-1 md:grid-cols-3";
    if (totalCheckpoints <= 6) return "grid-cols-2 md:grid-cols-3";
    if (totalCheckpoints <= 9) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* Progress Rings Grid */}
      <motion.div 
        className={`grid gap-6 ${getGridColumns()}`}
        layout
      >
            <AnimatePresence>
              {checkpoints.map((checkpoint, index) => {
                const targetValue = parseDecimalBR(checkpoint.targetValue || "0");
                const actualValue = parseDecimalBR(checkpoint.actualValue || "0");
                
                // Verificar se é checkpoint futuro
                const today = new Date();
                const checkpointDate = new Date(checkpoint.dueDate);
                const isFuture = checkpointDate > today;
                
                // Se é futuro e não tem valor registrado, não mostrar 0%
                const progress = isFuture && actualValue === 0 
                  ? -1  // Valor especial para indicar "aguardando"
                  : targetValue > 0 ? (actualValue / targetValue) * 100 : 0;
                
                return (
                  <motion.div
                    key={checkpoint.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    transition={{ 
                      duration: 0.5, 
                      delay: index * 0.1,
                      layout: { duration: 0.3 }
                    }}
                    className="flex justify-center relative z-10 checkpoint-ring"
                    style={{ position: 'relative', zIndex: 10, isolation: 'isolate' }}
                  >
                    <AnimatedProgressRing
                      progress={progress}
                      targetValue={targetValue}
                      actualValue={actualValue}
                      status={checkpoint.status}
                      period={checkpoint.period}
                      dueDate={checkpoint.dueDate}
                      size={140}
                      strokeWidth={10}
                      onHover={() => setHoveredCheckpoint(checkpoint.id)}
                      onClick={() => onCheckpointClick(checkpoint)}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
      </motion.div>


    </motion.div>
  );
}