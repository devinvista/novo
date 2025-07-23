import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, CheckCircle, Edit, Trash, Flag } from "lucide-react";

export default function RecentActivities() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["/api/activities"],
    queryFn: async () => {
      const response = await fetch("/api/activities?limit=10");
      if (!response.ok) throw new Error("Erro ao carregar atividades");
      return response.json();
    },
  });

  const getActivityIcon = (action: string) => {
    switch (action) {
      case "created":
        return Plus;
      case "updated":
        return Edit;
      case "deleted":
        return Trash;
      case "completed":
        return CheckCircle;
      default:
        return Flag;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case "created":
        return "bg-blue-100 text-primary";
      case "updated":
        return "bg-orange-100 text-accent";
      case "deleted":
        return "bg-red-100 text-destructive";
      case "completed":
        return "bg-green-100 text-secondary";
      default:
        return "bg-purple-100 text-purple-600";
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours === 0) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes <= 1 ? "agora" : `há ${diffInMinutes} min`;
    }
    
    if (diffInHours < 24) {
      return `há ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `há ${diffInDays} dia${diffInDays > 1 ? 's' : ''}`;
    }
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividades Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {activities?.length > 0 ? (
              activities.map((activity: any) => {
                const Icon = getActivityIcon(activity.action);
                const colorClasses = getActivityColor(activity.action);
                
                return (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClasses}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{activity.user.name}</span>{" "}
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimeAgo(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Flag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma atividade recente
                </p>
              </div>
            )}
          </div>
        )}
        
        {activities?.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <Button variant="ghost" className="w-full text-primary hover:bg-primary/10">
              Ver todas as atividades
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
