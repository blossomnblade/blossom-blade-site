/* Blossom & Blade — chat runtime
   - Reads ?man=&sub=
   - Restores local history (bnb.<man>.m)
   - Seeds first line if empty
   - Sends to /api/chat { man, history, mode }
   - Strict portrait mapping with fallback
*/

(() => {
  const qs = new URLSearchParams(location.search);
  const man = (qs.get("man") || "").toLowerCase();
  const sub = (qs.get("sub") || "day").toLowerCase();

  const el = {
    title: document.getElementById("roomTitle"),
    list: document.getElementById("messages"),
    input: document.getElementById("chatInput"),
    send: document.getElementById("sendBtn"),
    form: document.getElementById("composer"),
    portrait: document.getElementById("portraitImg"),
    portraitLabel: document.getElementById("portraitLabel"),
    tplUser: document.getElementById("tpl-user"),
    tplAi: document.getElementById("tpl-assistant"),
  };

  // Basic guard: valid names only
  const VALID = ["blade","dylan","jesse","alexander","silas","grayson"];
  const namePretty = {
    blade:"Blade", dylan:"Dylan", jesse:"Jesse",
    alexander:"Alexander", silas:"Silas", grayson:"Grayson"
  };
  const firstLines = [
    "hey you.", "look who’s here.", "aww, you came to see me."
  ];

  // Persona one-liners used by the backend, but handy if we need a local seed
  const personaTone = {
    blade: ["Come here and talk to me.","You’re safe. Try again—tighter."],
    dylan: ["You made it. Talk to me.","Helmet’s off. Your turn—what happened today?"],
    jesse: ["Be good for me.","How close do you want me?"],
    alexander: ["Mm. You again. Good.","I’m listening—brief me."],
    silas: ["Hey, muse.","What color was your mood today?"],
    grayson: ["Took you long enough.","What do you need from me tonight?"],
  };

  // Disallowed themes (hard refuse)
  const banned = /\b(rape|incest|bestiality|traffick|minor|teen|scat)\b/i;

  // Title / guard
  if (!VALID.includes(man)) {
    document.title = "Blossom & Blade — Chat";
    el.title.textContent = "— pick a character";
  } else {
    document.title = `Blossom & Blade — ${namePretty[man]}`;
    el.title.textContent = `— ${namePretty[man]}`;
  }

  // Portrait mapping: /images/characters/<man>/<man>-chat.webp
  const placeholder = "/images/placeholder.webp";
  function resolvePortrait(m, s) {
    // for now day|night both use <man>-chat.webp; keep hook for future themed subs
    return `/images/characters/${m}/${m}-chat.webp`;
  }
  function setPortrait() {
    const src = VALID.includes(man) ? resolvePortrait(man, sub) : placeholder;
    el.portrait.alt = VALID.includes(man) ? `${namePretty[man]} portrait` : "portrait";
    el.portraitLabel.textContent = VALID.includes(man) ? `${namePretty[man]} portrait` : "";
    el.portrait.src = src;
    el.portrait.onerror = () => { el.portrait.src = placeholder; };
  }
  setPortrait();

  // Local storage
  const key = `bnb.${man}.m`;
  const history = loadHistory();

  function loadHistory() {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
  function saveHistory() {
    try { localStorage.setItem(key, JSON.stringify(history.slice(-40))); } catch {}
  }

  // UI helpers
  function addBubble(role, text){
    const tpl = role === "user" ? el.tplUser : el.tplAi;
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.textContent = text;
    el.list.appendChild(node);
    el.list.scrollTop = el.list.scrollHeight;
  }

  // Seed first line if no history
  if (VALID.includes(man) && history.length === 0) {
    const first = firstLines[Math.floor(Math.random()*firstLines.length)];
    history.push({ role:"assistant", content:first });
    addBubble("assistant", first);
    saveHistory();
  } else {
    // restore
    for (const msg of history) addBubble(msg.role, msg.content);
  }

  // Send handling
  el.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = (el.input.value || "").trim();
    if (!text) return;

    // banned-word gate
    if (banned.test(text)) {
      const safe = "I won’t roleplay non-consensual or taboo themes. Let’s keep it adult, safe, and mutual—what vibe do you want instead?";
      addBubble("assistant", safe);
      history.push({role:"user", content:text});
      history.push({role:"assistant", content:safe});
      saveHistory();
      el.input.value = "";
      return;
    }

    addBubble("user", text);
    history.push({ role:"user", content:text });
    saveHistory();
    el.input.value = "";

    // Call API
    try {
      const res = await fetch("/api/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ man, history, mode: "soft" })
      });

      // Stream if possible, else fall back
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("text/event-stream")) {
        await streamInto(res);
      } else {
        const data = await res.json();
        const reply = sanitizeReply(data.reply || "");
        addBubble("assistant", reply);
        history.push({ role:"assistant", content: reply });
        saveHistory();
      }
    } catch (err) {
      const msg = "Network hiccup. Say that again and I’ll catch it.";
      addBubble("assistant", msg);
      history.push({role:"assistant", content:msg});
      saveHistory();
      console.error(err);
    }
  });

  function sanitizeReply(t){
    // Strip visible bracketed stage directions and asterisks
    t = t.replace(/\[(?:[^\[\]]{0,80})\]/g, "").replace(/\*([^*]{0,80})\*/g, "$1");
    // Keep it tight: max ~2 lines
    return t.split("\n").slice(0,3).join("\n").trim();
  }

  async function streamInto(res){
    const reader = res.body?.getReader();
    if (!reader){ throw new Error("No reader"); }
    let buf = "";
    // create a live bubble
    const live = el.tplAi.content.firstElementChild.cloneNode(true);
    el.list.appendChild(live);
    el.list.scrollTop = el.list.scrollHeight;

    while (true){
      const {value, done} = await reader.read();
      if (done) break;
      buf += new TextDecoder().decode(value, {stream:true});
      // naive SSE parse: lines starting with "data:"
      const parts = buf.split("\n\n");
      for (let i=0;i<parts.length-1;i++){
        const chunk = parts[i].replace(/^data:\s?/, "");
        if (chunk === "[DONE]") continue;
        const payload = safeParse(chunk);
        const token = (payload && payload.delta) || "";
        live.textContent += token;
        el.list.scrollTop = el.list.scrollHeight;
      }
      buf = parts[parts.length-1];
    }
    const finalText = live.textContent.trim();
    if (finalText){
      history.push({role:"assistant", content: sanitizeReply(finalText)});
      saveHistory();
    } else {
      live.textContent = "…";
    }
  }

  function safeParse(s){ try{return JSON.parse(s);}catch{return null;} }

  // Accessibility nicety: focus input on load
  setTimeout(() => { el.input?.focus?.(); }, 50);
})();
