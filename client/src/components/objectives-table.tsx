import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Edit, Trash2, Download, Search, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ObjectiveForm from "./objective-form";

interface ObjectivesTableProps {
  objectives?: any[];
  isLoading: boolean;
  showActions?: boolean;
}

export default function ObjectivesTable({ objectives, isLoading, showActions = false }: ObjectivesTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedObjective, setSelectedObjective] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/objectives/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/objectives"] });
      toast({
        title: "Objetivo deletado",
        description: "O objetivo foi deletado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao deletar objetivo.",
        variant: "destructive",
      });
    },
  });

  const filteredObjectives = objectives?.filter((objective) =>
    objective.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    objective.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getStatusBadge = (progress: number) => {
    if (progress >= 70) {
      return { label: "No prazo", variant: "default" as const, color: "bg-secondary" };
    }
    if (progress >= 40) {
      return { label: "Atenção", variant: "secondary" as const, color: "bg-accent" };
    }
    return { label: "Atrasado", variant: "destructive" as const, color: "bg-destructive" };
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 70) return "bg-secondary";
    if (progress >= 40) return "bg-accent";
    return "bg-destructive";
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEdit = (objective: any) => {
    setSelectedObjective(objective);
    setIsEditModalOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const exportData = () => {
    if (!objectives || objectives.length === 0) {
      toast({
        title: "Aviso",
        description: "Nenhum dado para exportar.",
        variant: "destructive",
      });
      return;
    }

    const csvContent = [
      ["Título", "Descrição", "Região", "Responsável", "Progresso", "Status"],
      ...objectives.map(obj => [
        obj.title,
        obj.description || "",
        obj.region?.name || "",
        obj.owner?.name || "Sem responsável",
        `${parseFloat(obj.progress || "0").toFixed(1)}%`,
        getStatusBadge(parseFloat(obj.progress || "0")).label
      ])
    ]
    .map(row => row.map(cell => `"${cell}"`).join(","))
    .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "objetivos.csv";
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Objetivos Ativos</CardTitle>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar objetivos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button variant="outline" onClick={exportData}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4 p-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Objetivo</TableHead>
                  <TableHead>Região</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Status</TableHead>
                  {showActions && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredObjectives.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showActions ? 6 : 5} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {searchQuery ? "Nenhum objetivo encontrado para a busca." : "Nenhum objetivo encontrado."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredObjectives.map((objective) => {
                    const progress = parseFloat(objective.progress || "0");
                    const statusBadge = getStatusBadge(progress);

                    return (
                      <TableRow key={objective.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">
                              {objective.title}
                            </p>
                            {objective.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {objective.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-foreground">
                          {objective.region?.name || objective.subRegion?.name || "Não informado"}
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getUserInitials(objective.owner?.name || "SR")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-foreground">
                              {objective.owner?.name || "Sem responsável"}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-16 bg-muted rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground min-w-[3rem]">
                              {progress.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant={statusBadge.variant}>
                            {statusBadge.label}
                          </Badge>
                        </TableCell>
                        
                        {showActions && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Visualizar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(objective)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Deletar
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja deletar este objetivo? Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDelete(objective.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Deletar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination would go here if needed */}
        {filteredObjectives.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Mostrando {filteredObjectives.length} de {objectives?.length || 0} objetivos
            </div>
          </div>
        )}
      </CardContent>

      {/* Edit Modal */}
      {selectedObjective && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl">
            <ObjectiveForm 
              objective={selectedObjective}
              onSuccess={() => {
                setIsEditModalOpen(false);
                setSelectedObjective(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
