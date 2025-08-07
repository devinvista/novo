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
    if (checkpoint.status === 'completed') return 'bg-green-500 border-green-600';
    if (checkpoint.isPast && checkpoint.status !== 'completed') return 'bg-red-500 border-red-600';
    if (checkpoint.status === 'in_progress') return 'bg-blue-500 border-blue-600';
    return 'bg-gray-400 border-gray-500';
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
        {/* Key Result Info */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Target className="h-5 w-5 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">{keyResult.title}</h3>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(timelineData.startDate, 'dd/MM/yyyy', { locale: ptBR })} - {format(timelineData.endDate, 'dd/MM/yyyy', { locale: ptBR })}
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Meta: {keyResult.targetValue} {keyResult.unit}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {timelineData.checkpoints.length} checkpoints
            </div>
          </div>
          
          {/* Overall Progress */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Progresso Geral</span>
              <span className="text-sm font-medium text-gray-900">{timelineData.progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div 
                className="bg-blue-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${timelineData.progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline base line */}
          <div className="absolute top-6 left-0 w-full h-1 bg-gray-200 rounded-full">
            {/* Progress line */}
            <motion.div 
              className="h-full bg-blue-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${timelineData.timeProgress}%` }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
            />
          </div>

          {/* Checkpoints */}
          <div className="relative pt-1 pb-8">
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
                {/* Checkpoint circle */}
                <div className={`w-4 h-4 rounded-full border-2 ${getStatusColor(checkpoint)} 
                  transition-transform group-hover:scale-125 relative z-10`}>
                </div>
                
                {/* Checkpoint label */}
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 min-w-max">
                  <div className="bg-white rounded-lg shadow-md border p-2 text-xs opacity-0 group-hover:opacity-100 
                    transition-opacity duration-200">
                    <div className="font-medium text-gray-900">
                      {checkpoint.title}
                    </div>
                    <div className="text-gray-600">
                      {format(new Date(checkpoint.dueDate), 'dd/MM', { locale: ptBR })}
                    </div>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {getStatusText(checkpoint)}
                    </Badge>
                    <div className="text-gray-600 mt-1">
                      {checkpoint.actualValue}/{checkpoint.targetValue} {keyResult.unit}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Timeline labels */}
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{format(timelineData.startDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
          <span>{format(timelineData.endDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
        </div>
      </CardContent>
    </Card>
  );
}