/**
 * Utilitários de limpeza de modais Radix UI
 * Evita que modais bloqueiem a interface após fechamento
 */

export function forceModalCleanup() {
  try {
    const orphanedOverlays = document.querySelectorAll('[data-radix-dialog-overlay]');
    orphanedOverlays.forEach(overlay => {
      try {
        const hasOpenDialog =
          overlay.closest('[data-state="open"]') ||
          overlay.querySelector('[data-state="open"]') ||
          document.querySelector('[data-state="open"]');

        if (!hasOpenDialog && overlay.parentNode && overlay.isConnected) {
          overlay.remove();
        }
      } catch {
        // ignore
      }
    });

    const closedElements = document.querySelectorAll('[data-state="closed"]');
    closedElements.forEach(el => {
      try {
        if (el.parentNode && el.isConnected) {
          const isModal =
            el.hasAttribute('data-radix-dialog-content') ||
            el.hasAttribute('data-radix-dialog-overlay') ||
            el.hasAttribute('data-radix-dialog-portal');

          if (isModal) el.remove();
        }
      } catch {
        // ignore
      }
    });

    const resetStyles = () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.style.pointerEvents = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.pointerEvents = '';
    };

    resetStyles();

    try {
      const bodyClasses = document.body.className.split(' ');
      document.body.className = bodyClasses
        .filter(cls =>
          !cls.includes('modal') &&
          !cls.includes('dialog') &&
          !cls.includes('overlay') &&
          !cls.includes('scroll-locked') &&
          !cls.includes('no-scroll')
        )
        .join(' ');
    } catch {
      // ignore
    }

    setTimeout(resetStyles, 100);
  } catch {
    // ignore
  }
}

export function cleanupOnDialogClose() {
  forceModalCleanup();
  setTimeout(forceModalCleanup, 300);
}
