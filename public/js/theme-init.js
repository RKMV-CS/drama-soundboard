// Runs synchronously in <head> so the saved theme paints on first frame (no flash).
(function () {
  var theme = "tape";
  try {
    if (localStorage.getItem("sb_theme") === "book") theme = "book";
  } catch (e) { /* storage blocked: keep default */ }
  document.documentElement.dataset.theme = theme;
})();
