// scripts/cards.js
(() => {
  // Find every <img> inside a .card
  const imgs = document.querySelectorAll('.card img');

  imgs.forEach((img) => {
    // Accept several ways to declare sources
    const on  = img.dataset.on  || img.dataset.f1 || img.getAttribute('src');
    let   off = img.dataset.off || img.dataset.f2;

    // If not explicitly provided, try -on -> -off swap
    if (!off && on) off = on.replace(/-on(\.\w+)$/, '-off$1');

    // Store back so we’re consistent
    if (on)  img.dataset.on  = on;
    if (off) img.dataset.off = off;

    // Ensure we start on the "on" image
    if (on) img.src = on;
    img.loading  = 'lazy';
    img.decoding = 'async';

    // Helpers
    const showOn  = () => on  && (img.src = on);
    const showOff = () => off && (img.src = off);

    // Desktop hover
    img.addEventListener('mouseenter', showOff);
    img.addEventListener('mouseleave', showOn);

    // Mobile: tap to toggle
    img.addEventListener('touchstart', (e) => {
      e.preventDefault();
      img._toggled = !img._toggled;
      img._toggled ? showOff() : showOn();
    }, { passive: false });
  });
})();
