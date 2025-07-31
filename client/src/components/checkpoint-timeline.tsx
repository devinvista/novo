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

    return {
      startDate,
      endDate,
      timeProgress,
      checkpointPositions,
      title: keyResult.title,
      progress: parseFloat(keyResult.progress) || 0,
      currentValue: keyResult.currentValue,
      targetValue: keyResult.targetValue,
      unit: keyResult.unit,
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

  const { startDate, endDate, timeProgress, checkpointPositions, title, progress, currentValue, targetValue, unit } = timelineData;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="font-medium">{progress.toFixed(1)}%</span>
            </div>
            <Badge variant="outline">
              {currentValue} / {targetValue} {unit}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Timeline Header */}
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{startDate.toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{endDate.toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          {/* Timeline Container */}
          <div className="relative">
            {/* Background Timeline */}
            <div className="w-full h-2 bg-gray-200 rounded-full relative overflow-hidden">
              {/* Progress Bar */}
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-in-out"
                style={{ width: `${timeProgress}%` }}
              />
              
              {/* Current Time Indicator */}
              {timeProgress < 100 && (
                <div 
                  className="absolute top-0 h-full w-0.5 bg-blue-700 shadow-sm"
                  style={{ left: `${timeProgress}%` }}
                />
              )}
            </div>

            {/* Checkpoint Markers */}
            <div className="relative mt-2">
              {checkpointPositions.map((checkpoint, index) => (
                <div
                  key={checkpoint.id}
                  className="absolute transform -translate-x-1/2"
                  style={{ left: `${checkpoint.position}%` }}
                >
                  {/* Checkpoint Dot */}
                  <div className="relative">
                    <div 
                      className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                        checkpoint.isCompleted 
                          ? 'bg-green-500 border-green-600 shadow-md' 
                          : checkpoint.isPast 
                            ? 'bg-yellow-500 border-yellow-600 shadow-md'
                            : 'bg-white border-gray-300'
                      }`}
                    />
                    
                    {/* Checkpoint Info Tooltip */}
                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity duration-200 z-10">
                      <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                        <div className="font-medium">{checkpoint.title}</div>
                        <div>{new Date(checkpoint.dueDate || checkpoint.period).toLocaleDateString('pt-BR')}</div>
                        {checkpoint.targetValue && (
                          <div>Meta: {checkpoint.targetValue}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Statistics */}
          <div className="grid grid-cols-3 gap-4 mt-6 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {checkpointPositions.filter(cp => cp.isCompleted).length}
              </div>
              <div className="text-sm text-muted-foreground">Concluídos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {timeProgress.toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">Tempo Decorrido</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {checkpointPositions.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Checkpoints</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}