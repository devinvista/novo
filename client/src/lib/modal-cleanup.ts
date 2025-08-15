/**
 * Comprehensive modal cleanup utilities for Radix UI dialog issues
 * Prevents modals from blocking interface after closing
 */

export function forceModalCleanup() {
  console.log('🧹 Executando limpeza forçada de modais...');
  
  try {
    // 1. Safely remove dialog-related overlays - only orphaned ones
    const orphanedOverlays = document.querySelectorAll('[data-radix-dialog-overlay]');
    orphanedOverlays.forEach(overlay => {
      try {
        // Only remove if no open dialog is found AND it's actually orphaned
        const hasOpenDialog = overlay.closest('[data-state="open"]') || 
                             overlay.querySelector('[data-state="open"]') ||
                             document.querySelector('[data-state="open"]');
        
        if (!hasOpenDialog && overlay.parentNode && overlay.isConnected) {
          overlay.remove();
        }
      } catch (error) {
        // Ignore removal errors
      }
    });
    
    // 2. Remove closed dialog elements that are stuck
    const closedElements = document.querySelectorAll('[data-state="closed"]');
    closedElements.forEach(el => {
      try {
        if (el.parentNode && el.isConnected) {
          // Check if it's actually a modal/dialog element
          const isModal = el.hasAttribute('data-radix-dialog-content') ||
                         el.hasAttribute('data-radix-dialog-overlay') ||
                         el.hasAttribute('data-radix-dialog-portal');
          
          if (isModal) {
            el.remove();
          }
        }
      } catch (error) {
        // Ignore removal errors
      }
    });
    
    // 3. Reset document and body styles that may be blocking interactions
    const resetStyles = () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.style.pointerEvents = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.pointerEvents = '';
    };
    
    resetStyles();
    
    // 4. Remove any modal-related classes from body
    try {
      const bodyClasses = document.body.className.split(' ');
      const filteredClasses = bodyClasses.filter(cls => 
        !cls.includes('modal') && 
        !cls.includes('dialog') && 
        !cls.includes('overlay') &&
        !cls.includes('scroll-locked') &&
        !cls.includes('no-scroll')
      );
      document.body.className = filteredClasses.join(' ');
    } catch (error) {
      // Ignore class manipulation errors
    }
    
    // 5. Final check for click-blocking elements (more conservative)
    setTimeout(() => {
      try {
        resetStyles();
        
        // Only target very specific problematic elements
        const suspiciousElements = document.querySelectorAll('div[style*="position: fixed"][style*="z-index"]');
        suspiciousElements.forEach(el => {
          try {
            const style = window.getComputedStyle(el);
            const zIndex = parseInt(style.zIndex) || 0;
            const rect = el.getBoundingClientRect();
            
            // Very specific criteria for removal
            if (style.position === 'fixed' && 
                zIndex >= 50 && 
                rect.width >= window.innerWidth - 50 && 
                rect.height >= window.innerHeight - 50 &&
                el.parentNode && 
                el.isConnected &&
                !el.closest('[data-state="open"]') &&
                !el.querySelector('[data-state="open"]') &&
                !el.querySelector('main, nav, header, footer') &&
                el.tagName !== 'HTML' &&
                el.tagName !== 'BODY' &&
                el.id !== 'root') {
              
              console.log('🎯 Removendo elemento bloqueador específico:', el.className);
              el.remove();
            }
          } catch (error) {
            // Ignore individual element errors
          }
        });
      } catch (error) {
        // Ignore timeout errors
      }
    }, 100);
    
  } catch (error) {
    console.error('❌ Erro durante limpeza de modais:', error);
  }
  
  console.log('✅ Limpeza de modais concluída');
}

/**
 * Global cleanup function to be called when dialogs close
 */
export function cleanupOnDialogClose() {
  // Immediate cleanup
  forceModalCleanup();
  
  // Additional cleanup after animations complete
  setTimeout(() => {
    forceModalCleanup();
  }, 300);
  
  // Final aggressive cleanup if needed
  setTimeout(() => {
    forceModalCleanup();
  }, 500);
}

/**
 * Hook into window to provide global cleanup access
 */
if (typeof window !== 'undefined') {
  (window as any).forceModalCleanup = forceModalCleanup;
}