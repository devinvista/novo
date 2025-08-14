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
import { Users, UserPlus, Edit, Trash2 } from "lucide-react";
import CompactHeader from "@/components/compact-header";

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: "admin" | "gestor" | "operacional";
  active: boolean;
  approved: boolean;
  gestorId?: number;
  createdAt: string;
}

const userFormSchema = z.object({
  username: z.string().min(3, "Usuário deve ter pelo menos 3 caracteres"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail deve ser válido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["admin", "gestor", "operacional"]),
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      name: "",
      email: "",
      password: "",
      role: "operacional",
    },
  });

  // Queries
  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: pendingUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/pending-users"],
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      return apiRequest("/api/users", {
        method: "POST",
        body: JSON.stringify(userData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pending-users"] });
      setIsCreateModalOpen(false);
      form.reset();
      toast({ title: "Usuário criado com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive"
      });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async (userData: Partial<UserFormData> & { id: number }) => {
      return apiRequest(`/api/users/${userData.id}`, {
        method: "PATCH",
        body: JSON.stringify(userData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditModalOpen(false);
      setEditingUser(null);
      form.reset();
      toast({ title: "Usuário atualizado com sucesso!" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest(`/api/users/${userId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuário excluído com sucesso!" });
    },
  });

  const approveUserMutation = useMutation({
    mutationFn: async (user: User) => {
      return apiRequest(`/api/users/${user.id}/approve`, {
        method: "POST",
        body: JSON.stringify({ approved: true }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pending-users"] });
      toast({ title: "Usuário aprovado com sucesso!" });
    },
  });

  // Event handlers
  const handleCreateUser = async (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleUpdateUser = async (data: UserFormData) => {
    if (!editingUser) return;
    updateUserMutation.mutate({ ...data, id: editingUser.id });
  };

  const handleDeleteUser = (userId: number) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleApproveUser = (user: User) => {
    approveUserMutation.mutate(user);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    });
    setIsEditModalOpen(true);
  };

  // Helper functions
  const canManageUser = (user: User) => {
    if (currentUser?.role === "admin") return true;
    if (currentUser?.role === "gestor" && user.role === "operacional" && user.gestorId === currentUser.id) return true;
    if (currentUser?.role === "operacional" && user.id === currentUser.id) return true;
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

  if (loadingUsers) {
    return <div className="flex items-center justify-center h-64">Carregando usuários...</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <CompactHeader showFilters={false} />
        
        <div className="p-6 border-b bg-white pt-20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h2>
              <p className="text-gray-600">
                {currentUser?.role === 'admin' 
                  ? "Gerencie todos os usuários e seus níveis de acesso no sistema"
                  : currentUser?.role === 'gestor'
                  ? "Gerencie os usuários operacionais de seu time"
                  : "Visualize suas informações de usuário"
                }
              </p>
            </div>
            {(currentUser?.role === "admin" || currentUser?.role === "gestor") && (
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Novo Usuário
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Usuário</DialogTitle>
                    <DialogDescription>
                      {currentUser?.role === "admin" 
                        ? "Crie um novo usuário com qualquer nível de acesso"
                        : "Crie um novo usuário operacional para seu time"
                      }
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleCreateUser)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Usuário</FormLabel>
                            <FormControl>
                              <Input placeholder="Digite o nome de usuário" {...field} />
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
                            <FormLabel>E-mail</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Digite o e-mail" {...field} />
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
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Digite a senha" {...field} />
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
                                  <SelectValue placeholder="Selecione uma função" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {canCreateRole("admin") && <SelectItem value="admin">Administrador</SelectItem>}
                                {canCreateRole("gestor") && <SelectItem value="gestor">Gestor</SelectItem>}
                                {canCreateRole("operacional") && <SelectItem value="operacional">Operacional</SelectItem>}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={createUserMutation.isPending}>
                          {createUserMutation.isPending ? (
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          ) : (
                            <UserPlus className="mr-2 h-4 w-4" />
                          )}
                          Criar Usuário
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

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

          {/* Main Users Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                {currentUser?.role === 'admin' 
                  ? "Todos os Usuários" 
                  : currentUser?.role === 'gestor'
                  ? "Meu Time"
                  : "Meus Dados"
                } ({users.length})
              </CardTitle>
              <CardDescription>
                {currentUser?.role === 'admin' 
                  ? "Visualize e gerencie todos os usuários do sistema"
                  : currentUser?.role === 'gestor'
                  ? "Visualize e gerencie os usuários operacionais de seu time"
                  : "Visualize suas informações pessoais"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Status</TableHead>
                      {(currentUser?.role === "admin" || currentUser?.role === "gestor") && (
                        <TableHead className="text-right">Ações</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: User) => (
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
                            {user.role === 'admin' ? 'Administrador' : 
                             user.role === 'gestor' ? 'Gestor' : 'Operacional'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.active ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Ativo
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                Inativo
                              </Badge>
                            )}
                            {user.approved && (
                              <Badge variant="outline" className="text-blue-600">
                                Aprovado
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        {(currentUser?.role === "admin" || currentUser?.role === "gestor") && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {canManageUser(user) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditUser(user)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
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

          {/* Edit User Dialog */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Editar Usuário</DialogTitle>
                <DialogDescription>
                  Atualize as informações do usuário
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleUpdateUser)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuário</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o nome de usuário" {...field} disabled />
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
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Digite o e-mail" {...field} />
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
                              <SelectValue placeholder="Selecione uma função" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {canCreateRole("admin") && <SelectItem value="admin">Administrador</SelectItem>}
                            {canCreateRole("gestor") && <SelectItem value="gestor">Gestor</SelectItem>}
                            {canCreateRole("operacional") && <SelectItem value="operacional">Operacional</SelectItem>}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={updateUserMutation.isPending}>
                      {updateUserMutation.isPending ? (
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      ) : (
                        <Edit className="mr-2 h-4 w-4" />
                      )}
                      Atualizar Usuário
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

        </div>
      </main>
    </div>
  );
}