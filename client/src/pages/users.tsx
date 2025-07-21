import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Edit, Trash2, Shield, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: "admin" | "gestor" | "operacional";
  regionId?: number;
  subRegionId?: number;
  regionIds?: number[];
  subRegionIds?: number[];
  solutionIds?: number[];
  serviceLineIds?: number[];
  serviceIds?: number[];
  active: boolean;
  approved: boolean;
  approvedAt?: string;
  approvedBy?: number;
  gestorId?: number;
  createdAt: string;
}

interface Region {
  id: number;
  name: string;
}

interface SubRegion {
  id: number;
  name: string;
  regionId: number;
}

const userFormSchema = z.object({
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email deve ser válido"),
  password: z.string().optional(),
  role: z.enum(["admin", "gestor", "operacional"]),
  regionIds: z.array(z.number()).optional().default([]),
  subRegionIds: z.array(z.number()).optional().default([]),
  solutionIds: z.array(z.number()).optional().default([]),
  serviceLineIds: z.array(z.number()).optional().default([]),
  serviceIds: z.array(z.number()).optional().default([]),
}).refine((data) => {
  // Password required only for new users
  if (!data.password || data.password.length === 0) {
    return true; // Allow empty password for editing
  }
  return data.password.length >= 6;
}, {
  message: "Senha deve ter pelo menos 6 caracteres",
  path: ["password"],
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPasswords, setShowPasswords] = useState<{[key: number]: boolean}>({});
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [userToApprove, setUserToApprove] = useState<User | null>(null);
  const [selectedSubRegionForApproval, setSelectedSubRegionForApproval] = useState<string>("");

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      name: "",
      email: "",
      password: "",
      role: "operacional",
      regionIds: [],
      subRegionIds: [],
      solutionIds: [],
      serviceLineIds: [],
      serviceIds: [],
    },
  });

  // Queries
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: pendingUsers = [] } = useQuery({
    queryKey: ["/api/pending-users"],
  });

  const { data: regions = [] } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: subRegions = [] } = useQuery<SubRegion[]>({
    queryKey: ["/api/sub-regions"],
  });

  const { data: solutions = [] } = useQuery({
    queryKey: ["/api/solutions"],
  });

  const { data: serviceLines = [] } = useQuery({
    queryKey: ["/api/service-lines"],
  });

  const { data: services = [] } = useQuery({
    queryKey: ["/api/services"],
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: (userData: UserFormData) => 
      apiRequest("POST", "/api/users", userData).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Usuário criado",
        description: "Usuário criado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar usuário",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, ...userData }: UserFormData & { id: number }) =>
      apiRequest("PATCH", `/api/users/${id}`, userData).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
      setEditingUser(null);
      form.reset();
      toast({
        title: "Usuário atualizado",
        description: "Usuário atualizado com sucesso!",
      });
    },
    onError: (error: any) => {
      console.error("User update error:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar usuário",
        variant: "destructive",
      });
    },
  });

  const approveUserMutation = useMutation({
    mutationFn: ({ id, subRegionId }: { id: number; subRegionId?: number }) => 
      apiRequest("PATCH", `/api/users/${id}/approve`, { subRegionId }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pending-users"] });
      setApprovalDialogOpen(false);
      setUserToApprove(null);
      setSelectedSubRegionForApproval("");
      toast({
        title: "Usuário aprovado",
        description: "Usuário aprovado com sucesso e vinculado à sua região!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao aprovar usuário",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/users/${id}`).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário removido",
        description: "Usuário removido com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover usuário",
        variant: "destructive",
      });
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiRequest("PATCH", `/api/users/${id}/status`, { active: !active }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Status alterado",
        description: "Status do usuário alterado com sucesso!",
      });
    },
  });

  const handleCreateUser = (data: UserFormData) => {
    try {
      // Validation for new users - password is required
      if (!editingUser && (!data.password || data.password.length === 0)) {
        form.setError("password", { message: "Senha é obrigatória para novos usuários" });
        return;
      }

      const userData = {
        ...data,
        regionIds: data.regionIds || [],
        subRegionIds: data.subRegionIds || [],
        solutionIds: data.solutionIds || [],
        serviceLineIds: data.serviceLineIds || [],
        serviceIds: data.serviceIds || [],
      };
      
      console.log("Submitting user data:", { ...userData, password: userData.password ? "[HIDDEN]" : undefined });
      
      if (editingUser) {
        console.log("Updating user:", editingUser.id);
        updateUserMutation.mutate({ ...userData, id: editingUser.id });
      } else {
        console.log("Creating new user");
        createUserMutation.mutate(userData);
      }
    } catch (error) {
      console.error("Error in handleCreateUser:", error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao processar dados do usuário",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      name: user.name,
      email: user.email,
      password: "", // Don't show existing password
      role: user.role,
      regionIds: user.regionIds || (user.regionId ? [user.regionId] : []),
      subRegionIds: user.subRegionIds || (user.subRegionId ? [user.subRegionId] : []),
      solutionIds: user.solutionIds || [],
      serviceLineIds: user.serviceLineIds || [],
      serviceIds: user.serviceIds || [],
    });
    setIsDialogOpen(true);
  };

  const handleDeleteUser = (id: number) => {
    if (confirm("Tem certeza que deseja remover este usuário?")) {
      deleteUserMutation.mutate(id);
    }
  };

  const toggleUserStatus = (id: number, active: boolean) => {
    toggleUserStatusMutation.mutate({ id, active });
  };

  const handleApproveUser = (user: User) => {
    setUserToApprove(user);
    setApprovalDialogOpen(true);
  };

  const confirmApproval = () => {
    if (userToApprove) {
      const subRegionId = selectedSubRegionForApproval && selectedSubRegionForApproval !== "inherit" 
        ? parseInt(selectedSubRegionForApproval) 
        : undefined;
      
      approveUserMutation.mutate({ 
        id: userToApprove.id, 
        subRegionId 
      });
    }
  };

  const togglePasswordVisibility = (userId: number) => {
    setShowPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const canManageUser = (user: User) => {
    if (currentUser?.role === "admin") return true;
    if (currentUser?.role === "gestor" && user.role === "operacional") return true;
    return false;
  };

  const canCreateRole = (role: string) => {
    if (currentUser?.role === "admin") return true;
    if (currentUser?.role === "gestor" && role === "operacional") return true;
    return false;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "gestor": return "default";
      case "operacional": return "secondary";
      default: return "outline";
    }
  };

  const getFilteredSubRegions = (regionId: string) => {
    if (!regionId || regionId === "all") return [];
    return subRegions.filter(sr => sr.regionId === parseInt(regionId));
  };

  if (loadingUsers) {
    return <div className="flex items-center justify-center h-64">Carregando usuários...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gerencie usuários e seus níveis de acesso no sistema
          </p>
        </div>
      </div>

      {/* Pending Users Section */}
      {pendingUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários Pendentes de Aprovação ({pendingUsers.length})
            </CardTitle>
            <CardDescription>
              Usuários que aguardam aprovação para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingUsers.map((user: User) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.name}</span>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.email} • {user.username}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApproveUser(user)}
                      disabled={approveUserMutation.isPending}
                      className="h-8"
                    >
                      {approveUserMutation.isPending ? (
                        <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        "Aprovar"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={deleteUserMutation.isPending}
                      className="h-8"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEditingUser(null);
                form.reset();
              }}
              className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-[425px] sm:max-w-[500px] md:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-lg sm:text-xl">
                {editingUser ? "Editar Usuário" : "Criar Novo Usuário"}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                {editingUser 
                  ? "Atualize as informações do usuário" 
                  : "Preencha os dados para criar um novo usuário"
                }
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateUser)} className="space-y-4 sm:space-y-5">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Digite o username" 
                          className="h-10 sm:h-11 text-sm sm:text-base"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Nome Completo</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Digite o nome completo" 
                          className="h-10 sm:h-11 text-sm sm:text-base"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Digite o email" 
                          className="h-10 sm:h-11 text-sm sm:text-base"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">
                        {editingUser ? "Nova Senha (deixe vazio para manter)" : "Senha"}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder={editingUser ? "Nova senha (opcional)" : "Digite a senha"} 
                          className="h-10 sm:h-11 text-sm sm:text-base"
                          {...field} 
                          required={!editingUser}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Função</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                            <SelectValue placeholder="Selecione a função" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {canCreateRole("admin") && (
                            <SelectItem value="admin">Administrador</SelectItem>
                          )}
                          {canCreateRole("gestor") && (
                            <SelectItem value="gestor">Gestor</SelectItem>
                          )}
                          {canCreateRole("operacional") && (
                            <SelectItem value="operacional">Operacional</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="regionIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Região</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          if (value === "all") {
                            field.onChange([]);
                          } else {
                            const regionId = parseInt(value);
                            const currentValue = field.value || [];
                            const newValue = currentValue.includes(regionId)
                              ? currentValue.filter(id => id !== regionId)
                              : [...currentValue, regionId];
                            field.onChange(newValue);
                          }
                          // Clear sub-regions when region changes
                          form.setValue("subRegionIds", []);
                        }}
                        value=""
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                            <SelectValue placeholder={
                              !field.value || field.value.length === 0 
                                ? "Todas as regiões" 
                                : `${field.value.length} região(ões) selecionada(s)`
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Todas as regiões</SelectItem>
                          {regions.map((region) => {
                            const isSelected = field.value?.includes(region.id) || false;
                            return (
                              <SelectItem key={region.id} value={region.id.toString()}>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={() => {}} // Handled by parent onValueChange
                                  />
                                  <span>{region.name}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {field.value && field.value.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Selecionadas: {field.value.map(id => 
                            regions.find(r => r.id === id)?.name
                          ).filter(Boolean).join(", ")}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch("regionIds") && form.watch("regionIds").length > 0 && (
                  <FormField
                    control={form.control}
                    name="subRegionIds"
                    render={({ field }) => {
                      const selectedRegions = form.watch("regionIds") || [];
                      const availableSubRegions = subRegions.filter(sr => 
                        selectedRegions.includes(sr.regionId)
                      );
                      
                      return (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Sub-região (Opcional)</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              if (value === "all") {
                                field.onChange([]);
                              } else if (value === "none") {
                                field.onChange([]);
                              } else {
                                const subRegionId = parseInt(value);
                                const currentValue = field.value || [];
                                const newValue = currentValue.includes(subRegionId)
                                  ? currentValue.filter(id => id !== subRegionId)
                                  : [...currentValue, subRegionId];
                                field.onChange(newValue);
                              }
                            }}
                            value=""
                          >
                            <FormControl>
                              <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                                <SelectValue placeholder={
                                  !field.value || field.value.length === 0 
                                    ? "Todas as sub-regiões" 
                                    : `${field.value.length} sub-região(ões) selecionada(s)`
                                } />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">Todas as sub-regiões</SelectItem>
                              {availableSubRegions.map((subRegion) => {
                                const isSelected = field.value?.includes(subRegion.id) || false;
                                const parentRegion = regions.find(r => r.id === subRegion.regionId);
                                return (
                                  <SelectItem key={subRegion.id} value={subRegion.id.toString()}>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={isSelected}
                                        onChange={() => {}} // Handled by parent onValueChange
                                      />
                                      <span>{subRegion.name} ({parentRegion?.name})</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          {field.value && field.value.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Selecionadas: {field.value.map(id => 
                                subRegions.find(sr => sr.id === id)?.name
                              ).filter(Boolean).join(", ")}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}

                {/* Solution Selection */}
                <FormField
                  control={form.control}
                  name="solutionIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Solução</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          if (value === "all") {
                            field.onChange([]);
                          } else {
                            const solutionId = parseInt(value);
                            const currentValue = field.value || [];
                            const newValue = currentValue.includes(solutionId)
                              ? currentValue.filter(id => id !== solutionId)
                              : [...currentValue, solutionId];
                            field.onChange(newValue);
                          }
                          // Clear service lines and services when solution changes
                          form.setValue("serviceLineIds", []);
                          form.setValue("serviceIds", []);
                        }}
                        value=""
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                            <SelectValue placeholder={
                              !field.value || field.value.length === 0 
                                ? "Todas as soluções" 
                                : `${field.value.length} solução(ões) selecionada(s)`
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Todas as soluções</SelectItem>
                          {solutions.map((solution: any) => {
                            const isSelected = field.value?.includes(solution.id) || false;
                            return (
                              <SelectItem key={solution.id} value={solution.id.toString()}>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={() => {}} // Handled by parent onValueChange
                                  />
                                  <span>{solution.name}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {field.value && field.value.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Selecionadas: {field.value.map((id: number) => 
                            solutions.find((s: any) => s.id === id)?.name
                          ).filter(Boolean).join(", ")}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Service Line Selection - Only show if specific solutions are selected */}
                {form.watch("solutionIds") && form.watch("solutionIds").length > 0 && (
                  <FormField
                    control={form.control}
                    name="serviceLineIds"
                    render={({ field }) => {
                      const selectedSolutions = form.watch("solutionIds") || [];
                      const availableServiceLines = serviceLines.filter((sl: any) => 
                        selectedSolutions.includes(sl.solutionId)
                      );
                      
                      return (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Linha de Serviço (Opcional)</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              if (value === "all") {
                                field.onChange([]);
                              } else {
                                const serviceLineId = parseInt(value);
                                const currentValue = field.value || [];
                                const newValue = currentValue.includes(serviceLineId)
                                  ? currentValue.filter(id => id !== serviceLineId)
                                  : [...currentValue, serviceLineId];
                                field.onChange(newValue);
                              }
                              // Clear services when service line changes
                              form.setValue("serviceIds", []);
                            }}
                            value=""
                          >
                            <FormControl>
                              <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                                <SelectValue placeholder={
                                  !field.value || field.value.length === 0 
                                    ? "Todas as linhas de serviço" 
                                    : `${field.value.length} linha(s) selecionada(s)`
                                } />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">Todas as linhas de serviço</SelectItem>
                              {availableServiceLines.map((serviceLine: any) => {
                                const isSelected = field.value?.includes(serviceLine.id) || false;
                                const parentSolution = solutions.find((s: any) => s.id === serviceLine.solutionId);
                                return (
                                  <SelectItem key={serviceLine.id} value={serviceLine.id.toString()}>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={isSelected}
                                        onChange={() => {}} // Handled by parent onValueChange
                                      />
                                      <span>{serviceLine.name} ({parentSolution?.name})</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          {field.value && field.value.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Selecionadas: {field.value.map((id: number) => 
                                serviceLines.find((sl: any) => sl.id === id)?.name
                              ).filter(Boolean).join(", ")}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}

                {/* Service Selection - Only show if specific service lines are selected */}
                {form.watch("serviceLineIds") && form.watch("serviceLineIds").length > 0 && (
                  <FormField
                    control={form.control}
                    name="serviceIds"
                    render={({ field }) => {
                      const selectedServiceLines = form.watch("serviceLineIds") || [];
                      const availableServices = services.filter((s: any) => 
                        selectedServiceLines.includes(s.serviceLineId)
                      );
                      
                      return (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Serviço (Opcional)</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              if (value === "all") {
                                field.onChange([]);
                              } else {
                                const serviceId = parseInt(value);
                                const currentValue = field.value || [];
                                const newValue = currentValue.includes(serviceId)
                                  ? currentValue.filter(id => id !== serviceId)
                                  : [...currentValue, serviceId];
                                field.onChange(newValue);
                              }
                            }}
                            value=""
                          >
                            <FormControl>
                              <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                                <SelectValue placeholder={
                                  !field.value || field.value.length === 0 
                                    ? "Todos os serviços" 
                                    : `${field.value.length} serviço(s) selecionado(s)`
                                } />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">Todos os serviços</SelectItem>
                              {availableServices.map((service: any) => {
                                const isSelected = field.value?.includes(service.id) || false;
                                const parentServiceLine = serviceLines.find((sl: any) => sl.id === service.serviceLineId);
                                return (
                                  <SelectItem key={service.id} value={service.id.toString()}>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={isSelected}
                                        onChange={() => {}} // Handled by parent onValueChange
                                      />
                                      <span>{service.name} ({parentServiceLine?.name})</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          {field.value && field.value.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Selecionados: {field.value.map((id: number) => 
                                services.find((s: any) => s.id === id)?.name
                              ).filter(Boolean).join(", ")}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}

                <DialogFooter className="pt-4">
                  <Button 
                    type="submit" 
                    disabled={createUserMutation.isPending || updateUserMutation.isPending}
                    className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base"
                  >
                    {(createUserMutation.isPending || updateUserMutation.isPending) ? "Salvando..." : 
                     editingUser ? "Atualizar" : "Criar Usuário"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="h-5 w-5" />
            Usuários do Sistema
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {currentUser?.role === "admin" 
              ? "Como administrador, você pode gerenciar todos os usuários"
              : "Como gestor, você pode criar e gerenciar usuários operacionais"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Região</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aprovação</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: User) => {
                const userRegion = regions.find(r => r.id === user.regionId);
                const userSubRegion = subRegions.find(sr => sr.id === user.subRegionId);
                
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role === "admin" ? "Administrador" :
                         user.role === "gestor" ? "Gestor" : "Operacional"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.regionIds && user.regionIds.length > 0 ? (
                        <div className="text-sm">
                          <div className="font-medium">
                            {user.regionIds.map(regionId => 
                              regions.find(r => r.id === regionId)?.name
                            ).filter(Boolean).join(", ")}
                          </div>
                          {user.subRegionIds && user.subRegionIds.length > 0 ? (
                            <div className="text-muted-foreground">
                              {user.subRegionIds.map(subRegionId => 
                                subRegions.find(sr => sr.id === subRegionId)?.name
                              ).filter(Boolean).join(", ")}
                            </div>
                          ) : (
                            <div className="text-muted-foreground italic">Todas as sub-regiões</div>
                          )}
                        </div>
                      ) : userRegion ? (
                        <div className="text-sm">
                          <div>{userRegion.name}</div>
                          {userSubRegion && (
                            <div className="text-muted-foreground">{userSubRegion.name}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm">
                          <div className="font-medium text-muted-foreground italic">Todas as regiões</div>
                          <div className="text-muted-foreground italic">Todas as sub-regiões</div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? "default" : "secondary"}>
                        {user.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.approved ? "default" : "destructive"}>
                        {user.approved ? "Aprovado" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {canManageUser(user) && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleUserStatus(user.id, user.active)}
                            >
                              {user.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            {user.id !== currentUser?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Aprovar Usuário</DialogTitle>
            <DialogDescription>
              Ao aprovar, o usuário será vinculado à sua região ({currentUser?.regionId ? regions.find(r => r.id === currentUser.regionId)?.name : 'N/A'}).
              Você pode opcionalmente definir uma sub-região específica.
            </DialogDescription>
          </DialogHeader>
          
          {userToApprove && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Usuário:</div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="font-medium">{userToApprove.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {userToApprove.email} • {userToApprove.username}
                  </div>
                  <Badge variant={getRoleBadgeVariant(userToApprove.role)} className="mt-1">
                    {userToApprove.role}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sub-região (opcional)</label>
                <Select 
                  value={selectedSubRegionForApproval} 
                  onValueChange={setSelectedSubRegionForApproval}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Herdar sub-região do gestor ou escolher específica" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">
                      Herdar sub-região do gestor ({currentUser?.subRegionId ? subRegions.find(sr => sr.id === currentUser.subRegionId)?.name : 'Nenhuma'})
                    </SelectItem>
                    {currentUser?.regionId && getFilteredSubRegions(currentUser.regionId.toString()).map((subRegion) => (
                      <SelectItem key={subRegion.id} value={subRegion.id.toString()}>
                        {subRegion.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">
                  O usuário será vinculado à região {currentUser?.regionId ? regions.find(r => r.id === currentUser.regionId)?.name : 'N/A'}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmApproval}
              disabled={approveUserMutation.isPending}
            >
              {approveUserMutation.isPending ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              ) : (
                <Shield className="mr-2 h-4 w-4" />
              )}
              Aprovar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}