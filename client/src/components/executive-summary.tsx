import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  BookOpen
} from "lucide-react";

export default function ExecutiveSummary() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Resumo Executivo - Implementação OKRs</h2>
        <p className="text-muted-foreground">
          Resultados da implementação da metodologia OKRs em empresa de médio porte do setor de tecnologia
        </p>
      </div>

      {/* Objetivos Principais */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-600" />
            <CardTitle>Objetivos Principais Definidos</CardTitle>
          </div>
          <CardDescription>
            Objetivos estratégicos estabelecidos pela liderança
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">Crescimento Financeiro</h4>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-200">
                Aumentar receita anual em 35% e melhorar margem de lucro
              </p>
            </div>
            
            <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/30">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-4 w-4 text-green-600" />
                <h4 className="font-semibold text-green-900 dark:text-green-100">Satisfação do Cliente</h4>
              </div>
              <p className="text-sm text-green-700 dark:text-green-200">
                Elevar NPS para 70+ e reduzir churn em 25%
              </p>
            </div>
            
            <div className="p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/30">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <h4 className="font-semibold text-purple-900 dark:text-purple-100">Expansão de Mercado</h4>
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-200">
                Capturar 15% de participação em novo segmento
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados Chave Mensuráveis */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-green-600" />
            <CardTitle>Resultados Chave Alcançados</CardTitle>
          </div>
          <CardDescription>
            Métricas específicas e mensuráveis associadas aos objetivos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Crescimento da Receita</span>
                <Badge variant="success">42% alcançado</Badge>
              </div>
              <Progress value={95} className="h-2" />
              <p className="text-xs text-muted-foreground">Meta: 35% | Resultado: 42%</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Net Promoter Score (NPS)</span>
                <Badge variant="success">73 pontos</Badge>
              </div>
              <Progress value={86} className="h-2" />
              <p className="text-xs text-muted-foreground">Meta: 70+ | Resultado: 73</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Redução do Churn</span>
                <Badge variant="success">28% redução</Badge>
              </div>
              <Progress value={90} className="h-2" />
              <p className="text-xs text-muted-foreground">Meta: 25% | Resultado: 28%</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Participação Novo Segmento</span>
                <Badge variant="warning">12% alcançado</Badge>
              </div>
              <Progress value={80} className="h-2" />
              <p className="text-xs text-muted-foreground">Meta: 15% | Resultado: 12%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Impactos Diretos */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <CardTitle>Impactos Diretos nos Resultados</CardTitle>
          </div>
          <CardDescription>
            Métricas de impacto organizacional mensuráveis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 border rounded-lg">
              <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">R$ 8,4M</div>
              <div className="text-sm text-muted-foreground">Aumento de Receita</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <Activity className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">32%</div>
              <div className="text-sm text-muted-foreground">Melhoria Eficiência</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">87%</div>
              <div className="text-sm text-muted-foreground">Engajamento Funcionários</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-600">45%</div>
              <div className="text-sm text-muted-foreground">Redução Time-to-Market</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desafios e Soluções */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <CardTitle>Desafios Enfrentados e Soluções</CardTitle>
          </div>
          <CardDescription>
            Principais obstáculos durante a implementação e como foram superados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/30">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                    Resistência Inicial da Equipe
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-200 mb-2">
                    30% dos funcionários demonstraram resistência à metodologia OKR nos primeiros meses.
                  </p>
                  <div className="flex items-center space-x-2 text-xs">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span className="text-green-700 dark:text-green-300">
                      Solucionado com treinamentos intensivos e workshops práticos
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Dificuldade de Mensuração
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-200 mb-2">
                    Equipes tinham dificuldade para definir métricas quantificáveis.
                  </p>
                  <div className="flex items-center space-x-2 text-xs">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span className="text-green-700 dark:text-green-300">
                      Criação de framework padrão de métricas e acompanhamento semanal
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/30">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                    Sobrecarga de Reuniões
                  </h4>
                  <p className="text-sm text-purple-700 dark:text-purple-200 mb-2">
                    Aumento de 40% no tempo gasto em reuniões nos primeiros trimestres.
                  </p>
                  <div className="flex items-center space-x-2 text-xs">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span className="text-green-700 dark:text-green-300">
                      Otimização do processo com check-ins assíncronos e reuniões focadas
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lições Aprendidas */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            <CardTitle>Lições Aprendidas e Melhores Práticas</CardTitle>
          </div>
          <CardDescription>
            Insights importantes para ciclos futuros e replicação do sucesso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-semibold text-green-700 dark:text-green-300 flex items-center space-x-2">
                <Award className="h-4 w-4" />
                <span>Fatores de Sucesso</span>
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Engajamento direto da liderança executiva desde o início</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Comunicação transparente dos resultados em tempo real</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Ciclos de feedback contínuo e ajustes trimestrais</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Ferramentas digitais integradas para acompanhamento</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-blue-700 dark:text-blue-300 flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>Próximos Passos</span>
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start space-x-2">
                  <div className="h-4 w-4 bg-blue-200 rounded-full mt-0.5 flex-shrink-0" />
                  <span>Expansão da metodologia para equipes de suporte</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="h-4 w-4 bg-blue-200 rounded-full mt-0.5 flex-shrink-0" />
                  <span>Implementação de OKRs individuais para desenvolvimento pessoal</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="h-4 w-4 bg-blue-200 rounded-full mt-0.5 flex-shrink-0" />
                  <span>Integração com sistema de avaliação de desempenho</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="h-4 w-4 bg-blue-200 rounded-full mt-0.5 flex-shrink-0" />
                  <span>Automação de relatórios e dashboards executivos</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conclusão */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-emerald-600" />
            <CardTitle className="text-emerald-800 dark:text-emerald-200">Conclusão</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-emerald-700 dark:text-emerald-300">
            A implementação dos OKRs resultou em uma transformação significativa na cultura organizacional, 
            com resultados financeiros superando as expectativas em 20%. O engajamento dos funcionários 
            aumentou para 87%, e a empresa estabeleceu uma base sólida para crescimento sustentável. 
            Os desafios enfrentados foram oportunidades valiosas de aprendizado, fortalecendo nossa 
            capacidade de execução estratégica e alinhamento organizacional.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}