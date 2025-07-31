import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function ForceRefresh() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // Force invalidate all key results queries
    queryClient.invalidateQueries({ queryKey: ["/api/key-results"] });
    queryClient.invalidateQueries({ queryKey: ["/api/checkpoints"] });
    
    // Force refetch all active queries
    queryClient.refetchQueries({ type: "active" });
  }, [queryClient]);
  
  return null;
}