/* Blossom & Blade — brain.js
   - Backgrounds per man (with Jesse fallbacks)
   - Natural openers
   - Auto-apply on chat.html and expose window.BB
*/
(function(){
  const BG_BY_MAN = {
    alexander: '/images/bg_alexander_boardroom.jpg',
    dylan:     '/images/dylan-garage.jpg',
    grayson:   '/images/grayson-bg.jpg',
    silas:     '/images/bg_silas_stage.jpg',
    blade:     '/images/blade-woods.jpg',
    jesse:     '/images/jesse_bg.jpg', // primary (underscore)
  };

  // If Jesse’s primary path fails, try these; last one is a safe generic.
  const JESSE_CANDIDATES = [
    '/images/jesse_bg.jpg',
    '/images/jesse-bg.jpg',
    '/images/jesse_bg.jpeg',
    '/images/jesse-bg.jpeg',
    '/images/dylan-garage.jpg' // final visual fallback so it’s never black
  ];

  const OPENERS = {
    alexander: ["There you are, love.","Evening. Miss me?","You clean up trouble like a pro."],
    dylan:     ["Hey pretty thing.","Slide in, I wiped the seat.","Got grease or gossip for me?"],
    grayson:   ["You found me.","Stay close.","What kind of mischief tonight?"],
    silas:     ["Backstage passes again?","There you are, star.","Wanna tune me up or turn me up?"],
    blade:     ["Hey trouble.","I like how you show up.","Helmet off or on, gorgeous?"],
    jesse:     ["Knew you’d come back.","C’mon, let’s make some noise.","You and me against the slow day."]
  };

  function pickOpener(man){
    const list = OPENERS[man] || ["There you are, love."];
    return list[Math.floor(Math.random() * list.length)];
  }

  function resolveImage(paths, cb){
    let i = 0;
    function tryNext(){
      if (i >= paths.length) return cb(null);
      const src = paths[i++];
      const img = new Image();
      img.onload = ()=> cb(src);
      img.onerror = tryNext;
      img.src = src;
    }
    tryNext();
  }

  function applyChatUI(){
    const isChat = /chat\.html$/i.test(location.pathname) || document.querySelector('[data-chat-root]');
    if(!isChat) return;

    const params = new URLSearchParams(window.location.search);
    const man = (params.get('man') || 'alexander').toLowerCase();

    if (man === 'jesse'){
      resolveImage(JESSE_CANDIDATES, (src)=>{
        const bg = src || BG_BY_MAN.jesse;
        document.documentElement.style.setProperty('--room-bg', `url(${bg})`);
      });
    } else {
      const bg = BG_BY_MAN[man] || BG_BY_MAN.alexander;
      document.documentElement.style.setProperty('--room-bg', `url(${bg})`);
    }

    const openerEl = document.querySelector('[data-chat-opener]');
    if(openerEl){ openerEl.textContent = pickOpener(man); }
  }

  window.BB = { BG_BY_MAN, pickOpener, applyChatUI };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyChatUI);
  } else {
    applyChatUI();
  }
})();
