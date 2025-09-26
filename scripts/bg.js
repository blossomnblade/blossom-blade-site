/* Blossom & Blade — per-character chat backgrounds */
(function () {
  const params = new URLSearchParams(location.search);
  const man = (params.get("man") || "default").toLowerCase();

  // Keep these filenames exactly as they are in your repo
  const BG = {
    default:   "/images/gothic-bg.jpg",
    blade:     "/images/blade-woods.jpg",
    dylan:     "/images/dylan-garage.jpg",
    grayson:   "/images/grayson-bg.jpg",
    silas:     "/images/bg_silas_stage.jpg",
    alexander: "/images/bg_alexander_boardroom.jpg",
    viper:     "/images/viper-bg.jpg"
  };

  const url = BG[man] || BG.default;

  // Create backdrop + vignette once
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

  // Fallback if 404
  const test = new Image();
  test.onerror = () => { back.style.backgroundImage = `url("${BG.default}")`; };
  test.src = url;
})();
