import { useQueryClient } from "@tanstack/react-query"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ForceRefresh() {
  const queryClient = useQueryClient()

  const handleForceRefresh = () => {
    // Clear all query cache
    queryClient.clear()
    
    // Add console log for debugging
    console.log("🔄 Force refresh executed - all cache cleared")
    
    // Reload the page to ensure fresh data
    window.location.reload()
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleForceRefresh}
      className="flex items-center gap-2"
      title="Atualizar dados"
    >
      <RotateCcw className="h-4 w-4" />
      <span className="hidden sm:inline">Atualizar</span>
    </Button>
  )
}