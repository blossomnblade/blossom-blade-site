/* Blossom & Blade — per-character chat backgrounds
   Drop this in /scripts/bg.js and include it on chat.html with defer.
*/
(function () {
  const params = new URLSearchParams(location.search);
  const man = (params.get("man") || "default").toLowerCase();
  const sub = (params.get("sub") || "").toLowerCase(); // e.g., "night" (not used yet, but available)

  // Map each man to a background image (your current filenames)
  const BG = {
    default: "/images/gothic-bg.jpg",
    blade:   "/images/blade-woods.jpg",
    dylan:   "/images/dylan-garage.jpg",
    grayson: "/images/grayson-bg.jpg",
    silas:   "/images/bg_silas_stage.jpg",
    alexander: "/images/bg_alexander_boardroom.jpg",
    viper:   "/images/viper-bg.jpg",            // <- you just added this
  };

  // Choose; fall back to default if anything is off
  const url = BG[man] || BG.default;

  // Create the backdrop + vignette exactly once
  let back = document.getElementById("bg-backdrop");
  if (!back) {
    back = document.createElement("div");
    back.id = "bg-backdrop";
    document.body.prepend(back);

    const vig = document.createElement("div");
    vig.id = "bg-vignette";
    document.body.prepend(vig);
  }
  back.style.backgroundImage = `url("${url}")`;

  // Defensive: if the image 404s for any reason, revert to default
  const tester = new Image();
  tester.onload = () => { /* good */ };
  tester.onerror = () => { back.style.backgroundImage = `url("${BG.default}")`; };
  tester.src = url;
})();
