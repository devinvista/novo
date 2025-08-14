import { useEffect } from 'react';

/**
 * Hook para limpeza forçada de overlays modais que ficam "presos" na DOM
 * após fechamento de diálogos do Radix UI
 */
export function useModalCleanup(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) {
      // Aguarda um pouco para garantir que as animações terminem
      const cleanup = setTimeout(() => {
        // Remove overlays de diálogo que ficaram presos
        const dialogOverlays = document.querySelectorAll('[data-radix-dialog-overlay]');
        dialogOverlays.forEach(overlay => {
          if (overlay.getAttribute('data-state') === 'closed') {
            overlay.remove();
          }
        });
        
        // Remove portals órfãos
        const portals = document.querySelectorAll('[data-radix-dialog-portal]');
        portals.forEach(portal => {
          if (!portal.querySelector('[data-state="open"]')) {
            portal.remove();
          }
        });
        
        // Remove elementos z-index altos que possam estar bloqueando cliques
        const highZElements = document.querySelectorAll('[style*="z-index"]');
        highZElements.forEach(element => {
          const style = window.getComputedStyle(element);
          const zIndex = parseInt(style.zIndex);
          if (zIndex > 40 && !element.closest('[data-state="open"]')) {
            const rect = element.getBoundingClientRect();
            if (rect.width === window.innerWidth && rect.height === window.innerHeight) {
              element.remove();
            }
          }
        });
        
        // Force document body scroll restoration
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        console.log('🧹 Modal cleanup executado');
      }, 150);
      
      return () => clearTimeout(cleanup);
    }
  }, [isOpen]);
}