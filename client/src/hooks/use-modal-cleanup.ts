import { useEffect } from 'react';

/**
 * Hook para limpeza forçada de overlays modais que ficam "presos" na DOM
 * após fechamento de diálogos do Radix UI
 */
export function useModalCleanup(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) {
      // Limpeza imediata + aguarda animações
      const immediateCleanup = () => {
        try {
          // Remove TODOS os overlays de diálogo com verificação segura
          const allOverlays = document.querySelectorAll('[data-radix-dialog-overlay]');
          allOverlays.forEach(overlay => {
            if (overlay.parentNode) {
              overlay.remove();
            }
          });
          
          // Remove TODOS os portals de diálogo com verificação segura
          const allPortals = document.querySelectorAll('[data-radix-dialog-portal]');
          allPortals.forEach(portal => {
            if (portal.parentNode) {
              portal.remove();
            }
          });
          
          // Remove elementos com position fixed e z-index alto
          const allElements = document.querySelectorAll('*');
          allElements.forEach(element => {
            try {
              const style = window.getComputedStyle(element);
              const zIndex = parseInt(style.zIndex) || 0;
              const position = style.position;
              
              if (position === 'fixed' && zIndex >= 50 && element.parentNode) {
                const rect = element.getBoundingClientRect();
                // Se cobre toda a tela, provavelmente é um overlay órfão
                if (rect.width >= window.innerWidth - 50 && rect.height >= window.innerHeight - 50) {
                  element.remove();
                }
              }
            } catch (error) {
              // Ignora erros de elementos já removidos
            }
          });
        } catch (error) {
          console.log('⚠️ Erro na limpeza imediata:', error);
        }
        
        // Remove atributos que podem estar bloqueando
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        document.documentElement.style.overflow = '';
        
        // Remove classes que podem estar afetando o pointer-events
        const bodyClasses = document.body.className.split(' ');
        const filteredClasses = bodyClasses.filter(cls => 
          !cls.includes('modal') && !cls.includes('dialog') && !cls.includes('overlay')
        );
        document.body.className = filteredClasses.join(' ');
        
        console.log('🧹 Limpeza agressiva de modais executada');
      };
      
      // Executa imediatamente
      immediateCleanup();
      
      // Executa a limpeza mais robusta após um delay
      const delayedCleanup = setTimeout(() => {
        immediateCleanup();
      }, 100);
      
      return () => clearTimeout(delayedCleanup);
    }
  }, [isOpen]);
}