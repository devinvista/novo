import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  ChevronDown,
  Goal,
  Key,
  CheckSquare,
  CheckCircle,
  Clock,
  Circle,
  AlertCircle,
  ChevronsDownUp,
  ChevronsUpDown,
  Search,
  Target,
  TrendingUp,
} from "lucide-react";
import { ptBR } from "date-fns/locale";
import { formatSP, parseISOSP, nowSP } from "@/lib/timezone";
import { formatDateBR } from "@/lib/formatters";
import CompactHeader from "@/components/layout/compact-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import KrProgressChart from "@/features/key-results/kr-progress-chart-lazy";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";
import { useFilters } from "@/hooks/use-filters";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Action {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  responsible?: { id: number; name: string };
}

interface KeyResult {
  id: number;
  title: string;
  description?: string;
  currentValue: string | number;
  targetValue: string | number;
  unit?: string;
  progress: string | number;
  status: string;
  endDate: string;
  actions?: Action[];
}

interface Objective {
  id: number;
  title: string;
  description?: string;
  progress: string | number;
  status: string;
  startDate: string;
  endDate: string;
  owner?: { id: number; name: string };
  keyResults?: KeyResult[];
}

// ─── Config ──────────────────────────────────────────────────────────────────

const ACTION_STATUS: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  completed: { label: "Concluída", icon: CheckCircle, color: "text-green-600", bg: "bg-green-100 border-green-200 text-green-700" },
  in_progress: { label: "Em Progresso", icon: Clock, color: "text-blue-600", bg: "bg-blue-100 border-blue-200 text-blue-700" },
  cancelled: { label: "Cancelada", icon: AlertCircle, color: "text-gray-400", bg: "bg-gray-100 border-gray-200 text-gray-500" },
  pending: { label: "Pendente", icon: Circle, color: "text-orange-500", bg: "bg-orange-100 border-orange-200 text-orange-700" },
};

const PRIORITY_CONFIG: Record<string, { label: string; cls: string }> = {
  high: { label: "Alta", cls: "bg-red-100 border-red-200 text-red-700" },
  medium: { label: "Média", cls: "bg-yellow-100 border-yellow-200 text-yellow-700" },
  low: { label: "Baixa", cls: "bg-gray-100 border-gray-200 text-gray-600" },
};

const OBJ_STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Ativo", cls: "bg-green-100 border-green-200 text-green-700" },
  completed: { label: "Concluído", cls: "bg-blue-100 border-blue-200 text-blue-700" },
  at_risk: { label: "Em Risco", cls: "bg-red-100 border-red-200 text-red-700" },
  on_hold: { label: "Pausado", cls: "bg-gray-100 border-gray-200 text-gray-600" },
  inactive: { label: "Inativo", cls: "bg-gray-100 border-gray-200 text-gray-600" },
};

const KR_STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Ativo", cls: "bg-blue-100 border-blue-200 text-blue-700" },
  completed: { label: "Concluído", cls: "bg-green-100 border-green-200 text-green-700" },
  at_risk: { label: "Em Risco", cls: "bg-red-100 border-red-200 text-red-700" },
  on_hold: { label: "Pausado", cls: "bg-gray-100 border-gray-200 text-gray-600" },
  inactive: { label: "Inativo", cls: "bg-gray-100 border-gray-200 text-gray-600" },
};

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : pct >= 25 ? "bg-yellow-500" : "bg-red-400";
  const h = size === "sm" ? "h-1.5" : "h-2";
  return (
    <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${h}`}>
      <div className={`${h} rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Action Node ──────────────────────────────────────────────────────────────

function ActionNode({ action, search }: { action: Action; search: string }) {
  const cfg = ACTION_STATUS[action.status] || ACTION_STATUS.pending;
  const pCfg = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.medium;
  const Icon = cfg.icon;

  const isOverdue =
    action.dueDate &&
    parseISOSP(action.dueDate) < nowSP() &&
    action.status !== "completed" &&
    action.status !== "cancelled";

  return (
    <div
      className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors group"
      data-testid={`action-node-${action.id}`}
    >
      {/* Connector lines */}
      <div className="shrink-0 flex flex-col items-center mt-0.5">
        <div className="w-4 h-px bg-gray-300" />
      </div>

      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.color}`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <span className={`text-sm font-medium ${action.status === "cancelled" ? "line-through text-gray-400" : "text-gray-800"}`}>
            {action.title}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${pCfg.cls}`}>
              {pCfg.label}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${cfg.bg}`}>
              {cfg.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {action.dueDate && (
            <span className={`text-xs ${isOverdue ? "text-red-600 font-medium" : "text-gray-500"}`}>
              {isOverdue ? "⚠ " : ""}
              Prazo: {formatSP(action.dueDate, "dd/MM/yyyy")}
            </span>
          )}
          {action.responsible && (
            <span className="text-xs text-gray-500">👤 {action.responsible.name}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── KR Node ─────────────────────────────────────────────────────────────────

function KRNode({
  kr,
  actionsMap,
  defaultOpen,
  search,
}: {
  kr: KeyResult;
  actionsMap: Record<number, Action[]>;
  defaultOpen: boolean;
  search: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const krActions = actionsMap[kr.id] || [];
  const filteredActions = search
    ? krActions.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()))
    : krActions;

  const pct = parseFloat(String(kr.progress)) || 0;
  const statusCfg = KR_STATUS[kr.status] || KR_STATUS.active;
  const completedCount = krActions.filter((a) => a.status === "completed").length;

  if (search && filteredActions.length === 0 && !kr.title.toLowerCase().includes(search.toLowerCase())) {
    return null;
  }

  return (
    <div className="ml-6 border-l-2 border-blue-200 pl-3">
      {/* KR Header */}
      <button
        className="w-full flex items-center gap-2 py-2.5 px-3 rounded-lg hover:bg-blue-50 transition-colors text-left group"
        onClick={() => setOpen((v) => !v)}
        data-testid={`kr-node-${kr.id}`}
      >
        <div className="shrink-0 text-blue-400">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </div>
        <Key className="h-4 w-4 text-blue-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-semibold text-blue-800 truncate">{kr.title}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500">
                {completedCount}/{krActions.length} ações
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${statusCfg.cls}`}>
                {statusCfg.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex-1 max-w-[180px]">
              <ProgressBar value={pct} size="sm" />
            </div>
            <span className="text-xs text-gray-500 shrink-0">
              {Number(kr.currentValue).toLocaleString("pt-BR")} /{" "}
              {Number(kr.targetValue).toLocaleString("pt-BR")}
              {kr.unit ? ` ${kr.unit}` : ""}
            </span>
            <span className="text-xs font-semibold text-blue-600 shrink-0">{pct.toFixed(0)}%</span>
          </div>
        </div>
      </button>

      {/* Mini sparkline – always visible */}
      <div className="ml-8 pr-3 -mt-1 mb-1">
        <KrProgressChart keyResultId={kr.id} unit={kr.unit} mode="mini" />
      </div>

      {/* KR Actions */}
      {open && (
        <div className="mt-1 mb-2">
          {filteredActions.length === 0 ? (
            <p className="ml-10 text-xs text-gray-400 italic py-1">Nenhuma ação vinculada</p>
          ) : (
            filteredActions.map((action) => (
              <ActionNode key={action.id} action={action} search={search} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Objective Node ───────────────────────────────────────────────────────────

function ObjectiveNode({
  objective,
  krsMap,
  actionsMap,
  defaultOpen,
  search,
}: {
  objective: Objective;
  krsMap: Record<number, KeyResult[]>;
  actionsMap: Record<number, Action[]>;
  defaultOpen: boolean;
  search: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const objKRs = krsMap[objective.id] || [];

  const filteredKRs = search
    ? objKRs.filter((kr) => {
        const krActions = actionsMap[kr.id] || [];
        return (
          kr.title.toLowerCase().includes(search.toLowerCase()) ||
          krActions.some((a) => a.title.toLowerCase().includes(search.toLowerCase())) ||
          objective.title.toLowerCase().includes(search.toLowerCase())
        );
      })
    : objKRs;

  if (
    search &&
    filteredKRs.length === 0 &&
    !objective.title.toLowerCase().includes(search.toLowerCase())
  ) {
    return null;
  }

  const pct = parseFloat(String(objective.progress)) || 0;
  const statusCfg = OBJ_STATUS[objective.status] || OBJ_STATUS.active;
  const totalActions = objKRs.reduce((sum, kr) => sum + (actionsMap[kr.id]?.length || 0), 0);
  const completedActions = objKRs.reduce(
    (sum, kr) => sum + (actionsMap[kr.id]?.filter((a) => a.status === "completed").length || 0),
    0
  );

  return (
    <div
      className="border border-gray-200 rounded-xl overflow-hidden mb-4 shadow-xs"
      data-testid={`objective-node-${objective.id}`}
    >
      {/* Objective Header */}
      <button
        className="w-full flex items-center gap-3 p-4 bg-linear-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="shrink-0 text-blue-600">
          {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </div>
        <Goal className="h-5 w-5 text-blue-700 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <span className="text-base font-bold text-blue-900 block truncate">{objective.title}</span>
              {objective.owner && (
                <span className="text-xs text-blue-600/70">👤 {objective.owner.name}</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500 hidden sm:block">
                {objKRs.length} KR{objKRs.length !== 1 ? "s" : ""} · {completedActions}/{totalActions} ações
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${statusCfg.cls}`}>
                {statusCfg.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 max-w-xs">
              <ProgressBar value={pct} />
            </div>
            <span className="text-sm font-bold text-blue-700 shrink-0">{pct.toFixed(0)}%</span>
            <span className="text-xs text-gray-500 hidden sm:block shrink-0">
              {formatDateBR(objective.startDate)} → {formatDateBR(objective.endDate)}
            </span>
          </div>
        </div>
      </button>

      {/* KRs */}
      {open && (
        <div className="p-3 bg-white">
          {filteredKRs.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-3">
              Nenhum resultado-chave vinculado
            </p>
          ) : (
            <div className="space-y-1">
              {filteredKRs.map((kr) => (
                <KRNode
                  key={kr.id}
                  kr={kr}
                  actionsMap={actionsMap}
                  defaultOpen={!!search || defaultOpen}
                  search={search}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AlignmentTree() {
  const { selectedQuarter } = useQuarterlyFilter();
  const { filters } = useFilters();
  const [allOpen, setAllOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [expandKey, setExpandKey] = useState(0); // force re-mount on toggle

  const buildParams = () => {
    const p = new URLSearchParams();
    if (filters?.regionId) p.append("regionId", filters.regionId.toString());
    if (filters?.subRegionId) p.append("subRegionId", filters.subRegionId.toString());
    if (filters?.serviceLineId) p.append("serviceLineId", filters.serviceLineId.toString());
    return p;
  };

  const quarterUrl = selectedQuarter && selectedQuarter !== "all"
    ? `/api/quarters/${selectedQuarter}/data${buildParams().toString() ? `?${buildParams()}` : ""}`
    : null;

  const { data: objectives, isLoading: loadingObj } = useQuery<Objective[]>({
    queryKey: ["/api/objectives", selectedQuarter, JSON.stringify(filters)],
    queryFn: async () => {
      if (quarterUrl) {
        const res = await fetch(quarterUrl, { credentials: "include" });
        if (!res.ok) throw new Error("Erro");
        const d = await res.json();
        return Array.isArray(d.objectives) ? d.objectives : [];
      }
      const url = `/api/objectives${buildParams().toString() ? `?${buildParams()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const { data: keyResults, isLoading: loadingKR } = useQuery<KeyResult[]>({
    queryKey: ["/api/key-results", selectedQuarter, JSON.stringify(filters)],
    queryFn: async () => {
      if (quarterUrl) {
        const res = await fetch(quarterUrl, { credentials: "include" });
        if (!res.ok) throw new Error("Erro");
        const d = await res.json();
        return Array.isArray(d.keyResults) ? d.keyResults : [];
      }
      const url = `/api/key-results${buildParams().toString() ? `?${buildParams()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const { data: actions, isLoading: loadingActions } = useQuery<Action[]>({
    queryKey: ["/api/actions", selectedQuarter, JSON.stringify(filters)],
    queryFn: async () => {
      if (quarterUrl) {
        const res = await fetch(quarterUrl, { credentials: "include" });
        if (!res.ok) throw new Error("Erro");
        const d = await res.json();
        return Array.isArray(d.actions) ? d.actions : [];
      }
      const url = `/api/actions${buildParams().toString() ? `?${buildParams()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const isLoading = loadingObj || loadingKR || loadingActions;

  // Build lookup maps
  const krsMap = useMemo(() => {
    const map: Record<number, KeyResult[]> = {};
    (keyResults || []).forEach((kr: any) => {
      const objId = kr.objectiveId ?? kr.objective?.id;
      if (objId) {
        if (!map[objId]) map[objId] = [];
        map[objId].push(kr);
      }
    });
    return map;
  }, [keyResults]);

  const actionsMap = useMemo(() => {
    const map: Record<number, Action[]> = {};
    (actions || []).forEach((a: any) => {
      const krId = a.keyResultId ?? a.keyResult?.id;
      if (krId) {
        if (!map[krId]) map[krId] = [];
        map[krId].push(a);
      }
    });
    return map;
  }, [actions]);

  // Stats
  const stats = useMemo(() => {
    const totalObj = (objectives || []).length;
    const totalKR = (keyResults || []).length;
    const totalActions = (actions || []).length;
    const completedActions = (actions || []).filter((a: any) => a.status === "completed").length;
    const inProgressActions = (actions || []).filter((a: any) => a.status === "in_progress").length;
    const overdueActions = (actions || []).filter(
      (a: any) =>
        a.dueDate &&
        parseISOSP(a.dueDate) < nowSP() &&
        a.status !== "completed" &&
        a.status !== "cancelled"
    ).length;
    const avgProgress =
      totalObj > 0
        ? (objectives || []).reduce((sum, o) => sum + (parseFloat(String(o.progress)) || 0), 0) / totalObj
        : 0;
    return { totalObj, totalKR, totalActions, completedActions, inProgressActions, overdueActions, avgProgress };
  }, [objectives, keyResults, actions]);

  const handleToggleAll = () => {
    setAllOpen((v) => !v);
    setExpandKey((k) => k + 1);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <CompactHeader showFilters={true} />

      {/* Page Header */}
      <div className="p-6 border-b bg-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Alinhamento Estratégico</h2>
            <p className="text-gray-600">Visualização hierárquica: Objetivos → Resultados-Chave → Ações</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-52"
                data-testid="input-search-tree"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleAll}
              data-testid="button-toggle-all"
              className="gap-1.5"
            >
              {allOpen ? (
                <>
                  <ChevronsDownUp className="h-4 w-4" />
                  Recolher tudo
                </>
              ) : (
                <>
                  <ChevronsUpDown className="h-4 w-4" />
                  Expandir tudo
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-gray-50 border-b px-6 py-3">
        <div className="flex items-center gap-6 flex-wrap text-sm">
          <div className="flex items-center gap-1.5">
            <Goal className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-blue-700">{stats.totalObj}</span>
            <span className="text-gray-500">objetivos</span>
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1.5">
            <Key className="h-4 w-4 text-indigo-500" />
            <span className="font-semibold text-indigo-700">{stats.totalKR}</span>
            <span className="text-gray-500">resultados-chave</span>
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1.5">
            <CheckSquare className="h-4 w-4 text-green-500" />
            <span className="font-semibold text-green-700">{stats.totalActions}</span>
            <span className="text-gray-500">ações</span>
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-green-700">{stats.completedActions}</span>
            <span className="text-gray-500">concluídas</span>
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="font-semibold text-blue-700">{stats.inProgressActions}</span>
            <span className="text-gray-500">em progresso</span>
          </div>
          {stats.overdueActions > 0 && (
            <>
              <div className="w-px h-4 bg-gray-300" />
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="font-semibold text-red-600">{stats.overdueActions}</span>
                <span className="text-gray-500">atrasadas</span>
              </div>
            </>
          )}
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <span className="font-semibold text-purple-700">{stats.avgProgress.toFixed(0)}%</span>
            <span className="text-gray-500">progresso médio</span>
          </div>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-xl overflow-hidden">
                <Skeleton className="h-20 w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-8 w-3/4 ml-6" />
                  <Skeleton className="h-8 w-3/4 ml-6" />
                </div>
              </div>
            ))}
          </div>
        ) : !objectives || objectives.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <Target className="h-14 w-14 text-gray-200" />
            <p className="text-lg font-medium">Nenhum objetivo encontrado</p>
            <p className="text-sm text-center">
              Crie objetivos e vincule resultados-chave e ações para visualizar a árvore de alinhamento
            </p>
          </div>
        ) : (
          <div key={expandKey}>
            {(objectives as Objective[]).map((obj) => (
              <ObjectiveNode
                key={obj.id}
                objective={obj}
                krsMap={krsMap}
                actionsMap={actionsMap}
                defaultOpen={allOpen}
                search={search}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
