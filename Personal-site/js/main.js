// ─── Header: transparent on home, solid on inner pages ────────────────────────

const header      = document.getElementById('site-header');
const hamburger   = document.getElementById('hamburger');
const mobileMenu  = document.getElementById('mobile-menu');

// ── Page init ────────────────────────────────────────────────────────────────
function initPage(pageKey) {
  if (pageKey === 'home') {
    header.classList.remove('solid');
  } else {
    header.classList.add('solid');
    const navLink = document.getElementById('nav-' + pageKey);
    if (navLink) navLink.classList.add('active');
    const mobileLink = document.getElementById('mnav-' + pageKey);
    if (mobileLink) mobileLink.classList.add('active');
  }
}

// ── Hamburger menu ────────────────────────────────────────────────────────────
if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  mobileMenu.addEventListener('click', e => {
    if (e.target === mobileMenu) {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });
}
