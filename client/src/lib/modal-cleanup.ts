/**
 * Comprehensive modal cleanup utilities for Radix UI dialog issues
 * Prevents modals from blocking interface after closing
 */

export function forceModalCleanup() {
  console.log('🧹 Executando limpeza forçada de modais...');
  
  try {
    // 1. Remove all dialog-related overlays and portals
    const overlaySelectors = [
      '[data-radix-dialog-overlay]',
      '[data-radix-dialog-portal]',
      '[data-radix-sheet-overlay]',
      '[data-radix-drawer-overlay]',
      '.fixed.inset-0.z-50', // Common overlay pattern
    ];
    
    overlaySelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el.parentNode && !el.querySelector('[data-state="open"]')) {
          el.remove();
        }
      });
    });
    
    // 2. Remove elements that are closed but still in DOM
    const closedElements = document.querySelectorAll('[data-state="closed"]');
    closedElements.forEach(el => {
      if (el.parentNode) {
        el.remove();
      }
    });
    
    // 3. Remove problematic fixed elements with high z-index
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      try {
        const style = window.getComputedStyle(el);
        const zIndex = parseInt(style.zIndex) || 0;
        const rect = el.getBoundingClientRect();
        
        // Check if element is a suspicious overlay
        if (style.position === 'fixed' && 
            zIndex >= 40 && 
            rect.width >= window.innerWidth - 100 && 
            rect.height >= window.innerHeight - 100 &&
            el.parentNode &&
            !el.querySelector('[data-state="open"]') &&
            !el.closest('[data-state="open"]')) {
          
          // Additional checks to avoid removing legitimate elements
          const isLegitimate = el.tagName === 'HTML' || 
                              el.tagName === 'BODY' || 
                              el.id === 'root' ||
                              el.hasAttribute('data-keep') ||
                              el.querySelector('main') ||
                              el.querySelector('nav');
                              
          if (!isLegitimate) {
            console.log('🗑️ Removendo elemento suspeito:', el.className, zIndex);
            el.remove();
          }
        }
      } catch (error) {
        // Ignore errors for elements that might have been removed
      }
    });
    
    // 4. Reset document and body styles that may be blocking interactions
    const resetStyles = () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.style.pointerEvents = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.pointerEvents = '';
      
      // Remove any potential pointer-events blocking
      const allElems = document.querySelectorAll('*');
      allElems.forEach(elem => {
        const computed = window.getComputedStyle(elem);
        if (computed.pointerEvents === 'none' && 
            computed.position === 'fixed' && 
            elem.parentNode &&
            elem instanceof HTMLElement) {
          elem.style.pointerEvents = '';
        }
      });
    };
    
    resetStyles();
    
    // 5. Remove any modal-related classes from body
    const bodyClasses = document.body.className.split(' ');
    const filteredClasses = bodyClasses.filter(cls => 
      !cls.includes('modal') && 
      !cls.includes('dialog') && 
      !cls.includes('overlay') &&
      !cls.includes('scroll-locked') &&
      !cls.includes('no-scroll')
    );
    document.body.className = filteredClasses.join(' ');
    
    // 6. Force re-enable interactions
    setTimeout(() => {
      resetStyles();
      
      // Check if any elements are still blocking clicks
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const elementsAtCenter = document.elementsFromPoint(centerX, centerY);
      
      elementsAtCenter.forEach((el, index) => {
        if (index === 0) return; // Skip the topmost element
        
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' && 
            parseInt(style.zIndex || '0') > 10 &&
            !el.closest('[data-state="open"]') &&
            el.parentNode) {
          console.log('🎯 Removendo elemento bloqueador de cliques:', el.className);
          el.remove();
        }
      });
    }, 200);
    
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