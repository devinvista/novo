import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import ModernDashboard from "@/components/modern-dashboard";

export default function Dashboard() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard" 
          description="Visão geral dos objetivos e resultados"
        />
        
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <ModernDashboard />
        </div>
      </main>
    </div>
  );
}
