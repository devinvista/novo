import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, Target, TrendingUp, Clock, ChevronRight } from "lucide-react";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NextCheckpointsOverviewProps {
  checkpoints: any[];
  keyResults: any[];
  onCheckpointClick: (checkpoint: any) => void;
  onSelectKeyResult: (keyResultId: number) => void;
}

export default function NextCheckpointsOverview({
  checkpoints,
  keyResults,
  onCheckpointClick,
  onSelectKeyResult
}: NextCheckpointsOverviewProps) {
  const checkpointData = useMemo(() => {
    if (!checkpoints || !keyResults) return { upcoming: [], overdue: [] };

    const now = new Date();
    const in7Days = addDays(now, 7);
    
    // Enrich checkpoints with key result data
    const enrichedCheckpoints = checkpoints.map(checkpoint => {
      const keyResult = keyResults.find(kr => kr.id === checkpoint.keyResultId);
      return {
        ...checkpoint,
        keyResult: keyResult || checkpoint.keyResult,
        dueDate: new Date(checkpoint.dueDate)
      };
    });

    // Filter upcoming checkpoints (next 7 days, not completed)
    const upcoming = enrichedCheckpoints
      .filter(cp => 
        cp.status !== 'completed' &&
        isAfter(cp.dueDate, now) &&
        isBefore(cp.dueDate, in7Days)
      )
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 5);

    // Filter overdue checkpoints
    const overdue = enrichedCheckpoints
      .filter(cp => 
        cp.status !== 'completed' &&
        isBefore(cp.dueDate, now)
      )
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 5);

    return { upcoming, overdue };
  }, [checkpoints, keyResults]);

  const getStatusColor = (checkpoint: any) => {
    const isOverdue = isBefore(checkpoint.dueDate, new Date()) && checkpoint.status !== 'completed';
    if (isOverdue) return 'border-red-200 bg-red-50';
    if (checkpoint.status === 'in_progress') return 'border-blue-200 bg-blue-50';
    return 'border-gray-200 bg-white';
  };

  const getUrgencyBadge = (checkpoint: any) => {
    const isOverdue = isBefore(checkpoint.dueDate, new Date()) && checkpoint.status !== 'completed';
    const daysUntilDue = Math.ceil((checkpoint.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (isOverdue) {
      return <Badge variant="destructive">Atrasado</Badge>;
    }
    if (daysUntilDue <= 1) {
      return <Badge variant="destructive">Vence hoje</Badge>;
    }
    if (daysUntilDue <= 3) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Urgente</Badge>;
    }
    return <Badge variant="outline">Próximo</Badge>;
  };

  const CheckpointCard = ({ checkpoint }: { checkpoint: any }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all duration-200 ${getStatusColor(checkpoint)}`}
      onClick={() => onCheckpointClick(checkpoint)}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm text-gray-900">
                {checkpoint.title}
              </h4>
              {getUrgencyBadge(checkpoint)}
            </div>
            
            <p className="text-xs text-gray-600 line-clamp-1">
              {checkpoint.keyResult?.title}
            </p>
          </div>
          
          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(checkpoint.dueDate, 'dd/MM/yyyy', { locale: ptBR })}
          </div>
          
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            {checkpoint.actualValue || 0}/{checkpoint.targetValue} {checkpoint.keyResult?.unit}
          </div>
        </div>

        {checkpoint.status === 'in_progress' && (
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min(100, ((parseFloat(checkpoint.actualValue) || 0) / parseFloat(checkpoint.targetValue) || 1) * 100)}%` 
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Overdue Checkpoints */}
      {checkpointData.overdue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Checkpoints Atrasados
            </CardTitle>
            <CardDescription>
              {checkpointData.overdue.length} checkpoint{checkpointData.overdue.length !== 1 ? 's' : ''} com prazo vencido
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {checkpointData.overdue.map((checkpoint) => (
                <CheckpointCard key={checkpoint.id} checkpoint={checkpoint} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Checkpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Próximos Checkpoints
          </CardTitle>
          <CardDescription>
            Checkpoints com prazo nos próximos 7 dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          {checkpointData.upcoming.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Nenhum checkpoint próximo</p>
              <p className="text-xs text-gray-400 mt-1">
                Todos os checkpoints estão em dia!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {checkpointData.upcoming.map((checkpoint) => (
                <CheckpointCard key={checkpoint.id} checkpoint={checkpoint} />
              ))}
              
              {checkpoints.length > 5 && (
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => onSelectKeyResult(-1)} // Special value to show all
                >
                  Ver todos os checkpoints
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}