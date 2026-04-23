import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, RotateCcw, Goal, Key, CheckSquare, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR }); }
  catch { return String(d); }
}

interface TrashItem {
  id: number;
  title: string;
  deletedAt?: string | null;
  ownerName?: string;
  responsibleName?: string;
  status?: string;
}

function TrashList({
  items,
  endpointPath,
  onRestore,
  isRestoring,
}: {
  items: TrashItem[];
  endpointPath: string;
  onRestore: (id: number) => void;
  isRestoring: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Trash2 className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">Nenhum item na lixeira</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-4 bg-white border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors"
          data-testid={`row-trash-${endpointPath}-${item.id}`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700 truncate">{item.title}</span>
              {item.status && (
                <Badge variant="outline" className="text-[11px] px-1.5 py-0 border text-gray-500 border-gray-200">
                  {item.status}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
              <span>#{item.id}</span>
              {(item.ownerName ?? item.responsibleName) && (
                <span>Responsável: {item.ownerName ?? item.responsibleName}</span>
              )}
              {item.deletedAt && (
                <span>Excluído em: {formatDate(item.deletedAt)}</span>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRestore(item.id)}
            disabled={isRestoring}
            className="shrink-0 gap-1.5"
            data-testid={`button-restore-${endpointPath}-${item.id}`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar
          </Button>
        </div>
      ))}
    </div>
  );
}

export default function TrashPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const isAllowed = user?.role === "admin" || user?.role === "gestor";

  const { data, isLoading, isFetching, refetch } = useQuery<{
    objectives: TrashItem[];
    keyResults: TrashItem[];
    actions: TrashItem[];
  }>({
    queryKey: ["/api/trash"],
    enabled: isAllowed,
    queryFn: async () => {
      const res = await fetch("/api/trash", { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar lixeira");
      return res.json();
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async ({ endpoint, id }: { endpoint: string; id: number }) => {
      const res = await apiRequest("POST", `/api/trash/${endpoint}/${id}/restore`);
      if (!res.ok) throw new Error("Erro ao restaurar item");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Item restaurado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/trash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/objectives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/key-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      setRestoringId(null);
    },
    onError: (err: any) => {
      toast({ title: "Erro ao restaurar", description: err.message, variant: "destructive" });
      setRestoringId(null);
    },
  });

  if (!isAllowed) return <Redirect to="/" />;

  const handleRestore = (endpoint: string, id: number) => {
    setRestoringId(id);
    restoreMutation.mutate({ endpoint, id });
  };

  const objectives = data?.objectives ?? [];
  const keyResults = data?.keyResults ?? [];
  const actions = data?.actions ?? [];
  const total = objectives.length + keyResults.length + actions.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-6 border-b bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lixeira</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Itens excluídos podem ser restaurados.{" "}
                {total > 0 && (
                  <span className="font-medium text-gray-700">
                    {total} item{total !== 1 ? "s" : ""} na lixeira.
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} data-testid="button-refresh-trash">
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="objectives">
            <TabsList className="mb-4" data-testid="tabs-trash">
              <TabsTrigger value="objectives" className="gap-1.5" data-testid="tab-trash-objectives">
                <Goal className="h-3.5 w-3.5" />
                Objetivos
                {objectives.length > 0 && (
                  <Badge className="ml-1 text-[10px] px-1.5 py-0 bg-red-100 text-red-600 border-red-200" variant="outline">
                    {objectives.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="keyResults" className="gap-1.5" data-testid="tab-trash-krs">
                <Key className="h-3.5 w-3.5" />
                Resultados-Chave
                {keyResults.length > 0 && (
                  <Badge className="ml-1 text-[10px] px-1.5 py-0 bg-red-100 text-red-600 border-red-200" variant="outline">
                    {keyResults.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="actions" className="gap-1.5" data-testid="tab-trash-actions">
                <CheckSquare className="h-3.5 w-3.5" />
                Ações
                {actions.length > 0 && (
                  <Badge className="ml-1 text-[10px] px-1.5 py-0 bg-red-100 text-red-600 border-red-200" variant="outline">
                    {actions.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="objectives">
              <TrashList
                items={objectives}
                endpointPath="objectives"
                onRestore={(id) => handleRestore("objectives", id)}
                isRestoring={restoreMutation.isPending && restoringId !== null}
              />
            </TabsContent>
            <TabsContent value="keyResults">
              <TrashList
                items={keyResults}
                endpointPath="key-results"
                onRestore={(id) => handleRestore("key-results", id)}
                isRestoring={restoreMutation.isPending && restoringId !== null}
              />
            </TabsContent>
            <TabsContent value="actions">
              <TrashList
                items={actions}
                endpointPath="actions"
                onRestore={(id) => handleRestore("actions", id)}
                isRestoring={restoreMutation.isPending && restoringId !== null}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
