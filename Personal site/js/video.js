// ─── Video Page: Autoplay on scroll + Lightbox ───────────────────────────────

(function () {
  const LIB      = '596543';
  const BASE_URL = 'https://player.mediadelivery.net/embed/';

  const items     = Array.from(document.querySelectorAll('.video-item'));
  const lightbox  = document.getElementById('video-lightbox');
  const vlbIframe = document.getElementById('vlb-iframe');
  const vlbTitle  = document.getElementById('vlb-title');
  const vlbClose  = document.getElementById('vlb-close');

  // ── Autoplay muted iframes as they scroll into view ──────────────────────
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const iframe = entry.target.querySelector('iframe');
      const id     = entry.target.dataset.id;

      if (entry.isIntersecting) {
        iframe.src = `${BASE_URL}${LIB}/${id}?autoplay=true&muted=true&loop=true&preload=true`;
      } else {
        iframe.src = `${BASE_URL}${LIB}/${id}?autoplay=false&muted=true&loop=true&preload=true`;
      }
    });
  }, {
    threshold: 0.4
  });

  items.forEach(item => observer.observe(item));

  // ── Lightbox ─────────────────────────────────────────────────────────────

  function openLightbox(item) {
    const id    = item.dataset.id;
    const title = item.dataset.title;

    // Lightbox version: autoplay on, unmuted, with controls
    vlbIframe.src        = `${BASE_URL}${LIB}/${id}?autoplay=true&muted=false&loop=false&preload=true`;
    vlbTitle.textContent = title;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    vlbIframe.src = '';
    document.body.style.overflow = '';
  }

  items.forEach(item => {
    item.querySelector('.video-item-overlay').addEventListener('click', () => {
      openLightbox(item);
    });
  });

  vlbClose.addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && lightbox.classList.contains('open')) {
      closeLightbox();
    }
  });
})();
