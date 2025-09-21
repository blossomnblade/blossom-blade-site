/* Blossom & Blade — card renderer
   Drop this file at scripts/cards.js and keep your images under:
   images/characters/<slug>/<slug>-card-on.webp
   images/characters/<slug>/<slug>-card-off.webp  (optional; falls back to -on)
*/

const CARDS = [
  {
    slug: "blade",
    name: "Blade",
    href: "chat.html?man=blade&sub=night",
    on:  "images/characters/blade/blade-card-on.webp",
    off: "images/characters/blade/blade-card-on.webp"
  },
  {
    slug: "dylan",
    name: "Dylan",
    href: "chat.html?man=dylan&sub=night",
    on:  "images/characters/dylan/dylan-card-on.webp",
    off: "images/characters/dylan/dylan-card-off.webp"
  },
  {
    slug: "jesse",
    name: "Jesse",
    href: "chat.html?man=jesse&sub=night",
    on:  "images/characters/jesse/jesse-card-on.webp",
    off: "images/characters/jesse/jesse-card-on.webp" // use same until we add an OFF
  },
  {
    slug: "alexander",
    name: "Alexander",
    href: "chat.html?man=alexander&sub=night",
    on:  "images/characters/alexander/alexander-card-on.webp",
    off: "images/characters/alexander/alexander-card-on.webp"
  },
  {
    slug: "silas",
    name: "Silas",
    href: "chat.html?man=silas&sub=night",
    on:  "images/characters/silas/silas-card-on.webp",
    off: "images/characters/silas/silas-card-on.webp"
  },
  {
    slug: "grayson",
    name: "Grayson",
    href: "chat.html?man=grayson&sub=night",
    on:  "images/characters/grayson/grayson-card-on.webp",
    off: "images/characters/grayson/grayson-card-on.webp"
  }
];

/* Utility: render one card */
function cardHTML({ name, href, on, off }) {
  const offSrc = off || on;
  return `
    <article class="card">
      <a class="art" href="${href}" aria-label="Enter ${name}">
        <img class="on"  src="${on}"  alt="${name} — card on"  loading="lazy" decoding="async">
        <img class="off" src="${offSrc}" alt="${name} — card off" loading="lazy" decoding="async">
        <!-- If an image fails to load, the ::before wouldn't help; we inject a graceful fallback below in JS -->
      </a>
      <div class="meta">
        <div class="name">${name}</div>
        <a class="btn" href="${href}">Enter</a>
      </div>
    </article>
  `;
}

/* Graceful fallback: if either image errors, show a soft placeholder */
function attachFallbacks(root) {
  root.querySelectorAll('.card .art img').forEach(img => {
    img.addEventListener('error', () => {
      const art = img.closest('.art');
      if (art && !art.querySelector('.placeholder')) {
        const ph = document.createElement('div');
        ph.className = 'placeholder';
        ph.textContent = 'Coming soon';
        art.appendChild(ph);
      }
    }, { once:true });
  });
}

/* Render all cards */
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('grid');
  grid.innerHTML = CARDS.map(cardHTML).join('');
  attachFallbacks(grid);
});
