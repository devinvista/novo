import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { format, isBefore, startOfDay, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LayoutDashboard, Goal, Key, CheckSquare, AlertCircle,
  Clock, CheckCircle, ArrowRight, TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const today = startOfDay(new Date());

function formatDate(d: string | undefined | null) {
  if (!d) return "—";
  try { return format(new Date(d), "dd/MM/yyyy", { locale: ptBR }); }
  catch { return String(d); }
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
  at_risk: "bg-amber-100 text-amber-700 border-amber-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
  pending: "bg-orange-100 text-orange-700 border-orange-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo", completed: "Concluído", at_risk: "Em Risco",
  cancelled: "Cancelado", pending: "Pendente", in_progress: "Em Progresso",
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  href,
}: {
  icon: any; label: string; value: number; sub?: string; color: string; href: string;
}) {
  return (
    <Link href={href}>
      <div className={`bg-white border rounded-xl p-5 hover:shadow-md transition-all cursor-pointer group`} data-testid={`card-stat-${label}`}>
        <div className="flex items-start justify-between">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors mt-1" />
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: objectives, isLoading: loadingObj } = useQuery<any[]>({
    queryKey: ["/api/objectives"],
    queryFn: async () => {
      const res = await fetch("/api/objectives", { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const { data: actions, isLoading: loadingActions } = useQuery<any[]>({
    queryKey: ["/api/actions"],
    queryFn: async () => {
      const res = await fetch("/api/actions", { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const { data: keyResults, isLoading: loadingKRs } = useQuery<any[]>({
    queryKey: ["/api/key-results"],
    queryFn: async () => {
      const res = await fetch("/api/key-results", { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const isLoading = loadingObj || loadingActions || loadingKRs;

  const myObjectives = (objectives ?? []).filter(
    (o) => o.ownerId === user?.id && !o.deletedAt
  );

  const myActions = (actions ?? []).filter(
    (a) => (a.responsibleId === user?.id || a.responsible?.id === user?.id) && !a.deletedAt
  );

  const overdueActions = myActions.filter((a) => {
    if (!a.dueDate) return false;
    if (a.status === "completed" || a.status === "cancelled") return false;
    return isBefore(startOfDay(new Date(a.dueDate)), today);
  });

  const pendingActions = myActions.filter(
    (a) => a.status === "pending" || a.status === "in_progress"
  );

  const myObjectiveIds = new Set(myObjectives.map((o) => o.id));
  const relatedKRs = (keyResults ?? []).filter(
    (kr) => myObjectiveIds.has(kr.objectiveId) && !kr.deletedAt
  );

  const weekStart = format(startOfWeek(new Date(), { locale: ptBR }), "yyyy-MM-dd");
  const { data: checkIns } = useQuery<any[]>({
    queryKey: ["/api/kr-check-ins"],
    queryFn: async () => {
      const res = await fetch("/api/kr-check-ins", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const checkedInKRIds = new Set(
    (checkIns ?? [])
      .filter((ci) => ci.weekStart === weekStart && ci.authorId === user?.id)
      .map((ci) => ci.keyResultId)
  );

  const krsNeedingCheckIn = relatedKRs.filter(
    (kr) => !checkedInKRIds.has(kr.id) && kr.status === "active"
  );

  const avgProgress =
    myObjectives.length > 0
      ? Math.round(
          myObjectives.reduce((sum, o) => sum + parseFloat(o.progress ?? "0"), 0) /
            myObjectives.length
        )
      : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-6 border-b bg-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <LayoutDashboard className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Olá, {user?.name?.split(" ")[0] ?? "usuário"} 👋
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Aqui está o resumo do que é seu — {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Goal}
                label="Meus Objetivos"
                value={myObjectives.length}
                sub={`Progresso médio: ${avgProgress}%`}
                color="bg-indigo-50 text-indigo-600"
                href="/objectives"
              />
              <StatCard
                icon={Key}
                label="Resultados-Chave"
                value={relatedKRs.length}
                sub={krsNeedingCheckIn.length > 0 ? `${krsNeedingCheckIn.length} sem check-in esta semana` : "Todos em dia"}
                color="bg-blue-50 text-blue-600"
                href="/key-results"
              />
              <StatCard
                icon={CheckSquare}
                label="Minhas Ações"
                value={pendingActions.length}
                sub="Pendentes ou em progresso"
                color="bg-amber-50 text-amber-600"
                href="/actions"
              />
              <StatCard
                icon={AlertCircle}
                label="Ações Atrasadas"
                value={overdueActions.length}
                sub={overdueActions.length === 0 ? "Tudo no prazo!" : "Requerem atenção"}
                color={overdueActions.length > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}
                href="/actions"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-indigo-500" />
                    <h2 className="text-sm font-semibold text-gray-900">Meus Objetivos</h2>
                  </div>
                  <Link href="/objectives">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                      Ver todos <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
                {myObjectives.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Nenhum objetivo atribuído a você</p>
                ) : (
                  <div className="space-y-3">
                    {myObjectives.slice(0, 5).map((obj) => (
                      <div key={obj.id} data-testid={`item-my-objective-${obj.id}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700 truncate flex-1 mr-2">{obj.title}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 border ${STATUS_COLORS[obj.status] ?? "bg-gray-100 text-gray-500"}`}
                            >
                              {STATUS_LABELS[obj.status] ?? obj.status}
                            </Badge>
                            <span className="text-xs font-medium text-gray-600 w-8 text-right">
                              {Math.round(parseFloat(obj.progress ?? "0"))}%
                            </span>
                          </div>
                        </div>
                        <Progress value={parseFloat(obj.progress ?? "0")} className="h-1.5" />
                      </div>
                    ))}
                    {myObjectives.length > 5 && (
                      <p className="text-xs text-gray-400 text-center pt-1">
                        +{myObjectives.length - 5} objetivo{myObjectives.length - 5 !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <h2 className="text-sm font-semibold text-gray-900">Ações Atrasadas</h2>
                  </div>
                  <Link href="/actions">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                      Ver todas <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
                {overdueActions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-gray-400 gap-2">
                    <CheckCircle className="h-8 w-8 text-green-400" />
                    <p className="text-sm font-medium text-green-600">Tudo em dia!</p>
                    <p className="text-xs">Nenhuma ação atrasada</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {overdueActions.slice(0, 6).map((action) => (
                      <div
                        key={action.id}
                        className="flex items-start justify-between gap-2 p-2.5 bg-red-50 rounded-lg border border-red-100"
                        data-testid={`item-overdue-action-${action.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 font-medium truncate">{action.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Clock className="h-3 w-3 text-red-500" />
                            <span className="text-xs text-red-600">
                              Venceu em {formatDate(action.dueDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {overdueActions.length > 6 && (
                      <p className="text-xs text-gray-400 text-center pt-1">
                        +{overdueActions.length - 6} ação{overdueActions.length - 6 !== 1 ? "ões" : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-amber-500" />
                    <h2 className="text-sm font-semibold text-gray-900">Minhas Ações Pendentes</h2>
                  </div>
                  <Link href="/actions">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                      Ver todas <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
                {pendingActions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Nenhuma ação pendente</p>
                ) : (
                  <div className="space-y-2">
                    {pendingActions.slice(0, 6).map((action) => {
                      const isOverdue =
                        action.dueDate && isBefore(startOfDay(new Date(action.dueDate)), today);
                      return (
                        <div
                          key={action.id}
                          className={`flex items-start justify-between gap-2 p-2.5 rounded-lg border ${
                            isOverdue ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"
                          }`}
                          data-testid={`item-pending-action-${action.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 truncate">{action.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[action.status] ?? ""}`}
                              >
                                {STATUS_LABELS[action.status] ?? action.status}
                              </Badge>
                              {action.dueDate && (
                                <span className={`text-xs ${isOverdue ? "text-red-600" : "text-gray-400"}`}>
                                  {isOverdue ? "Atrasada · " : ""}Prazo: {formatDate(action.dueDate)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-blue-500" />
                    <h2 className="text-sm font-semibold text-gray-900">Check-ins Pendentes esta Semana</h2>
                  </div>
                  <Link href="/key-results">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                      Ver KRs <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
                {krsNeedingCheckIn.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-gray-400 gap-2">
                    <CheckCircle className="h-8 w-8 text-green-400" />
                    <p className="text-sm font-medium text-green-600">Check-ins em dia!</p>
                    <p className="text-xs">Todos os KRs foram atualizados esta semana</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {krsNeedingCheckIn.slice(0, 5).map((kr) => (
                      <div
                        key={kr.id}
                        className="flex items-start gap-2 p-2.5 bg-blue-50 rounded-lg border border-blue-100"
                        data-testid={`item-kr-checkin-${kr.id}`}
                      >
                        <Key className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate">{kr.title}</p>
                          <p className="text-xs text-blue-600 mt-0.5">
                            Progresso: {Math.round(parseFloat(kr.progress ?? "0"))}%
                          </p>
                        </div>
                      </div>
                    ))}
                    {krsNeedingCheckIn.length > 5 && (
                      <p className="text-xs text-gray-400 text-center pt-1">
                        +{krsNeedingCheckIn.length - 5} KR{krsNeedingCheckIn.length - 5 !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
