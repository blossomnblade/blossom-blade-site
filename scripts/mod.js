/* Blossom & Blade — /scripts/mod.js
   Client-side moderation logger with receipts:
   - Detects trigger words
   - Strike IDs + session/user IDs
   - Download JSON/CSV
   - Optional webhook POST for server-side receipts
   - Exposes window.Mod
*/

(function(){
  const LS_KEY = 'bb_modlog_v1';
  const SID_KEY = 'bb_session_id_v1';
  const UID_KEY = 'bb_user_id_v1'; // from your paywall/account if available; else generated
  // Optional: set window.MOD_WEBHOOK_URL = 'https://<your-endpoint>';
  const WEBHOOK = () => (typeof window !== 'undefined' && window.MOD_WEBHOOK_URL) ? String(window.MOD_WEBHOOK_URL) : null;

  // --- triggers (keep in sync w/ server) ---
  const TRIGGERS = [
    /rape/i,
    /incest/i,
    /\b(minor|underage)\b/i,
    /traffick/i,
    /\b(scat|feces)\b/i,
    /\b988\b/,
    /\bsuicide\b/i,
    /\bkill\s+myself\b/i
  ];

  // --- ids ---
  function uuid(){
    // RFC4122-ish v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
      const r = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  function getSessionId(){
    try{
      let sid = localStorage.getItem(SID_KEY);
      if(!sid){ sid = uuid(); localStorage.setItem(SID_KEY, sid); }
      return sid;
    }catch(_){ return uuid(); }
  }
  function getUserId(){
    try{
      // Prefer a site user id if you have one
      if (window.BB_ACCESS && window.BB_ACCESS.userId) {
        localStorage.setItem(UID_KEY, String(window.BB_ACCESS.userId));
        return String(window.BB_ACCESS.userId);
      }
      let uid = localStorage.getItem(UID_KEY);
      if(!uid){ uid = 'anon-' + uuid(); localStorage.setItem(UID_KEY, uid); }
      return uid;
    }catch(_){ return 'anon-' + uuid(); }
  }

  // --- helpers ---
  function hitList(text){
    const hits = [];
    for(const rx of TRIGGERS){
      const m = String(text||'').match(rx);
      if(m) hits.push(rx.source.replace(/\\b/g,'').replace(/\(\?:/g,'('));
    }
    return Array.from(new Set(hits));
  }
  function readLog(){
    try{ return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }catch(_){ return []; }
  }
  function writeLog(arr){
    try{ localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(-1000))); }catch(_){}
  }

  async function postWebhook(event){
    const url = WEBHOOK();
    if(!url) return;
    try{
      await fetch(url, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(event)
      });
    }catch(e){
      // best-effort only
      console.warn('Mod webhook failed', e);
    }
  }

  function logStrike({room, role, text, hits}){
    const event = {
      strikeId : uuid(),
      ts       : new Date().toISOString(),
      room     : (room||'').toLowerCase(),
      role     : role || 'user',
      hits     : hits||[],
      text     : String(text||'').slice(0, 1200),
      sessionId: getSessionId(),
      userId   : getUserId()
    };
    const arr = readLog();
    arr.push(event);
    writeLog(arr);
    postWebhook(event);
    return event;
  }

  function clearLog(){ writeLog([]); }
  function getLog(){ return readLog(); }

  function downloadJSON(filename='bb_modlog.json'){
    const blob = new Blob([JSON.stringify(getLog(), null, 2)], {type:'application/json'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadCSV(filename='bb_modlog.csv'){
    const rows = [['strikeId','ts','room','role','hits','text','sessionId','userId']];
    for(const e of getLog()){
      rows.push([
        e.strikeId,
        e.ts,
        e.room,
        e.role,
        (e.hits||[]).join('|'),
        (e.text||'').replace(/\n/g,' ').replace(/"/g,'""'),
        e.sessionId,
        e.userId
      ]);
    }
    const csv = rows.map(r => r.map(cell => `"${String(cell??'')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  window.Mod = { hitList, logStrike, getLog, clearLog, downloadJSON, downloadCSV, getSessionId, getUserId };
})();
