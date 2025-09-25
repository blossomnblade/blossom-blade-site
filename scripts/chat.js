<!-- FILE: /scripts/chat.js -->
<script>
/* Blossom & Blade — front-end chat runtime
   - URL & persona parsing
   - Portrait fallback
   - Message history + auto-scroll
   - Soft safety filters + persona tweaks (Viper included)
   - No placeholder bubbles on network errors
*/
(() => {
  // ---------- URL state ----------
  const qs = new URLSearchParams(location.search);
  const man = (qs.get("man") || "").toLowerCase();
  const urlMode = (qs.get("mode") || "").toLowerCase();
  const VALID = ["blade","dylan","alexander","silas","grayson","viper"];
  const pretty = {
    blade: "Blade",
    dylan: "Dylan",
    alexander: "Alexander",
    silas: "Silas",
    grayson: "Grayson",
    viper: "Viper",
  };
  const FIRST_LINES = [
    "hey you.",
    "look who’s here.",
    "aww, you came to see me.",
  ];

  // ---------- helpers: storage ----------
  const uidKey = "bnb.userId";
  const hKey  = (m) => `bnb.${m}.history`;
  const sKey  = (m) => `bnb.${m}.summary`;
  const pKey  = (m) => `bnb.${m}.profile`;

  const loadJson = (k, fallback = []) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  };
  const saveJson = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
  };
  const getUserId = () => {
    let id = localStorage.getItem(uidKey);
    if (!id) {
      id = ([1e7]+-1e3+-4e3+-8e3+-1e11)
           .replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
      localStorage.setItem(uidKey, id);
    }
    return id;
  };

  // ---------- DOM ----------
  const el = {
    title:        document.getElementById("roomTitle"),
    list:         document.getElementById("messages"),
    input:        document.getElementById("chatInput"),
    send:         document.getElementById("sendBtn"),
    form:         document.getElementById("composer"),
    portrait:     document.getElementById("portraitImg"),
    portraitLabel:document.getElementById("portraitlabel"),
  };

  // ---------- Title + portrait ----------
  const FallbackLogo = "/images/logo.jpg";
  const imgPathChat  = (m) => `/images/characters/${m}/${m}-chat.webp`;
  const imgPathCard  = (m) => `/images/characters/${m}/${m}-card-on.webp`;

  (function setPortrait(){
    const img = el.portrait;
    if (!img) return;
    img.dataset.stage = "chat";
    img.alt = VALID.includes(man) ? `${pretty[man]} portrait` : "portrait";
    if (el.portraitLabel) el.portraitLabel.textContent =
      VALID.includes(man) ? `${pretty[man]} portrait` : "";
    img.src = VALID.includes(man) ? imgPathChat(man) : FallbackLogo;
    img.onerror = () => {
      switch (img.dataset.stage) {
        case "chat":  img.src = imgPathCard(man); img.dataset.stage = "card"; break;
        case "card":  img.src = FallbackLogo;     img.dataset.stage = "fallback"; break;
        default:      img.onerror = null;
      }
    };
  })();

  if (VALID.includes(man)) {
    document.title = `Blossom & Blade — ${pretty[man]}`;
    if (el.title) el.title.textContent = `— ${pretty[man]}`;
  } else {
    document.title = "Blossom & Blade — Chat";
    if (el.title) el.title.textContent = "— pick a character";
  }

  // ---------- History ----------
  let history = loadJson(hKey(man), []);
  const trimHistory = () => { if (history.length > 60) history = history.slice(-60); };

  function scrollToBottom(){
    // make the messages panel auto-scroll when a bubble is appended
    el.list?.lastElementChild?.scrollIntoView({behavior:"smooth", block:"end"});
  }

  function addBubble(role, text){
    if (!text) return;
    const li = document.createElement("li");
    li.className = `bubble ${role}`;
    li.textContent = text;
    el.list.appendChild(li);
    scrollToBottom();
  }

  function renderAll(){
    if (!el.list) return;
    el.list.innerHTML = "";
    for (const m of history) addBubble(m.role, m.content);
  }

  // ---------- First visit seed ----------
  if (VALID.includes(man) && history.length === 0){
    const first = FIRST_LINES[Math.floor(Math.random()*FIRST_LINES.length)];
    history.push({ role: "assistant", content: first, t: Date.now() });
    saveJson(hKey(man), history);
  }
  renderAll();

  // ---------- Heuristics / filters ----------
  const BANNED = /\b(?:rape|incest|bestiality|traffick|minors?|teen|scat)\b/i;

  // small acks & possessive spice
  function tweakAssistant(out, lastUser = ""){
    // eager ack for “tell me more”
    out = out.replace(/\b(tell me more|explain|elaborate)\b[\s\?]*$/gi, (s) => {
      return /[.!?]$/.test(out) ? out : out + " — oh baby, yes.";
    });

    // “ask nicely” → “ask like a good girl”
    out = out.replace(/\bask(?: nicely)?\b/gi, "ask like a good girl");

    // reassure about lifting
    if (/\byou (can(?:'|no)t?|cannot) lift me\b/i.test(lastUser)){
      out += " You’re light as a feather, love.";
    }

    // possessive lines if she mentions other men
    if (/\b(other|men|guy|guys|man)\b/i.test(lastUser)){
      switch (man){
        case "alexander":
          out += " Amore, don’t get your little friend in trouble—I wouldn’t want to speak with him about what isn’t his.";
          break;
        case "viper": {
          const L = [
            "I’ve never stalked anyone like you before.",
            "You belong to me in ways you don’t even understand yet.",
            "I don’t just want you, I need you.",
            "You’re already claimed, baby.",
            "I’ll burn the world before I let him breathe your name.",
            "Fuck society—it’s you and me, love.",
            "Eyes on me. Always."
          ];
          out += " " + L[Math.floor(Math.random()*L.length)];
          break;
        }
        default:
          out += " Eyes on me.";
      }
    }
    return out;
  }

  // ---------- Form handling ----------
  if (el.form){
    el.form.addEventListener("submit", onSend);
    el.send?.addEventListener("click", () => el.form.requestSubmit());
  }

  async function onSend(e){
    e.preventDefault();
    const text = (el.input.value || "").trim();
    if (!text) return;

    // taboo guard
    if (BANNED.test(text)){
      addBubble("assistant", "I can’t do that. I’ll keep you safe and stay within the lines, okay?");
      el.input.value = "";
      return;
    }

    // append user + save
    history.push({ role:"user", content:text, t:Date.now() });
    trimHistory();
    saveJson(hKey(man), history);
    addBubble("user", text);
    el.input.value = "";

    // build request
    const body = {
      man,
      userId: getUserId(),
      history,
      mode: urlMode || "soft",
      memory: {
        summary: loadJson(sKey(man), ""),
        profile: loadJson(pKey(man), ""),
      },
      pov: "first",
      consented: (localStorage.getItem("bnb.consent") === "1"),
    };

    // fetch reply
    let reply = "";
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      reply = (j && j.reply) ? String(j.reply) : "";
    } catch (err) {
      console.error("chat send failed:", err);
      return; // do not add fallback / placeholder bubble
    }

    // append AI reply
    if (!reply) return;
    reply = tweakAssistant(reply, text);
    history.push({ role:"assistant", content:reply, t:Date.now() });
    trimHistory();
    saveJson(hKey(man), history);
    addBubble("assistant", reply);
  }
})();
</script>
