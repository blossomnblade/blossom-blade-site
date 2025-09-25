/* Blossom & Blade — chat runtime (stable layout + portrait fallback + demo replies if API fails) */
(() => {
  // -------- URL state --------
  const qs = new URLSearchParams(location.search);
  const man = (qs.get("man") || "").toLowerCase();

  const VALID  = ["blade","dylan","alexander","silas","grayson","viper"];
  const pretty = { blade:"Blade", dylan:"Dylan", alexander:"Alexander", silas:"Silas", grayson:"Grayson", viper:"Viper" };

  // Cache-bust assets on deploy
  const V = "9";

  // Demo fallback while backend is flaky: set to false when API is solid
  const DEMO_MODE = true;
  const SOFT = {
    blade: ["You again? Put that smile away before I steal it.","You look dangerous. I approve.","Got a request, pretty thing?"],
    dylan: ["You came to see me? I won't pretend I'm not pleased.","What's the vibe tonight? Minimal words, maximal smirk.","Tell me what you want, rider."],
    alexander: ["Right on time. I like that.","We're keeping it clean. Mostly.","Ask for what you want, kitten."],
    silas: ["Hey you.","Tuning up. Want a song or a sin?","Use that voice—I like it."],
    grayson: ["Look who’s here.","Careful what you wish for. I deliver.","Your move."],
    viper: ["Look who’s here.","Loosen the tie for me.","I'll behave if you don't."]
  };

  // -------- DOM --------
  const el = {
    title: document.getElementById("roomTitle
