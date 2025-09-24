/* Blossom & Blade — cards (character grid) */
(() => {
  const MEN = ["blade","dylan","alexander","silas","grayson","viper"];

  const el = {
    wrap: document.getElementById("cards") || document.body
  };

  const title = (m) => m[0].toUpperCase() + m.slice(1);

  function cardHTML(m){
    const img = `/images/characters/${m}/${m}-card.webp`;
    const url = `/chat.html?man=${m}&sub=night`;
    return `
      <article class="card">
        <figure class="frame">
          <img loading="lazy" src="${img}" alt="${title(m)} portrait" />
        </figure>
        <div class="meta">
          <h3>${title(m)}</h3>
          <a class="enter" href="${url}">Enter</a>
        </div>
      </article>
    `;
  }

  function render(){
    const html = MEN.map(cardHTML).join("");
    if (el.wrap.id === "cards") {
      el.wrap.innerHTML = html;
    } else {
      // Fallback minimal mount
      const mount = document.createElement("section");
      mount.id = "cards";
      mount.innerHTML = html;
      document.body.appendChild(mount);
    }
  }

  render();
})();
