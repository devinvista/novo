import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, User, Users as UsersIcon } from "lucide-react";

export default function Users() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header 
            title="Usuários" 
            description="Gerenciamento de usuários do sistema"
          />
          
          <div className="flex-1 flex items-center justify-center p-6">
            <Alert className="max-w-md">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Acesso restrito. Apenas administradores podem visualizar esta página.
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Usuários" 
          description="Gerenciamento de usuários do sistema"
        />
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UsersIcon className="h-5 w-5" />
                  <span>Níveis de Acesso</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="h-4 w-4 text-red-600" />
                      <h3 className="font-semibold">Administrador</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Acesso completo ao sistema, incluindo gerenciamento de usuários, 
                      configurações e visualização de todos os dados organizacionais.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <h3 className="font-semibold">Gestor</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pode criar e gerenciar objetivos, resultados-chave e ações. 
                      Visualiza dados da sua região/sub-região.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="h-4 w-4 text-green-600" />
                      <h3 className="font-semibold">Operacional</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Acesso limitado para atualização de checkpoints e ações 
                      relacionadas aos seus resultados-chave.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Funcionalidades Planejadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>• Listagem completa de usuários do sistema</p>
                  <p>• Criação e edição de perfis de usuário</p>
                  <p>• Atribuição de regiões e sub-regiões</p>
                  <p>• Gerenciamento de níveis de acesso</p>
                  <p>• Ativação/desativação de contas</p>
                  <p>• Logs de atividade por usuário</p>
                  <p>• Reset de senhas</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
