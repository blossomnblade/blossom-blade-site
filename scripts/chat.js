/* =========================
   BnB — Character bootstrap
   Sets: title name + right portrait
   ========================= */

(() => {
  // Master registry of characters
  const MEN = {
    blade: {
      name: "Blade",
      portrait: "images/characters/blade/blade-chat.webp",
    },
    dylan: {
      name: "Dylan",
      portrait: "images/characters/dylan/dylan-chat.webp",
    },
    alexander: {
      name: "Alexander",
      portrait: "images/characters/alexander/alexander-chat.webp",
    },
    silas: {
      name: "Silas",
      portrait: "images/characters/silas/silas-chat.webp",
    },
    grayson: {
      name: "Grayson",
      portrait: "images/characters/grayson/grayson-chat.webp",
    },
    jesse: {
      name: "Jesse",
      portrait: "images/characters/jesse/jesse-chat.webp",
    },
  };

  // Read URL (?man=blade&sub=night)
  const params = new URLSearchParams(location.search);
  const rawKey = (params.get("man") || "").toLowerCase().trim();

  // Fallback safely if the key is unknown
  const key = Object.prototype.hasOwnProperty.call(MEN, rawKey) ? rawKey : "blade";
  const info = MEN[key];

  // Set the page header name
  const nameEl = document.querySelector("#chatName");
  if (nameEl) nameEl.textContent = info.name;

  // Set the portrait on the right
  const imgEl = document.querySelector("#portraitImg");
  if (imgEl) {
    // add a tiny cache-buster so CDN refreshes after swaps
    imgEl.src = info.portrait + "?v=1";
    imgEl.alt = info.name;

    // If an image path is wrong, fail gracefully to Blade
    imgEl.onerror = () => {
      imgEl.onerror = null;
      imgEl.src = "images/characters/blade/blade-chat.webp";
      imgEl.alt = "Blade";
    };
  }

  // Expose who’s active (optional, some scripts may want this)
  window.BNB_ACTIVE = { key, ...info };
})();
