import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Target, TrendingUp, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CheckpointTimelineHeaderProps {
  keyResult: any;
  checkpoints: any[];
  onCheckpointClick: (checkpoint: any) => void;
}

export default function CheckpointTimelineHeader({
  keyResult,
  checkpoints,
  onCheckpointClick
}: CheckpointTimelineHeaderProps) {
  const timelineData = useMemo(() => {
    if (!keyResult || !checkpoints) return null;

    const startDate = new Date(keyResult.startDate);
    const endDate = new Date(keyResult.endDate);
    const now = new Date();
    
    // Calculate progress percentage based on time elapsed
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = Math.min(now.getTime() - startDate.getTime(), totalDuration);
    const timeProgress = Math.max(0, Math.min(100, (elapsedDuration / totalDuration) * 100));

    // Sort checkpoints by due date
    const sortedCheckpoints = [...checkpoints].sort((a, b) => 
      new Date(a.dueDate || a.period).getTime() - new Date(b.dueDate || b.period).getTime()
    );

    // Calculate checkpoint positions along timeline
    const checkpointPositions = sortedCheckpoints.map((checkpoint, index) => {
      const checkpointDate = new Date(checkpoint.dueDate);
      const position = ((checkpointDate.getTime() - startDate.getTime()) / totalDuration) * 100;
      return {
        ...checkpoint,
        position: Math.max(0, Math.min(100, position)),
        isPast: checkpointDate <= now,
        isCompleted: checkpoint.status === 'completed',
        index
      };
    });

    const progress = parseFloat(keyResult.progress) || 0;
    
    return {
      startDate,
      endDate,
      timeProgress,
      checkpoints: checkpointPositions,
      progress
    };
  }, [keyResult, checkpoints]);

  if (!timelineData) return null;

  const getStatusColor = (checkpoint: any) => {
    if (checkpoint.status === 'completed') return 'bg-emerald-500 border-emerald-600 shadow-emerald-200';
    if (checkpoint.isPast && checkpoint.status !== 'completed') return 'bg-red-500 border-red-600 shadow-red-200';
    if (checkpoint.status === 'in_progress') return 'bg-blue-500 border-blue-600 shadow-blue-200';
    return 'bg-gray-400 border-gray-500 shadow-gray-200';
  };

  const getStatusText = (checkpoint: any) => {
    if (checkpoint.status === 'completed') return 'Concluído';
    if (checkpoint.isPast && checkpoint.status !== 'completed') return 'Atrasado';
    if (checkpoint.status === 'in_progress') return 'Em progresso';
    return 'Pendente';
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        {/* Header compacto */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-3">
            <Target className="h-5 w-5 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">{keyResult.title}</h3>
            <Badge variant="outline" className="text-xs">
              {timelineData.checkpoints.length} checkpoints
            </Badge>
          </div>
        </div>

        {/* Layout otimizado: Timeline à esquerda, Progresso à direita */}
        <div className="flex gap-6 items-start">
          
          {/* Timeline à esquerda - 70% do espaço */}
          <div className="flex-1">
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span className="font-medium">Timeline de Checkpoints</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                  {timelineData.timeProgress.toFixed(0)}% do prazo decorrido
                </span>
              </div>
            </div>
            
            <div className="relative">
              {/* Timeline base line - design mais sutil */}
              <div className="w-full h-2 bg-gradient-to-r from-slate-100 to-slate-200 rounded-full border border-slate-200/50">
                {/* Progress line - tons neutros */}
                <motion.div 
                  className="h-full bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500 rounded-full shadow-sm"
                  initial={{ width: 0 }}
                  animate={{ width: `${timelineData.timeProgress}%` }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                >
                  <div className="h-full bg-gradient-to-t from-slate-400/30 to-transparent rounded-full"></div>
                </motion.div>
              </div>

              {/* Checkpoints */}
              <div className="relative pt-3 pb-12">
                {timelineData.checkpoints.map((checkpoint) => (
                  <motion.div
                    key={checkpoint.id}
                    className="absolute transform -translate-x-1/2 cursor-pointer group"
                    style={{ left: `${checkpoint.position}%` }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: checkpoint.index * 0.1 }}
                    onClick={() => onCheckpointClick(checkpoint)}
                  >
                    {/* Checkpoint circle - melhor contraste */}
                    <div className={`w-5 h-5 rounded-full border-3 ${getStatusColor(checkpoint)} 
                      transition-all duration-200 group-hover:scale-125 group-hover:shadow-lg relative z-10 shadow-md`}>
                    </div>
                    
                    {/* Checkpoint label - tooltip melhorado */}
                    <div className="absolute top-8 left-1/2 transform -translate-x-1/2 min-w-max z-20">
                      <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-3 text-xs opacity-0 group-hover:opacity-100 
                        transition-all duration-300 transform group-hover:scale-105 max-w-48">
                        <div className="font-semibold text-gray-900 mb-1">
                          {checkpoint.title}
                        </div>
                        <div className="text-gray-600 mb-2">
                          📅 {format(new Date(checkpoint.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <Badge 
                            variant={checkpoint.status === 'completed' ? "default" : checkpoint.isPast ? "destructive" : "secondary"} 
                            className="text-xs"
                          >
                            {getStatusText(checkpoint)}
                          </Badge>
                        </div>
                        <div className="text-gray-700 font-medium">
                          📊 {checkpoint.actualValue}/{checkpoint.targetValue} {keyResult.unit}
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-100 text-center text-gray-500">
                          Clique para atualizar
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Timeline labels */}
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <div>
                <div className="font-medium">{format(timelineData.startDate, 'dd/MM/yyyy', { locale: ptBR })}</div>
                <div className="text-gray-400">Início</div>
              </div>
              <div className="text-right">
                <div className="font-medium">{format(timelineData.endDate, 'dd/MM/yyyy', { locale: ptBR })}</div>
                <div className="text-gray-400">Meta</div>
              </div>
            </div>
          </div>

          {/* Progresso Geral à direita - design circular compacto */}
          <div className="flex-shrink-0">
            <div className="flex flex-col items-center gap-3 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
              <div className="relative w-16 h-16">
                {/* Círculo de fundo */}
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="rgb(229, 231, 235)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <motion.path
                    d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="100 100"
                    initial={{ strokeDashoffset: 100 }}
                    animate={{ strokeDashoffset: 100 - timelineData.progress }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="50%" stopColor="#1d4ed8" />
                      <stop offset="100%" stopColor="#1e40af" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Texto no centro do círculo */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-900">
                    {timelineData.progress.toFixed(0)}%
                  </span>
                </div>
              </div>
              
              <div className="text-center">
                <h4 className="text-xs font-medium text-gray-600 mb-1">Progresso Geral</h4>
                <div className="text-lg font-bold text-gray-900">
                  {keyResult.currentValue} / {keyResult.targetValue}
                </div>
                <div className="text-xs text-gray-500">{keyResult.unit}</div>
                
                {/* Status badge compacto */}
                <Badge 
                  variant={timelineData.progress >= 70 ? "default" : timelineData.progress >= 40 ? "secondary" : "destructive"}
                  className="text-xs px-2 py-1 mt-2"
                >
                  {timelineData.progress >= 70 ? "No prazo" : timelineData.progress >= 40 ? "Atenção" : "Crítico"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}