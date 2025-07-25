import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Target, TrendingUp, Users, Activity } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    gestorId: "",
  });

  // Load managers for registration
  const { data: managers } = useQuery({
    queryKey: ["/api/managers"],
  });

  // Use effect to redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  if (user) {
    return null;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = {
      ...registerForm,
      gestorId: registerForm.gestorId ? parseInt(registerForm.gestorId) : undefined,
    };
    registerMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Forms */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-lg flex items-center justify-center">
                <Target className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">OKR Saúde</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">Sistema de Gestão de Objetivos</p>
          </div>

          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" className="text-sm sm:text-base">Entrar</TabsTrigger>
              <TabsTrigger value="register" className="text-sm sm:text-base">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg sm:text-xl">Fazer Login</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Acesse sua conta para gerenciar seus objetivos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="login-username" className="text-sm sm:text-base">Usuário</Label>
                      <Input
                        id="login-username"
                        type="text"
                        value={loginForm.username}
                        onChange={(e) =>
                          setLoginForm({ ...loginForm, username: e.target.value })
                        }
                        required
                        className="h-11 sm:h-12 text-sm sm:text-base"
                        placeholder="Digite seu usuário"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm sm:text-base">Senha</Label>
                      <Input
                        id="login-password"
                        type="password"
                        value={loginForm.password}
                        onChange={(e) =>
                          setLoginForm({ ...loginForm, password: e.target.value })
                        }
                        required
                        className="h-11 sm:h-12 text-sm sm:text-base"
                        placeholder="Digite sua senha"
                      />
                    </div>
                    {loginMutation.isError && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          Credenciais inválidas. Verifique seu usuário e senha.
                        </AlertDescription>
                      </Alert>
                    )}
                    <Button
                      type="submit"
                      className="w-full h-11 sm:h-12 text-sm sm:text-base"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Entrar
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg sm:text-xl">Criar Conta</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Registre-se para começar a usar o sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4 sm:space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="register-name" className="text-sm sm:text-base">Nome Completo</Label>
                      <Input
                        id="register-name"
                        type="text"
                        value={registerForm.name}
                        onChange={(e) =>
                          setRegisterForm({ ...registerForm, name: e.target.value })
                        }
                        required
                        className="h-11 sm:h-12 text-sm sm:text-base"
                        placeholder="Digite seu nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="text-sm sm:text-base">E-mail</Label>
                      <Input
                        id="register-email"
                        type="email"
                        value={registerForm.email}
                        onChange={(e) =>
                          setRegisterForm({ ...registerForm, email: e.target.value })
                        }
                        required
                        className="h-11 sm:h-12 text-sm sm:text-base"
                        placeholder="Digite seu e-mail"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-username" className="text-sm sm:text-base">Usuário</Label>
                      <Input
                        id="register-username"
                        type="text"
                        value={registerForm.username}
                        onChange={(e) =>
                          setRegisterForm({ ...registerForm, username: e.target.value })
                        }
                        required
                        className="h-11 sm:h-12 text-sm sm:text-base"
                        placeholder="Escolha um nome de usuário"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="text-sm sm:text-base">Senha</Label>
                      <Input
                        id="register-password"
                        type="password"
                        value={registerForm.password}
                        onChange={(e) =>
                          setRegisterForm({ ...registerForm, password: e.target.value })
                        }
                        required
                        className="h-11 sm:h-12 text-sm sm:text-base"
                        placeholder="Crie uma senha segura"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-manager" className="text-sm sm:text-base">Gestor Responsável</Label>
                      <Select
                        value={registerForm.gestorId}
                        onValueChange={(value) =>
                          setRegisterForm({ ...registerForm, gestorId: value })
                        }
                      >
                        <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base">
                          <SelectValue placeholder="Selecione seu gestor" />
                        </SelectTrigger>
                        <SelectContent>
                          {managers?.map((manager: any) => (
                            <SelectItem key={manager.id} value={manager.id.toString()}>
                              {manager.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {registerMutation.isError && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          Erro ao criar conta. Verifique os dados e tente novamente.
                        </AlertDescription>
                      </Alert>
                    )}
                    <Button
                      type="submit"
                      className="w-full h-11 sm:h-12 text-sm sm:text-base"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Criar Conta
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Mobile Features Section */}
          <div className="lg:hidden mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1 text-sm">Progresso Visual</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Acompanhe em tempo real
                </p>
              </div>

              <div className="text-center">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1 text-sm">Colaboração</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Trabalhe em equipe
                </p>
              </div>

              <div className="text-center">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1 text-sm">Indicadores</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Métricas estratégicas
                </p>
              </div>

              <div className="text-center">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1 text-sm">Checkpoints</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Acompanhamento periódico
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Hero */}
      <div className="hidden lg:flex flex-1 bg-primary text-white p-6 lg:p-8 items-center justify-center">
        <div className="max-w-md text-center space-y-6 lg:space-y-8">
          <div>
            <h2 className="text-2xl lg:text-4xl font-bold mb-4">
              Gerencie seus OKRs de forma eficiente
            </h2>
            <p className="text-blue-100 text-base lg:text-lg">
              Sistema completo para definir, acompanhar e alcançar seus objetivos e resultados-chave na área da saúde.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:gap-6">
            <div className="text-center">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6" />
              </div>
              <h3 className="font-semibold mb-1 text-sm lg:text-base">Progresso Visual</h3>
              <p className="text-xs lg:text-sm text-blue-100">
                Acompanhe o progresso em tempo real
              </p>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Users className="h-5 w-5 lg:h-6 lg:w-6" />
              </div>
              <h3 className="font-semibold mb-1 text-sm lg:text-base">Colaboração</h3>
              <p className="text-xs lg:text-sm text-blue-100">
                Trabalhe em equipe de forma integrada
              </p>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Activity className="h-5 w-5 lg:h-6 lg:w-6" />
              </div>
              <h3 className="font-semibold mb-1 text-sm lg:text-base">Indicadores</h3>
              <p className="text-xs lg:text-sm text-blue-100">
                Métricas estratégicas da saúde
              </p>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Target className="h-5 w-5 lg:h-6 lg:w-6" />
              </div>
              <h3 className="font-semibold mb-1 text-sm lg:text-base">Checkpoints</h3>
              <p className="text-xs lg:text-sm text-blue-100">
                Acompanhamento periódico automático
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
