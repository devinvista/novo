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
import { Loader2, Target, TrendingUp, Users, ClipboardCheck } from "lucide-react";
import logoImage from "@assets/ChatGPT Image 31 de jul. de 2025, 14_21_03_1753982548631.png";

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

  const { data: managers } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ["/api/managers/public"],
    queryFn: async () => {
      const response = await fetch("/api/managers/public");
      if (!response.ok) return [];
      return response.json();
    },
    enabled: true,
  });

  useEffect(() => {
    if (user) setLocation("/");
  }, [user, setLocation]);

  if (user) return null;

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

  const features = [
    { icon: TrendingUp, title: "Progresso Visual", desc: "Acompanhe em tempo real" },
    { icon: Users, title: "Colaboração", desc: "Trabalhe em equipe" },
    { icon: Target, title: "Objetivos", desc: "Metas estratégicas claras" },
    { icon: ClipboardCheck, title: "Check-ins", desc: "Acompanhamento periódico" },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left — Forms */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <img
                src={logoImage}
                alt="OKRs"
                fetchPriority="high"
                className="h-16 w-auto object-contain"
              />
            </div>
            <p className="text-gray-500 text-sm mt-3">Sistema de Gestão de Objetivos</p>
          </div>

          <Tabs defaultValue="login" className="space-y-4" aria-label="Autenticação">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">Entrar</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle>Fazer Login</CardTitle>
                  <CardDescription>Acesse sua conta para gerenciar seus objetivos</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="login-username">Usuário</Label>
                      <Input
                        id="login-username"
                        type="text"
                        autoComplete="username"
                        spellCheck={false}
                        autoCapitalize="none"
                        value={loginForm.username}
                        onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                        required
                        className="h-11"
                        placeholder="Digite seu usuário"
                        data-testid="input-username"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="login-password">Senha</Label>
                      <Input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        required
                        className="h-11"
                        placeholder="Digite sua senha"
                        data-testid="input-password"
                      />
                    </div>
                    {loginMutation.isError && (
                      <Alert variant="destructive" role="alert">
                        <AlertDescription>
                          Credenciais inválidas. Verifique seu usuário e senha.
                        </AlertDescription>
                      </Alert>
                    )}
                    <Button
                      type="submit"
                      className="w-full h-11"
                      disabled={loginMutation.isPending}
                      data-testid="button-login"
                    >
                      {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {loginMutation.isPending ? "Entrando…" : "Entrar"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle>Criar Conta</CardTitle>
                  <CardDescription>Registre-se para começar a usar o sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="register-name">Nome Completo</Label>
                      <Input
                        id="register-name"
                        type="text"
                        autoComplete="name"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                        required
                        className="h-11"
                        placeholder="Seu nome completo"
                        data-testid="input-name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="register-email">E-mail</Label>
                      <Input
                        id="register-email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        spellCheck={false}
                        autoCapitalize="none"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        required
                        className="h-11"
                        placeholder="seu@email.com"
                        data-testid="input-email"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="register-username">Usuário</Label>
                      <Input
                        id="register-username"
                        type="text"
                        autoComplete="username"
                        spellCheck={false}
                        autoCapitalize="none"
                        value={registerForm.username}
                        onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                        required
                        className="h-11"
                        placeholder="Nome de usuário único"
                        data-testid="input-register-username"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="register-password">Senha</Label>
                      <Input
                        id="register-password"
                        type="password"
                        autoComplete="new-password"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        required
                        className="h-11"
                        placeholder="Crie uma senha segura"
                        data-testid="input-register-password"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="register-manager">Gestor Responsável</Label>
                      <Select
                        value={registerForm.gestorId}
                        onValueChange={(value) => setRegisterForm({ ...registerForm, gestorId: value })}
                      >
                        <SelectTrigger id="register-manager" className="h-11" data-testid="select-manager">
                          <SelectValue placeholder="Selecione seu gestor" />
                        </SelectTrigger>
                        <SelectContent>
                          {managers && managers.length > 0 ? (
                            managers.map((manager: any) => (
                              <SelectItem key={manager.id} value={manager.id.toString()}>
                                {manager.name}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              Nenhum gestor disponível
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    {registerMutation.isError && (
                      <Alert variant="destructive" role="alert">
                        <AlertDescription>
                          Erro ao criar conta. Verifique os dados e tente novamente.
                        </AlertDescription>
                      </Alert>
                    )}
                    {registerMutation.isSuccess && (
                      <Alert role="status">
                        <AlertDescription>
                          Cadastro realizado! Aguarde a aprovação do seu gestor para acessar.
                        </AlertDescription>
                      </Alert>
                    )}
                    <Button
                      type="submit"
                      className="w-full h-11"
                      disabled={registerMutation.isPending}
                      data-testid="button-register"
                    >
                      {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {registerMutation.isPending ? "Cadastrando…" : "Criar Conta"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Mobile features */}
          <div className="lg:hidden mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              {features.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="text-center">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">{title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right — Hero */}
      <div className="hidden lg:flex flex-1 bg-primary text-white p-8 items-center justify-center">
        <div className="max-w-md text-center space-y-8">
          <div>
            <h2 className="text-4xl font-bold mb-4">
              Gerencie seus OKRs de forma eficiente
            </h2>
            <p className="text-blue-100 text-lg">
              Sistema completo para definir, acompanhar e alcançar seus objetivos e resultados-chave.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-sm text-blue-100">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
