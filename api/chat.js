<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Chat • Blossom n Blade</title>
<meta name="description" content="Women-safe fantasy chat. PG-13 by default; coins unlock erotic chat (words only, no visuals)." />
<style>
  :root{ --bg:#0e0a0d; --panel:#171017; --ink:#efe6ee; --muted:#bba9b6; --plum:#4B1F3C; --wine:#6E0F2E; --line:#2a1a25; }
  *{box-sizing:border-box} html,body{height:100%}
  body{
    margin:0; color:var(--ink); font:500 16px/1.45 system-ui,Segoe UI,Roboto,Helvetica,Arial;
    background:linear-gradient(0deg, rgba(14,10,13,.84), rgba(14,10,13,.84)),
               var(--hero, url("/images/gothic-bg.jpg")) center/cover no-repeat fixed;
  }
  a{color:#e7bddf; text-decoration:none}
  header{
    display:flex; justify-content:space-between; align-items:center; gap:10px;
    padding:12px 12px; border-bottom:1px solid var(--line);
    background:linear-gradient(180deg, rgba(20,13,20,.6), rgba(20,13,20,0));
  }
  .brand{display:flex; align-items:center; gap:10px}
  .dot{width:22px;height:22px;border-radius:50%;
       background:conic-gradient(from 220deg,var(--wine),var(--plum)); box-shadow:0 0 0 2px #000 inset}
  h1{margin:0; font-size:16px}
  .hdr-actions{display:flex; gap:10px; align-items:center}
  .btn{border:none; border-radius:999px; padding:8px 12px; cursor:pointer;
       background:linear-gradient(90deg,var(--plum),var(--wine)); color:white; font-weight:700}
  .btn.link{display:inline-block; text-decoration:none}
  .timer{display:flex; align-items:center; gap:10px; padding:10px 12px; border-bottom:1px solid var(--line);
         background:linear-gradient(180deg,#1a121a,#120a11)}
  .time-left{font-weight:700}
  .bar{flex:1;height:8px;background:#241624;border-radius:999px;overflow:hidden}
  .fill{height:100%;width:0%;background:linear-gradient(90deg,var(--plum),var(--wine))}
  .wrap{max-width:900px;margin:0 auto;padding:12px}
  .chat{
    display:flex; flex-direction:column; gap:10px; height:calc(100vh - 220px);
    padding:10px; overflow:auto; scroll-behavior:smooth;
    background:rgba(14,10,13,.35); border:1px solid var(--line); border-radius:16px;
    box-shadow:0 1px 12px rgba(0,0,0,.25);
  }
  .row{display:flex; gap:8px}
  .row.you{justify-content:flex-end}
  .bubble{max-width:72%; padding:10px 12px; border-radius:14px; line-height:1.45;
          background:rgba(23,16,23,.78); border:1px solid #2a1a25; box-shadow:0 1px 6px rgba(0,0,0,.25)}
  .you .bubble{background:rgba(36,20,36,.82); border-color:#3a203a}
  .sys{font-size:12px;color:#cbbdca; text-align:center; margin:8px 0}
  .composer{margin-top:10px; display:flex; gap:8px; align-items:center;
            background:rgba(14,10,13,.55); border:1px solid var(--line); border-radius:12px; padding:8px}
  input[type="text"]{flex:1; padding:10px; border-radius:8px; border:1px solid #2a1a25; background:#0f0b0f; color:#eee}
  .hint{font-size:12px;color:var(--muted); text-align:center; margin-top:6px}
  .badge{font-size:12px; color:#e9d4e6; background:#241624; border:1px solid #2a1a25; border-radius:999px; padding:6px 10px; white-space:nowrap}

  /* Upsell overlay */
  .overlay{position:fixed; inset:0; display:none; place-items:center;
           background:rgba(10,6,10,.65); backdrop-filter:blur(3px); z-index:30;}
  .panel{width:min(560px,92vw); border-radius:16px; overflow:hidden; border:1px solid var(--line);
         background:linear-gradient(180deg,#1a121a,#120a11); box-shadow:0 10px 40px rgba(0,0,0,.45)}
  .panel .hd{padding:12px 14px; border-bottom:1px solid #241624; display:flex; align-items:center; gap:10px}
  .panel .bd{padding:14px}
  .choices{display:grid; gap:10px; grid-template-columns:1fr 1fr}
  .pill{display:inline-block; padding:3px 8px; border:1px solid #2b1a28; border-radius:999px; font-size:12px; color:#e9d4e6}
  .avatar{width:56px; height:56px; border-radius:12px; object-fit:cover; border:1px solid #2a1a25}
  .subtle{color:var(--muted); font-size:12px}
  .hidden{display:none}
  .disabled{opacity:.6; pointer-events:none}

  /* — Coin popup (bottom-right) — */
  .coinpop{
    position:fixed; right:14px; bottom:92px; z-index:40;
    width:290px; max-width:95vw;
    border-radius:16px; padding:12px;
    border:1px solid #2a1a25;
    background:radial-gradient(120% 120% at 10% 10%, rgba(110,15,46,.35), rgba(75,31,60,.25) 60%, rgba(14,10,13,.9) 100%),
               linear-gradient(180deg, #1a121a, #120a11);
    box-shadow:0 12px 30px rgba(0,0,0,.45);
  }
  .coinpop h4{margin:0 0 6px; font:800 14px/1.2 system-ui}
  .coinpacks{display:grid; grid-template-columns:repeat(2,1fr); gap:8px}
  .coinbtn{
    display:block; text-align:center; padding:8px 10px; border-radius:12px; font-weight:800;
    border:1px dashed #3a2239; background:#160f16; color:#fff; cursor:pointer
  }
  .coinmeta{font-size:12px; color:#bba9b6; margin-top:6px}
  .coinclose{margin-top:8px; text-align:center}
  .coinclose a{color:#bba9b6; font-size:12px; text-decoration:underline}
</style>
</head>
<body>

<header>
  <div class="brand"><div class="dot" aria-hidden="true"></div><h1 id="hdrTitle">Blossom n Blade</h1></div>
  <div class="hdr-actions">
    <span id="coinBadge" class="badge" title="Coins available">Coins: 0</span>
    <a id="pricingLink" class="btn link" href="/pay.html">Pricing</a>
    <a class="btn link" style="background:#2a1a25" href="/index.html">Back</a>
  </div>
</header>

<div class="timer">
  <div>Trial:</div><div class="time-left" id="timeleft">3:30</div>
  <div class="bar"><div class="fill" id="fill"></div></div>
</div>

<main class="wrap">
  <section id="chat" class="chat" aria-live="polite" aria-label="Chat messages"></section>
  <form id="composer" class="composer">
    <input id="input" type="text" placeholder="Say hi…" autocomplete="off" />
    <button class="btn" type="submit">Send</button>
  </form>
  <div class="hint">PG-13 by default. Coins unlock erotic chat (words only, no visuals).</div>
</main>

<!-- Upsell overlay (time limit) -->
<div id="overlay" class="overlay" aria-hidden="true">
  <div class="panel">
    <div class="hd">
      <img id="ovAvatar" class="avatar" src="/images/gothic-bg.jpg" alt="" />
      <div>
        <div id="ovTitle" style="font-weight:800">Time’s up for the free vibe</div>
        <div class="pill" id="ovPill">Keep going with Silas</div>
      </div>
    </div>
    <div class="bd">
      <p id="ovMsg" style="margin-top:0">Want to keep chatting? Pick a quick Day Pass or go Monthly. Coins are optional and simply unlock erotic chat.</p>
      <div class="choices">
        <a id="buyDay" class="btn link" href="#">Day Pass — $5.99</a>
        <a id="buyMonth" class="btn link" href="#">Monthly — $10.99</a>
      </div>
      <p id="freeLeft" class="subtle"></p>
      <div id="ovActions" class="choices" style="margin-top:8px">
        <button id="anotherPreview" class="btn" type="button">Another 3½-minute preview</button>
        <button id="snooze" class="btn" type="button" style="background:#2a1a25">Maybe later (1 minute)</button>
      </div>
    </div>
  </div>
</div>

<!-- Tiny coin popup -->
<div id="coinPopup" class="coinpop hidden" role="dialog" aria-modal="false" aria-label="Buy coins">
  <h4>Unlock erotic chat</h4>
  <div class="coinpacks">
    <a data-pack="5"   class="coinbtn">5 coins — $1</a>
    <a data-pack="25"  class="coinbtn">25 coins — $5</a>
    <a data-pack="60"  class="coinbtn">60 coins — $10</a>
    <a data-pack="150" class="coinbtn">150 coins — $20</a>
  </div>
  <div class="coinmeta">Triggers naturally by convo prompts—never pushy.</div>
  <div class="coinclose"><a href="#" id="coinClose">Not now</a></div>
</div>

<script>
/* === Character mapping === */
const MAP = {
  blade:{ name:"Blade Kincaid", bg:"/images/blade-woods.jpg", card:"/images/blade_front_card.jpg",
          intro:"Found you, brave girl. Don’t run—yet. What would make a perfect chase tonight?" },
  dylan:{ name:"Dylan Vale", bg:"/images/dylan-garage.jpg", card:"/images/dylan-garage.jpg",
          intro:"Hop up on the counter, pretty thing. What kind of trouble do you want—PG-13, for now." },
  grayson:{ name:"Grayson Kincaid", bg:"/images/grayson-bg.jpg", card:"/images/grayson-bg.jpg",
            intro:"One line at a time. Give me a detail I should notice when I look at you." },
  silas:{ name:"Silas Lennox", bg:"/images/gothic-bg.jpg", card:"/images/gothic-bg.jpg",
          intro:"Come closer, muse. Lend me a verse—soft or a little rough around the edges?" },
  alexander:{ name:"Alexander Jackson", bg:"/images/gentleman-bg.jpg", card:"/images/gentleman-bg.jpg",
              intro:"Shoes off. Let me take your coat and one weight off your mind." },
  jesse:{ name:"Jesse Granger", bg:"/images/cowboy.jpg", card:"/images/cowboy.jpg",
          intro:"Darlin’, sit a spell. Start with one truth from today and we’ll go from there." }
};
const ALIAS = { garage:"dylan", gentleman:"alexander", cowboy:"jesse", rockstar:"silas", mask:"blade", viking:"grayson" };

/* Require age verification before entry */
(function enforceAgeGate(){
  const until = Number(localStorage.getItem("bb.ageVerifiedUntil") || 0);
  if (!until || until <= Date.now()){
    const nextHere = location.pathname + location.search + location.hash;
    location.replace(`/age.html?man=${encodeURIComponent((new URLSearchParams(location.search).get("man")||"").toLowerCase())}&next=${encodeURIComponent(nextHere)}`);
  }
})();

/* Resolve selected man */
const qs = new URLSearchParams(location.search);
let id = (qs.get("man") || localStorage.getItem("bb.character") || "").toLowerCase().trim();
id = ALIAS[id] || id; if(!MAP[id]) id = "silas";
const guy = MAP[id];

/* Branding + links */
document.body.style.setProperty("--hero", `url("${guy.bg}")`);
document.getElementById("hdrTitle").textContent = `${guy.name}`;
document.getElementById("pricingLink").href = `/pay.html?man=${encodeURIComponent(id)}`;

/* === Coins (local balance + popup) === */
const COIN_KEY = "bb.coins";
function getCoins(){ return Math.max(0, Number(localStorage.getItem(COIN_KEY) || 0)); }
function setCoins(n){ localStorage.setItem(COIN_KEY, String(Math.max(0,n))); updateBadge(); }
function addCoins(n){ setCoins(getCoins() + n); }
function spendCoin(){ const c=getCoins(); if(c>0){ setCoins(c-1); return true; } return false; }
function updateBadge(){ document.getElementById("coinBadge").textContent = `Coins: ${getCoins()}`; }
updateBadge();

/* Stripe hookup (optional, later):
   If you have Stripe Checkout links, paste them here. If left empty, we just add coins locally for demo. */
const STRIPE_LINKS = {
  "5":   "", // e.g. "https://buy.stripe.com/..."
  "25":  "",
  "60":  "",
  "150": ""
};

const coinPopup = document.getElementById("coinPopup");
function showCoins(reason){
  coinPopup.classList.remove("hidden");
  // mark that we showed at least once
  try { localStorage.setItem("bb.coinPopupShown","1"); } catch(e){}
}
function hideCoins(){ coinPopup.classList.add("hidden"); }
document.getElementById("coinClose").addEventListener("click", e=>{ e.preventDefault(); hideCoins(); });

coinPopup.addEventListener("click", (e)=>{
  const btn = e.target.closest(".coinbtn");
  if(!btn) return;
  const pack = btn.getAttribute("data-pack");
  const link = STRIPE_LINKS[pack] || "";
  if(link){
    // Real checkout: send to Stripe (returns after payment if you set success_url back to this page)
    location.href = link;
  }else{
    // Demo/local: just grant coins immediately
    addCoins(Number(pack));
    alert(`Added ${pack} coins.`);
    hideCoins();
  }
});

/* When to suggest coins:
   - If message looks "spicy" and user has 0 coins
   - Show once the first time they try (bb.coinPopupShown flag) */
function looksSpicy(text){
  const t = text.toLowerCase();
  const triggers = ["erotic","explicit","spicy","dirty","nsfw","more","go further","turn up","coin","unlock"];
  return triggers.some(k => t.includes(k));
}

/* === Free-trial timer & overlay === */
const TRIAL_SECONDS = 210; // 3:30 per preview
const MAX_TRIALS = 3;
const END_KEY   = `bb.trialEnd:${id}`;
const COUNT_KEY = `bb.trialCount:${id}`;
const MARK_KEY  = `bb.trialMarkedEnd:${id}`;
let count = Number(localStorage.getItem(COUNT_KEY) || 0);
let end   = Number(localStorage.getItem(END_KEY) || 0);

const chat = document.getElementById("chat");
const timeleft = document.getElementById("timeleft");
const fill = document.getElementById("fill");
const composer = document.getElementById("composer");
const input = document.getElementById("input");

function row(html, you=false){
  const r = document.createElement("div");
  r.className = "row" + (you ? " you" : "");
  r.innerHTML = `<div class="bubble">${html}</div>`;
  chat.appendChild(r); chat.scrollTop = chat.scrollHeight;
}
function esc(s){ return s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])) }
row(`<strong>${guy.name}:</strong> ${esc(guy.intro)}`);

const overlay = document.getElementById("overlay");
const freeLeft= document.getElementById("freeLeft");
const another = document.getElementById("anotherPreview");
const snooze  = document.getElementById("snooze");
const buyDay  = document.getElementById("buyDay");
const buyMon  = document.getElementById("buyMonth");
function ageGate(plan){ return `/age.html?man=${encodeURIComponent(id)}&plan=${encodeURIComponent(plan)}`; }
buyDay.href = ageGate("day"); buyMon.href = ageGate("month");

function fmt(ms){
  const s = Math.max(0, Math.ceil(ms/1000));
  const m = Math.floor(s/60).toString();
  const ss = (s%60).toString().padStart(2,'0');
  return `${m}:${ss}`;
}
function startPreview(){
  const now = Date.now();
  end = now + TRIAL_SECONDS*1000;
  localStorage.setItem(END_KEY, String(end));
  localStorage.removeItem(MARK_KEY);
  overlay.style.display = "none";
  overlay.setAttribute("aria-hidden","true");
  composer.classList.remove("disabled"); input.disabled = false; input.focus();
  requestAnimationFrame(tick);
}
function tick(){
  if (count >= MAX_TRIALS){ lock(true); return; }
  const ms = end - Date.now();
  const total = TRIAL_SECONDS*1000;
  const used = Math.min(total, Math.max(0,total - ms));
  fill.style.width = (used/total*100) + "%";
  timeleft.textContent = fmt(ms);
  if(ms <= 0){ lock(false); return; }
  requestAnimationFrame(tick);
}
function lock(limitReached){
  composer.classList.add("disabled"); input.disabled = true;
  document.getElementById("ovTitle").textContent = limitReached ? `Free previews used up` : `Time’s up — ${guy.name} can keep you longer`;
  document.getElementById("ovPill").textContent  = limitReached ? `You’ve had ${MAX_TRIALS} previews with ${guy.name}` : `Keep going with ${guy.name}`;
  document.getElementById("ovAvatar").src = guy.card; document.getElementById("ovAvatar").alt = guy.name;

  if(!limitReached){
    const mark = localStorage.getItem(MARK_KEY);
    if (String(end) !== mark){
      count = Number(localStorage.getItem(COUNT_KEY) || 0) + 1;
      localStorage.setItem(COUNT_KEY, String(count));
      localStorage.setItem(MARK_KEY, String(end));
    }
  }
  const left = Math.max(0, MAX_TRIALS - count);
  freeLeft.textContent = left ? `${left} free preview${left===1?"":"s"} left with ${guy.name}.` : `No free previews left for ${guy.name}.`;
  document.getElementById("ovActions").classList.toggle("hidden", left === 0);
  snooze.disabled = (left === 0); another.disabled = (left === 0);
  overlay.style.display = "grid"; overlay.setAttribute("aria-hidden","false");
}
another.addEventListener("click", ()=>{ if (count < MAX_TRIALS) startPreview(); });
snooze.addEventListener("click", ()=>{
  overlay.style.display = "none"; overlay.setAttribute("aria-hidden","true");
  end = Date.now() + 60*1000; localStorage.setItem(END_KEY, String(end)); requestAnimationFrame(tick);
});

/* Demo reply (PG-13) */
function botReply(){
  const replies = [
    "Mhm. Tell me more—in your own words.",
    "I’m listening. Where do you feel it most—heart or head?",
    "Good. Breathe. Give me one detail I can hold onto.",
    "Do you want softer… or a little bolder in tone?",
    "Stay with me. What would make tonight easier?"
  ];
  row(`<strong>${guy.name}:</strong> ${esc(replies[Math.floor(Math.random()*replies.length)])}`);
}

/* Send handler + coin trigger */
document.getElementById("composer").addEventListener("submit", (e)=>{
  e.preventDefault();
  const t = input.value.trim(); if(!t) return;
  row(esc(t), true); input.value = "";

  // If the message looks like it's escalating: require a coin
  if (looksSpicy(t)){
    if (getCoins() <= 0){
      // first-time hint? show popup
      showCoins("need");
      row(`<em class="sys">Coins unlock erotic chat (words only). Grab a small pack to continue that direction.</em>`);
      return; // don't reply yet; let them decide
    } else {
      spendCoin();
      updateBadge();
      row(`<em class="sys">Spent 1 coin to unlock erotic tone for this message.</em>`);
    }
  }
  setTimeout(botReply, 500);
});

/* Kickoff */
(function init(){
  if (Number(localStorage.getItem("bb.trialCount:"+id)||0) >= MAX_TRIALS){ lock(true); return; }
  if (!end || end <= Date.now()){ startPreview(); } else { requestAnimationFrame(tick); }

  // Nudge: if no coins and they've never seen the popup, show gently once
  const seen = localStorage.getItem("bb.coinPopupShown");
  if (!seen && getCoins()===0){ setTimeout(()=>showCoins("intro"), 1200); }
})();
</script>
</body>
</html>
