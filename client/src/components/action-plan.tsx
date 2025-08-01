import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  Target, 
  Calendar, 
  User, 
  BarChart3,
  CheckSquare,
  Goal,
  AlertCircle,
  Clock
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ActionPlan() {
  const { data: objectives, isLoading: objectivesLoading } = useQuery({
    queryKey: ["/api/objectives"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: keyResults, isLoading: keyResultsLoading } = useQuery({
    queryKey: ["/api/key-results"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: actions, isLoading: actionsLoading } = useQuery({
    queryKey: ["/api/actions"],
    staleTime: 5 * 60 * 1000,
  });

  // Get strategic indicators data
  const { data: strategicIndicators } = useQuery({
    queryKey: ["/api/strategic-indicators"],
    staleTime: 10 * 60 * 1000,
  });

  const isLoading = objectivesLoading || keyResultsLoading || actionsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-muted-foreground mt-4">Carregando planos de ação...</p>
        </div>
      </div>
    );
  }

  if (!objectives || !Array.isArray(objectives) || objectives.length === 0) {
    return (
      <div className="text-center py-8">
        <Goal className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Nenhum objetivo encontrado para gerar planos de ação</p>
      </div>
    );
  }

  // Group key results and actions by objective
  const groupedData = objectives.map((objective: any) => {
    const objectiveKeyResults = Array.isArray(keyResults) ? keyResults.filter((kr: any) => kr.objectiveId === objective.id) : [];
    
    // Actions are linked to key results, not directly to objectives
    const relatedActions = Array.isArray(actions) ? actions.filter((action: any) => 
      objectiveKeyResults.some((kr: any) => kr.id === action.keyResultId)
    ) : [];
    
    return {
      ...objective,
      keyResults: objectiveKeyResults,
      actions: relatedActions
    };
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return "Não definido";
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'active': return 'info';
      case 'paused': return 'warning';
      case 'cancelled': return 'error';
      default: return 'secondary';
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-2 flex items-center space-x-3">
          <CheckSquare className="h-6 w-6" />
          <span>Planos de Ação por Objetivo</span>
        </h2>
        <p className="text-orange-100">
          Planos de trabalho detalhados organizados por objetivo estratégico do Sistema FIERGS
        </p>
      </div>

      {/* Action Plans for each Objective */}
      {groupedData.map((objective: any) => (
        <Card key={objective.id} className="border-l-4 border-l-orange-600 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl text-orange-900 dark:text-orange-100 mb-2">
                  Objetivo: {objective.title}
                </CardTitle>
                <CardDescription className="text-orange-700 dark:text-orange-200 text-base">
                  {objective.description}
                </CardDescription>
                <div className="flex items-center space-x-4 mt-3 text-sm">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span>Período: {formatDate(objective.startDate)} - {formatDate(objective.endDate)}</span>
                  </div>
                  <Badge variant={getStatusVariant(objective.status)} className="capitalize">
                    {objective.status === 'active' ? 'Ativo' : 
                     objective.status === 'completed' ? 'Concluído' : 
                     objective.status === 'paused' ? 'Pausado' : 'Cancelado'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Key Results Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b pb-2">
                <Target className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                  Resultados-chave (KR) - Como vamos mensurar o alcance do objetivo
                </h3>
              </div>
              
              {objective.keyResults && objective.keyResults.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-blue-50 dark:bg-blue-950/30">
                        <TableHead className="font-semibold text-blue-900 dark:text-blue-100">
                          Resultado-chave (O quê?)
                        </TableHead>
                        <TableHead className="font-semibold text-blue-900 dark:text-blue-100">
                          Indicadores Estratégicos
                        </TableHead>
                        <TableHead className="font-semibold text-blue-900 dark:text-blue-100">
                          Meta
                        </TableHead>
                        <TableHead className="font-semibold text-blue-900 dark:text-blue-100">
                          Resultado no período
                        </TableHead>
                        <TableHead className="font-semibold text-blue-900 dark:text-blue-100">
                          Progresso
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {objective.keyResults.map((kr: any) => (
                        <TableRow key={kr.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="font-semibold">{kr.title}</div>
                              {kr.description && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {kr.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {(() => {
                                let indicatorIds = [];
                                try {
                                  if (kr.strategicIndicatorIds) {
                                    if (Array.isArray(kr.strategicIndicatorIds)) {
                                      indicatorIds = kr.strategicIndicatorIds;
                                    } else if (typeof kr.strategicIndicatorIds === 'string') {
                                      indicatorIds = JSON.parse(kr.strategicIndicatorIds);
                                    }
                                  }
                                } catch (e) {
                                  console.log('Error parsing strategic indicators:', e);
                                  indicatorIds = [];
                                }

                                return Array.isArray(indicatorIds) && indicatorIds.length > 0 && Array.isArray(strategicIndicators) ? (
                                  <div className="space-y-1">
                                    {indicatorIds.map((indicatorId: number) => {
                                      const indicator = strategicIndicators.find((si: any) => si.id === indicatorId);
                                      return indicator ? (
                                        <div key={indicator.id} className="text-xs bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                                          {indicator.name}
                                        </div>
                                      ) : null;
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Nenhum indicador associado</span>
                                );
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-blue-600">
                              {kr.targetValue || "0"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold">
                              {kr.currentValue || "0"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Badge variant={
                                (kr.progress || 0) >= 75 ? 'success' : 
                                (kr.progress || 0) >= 50 ? 'warning' : 'error'
                              }>
                                {kr.progress || 0}%
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum resultado-chave definido para este objetivo</p>
                </div>
              )}
            </div>

            {/* Action Plan Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b pb-2">
                <CheckSquare className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200">
                  Plano de ação - Como vamos alcançar os KRs?
                </h3>
              </div>
              
              {objective.actions && objective.actions.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-purple-50 dark:bg-purple-950/30">
                        <TableHead className="font-semibold text-purple-900 dark:text-purple-100">
                          Detalhamento (Como?)
                        </TableHead>
                        <TableHead className="font-semibold text-purple-900 dark:text-purple-100">
                          Responsável (Quem?)
                        </TableHead>
                        <TableHead className="font-semibold text-purple-900 dark:text-purple-100">
                          Prazo (Quando?)
                        </TableHead>
                        <TableHead className="font-semibold text-purple-900 dark:text-purple-100">
                          Prioridade
                        </TableHead>
                        <TableHead className="font-semibold text-purple-900 dark:text-purple-100">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {objective.actions.map((action: any) => (
                        <TableRow key={action.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="font-semibold">{action.title}</div>
                              {action.description && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {action.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {action.ownerName || action.ownerUsername || "Não atribuído"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {formatDate(action.dueDate)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPriorityVariant(action.priority)} className="capitalize">
                              {action.priority === 'high' ? 'Alta' :
                               action.priority === 'medium' ? 'Média' :
                               action.priority === 'low' ? 'Baixa' : 'Não definida'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(action.status)} className="capitalize">
                              {action.status === 'completed' ? 'Concluída' :
                               action.status === 'active' ? 'Em andamento' :
                               action.status === 'paused' ? 'Pausada' :
                               action.status === 'cancelled' ? 'Cancelada' : 'Pendente'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma ação definida para este objetivo</p>
                </div>
              )}
            </div>

            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-4 pt-4 border-t">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-blue-600">
                  {objective.keyResults?.length || 0}
                </div>
                <div className="text-xs text-muted-foreground">Resultados-Chave</div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <CheckSquare className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-purple-600">
                  {objective.actions?.length || 0}
                </div>
                <div className="text-xs text-muted-foreground">Ações</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <Target className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-green-600">
                  {objective.actions?.filter((a: any) => a.status === 'completed').length || 0}
                </div>
                <div className="text-xs text-muted-foreground">Ações Concluídas</div>
              </div>
              
              <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <AlertCircle className="h-6 w-6 text-amber-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-amber-600">
                  {objective.actions?.filter((a: any) => 
                    a.dueDate && new Date(a.dueDate) < new Date() && a.status !== 'completed'
                  ).length || 0}
                </div>
                <div className="text-xs text-muted-foreground">Ações Atrasadas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}