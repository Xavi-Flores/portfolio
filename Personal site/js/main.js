// ─── Header: transparent on home, solid on inner pages ───────────────────────

const header = document.getElementById('site-header');

// Mark the current page's nav link as active and set header state.
// Each page passes its own page key on load.
function initPage(pageKey) {
  // Solid header on all pages except home
  if (pageKey === 'home') {
    header.classList.remove('solid');
  } else {
    header.classList.add('solid');

    // Highlight the matching nav link
    const navLink = document.getElementById('nav-' + pageKey);
    if (navLink) navLink.classList.add('active');
  }
}
