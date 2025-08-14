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
import CompactHeader from "@/components/compact-header";

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
  username: z.string().min(3, "Usuário deve ter pelo menos 3 caracteres"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail deve ser válido"),
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
  const [selectedRegionsForApproval, setSelectedRegionsForApproval] = useState<number[]>([]);
  const [selectedSubRegionsForApproval, setSelectedSubRegionsForApproval] = useState<number[]>([]);
  const [selectedSolutionsForApproval, setSelectedSolutionsForApproval] = useState<number[]>([]);
  const [selectedServiceLinesForApproval, setSelectedServiceLinesForApproval] = useState<number[]>([]);
  const [selectedServicesForApproval, setSelectedServicesForApproval] = useState<number[]>([]);

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
  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: pendingUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/pending-users"],
  });

  const { data: regions = [] } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: subRegions = [] } = useQuery<SubRegion[]>({
    queryKey: ["/api/sub-regions"],
  });

  const { data: solutions = [] } = useQuery<any[]>({
    queryKey: ["/api/solutions"],
  });

  const { data: serviceLines = [] } = useQuery<any[]>({
    queryKey: ["/api/service-lines"],
  });

  const { data: services = [] } = useQuery<any[]>({
    queryKey: ["/api/services"],
  });

  // Filter data based on current user permissions
  const availableRegions = currentUser?.role === "admin" 
    ? regions 
    : regions.filter(region => 
        !currentUser?.regionIds || 
        (Array.isArray(currentUser.regionIds) && currentUser.regionIds.length === 0) || 
        (Array.isArray(currentUser.regionIds) && currentUser.regionIds.includes(region.id))
      );

  const availableSubRegions = currentUser?.role === "admin"
    ? subRegions
    : subRegions.filter(subRegion => 
        !currentUser?.subRegionIds ||
        (Array.isArray(currentUser.subRegionIds) && currentUser.subRegionIds.length === 0) ||
        (Array.isArray(currentUser.subRegionIds) && currentUser.subRegionIds.includes(subRegion.id))
      );

  const availableSolutions = currentUser?.role === "admin"
    ? solutions
    : solutions.filter(solution => 
        !currentUser?.solutionIds ||
        (Array.isArray(currentUser.solutionIds) && currentUser.solutionIds.length === 0) ||
        (Array.isArray(currentUser.solutionIds) && currentUser.solutionIds.includes(solution.id))
      );

  const availableServiceLines = currentUser?.role === "admin"
    ? serviceLines
    : serviceLines.filter(serviceLine => 
        !currentUser?.serviceLineIds ||
        (Array.isArray(currentUser.serviceLineIds) && currentUser.serviceLineIds.length === 0) ||
        (Array.isArray(currentUser.serviceLineIds) && currentUser.serviceLineIds.includes(serviceLine.id))
      );

  const availableServices = currentUser?.role === "admin"
    ? services
    : services.filter(service => 
        !currentUser?.serviceIds ||
        (Array.isArray(currentUser.serviceIds) && currentUser.serviceIds.length === 0) ||
        (Array.isArray(currentUser.serviceIds) && currentUser.serviceIds.includes(service.id))
      );

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao criar usuário");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pending-users"] });
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar usuário.",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number; userData: Partial<UserFormData> }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao atualizar usuário");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso.",
      });
      setIsDialogOpen(false);
      setEditingUser(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar usuário.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao deletar usuário");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Sucesso",
        description: "Usuário deletado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao deletar usuário.",
        variant: "destructive",
      });
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const response = await fetch(`/api/users/${id}/toggle-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao alterar status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Sucesso",
        description: "Status do usuário alterado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar status do usuário.",
        variant: "destructive",
      });
    },
  });

  const approveUserMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      regionIds, 
      subRegionIds, 
      solutionIds, 
      serviceLineIds, 
      serviceIds 
    }: { 
      userId: number;
      regionIds: number[];
      subRegionIds: number[];
      solutionIds: number[];
      serviceLineIds: number[];
      serviceIds: number[];
    }) => {
      const response = await fetch(`/api/users/${userId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regionIds,
          subRegionIds,
          solutionIds,
          serviceLineIds,
          serviceIds,
        }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao aprovar usuário");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pending-users"] });
      toast({
        title: "Sucesso",
        description: "Usuário aprovado com sucesso.",
      });
      setApprovalDialogOpen(false);
      setUserToApprove(null);
      setSelectedRegionsForApproval([]);
      setSelectedSubRegionsForApproval([]);
      setSelectedSolutionsForApproval([]);
      setSelectedServiceLinesForApproval([]);
      setSelectedServicesForApproval([]);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao aprovar usuário.",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "gestor": return "default";
      case "operacional": return "secondary";
      default: return "outline";
    }
  };

  const canCreateRole = (role: string) => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    if (currentUser.role === "gestor" && role === "operacional") return true;
    return false;
  };

  const canManageUser = (user: User) => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    if (currentUser.role === "gestor" && user.role === "operacional") {
      return user.gestorId === currentUser.id;
    }
    return false;
  };

  // Event handlers
  const handleCreateUser = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleUpdateUser = (data: UserFormData) => {
    if (!editingUser) return;
    updateUserMutation.mutate({ id: editingUser.id, userData: data });
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      regionIds: user.regionIds || [],
      subRegionIds: user.subRegionIds || [],
      solutionIds: user.solutionIds || [],
      serviceLineIds: user.serviceLineIds || [],
      serviceIds: user.serviceIds || [],
    });
    setIsDialogOpen(true);
  };

  const handleDeleteUser = (id: number) => {
    if (confirm("Tem certeza que deseja deletar este usuário?")) {
      deleteUserMutation.mutate(id);
    }
  };

  const toggleUserStatus = (user: User) => {
    toggleUserStatusMutation.mutate({ id: user.id, active: !user.active });
  };

  const handleApproveUser = (user: User) => {
    setUserToApprove(user);
    setApprovalDialogOpen(true);
  };

  const confirmApproval = () => {
    if (!userToApprove) return;
    
    approveUserMutation.mutate({
      userId: userToApprove.id,
      regionIds: selectedRegionsForApproval,
      subRegionIds: selectedSubRegionsForApproval,
      solutionIds: selectedSolutionsForApproval,
      serviceLineIds: selectedServiceLinesForApproval,
      serviceIds: selectedServicesForApproval,
    });
  };

  if (loadingUsers) {
    return (
      <div className="flex-1 overflow-y-auto">
        <CompactHeader />
        <div className="p-6">
          <div className="text-center">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
        <CompactHeader />
        <div className="p-4 sm:p-6 pt-16">
          {/* Pending Users Section */}
          {currentUser?.role === "admin" && pendingUsers.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Usuários Pendentes de Aprovação
                </CardTitle>
                <CardDescription>
                  Usuários aguardando aprovação de um administrador
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role}
                          </Badge>
                        </div>
                      </div>
                      <Button onClick={() => handleApproveUser(user)}>
                        Aprovar
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Users Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Gerenciamento de Usuários
                  </CardTitle>
                  <CardDescription>
                    {currentUser?.role === 'admin' 
                      ? "Gerencie todos os usuários do sistema"
                      : currentUser?.role === 'gestor'
                      ? "Gerencie os usuários do seu time"
                      : "Visualize informações dos usuários"
                    }
                  </CardDescription>
                </div>
                {(currentUser?.role === "admin" || currentUser?.role === "gestor") && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEditingUser(null);
                        form.reset({
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
                        });
                      }}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Novo Usuário
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {editingUser ? "Editar Usuário" : "Criar Novo Usuário"}
                        </DialogTitle>
                        <DialogDescription>
                          {editingUser 
                            ? "Edite as informações do usuário"
                            : "Crie um novo usuário no sistema"
                          }
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(editingUser ? handleUpdateUser : handleCreateUser)} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input placeholder="Digite o username" {...field} />
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
                                <FormLabel>Nome Completo</FormLabel>
                                <FormControl>
                                  <Input placeholder="Digite o nome completo" {...field} />
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
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="Digite o email" {...field} />
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
                                <FormLabel>
                                  {editingUser ? "Nova Senha (opcional)" : "Senha"}
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    type="password" 
                                    placeholder={editingUser ? "Deixe vazio para manter a atual" : "Digite a senha"} 
                                    {...field} 
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
                                <FormLabel>Função</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
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
                          <DialogFooter>
                            <Button 
                              type="submit" 
                              disabled={createUserMutation.isPending || updateUserMutation.isPending}
                            >
                              {createUserMutation.isPending || updateUserMutation.isPending 
                                ? "Salvando..." 
                                : editingUser 
                                  ? "Salvar Alterações" 
                                  : "Criar Usuário"
                              }
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Status</TableHead>
                      {(currentUser?.role === "admin" || currentUser?.role === "gestor") && (
                        <TableHead>Ações</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">@{user.username}</div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.active ? "default" : "secondary"}>
                            {user.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        {(currentUser?.role === "admin" || currentUser?.role === "gestor") && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {canManageUser(user) && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditUser(user)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleUserStatus(user)}
                                    disabled={toggleUserStatusMutation.isPending}
                                  >
                                    {user.active ? "Desativar" : "Ativar"}
                                  </Button>
                                </>
                              )}
                              {currentUser?.role === "admin" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.id)}
                                  disabled={deleteUserMutation.isPending}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {currentUser?.role === 'gestor' 
                            ? "Nenhum usuário operacional encontrado em seu time."
                            : "Nenhum usuário encontrado."
                          }
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Approval Dialog */}
          <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Aprovar Usuário</DialogTitle>
                <DialogDescription>
                  Defina as permissões para {userToApprove?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="font-medium mb-2">Usuário: {userToApprove?.name}</p>
                  <Badge variant={getRoleBadgeVariant(userToApprove?.role || "")}>
                    {userToApprove?.role}
                  </Badge>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setApprovalDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={confirmApproval}
                  disabled={approveUserMutation.isPending}
                >
                  {approveUserMutation.isPending ? "Aprovando..." : "Aprovar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      
    </div>
  );
}