import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ActionForm from "@/components/action-form";
import ActionTimeline from "@/components/action-timeline";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Actions() {
  const [showForm, setShowForm] = useState(false);
  const [keyResultFilter, setKeyResultFilter] = useState<string>("");

  const { data: keyResults } = useQuery({
    queryKey: ["/api/key-results"],
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Ações" 
          description="Acompanhe e gerencie as ações dos resultados-chave"
          action={
            <div className="flex gap-4 items-center">
              <Select value={keyResultFilter} onValueChange={setKeyResultFilter}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Filtrar por resultado-chave" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">Todos os resultados</SelectItem>
                  {keyResults?.map((kr: any) => (
                    <SelectItem key={kr.id} value={kr.id.toString()}>
                      {kr.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Ação
              </Button>
            </div>
          }
        />
        
        <div className="flex-1 overflow-y-auto p-6">
          <Card className="p-6">
            <ActionTimeline 
              keyResultId={keyResultFilter ? parseInt(keyResultFilter) : undefined} 
              showAll={true} 
            />
          </Card>
        </div>
      </main>

      <ActionForm
        action={null}
        onSuccess={() => setShowForm(false)}
        open={showForm}
        onOpenChange={setShowForm}
      />
    </div>
  );
}