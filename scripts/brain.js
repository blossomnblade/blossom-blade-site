/* Blossom & Blade — brain.js (standalone, safe drop-in)
   - Per-man background map (uses real filenames)
   - Natural openers per man
   - Auto-applies on chat.html: ?man=<name>&sub=<day|night>
   - Exposes window.BB helpers
*/
(function(){
  const BG_BY_MAN = {
    alexander: '/images/bg_alexander_boardroom.jpg',
    dylan: '/images/dylan-garage.jpg',
    grayson: '/images/grayson-bg.jpg',
    silas: '/images/bg_silas_stage.jpg',
    blade: '/images/blade-woods.jpg',
    jesse: '/images/jesse_bg.jpg', // UNDERSCORE
  };

  const OPENERS_BY_MAN = {
    alexander: [
      "There you are, love.",
      "Evening. Miss me?",
      "You clean up trouble like a pro."
    ],
    dylan: [
      "Hey pretty thing.",
      "Slide in, I wiped the seat.",
      "Got grease or gossip for me?"
    ],
    grayson: [
      "You found me.",
      "Stay close.",
      "What kind of mischief tonight?"
    ],
    silas: [
      "Backstage passes again?",
      "There you are, star.",
      "Wanna tune me up or turn me up?"
    ],
    blade: [
      "Hey trouble.",
      "I like how you show up.",
      "Helmet off or on, gorgeous?"
    ],
    jesse: [
      "Knew you’d come back.",
      "C’mon, let’s make some noise.",
      "You and me against the slow day."
    ]
  };

  function pickOpener(man){
    const list = OPENERS_BY_MAN[man] || ["There you are, love."];
    return list[Math.floor(Math.random() * list.length)];
  }

  function applyChatUI(){
    const isChat = /chat\.html$/i.test(location.pathname) || document.querySelector('[data-chat-root]');
    if(!isChat) return;

    const params = new URLSearchParams(window.location.search);
    const man = (params.get('man') || 'alexander').toLowerCase();
    const bg = BG_BY_MAN[man] || BG_BY_MAN.alexander;

    document.documentElement.style.setProperty('--room-bg', `url(${bg})`);

    const openerEl = document.querySelector('[data-chat-opener]');
    if(openerEl){ openerEl.textContent = pickOpener(man); }
  }

  window.BB = { BG_BY_MAN, OPENERS_BY_MAN, pickOpener, applyChatUI };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyChatUI);
  } else {
    applyChatUI();
  }
})();
