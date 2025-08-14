/**
 * Utilities para debug de problemas com modais bloqueando cliques
 */

export function debugClickBlocker() {
  // Adiciona listener para detectar cliques bloqueados
  const clickListener = (e: MouseEvent) => {
    const target = e.target as Element;
    console.log('🎯 Clique detectado em:', {
      element: target.tagName,
      className: target.className,
      id: target.id,
      coordinates: { x: e.clientX, y: e.clientY }
    });
    
    // Verifica elementos em posições altas
    const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
    console.log('📍 Elementos na posição do clique:', elementsAtPoint.map(el => ({
      tag: el.tagName,
      className: el.className,
      zIndex: window.getComputedStyle(el).zIndex,
      position: window.getComputedStyle(el).position
    })));
  };
  
  document.addEventListener('click', clickListener, true);
  
  return () => document.removeEventListener('click', clickListener, true);
}

export function forceRemoveAllOverlays() {
  console.log('🔥 Forçando remoção de todos os overlays possíveis...');
  
  // Lista de seletores suspeitos
  const suspiciousSelectors = [
    '[data-radix-dialog-overlay]',
    '[data-radix-dialog-portal]',
    '[data-state="closed"]',
    '.fixed.inset-0',
    '[style*="position: fixed"]',
    '[style*="z-index"]'
  ];
  
  suspiciousSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      try {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' && parseInt(style.zIndex || '0') > 40) {
          // Verifica se o elemento ainda está na DOM antes de remover
          if (el.parentNode) {
            console.log('🗑️ Removendo elemento suspeito:', {
              selector,
              className: el.className,
              zIndex: style.zIndex
            });
            el.remove();
          }
        }
      } catch (error) {
        console.log('⚠️ Erro ao processar elemento:', error);
      }
    });
  });
  
  // Remove todos os elementos invisíveis que cobrem a tela toda
  const allElements = document.body.querySelectorAll('*');
  allElements.forEach(el => {
    try {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      
      if (
        style.position === 'fixed' &&
        rect.width >= window.innerWidth - 10 &&
        rect.height >= window.innerHeight - 10 &&
        parseInt(style.zIndex || '0') > 10 &&
        el.getAttribute('data-state') !== 'open' &&
        el.parentNode // Verifica se ainda está na DOM
      ) {
        console.log('🗑️ Removendo overlay invisível:', el);
        el.remove();
      }
    } catch (error) {
      console.log('⚠️ Erro ao processar overlay:', error);
    }
  });
  
  // Força reset de estilos de body
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('padding-right');
  document.documentElement.style.removeProperty('overflow');
  
  console.log('✅ Limpeza forçada concluída');
}