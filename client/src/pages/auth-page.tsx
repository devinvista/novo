import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
    role: "operacional" as const,
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
    registerMutation.mutate(registerForm);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">OKR Saúde</h1>
            <p className="text-gray-600 mt-2">Sistema de Gestão de Objetivos</p>
          </div>

          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Registrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Fazer Login</CardTitle>
                  <CardDescription>
                    Acesse sua conta para gerenciar seus objetivos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-username">Usuário</Label>
                      <Input
                        id="login-username"
                        type="text"
                        value={loginForm.username}
                        onChange={(e) =>
                          setLoginForm({ ...loginForm, username: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="login-password">Senha</Label>
                      <Input
                        id="login-password"
                        type="password"
                        value={loginForm.password}
                        onChange={(e) =>
                          setLoginForm({ ...loginForm, password: e.target.value })
                        }
                        required
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
                      className="w-full"
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
                <CardHeader>
                  <CardTitle>Criar Conta</CardTitle>
                  <CardDescription>
                    Registre-se para começar a usar o sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Label htmlFor="register-name">Nome Completo</Label>
                      <Input
                        id="register-name"
                        type="text"
                        value={registerForm.name}
                        onChange={(e) =>
                          setRegisterForm({ ...registerForm, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-email">E-mail</Label>
                      <Input
                        id="register-email"
                        type="email"
                        value={registerForm.email}
                        onChange={(e) =>
                          setRegisterForm({ ...registerForm, email: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-username">Usuário</Label>
                      <Input
                        id="register-username"
                        type="text"
                        value={registerForm.username}
                        onChange={(e) =>
                          setRegisterForm({ ...registerForm, username: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-password">Senha</Label>
                      <Input
                        id="register-password"
                        type="password"
                        value={registerForm.password}
                        onChange={(e) =>
                          setRegisterForm({ ...registerForm, password: e.target.value })
                        }
                        required
                      />
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
                      className="w-full"
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
        </div>
      </div>

      {/* Right side - Hero */}
      <div className="flex-1 bg-primary text-white p-8 flex items-center justify-center">
        <div className="max-w-md text-center space-y-8">
          <div>
            <h2 className="text-4xl font-bold mb-4">
              Gerencie seus OKRs de forma eficiente
            </h2>
            <p className="text-blue-100 text-lg">
              Sistema completo para definir, acompanhar e alcançar seus objetivos e resultados-chave na área da saúde.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-1">Progresso Visual</h3>
              <p className="text-sm text-blue-100">
                Acompanhe o progresso em tempo real
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-1">Colaboração</h3>
              <p className="text-sm text-blue-100">
                Trabalhe em equipe de forma integrada
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-1">Indicadores</h3>
              <p className="text-sm text-blue-100">
                Métricas estratégicas da saúde
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-1">Checkpoints</h3>
              <p className="text-sm text-blue-100">
                Acompanhamento periódico automático
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
