// Runs before paint: apply the palette from the URL, or the last one this browser saw, to avoid a flash.
(function () {
  var p = new URLSearchParams(location.search).get("palette");
  if (!/^(paper|stone|sand)$/.test(p)) {
    try { p = localStorage.getItem("palette"); } catch (e) { p = null; }
  }
  if (/^(paper|stone|sand)$/.test(p)) document.documentElement.setAttribute("data-palette", p);
})();
