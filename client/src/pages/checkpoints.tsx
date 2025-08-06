import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import CompactHeader from "@/components/compact-header";
import SimpleCheckpoints from "@/components/simple-checkpoints";

export default function Checkpoints() {
  const [selectedKeyResultId, setSelectedKeyResultId] = useState<number | undefined>(undefined);
  const [location] = useLocation();

  // Read kr parameter from URL and set filter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const krParam = urlParams.get('kr');
    if (krParam) {
      setSelectedKeyResultId(parseInt(krParam));
    }
  }, [location]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <CompactHeader showFilters={false} />
        
        <div className="flex-1 overflow-y-auto p-6 pt-16">
          <SimpleCheckpoints keyResultId={selectedKeyResultId} />
        </div>
      </main>
    </div>
  );
}