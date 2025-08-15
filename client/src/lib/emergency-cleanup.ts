/**
 * Emergency cleanup utility for when dialogs get stuck
 * Provides a global emergency button to clean up stuck modals
 */

import { forceModalCleanup } from './modal-cleanup';

declare global {
  interface Window {
    emergencyCleanup: () => void;
  }
}

export function setupEmergencyCleanup() {
  // Add emergency cleanup to window for global access
  window.emergencyCleanup = () => {
    console.log('🚨 LIMPEZA DE EMERGÊNCIA ATIVADA');
    
    // Multiple rounds of aggressive cleanup
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        forceModalCleanup();
        
        // Additional emergency measures
        document.body.style.pointerEvents = '';
        document.documentElement.style.pointerEvents = '';
        
        // Remove any element with extremely high z-index
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
          try {
            const style = window.getComputedStyle(el);
            const zIndex = parseInt(style.zIndex) || 0;
            
            if (zIndex > 9999 && 
                style.position === 'fixed' && 
                el.parentNode &&
                el.tagName !== 'HTML' &&
                el.tagName !== 'BODY' &&
                el.id !== 'root') {
              console.log('🚨 Removendo elemento com z-index muito alto:', el.className, zIndex);
              el.remove();
            }
          } catch (error) {
            // Ignore
          }
        });
        
        console.log(`🧹 Limpeza de emergência round ${i + 1} concluída`);
      }, i * 100);
    }
    
    console.log('✅ LIMPEZA DE EMERGÊNCIA FINALIZADA');
  };
  
  // Add keyboard shortcut Ctrl+Shift+C for emergency cleanup
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      window.emergencyCleanup();
    }
  });
  
  console.log('🚨 Sistema de limpeza de emergência ativo');
  console.log('💡 Use Ctrl+Shift+C ou window.emergencyCleanup() se a interface travar');
}