import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Shield, RefreshCw, Filter, ChevronLeft, ChevronRight,
  PlusCircle, Pencil, Trash2, RotateCcw, CheckCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";

const PAGE_SIZE = 30;

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  create: { label: "Criação", color: "bg-green-100 text-green-700 border-green-200", icon: PlusCircle },
  update: { label: "Atualização", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Pencil },
  delete: { label: "Exclusão", color: "bg-red-100 text-red-700 border-red-200", icon: Trash2 },
  restore: { label: "Restauração", color: "bg-amber-100 text-amber-700 border-amber-200", icon: RotateCcw },
  check_in: { label: "Check-in", color: "bg-purple-100 text-purple-700 border-purple-200", icon: CheckCircle },
};

const ENTITY_LABELS: Record<string, string> = {
  objective: "Objetivo",
  key_result: "Resultado-Chave",
  action: "Ação",
  checkpoint: "Checkpoint",
  user: "Usuário",
  kr_check_in: "Check-in de KR",
};

function formatTimestamp(ts: string | null) {
  if (!ts) return "—";
  try {
    return format(new Date(ts), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return ts;
  }
}

function DiffViewer({ details }: { details: any }) {
  if (!details) return null;
  const before = details.before;
  const after = details.after;

  if (!before && !after) {
    return (
      <pre className="text-xs bg-gray-50 rounded p-2 overflow-auto max-h-40 text-gray-600 mt-1">
        {JSON.stringify(details, null, 2)}
      </pre>
    );
  }

  const keys = Array.from(new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ])).filter((k) => !["createdAt", "updatedAt", "deletedAt", "password"].includes(k));

  const changed = keys.filter((k) => JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k]));
  if (changed.length === 0) return null;

  return (
    <div className="mt-1 space-y-0.5">
      {changed.map((k) => (
        <div key={k} className="flex items-start gap-2 text-xs">
          <span className="text-gray-400 shrink-0 w-24 truncate font-mono">{k}</span>
          {before && (
            <span className="bg-red-50 text-red-700 px-1 rounded truncate max-w-[150px]">
              {String(before[k] ?? "—")}
            </span>
          )}
          <span className="text-gray-400">→</span>
          {after && (
            <span className="bg-green-50 text-green-700 px-1 rounded truncate max-w-[150px]">
              {String(after[k] ?? "—")}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AuditPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const isAdmin = user?.role === "admin";

  const params = new URLSearchParams();
  params.set("limit", String(PAGE_SIZE));
  params.set("offset", String(page * PAGE_SIZE));
  if (filterAction !== "all") params.set("action", filterAction);
  if (filterEntity !== "all") params.set("entityType", filterEntity);

  const { data: activities, isLoading, isFetching } = useQuery<any[]>({
    queryKey: ["/api/activities", page, filterAction, filterEntity],
    enabled: isAdmin,
    queryFn: async () => {
      const res = await fetch(`/api/activities?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar auditoria");
      return res.json();
    },
  });

  if (!isAdmin) return <Redirect to="/" />;

  const items = activities ?? [];
  const hasNext = items.length === PAGE_SIZE;

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-6 border-b bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Auditoria</h1>
              <p className="text-sm text-gray-500 mt-0.5">Histórico completo de todas as alterações do sistema</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={isFetching} data-testid="button-refresh-audit">
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <Filter className="h-4 w-4 text-gray-400" />
          <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setPage(0); }}>
            <SelectTrigger className="w-44 h-8 text-sm" data-testid="select-filter-action">
              <SelectValue placeholder="Tipo de ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {Object.entries(ACTION_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterEntity} onValueChange={(v) => { setFilterEntity(v); setPage(0); }}>
            <SelectTrigger className="w-48 h-8 text-sm" data-testid="select-filter-entity">
              <SelectValue placeholder="Tipo de entidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as entidades</SelectItem>
              {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Shield className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-base font-medium">Nenhum registro encontrado</p>
            <p className="text-sm mt-1">Tente ajustar os filtros</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const cfg = ACTION_CONFIG[item.action] ?? ACTION_CONFIG.update;
              const Icon = cfg.icon;
              const isExpanded = expandedId === item.id;
              const entityLabel = ENTITY_LABELS[item.entityType] ?? item.entityType;

              return (
                <div
                  key={item.id}
                  className="bg-white border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  data-testid={`row-audit-${item.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5">
                        <Icon className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`text-[11px] px-1.5 py-0 border ${cfg.color}`}>
                            {cfg.label}
                          </Badge>
                          <span className="text-sm font-medium text-gray-700">
                            {entityLabel} #{item.entityId}
                          </span>
                          {item.userId && (
                            <span className="text-xs text-gray-400">
                              por {item.userName ?? `Usuário #${item.userId}`}
                            </span>
                          )}
                        </div>
                        {isExpanded && item.details && (
                          <DiffViewer details={item.details} />
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                      {formatTimestamp(item.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <span className="text-sm text-gray-500">
            Página {page + 1} — {items.length} registro{items.length !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
              data-testid="button-next-page"
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
