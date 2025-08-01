import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  Users, 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  Activity,
  Clock,
  Award,
  BookOpen,
  BarChart3,
  Flag,
  CheckSquare,
  Goal,
  FileText
} from "lucide-react";

export default function ExecutiveSummary() {
  const { data: summaryData, isLoading } = useQuery({
    queryKey: ["/api/executive-summary"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!summaryData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Erro ao carregar dados do resumo executivo</p>
      </div>
    );
  }
  const { overview, mainObjectives, topKeyResults, performance, distribution, trends } = summaryData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-2 flex items-center space-x-3">
          <FileText className="h-6 w-6" />
          <span>Resumo Executivo - Sistema OKRs</span>
        </h2>
        <p className="text-green-100">
          Análise dos resultados e performance atual da implementação de OKRs no Sistema FIERGS
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Goal className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{overview.totalObjectives}</div>
                <div className="text-sm text-muted-foreground">Objetivos Totais</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{overview.totalKeyResults}</div>
                <div className="text-sm text-muted-foreground">Resultados-Chave</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-600">{overview.totalActions}</div>
                <div className="text-sm text-muted-foreground">Ações</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Flag className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-600">{overview.totalCheckpoints}</div>
                <div className="text-sm text-muted-foreground">Checkpoints</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Objetivos Principais */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-600" />
            <CardTitle>Objetivos Estratégicos Ativos</CardTitle>
          </div>
          <CardDescription>
            Principais objetivos definidos pela organização
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mainObjectives && mainObjectives.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-1">
              {mainObjectives.map((objective: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">{objective.title}</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-200 mb-2">
                        {objective.description}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>{objective.keyResultsCount} Resultados-Chave</span>
                        <span>{objective.actionsCount} Ações</span>
                        <Badge variant={objective.status === 'active' ? 'success' : 'secondary'}>
                          {objective.status === 'active' ? 'Ativo' : 'Concluído'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">{Math.round(objective.progress)}%</div>
                      <div className="text-xs text-muted-foreground">Progresso</div>
                    </div>
                  </div>
                  <Progress value={objective.progress} className="h-2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Nenhum objetivo encontrado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Geral */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            <CardTitle>Performance Geral do Sistema</CardTitle>
          </div>
          <CardDescription>
            Métricas de progresso e desempenho organizacional
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Taxa de Conclusão de Objetivos</span>
                <Badge variant={overview.objectiveCompletionRate >= 75 ? "success" : overview.objectiveCompletionRate >= 50 ? "warning" : "error"}>
                  {overview.objectiveCompletionRate}%
                </Badge>
              </div>
              <Progress value={overview.objectiveCompletionRate} className="h-2" />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Progresso Médio de Resultados-Chave</span>
                <Badge variant={overview.avgKeyResultProgress >= 75 ? "success" : overview.avgKeyResultProgress >= 50 ? "warning" : "error"}>
                  {overview.avgKeyResultProgress}%
                </Badge>
              </div>
              <Progress value={overview.avgKeyResultProgress} className="h-2" />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Conclusão de Ações</span>
                <Badge variant={overview.actionCompletionRate >= 75 ? "success" : overview.actionCompletionRate >= 50 ? "warning" : "error"}>
                  {overview.actionCompletionRate}%
                </Badge>
              </div>
              <Progress value={overview.actionCompletionRate} className="h-2" />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Checkpoints Completados</span>
                <Badge variant={overview.checkpointCompletionRate >= 75 ? "success" : overview.checkpointCompletionRate >= 50 ? "warning" : "error"}>
                  {overview.checkpointCompletionRate}%
                </Badge>
              </div>
              <Progress value={overview.checkpointCompletionRate} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Resultados-Chave */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-green-600" />
            <CardTitle>Resultados-Chave com Melhor Performance</CardTitle>
          </div>
          <CardDescription>
            Principais resultados-chave ordenados por progresso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topKeyResults && topKeyResults.length > 0 ? (
            <div className="space-y-3">
              {topKeyResults.map((kr: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{kr.title}</h4>
                    <div className="text-sm text-muted-foreground">
                      {kr.currentValue} / {kr.targetValue}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24">
                      <Progress value={kr.progress} className="h-2" />
                    </div>
                    <Badge variant={kr.progress >= 75 ? "success" : kr.progress >= 50 ? "warning" : "error"}>
                      {Math.round(kr.progress)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Nenhum resultado-chave encontrado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Análise de Performance */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-orange-600" />
            <CardTitle>Análise de Performance e Riscos</CardTitle>
          </div>
          <CardDescription>
            Indicadores de saúde organizacional e pontos de atenção
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="font-semibold text-green-700 dark:text-green-300 flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>Pontos Positivos</span>
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/30 rounded">
                  <span className="text-sm">Objetivos Ativos</span>
                  <Badge variant="success">{performance.objectivesOnTrack}</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
                  <span className="text-sm">Resultados de Alto Progresso</span>
                  <Badge variant="info">{trends.keyResultsWithHighProgress}</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-950/30 rounded">
                  <span className="text-sm">Ações Completadas (Trimestre)</span>
                  <Badge variant="secondary">{trends.completedActionsThisQuarter}</Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-amber-700 dark:text-amber-300 flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Pontos de Atenção</span>
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-950/30 rounded">
                  <span className="text-sm">Objetivos em Risco</span>
                  <Badge variant={performance.objectivesAtRisk > 0 ? "warning" : "success"}>
                    {performance.objectivesAtRisk}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/30 rounded">
                  <span className="text-sm">Ações Atrasadas</span>
                  <Badge variant={performance.actionsOverdue > 0 ? "error" : "success"}>
                    {performance.actionsOverdue}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-950/30 rounded">
                  <span className="text-sm">Indicadores Estratégicos</span>
                  <Badge variant="secondary">{performance.strategicIndicatorsCount}</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tendências e Insights */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <CardTitle>Tendências e Insights do Trimestre</CardTitle>
          </div>
          <CardDescription>
            Análise temporal e insights estratégicos baseados em dados reais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <Goal className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{trends.objectivesCreatedThisQuarter}</div>
              <div className="text-sm text-muted-foreground">Novos Objetivos</div>
              <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">Este Trimestre</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg bg-green-50 dark:bg-green-950/30">
              <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{trends.keyResultsWithHighProgress}</div>
              <div className="text-sm text-muted-foreground">KRs com Alto Progresso</div>
              <div className="text-xs text-green-700 dark:text-green-300 mt-1">≥ 75% de progresso</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/30">
              <CheckSquare className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">{trends.completedActionsThisQuarter}</div>
              <div className="text-sm text-muted-foreground">Ações Finalizadas</div>
              <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">Este Trimestre</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conclusão e Recomendações */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-emerald-600" />
            <CardTitle className="text-emerald-800 dark:text-emerald-200">Análise Executiva</CardTitle>
          </div>
          <CardDescription className="text-emerald-700 dark:text-emerald-300">
            Conclusões baseadas nos dados atuais do sistema OKR
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2 flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>Status Atual</span>
              </h4>
              <ul className="space-y-1 text-sm text-emerald-700 dark:text-emerald-300">
                <li>• {overview.totalObjectives} objetivos estratégicos em acompanhamento</li>
                <li>• {overview.totalKeyResults} resultados-chave definidos</li>
                <li>• {overview.totalActions} ações em execução</li>
                <li>• {overview.totalCheckpoints} checkpoints de monitoramento</li>
                <li>• {overview.avgKeyResultProgress}% de progresso médio nos KRs</li>
              </ul>
            </div>
            
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Principais Insights</span>
              </h4>
              <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                <li>• {performance.objectivesOnTrack} objetivos atualmente ativos</li>
                <li>• {trends.keyResultsWithHighProgress} resultados-chave com alto progresso (≥75%)</li>
                <li>• {trends.objectivesCreatedThisQuarter} novos objetivos criados este trimestre</li>
                <li>• {performance.objectivesAtRisk > 0 ? `${performance.objectivesAtRisk} objetivos requerem atenção` : 'Todos os objetivos dentro do prazo'}</li>
                <li>• {performance.actionsOverdue > 0 ? `${performance.actionsOverdue} ações com atraso` : 'Nenhuma ação em atraso'}</li>
              </ul>
            </div>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-emerald-100 to-blue-100 dark:from-emerald-900/30 dark:to-blue-900/30 rounded-lg">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Recomendações Estratégicas</h4>
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div>
                <strong className="text-green-700 dark:text-green-300">Pontos Fortes a Manter:</strong>
                <ul className="mt-1 space-y-1 text-gray-700 dark:text-gray-300">
                  {overview.avgKeyResultProgress >= 50 && <li>• Alto engajamento na execução de KRs</li>}
                  {performance.objectivesAtRisk === 0 && <li>• Excelente gestão de prazos</li>}
                  {trends.objectivesCreatedThisQuarter > 0 && <li>• Crescimento ativo da estratégia</li>}
                </ul>
              </div>
              <div>
                <strong className="text-amber-700 dark:text-amber-300">Áreas para Melhoria:</strong>
                <ul className="mt-1 space-y-1 text-gray-700 dark:text-gray-300">
                  {overview.avgKeyResultProgress < 50 && <li>• Acelerar progresso dos resultados-chave</li>}
                  {performance.objectivesAtRisk > 0 && <li>• Revisar objetivos em risco</li>}
                  {performance.actionsOverdue > 0 && <li>• Reorganizar cronograma de ações</li>}
                  {overview.actionCompletionRate < 75 && <li>• Aumentar taxa de conclusão de ações</li>}
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}