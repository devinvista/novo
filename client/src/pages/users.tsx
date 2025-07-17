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

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: "admin" | "gestor" | "operacional";
  regionId?: number;
  subRegionId?: number;
  active: boolean;
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
  regionId: z.string().optional(),
  subRegionId: z.string().optional(),
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

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      name: "",
      email: "",
      password: "",
      role: "operacional",
      regionId: "all",
      subRegionId: "all",
    },
  });

  // Queries
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: regions = [] } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: subRegions = [] } = useQuery<SubRegion[]>({
    queryKey: ["/api/sub-regions"],
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: (userData: UserFormData) => 
      apiRequest("/api/users", "POST", userData),
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
      apiRequest(`/api/users/${id}`, "PATCH", userData),
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
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar usuário",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/users/${id}`, "DELETE"),
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
      apiRequest(`/api/users/${id}/status`, "PATCH", { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Status alterado",
        description: "Status do usuário alterado com sucesso!",
      });
    },
  });

  const handleCreateUser = (data: UserFormData) => {
    // Validation for new users - password is required
    if (!editingUser && (!data.password || data.password.length === 0)) {
      form.setError("password", { message: "Senha é obrigatória para novos usuários" });
      return;
    }

    const userData = {
      ...data,
      regionId: data.regionId && data.regionId !== "all" ? parseInt(data.regionId) : undefined,
      subRegionId: data.subRegionId && data.subRegionId !== "all" ? parseInt(data.subRegionId) : undefined,
    };
    
    if (editingUser) {
      updateUserMutation.mutate({ ...userData, id: editingUser.id });
    } else {
      createUserMutation.mutate(userData);
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
      regionId: user.regionId?.toString() || "all",
      subRegionId: user.subRegionId?.toString() || "all",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteUser = (id: number) => {
    if (confirm("Tem certeza que deseja remover este usuário?")) {
      deleteUserMutation.mutate(id);
    }
  };

  const toggleUserStatus = (id: number, active: boolean) => {
    toggleUserStatusMutation.mutate({ id, active: !active });
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
                  name="regionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Região (Opcional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                            <SelectValue placeholder="Selecione uma região" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Todas as regiões</SelectItem>
                          {regions.map((region) => (
                            <SelectItem key={region.id} value={region.id.toString()}>
                              {region.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch("regionId") && (
                  <FormField
                    control={form.control}
                    name="subRegionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base">Sub-região (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                              <SelectValue placeholder="Selecione uma sub-região" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">Todas as sub-regiões</SelectItem>
                            {getFilteredSubRegions(form.watch("regionId")).map((subRegion) => (
                              <SelectItem key={subRegion.id} value={subRegion.id.toString()}>
                                {subRegion.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
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
                      {userRegion ? (
                        <div className="text-sm">
                          <div>{userRegion.name}</div>
                          {userSubRegion && (
                            <div className="text-muted-foreground">{userSubRegion.name}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Todas</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? "default" : "secondary"}>
                        {user.active ? "Ativo" : "Inativo"}
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
    </div>
  );
}