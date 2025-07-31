import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Target, TrendingUp } from "lucide-react";

interface CheckpointTimelineProps {
  keyResultId: number;
}

export default function CheckpointTimeline({ keyResultId }: CheckpointTimelineProps) {
  // Fetch key result details
  const { data: keyResult } = useQuery({
    queryKey: ["/api/key-results", keyResultId],
    queryFn: async () => {
      const response = await fetch("/api/key-results", { credentials: "include" });
      if (!response.ok) throw new Error("Erro ao carregar resultado-chave");
      const keyResults = await response.json();
      return keyResults.find((kr: any) => kr.id === keyResultId);
    },
    enabled: !!keyResultId,
  });

  // Fetch checkpoints for timeline
  const { data: checkpoints } = useQuery({
    queryKey: ["/api/checkpoints", keyResultId],
    queryFn: async () => {
      const response = await fetch(`/api/checkpoints?keyResultId=${keyResultId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Erro ao carregar checkpoints");
      return response.json();
    },
    enabled: !!keyResultId,
  });

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
    const checkpointPositions = sortedCheckpoints.map((checkpoint) => {
      const checkpointDate = new Date(checkpoint.dueDate || checkpoint.period);
      const position = ((checkpointDate.getTime() - startDate.getTime()) / totalDuration) * 100;
      return {
        ...checkpoint,
        position: Math.max(0, Math.min(100, position)),
        isPast: checkpointDate <= now,
        isCompleted: checkpoint.status === 'completed',
      };
    });

    const progress = parseFloat(keyResult.progress) || 0;
    
    // Define colors based on progress (same as KR status)
    const getProgressColor = (progress: number) => {
      if (progress >= 70) return { bg: 'bg-green-500', border: 'border-green-600', text: 'text-green-600' };
      if (progress >= 40) return { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-orange-600' };
      return { bg: 'bg-red-500', border: 'border-red-600', text: 'text-red-600' };
    };

    const progressColors = getProgressColor(progress);

    return {
      startDate,
      endDate,
      timeProgress,
      checkpointPositions,
      title: keyResult.title,
      progress,
      currentValue: keyResult.currentValue,
      targetValue: keyResult.targetValue,
      unit: keyResult.unit,
      progressColors,
    };
  }, [keyResult, checkpoints]);

  if (!timelineData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Carregando linha do tempo...
          </div>
        </CardContent>
      </Card>
    );
  }

  const { startDate, endDate, timeProgress, checkpointPositions, title, progress, currentValue, targetValue, unit, progressColors } = timelineData;

  return (
    <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header compacto */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm text-gray-700">{title}</h3>
              <Badge variant="secondary" className="text-xs">
                {progress.toFixed(0)}% • {currentValue}/{targetValue} {unit}
              </Badge>
            </div>
          </div>

          {/* Estatísticas compactas */}
          <div className="flex justify-center gap-6 text-xs">
            <div className="text-center">
              <span className="font-semibold text-gray-600">
                {checkpointPositions.filter(cp => cp.isCompleted).length}
              </span>
              <span className="text-muted-foreground ml-1">concluídos</span>
            </div>
            <div className="text-center">
              <span className="font-semibold text-gray-600">
                {timeProgress.toFixed(0)}%
              </span>
              <span className="text-muted-foreground ml-1">decorrido</span>
            </div>
            <div className="text-center">
              <span className="font-semibold text-gray-600">
                {checkpointPositions.length}
              </span>
              <span className="text-muted-foreground ml-1">total</span>
            </div>
          </div>

          {/* Timeline Container compacto */}
          <div className="relative">
            {/* Background Timeline */}
            <div className="w-full h-1.5 bg-gray-200 rounded-full relative overflow-hidden">
              {/* Progress Bar */}
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${timeProgress}%` }}
              />
            </div>

            {/* Checkpoint Markers */}
            <div className="relative mt-1">
              {checkpointPositions.map((checkpoint) => (
                <div
                  key={checkpoint.id}
                  className="absolute transform -translate-x-1/2 group"
                  style={{ left: `${checkpoint.position}%` }}
                >
                  {/* Checkpoint Dot */}
                  <div 
                    className={`w-2 h-2 rounded-full border transition-all duration-200 cursor-pointer ${
                      checkpoint.isCompleted 
                        ? 'bg-green-500 border-green-600' 
                        : checkpoint.isPast 
                          ? 'bg-red-500 border-red-600'
                          : 'bg-white border-gray-400'
                    }`}
                  />
                  
                  {/* Tooltip compacto */}
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
                    <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                      <div className="font-medium">{checkpoint.title}</div>
                      <div>{new Date(checkpoint.dueDate || checkpoint.period).toLocaleDateString('pt-BR')}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Período de datas */}
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{startDate.toLocaleDateString('pt-BR')}</span>
            <span>{endDate.toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}