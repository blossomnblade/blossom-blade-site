// scripts/cards.js
(() => {
  const supportsHover = matchMedia('(hover: hover)').matches;

  document.querySelectorAll('[data-card]').forEach(card => {
    const img  = card.querySelector('img');
    const on   = card.dataset.on;
    const off  = card.dataset.off || on;           // if no "off", reuse "on"
    let broken = false;

    // Preload both sources so swapping is instant
    [on, off].forEach(src => { const i = new Image(); i.src = src; });

    // If any img errors, stop swapping (prevents flashing + alt text spam)
    img.addEventListener('error', () => { broken = true; });

    // Always start with the ON image
    img.src = on;

    if (!supportsHover) return;                    // no hover on touch devices

    card.addEventListener('mouseenter', () => { if (!broken) img.src = off; });
    card.addEventListener('mouseleave', () => { if (!broken) img.src = on;  });
  });
})();
