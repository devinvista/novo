import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, TrendingUp, Target, RotateCcw } from "lucide-react";
import AnimatedProgressRing from "./animated-progress-ring";

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
    const targetValue = parseFloat(cp.targetValue);
    const actualValue = parseFloat(cp.actualValue);
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
      className="space-y-6"
    >
      {/* Header with Overall Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Checkpoints de Progresso
                {keyResultTitle && (
                  <Badge variant="secondary" className="ml-2">
                    {keyResultTitle}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Acompanhe o progresso através de marcos visuais interativos
              </CardDescription>
            </div>
            
            {onRegenerateCheckpoints && (
              <Button 
                onClick={onRegenerateCheckpoints}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Recriar
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {completedCheckpoints}/{totalCheckpoints}
                </div>
                <div className="text-sm text-muted-foreground">
                  Concluídos
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {overallProgress.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Progresso Geral
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Badge variant="outline">
                {totalCheckpoints} checkpoint{totalCheckpoints !== 1 ? 's' : ''}
              </Badge>
              {completedCheckpoints > 0 && (
                <Badge className="bg-green-100 text-green-800">
                  {completedCheckpoints} concluído{completedCheckpoints !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Rings Grid */}
      <Card>
        <CardContent className="p-6">
          <motion.div 
            className={`grid gap-6 ${getGridColumns()}`}
            layout
          >
            <AnimatePresence>
              {checkpoints.map((checkpoint, index) => {
                const targetValue = parseFloat(checkpoint.targetValue);
                const actualValue = parseFloat(checkpoint.actualValue);
                const progress = targetValue > 0 ? (actualValue / targetValue) * 100 : 0;
                
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
                    className="flex justify-center"
                  >
                    <AnimatedProgressRing
                      progress={progress}
                      targetValue={targetValue}
                      actualValue={actualValue}
                      status={checkpoint.status}
                      period={checkpoint.period}
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
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Insights de Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: "hsl(220, 65%, 95%)" }}>
                <CalendarDays className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(220, 65%, 36%)" }} />
                <div className="text-sm font-medium" style={{ color: "hsl(220, 65%, 36%)" }}>
                  Próximo Marco
                </div>
                <div className="text-xs" style={{ color: "hsl(220, 65%, 50%)" }}>
                  {checkpoints.find(cp => cp.status === "pending")?.period || "Todos concluídos"}
                </div>
              </div>
              
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: "hsl(137, 62%, 95%)" }}>
                <Target className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(137, 62%, 42%)" }} />
                <div className="text-sm font-medium" style={{ color: "hsl(137, 62%, 42%)" }}>
                  Taxa de Sucesso
                </div>
                <div className="text-xs" style={{ color: "hsl(137, 62%, 50%)" }}>
                  {totalCheckpoints > 0 ? ((completedCheckpoints / totalCheckpoints) * 100).toFixed(0) : 0}% concluído
                </div>
              </div>
              
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: "hsl(195, 100%, 95%)" }}>
                <TrendingUp className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(195, 100%, 50%)" }} />
                <div className="text-sm font-medium" style={{ color: "hsl(195, 100%, 40%)" }}>
                  Momentum
                </div>
                <div className="text-xs" style={{ color: "hsl(195, 100%, 45%)" }}>
                  {overallProgress >= 70 ? "Excelente!" : 
                   overallProgress >= 50 ? "Bom ritmo" : 
                   overallProgress >= 25 ? "Acelerando" : "Iniciando"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}