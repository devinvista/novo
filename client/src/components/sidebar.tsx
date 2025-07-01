import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Target, 
  BarChart3, 
  Goal, 
  Key, 
  CheckSquare, 
  Flag, 
  Activity, 
  Users, 
  Settings, 
  LogOut,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const navigationItems = [
    { href: "/", icon: BarChart3, label: "Dashboard" },
    { href: "/objectives", icon: Goal, label: "Objetivos" },
    { href: "/key-results", icon: Key, label: "Resultados-Chave" },
    { href: "/actions", icon: CheckSquare, label: "Ações" },
    { href: "/checkpoints", icon: Flag, label: "Checkpoints" },
    { href: "/indicators", icon: Activity, label: "Indicadores" },
  ];

  const adminItems = [
    { href: "/users", icon: Users, label: "Usuários" },
    { href: "/settings", icon: Settings, label: "Configurações" },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Administrador";
      case "gestor": return "Gestor";
      case "operacional": return "Operacional";
      default: return role;
    }
  };

  return (
    <aside className="w-64 bg-sidebar-background border-r border-sidebar-border flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Target className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">OKR Saúde</h1>
            <p className="text-xs text-sidebar-foreground/60">Gestão de Objetivos</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center px-4 py-3 rounded-lg font-medium transition-colors ${
                isActive(item.href)
                  ? "text-sidebar-primary bg-sidebar-primary/10"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {user?.role === "admin" && (
          <div className="pt-4 border-t border-sidebar-border mt-4">
            {adminItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg font-medium transition-colors ${
                    isActive(item.href)
                      ? "text-sidebar-primary bg-sidebar-primary/10"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-sm">
              {user ? getUserInitials(user.name) : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.name || "Usuário"}
            </p>
            <p className="text-xs text-sidebar-foreground/60">
              {user ? getRoleLabel(user.role) : "Carregando..."}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
