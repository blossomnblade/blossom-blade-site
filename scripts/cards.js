/* Blossom & Blade – card builder
   - Renders 6 cards in a 3x2 grid
   - Loads {name}-card-on.webp by default
   - If {name}-card-on.webp is missing, falls back to {name}-card-off.webp
   - On hover, swaps to {name}-card-off.webp when available
*/

const PEOPLE = [
  { id: "blade",     name: "Blade"     },
  { id: "dylan",     name: "Dylan"     },
  { id: "jesse",     name: "Jesse"     },
  { id: "alexander", name: "Alexander" },
  { id: "silas",     name: "Silas"     },
  { id: "grayson",   name: "Grayson"   },
];

// paths follow: images/characters/<id>/<id>-card-on.webp (and -card-off.webp)
function cardSrc(id, on = true) {
  return `images/characters/${id}/${id}-card-${on ? "on" : "off"}.webp`;
}

function chatHref(id) {
  return `chat.html?man=${id}&sub=night`;
}

function buildCard({ id, name }) {
  const article = document.createElement("article");
  article.className = "card";

  const link = document.createElement("a");
  link.className = "pic";
  link.href = chatHref(id);
  link.setAttribute("aria-label", `Open chat with ${name}`);

  // primary (card-on)
  const imgOn = document.createElement("img");
  imgOn.className = "primary";
  imgOn.alt = `${name} — card`;
  imgOn.decoding = "async";
  imgOn.loading = "lazy";
  imgOn.src = cardSrc(id, true);

  // secondary (card-off) used on hover
  const imgOff = document.createElement("img");
  imgOff.className = "secondary";
  imgOff.alt = "";
  imgOff.decoding = "async";
  imgOff.loading = "lazy";
  imgOff.src = cardSrc(id, false);

  // if ON fails, try OFF instead; if that fails, mark as broken
  imgOn.addEventListener("error", () => {
    // try to swap in the OFF image if it loads
    const tester = new Image();
    tester.onload = () => {
      imgOn.src = tester.src;        // show OFF as the base
      imgOff.classList.add("hidden"); // hide secondary hover if same
    };
    tester.onerror = () => {
      link.classList.add("broken");
      imgOn.classList.add("hidden");
      imgOff.classList.add("hidden");
    };
    tester.src = cardSrc(id, false);
  });

  // if OFF fails, just hide the hover image
  imgOff.addEventListener("error", () => {
    imgOff.classList.add("hidden");
  });

  link.append(imgOn, imgOff);

  const meta = document.createElement("div");
  meta.className = "meta";

  const title = document.createElement("div");
  title.className = "name";
  title.textContent = name;

  const btn = document.createElement("a");
  btn.className = "btn";
  btn.href = chatHref(id);
  btn.textContent = "Enter";

  meta.append(title, btn);
  article.append(link, meta);
  return article;
}

(function renderCards(){
  const root = document.getElementById("cards");
  root.innerHTML = "";
  PEOPLE.forEach(p => root.appendChild(buildCard(p)));
})();
