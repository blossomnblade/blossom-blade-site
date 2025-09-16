/* Blossom & Blade — /scripts/mod.js
   Lightweight client-side moderation logger.
   - Detects trigger words
   - Stores mod log in localStorage
   - Exposes helpers under window.Mod
*/

(function(){
  const LS_KEY = 'bb_modlog_v1';

  // Keep these in sync with server BLOCK, plus friendly variants
  const TRIGGERS = [
    /rape/i,
    /incest/i,
    /\b(minor|underage)\b/i,
    /traffick/i,
    /\b(scat|feces)\b/i,
    /\b988\b/,                      // crisis line mention
    /\bsuicide\b/i,
    /\bkill\s+myself\b/i
  ];

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
    try{ localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(-500))); }catch(_){}
  }

  function logStrike({room, role, text, hits}){
    const arr = readLog();
    arr.push({
      ts: new Date().toISOString(),
      room: (room||'').toLowerCase(),
      role: role || 'user',
      hits: hits||[],
      text: String(text||'').slice(0, 1200) // cap for safety
    });
    writeLog(arr);
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

  window.Mod = { hitList, logStrike, getLog, clearLog, downloadJSON };
})();
