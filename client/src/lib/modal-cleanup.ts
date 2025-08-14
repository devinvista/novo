/**
 * Comprehensive modal cleanup utilities for Radix UI dialog issues
 * Prevents modals from blocking interface after closing
 */

export function forceModalCleanup() {
  console.log('🧹 Executando limpeza forçada de modais...');
  
  // Remove all dialog overlays
  const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
  overlays.forEach(overlay => {
    if (overlay.parentNode) {
      overlay.remove();
    }
  });
  
  // Remove all dialog portals without open dialogs
  const portals = document.querySelectorAll('[data-radix-dialog-portal]');
  portals.forEach(portal => {
    if (!portal.querySelector('[data-state="open"]') && portal.parentNode) {
      portal.remove();
    }
  });
  
  // Remove closed dialog elements that are still fixed positioned
  const closedElements = document.querySelectorAll('[data-state="closed"]');
  closedElements.forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.position === 'fixed' && el.parentNode) {
      el.remove();
    }
  });
  
  // Remove any remaining problematic fixed elements
  const allElements = document.querySelectorAll('*');
  allElements.forEach(el => {
    try {
      const style = window.getComputedStyle(el);
      const zIndex = parseInt(style.zIndex) || 0;
      const rect = el.getBoundingClientRect();
      
      // Check if element is a full-screen overlay with high z-index
      if (style.position === 'fixed' && 
          zIndex >= 50 && 
          rect.width >= window.innerWidth - 50 && 
          rect.height >= window.innerHeight - 50 &&
          !el.querySelector('[data-state="open"]') &&
          el.parentNode) {
        el.remove();
      }
    } catch (error) {
      // Ignore errors for elements that might have been removed
    }
  });
  
  // Reset body and document styles
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  document.documentElement.style.overflow = '';
  
  // Remove any modal-related classes from body
  const bodyClasses = document.body.className.split(' ');
  const filteredClasses = bodyClasses.filter(cls => 
    !cls.includes('modal') && 
    !cls.includes('dialog') && 
    !cls.includes('overlay') &&
    !cls.includes('scroll-locked')
  );
  document.body.className = filteredClasses.join(' ');
  
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
}

/**
 * Hook into window to provide global cleanup access
 */
if (typeof window !== 'undefined') {
  (window as any).forceModalCleanup = forceModalCleanup;
}