import { useState } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Card } from "@/components/ui/card";
import CheckpointUpdater from "@/components/checkpoint-updater";

export default function Checkpoints() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Checkpoints" 
          description="Atualize e acompanhe o progresso dos resultados-chave"
        />
        
        <div className="flex-1 overflow-y-auto p-6">
          <Card className="p-6">
            <CheckpointUpdater />
          </Card>
        </div>
      </main>
    </div>
  );
}