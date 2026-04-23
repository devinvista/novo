import { forceModalCleanup } from './modal-cleanup';

declare global {
  interface Window {
    emergencyCleanup: () => void;
  }
}

export function setupEmergencyCleanup(): () => void {
  window.emergencyCleanup = () => {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        forceModalCleanup();

        document.body.style.pointerEvents = '';
        document.documentElement.style.pointerEvents = '';

        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
          try {
            const style = window.getComputedStyle(el);
            const zIndex = parseInt(style.zIndex) || 0;

            if (
              zIndex > 9999 &&
              style.position === 'fixed' &&
              el.parentNode &&
              el.tagName !== 'HTML' &&
              el.tagName !== 'BODY' &&
              el.id !== 'root'
            ) {
              el.remove();
            }
          } catch {
            // ignore
          }
        });
      }, i * 100);
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      window.emergencyCleanup();
    }
  };

  document.addEventListener('keydown', handleKeydown);

  return () => {
    document.removeEventListener('keydown', handleKeydown);
  };
}
