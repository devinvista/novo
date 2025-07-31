import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function ForceRefresh() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // Clear all cache data first
    queryClient.clear();
    
    // Force invalidate all key results queries
    queryClient.invalidateQueries({ queryKey: ["/api/key-results"] });
    queryClient.invalidateQueries({ queryKey: ["/api/checkpoints"] });
    queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/objectives"] });
    
    // Force refetch all active queries
    queryClient.refetchQueries({ type: "active" });
    
    console.log('🔄 Force refresh executed - all cache cleared');
  }, [queryClient]);
  
  return null;
}