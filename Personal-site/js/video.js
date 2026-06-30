// ─── Video Page: dynamic loading from Bunny Stream + autoplay on scroll + Lightbox ──

(function () {
  const BASE_URL = 'https://player.mediadelivery.net/embed/';

  const list      = document.getElementById('video-list');
  const statusEl  = document.getElementById('video-status');
  const lightbox  = document.getElementById('video-lightbox');
  const vlbIframe = document.getElementById('vlb-iframe');
  const vlbTitle  = document.getElementById('vlb-title');
  const vlbDesc   = document.getElementById('vlb-description');
  const vlbClose  = document.getElementById('vlb-close');

  let libraryId = null;
  let observer  = null;

  // ── Fetch video list from the serverless API and build the page ──────────
  async function loadVideos() {
    statusEl.style.display = 'block';
    statusEl.textContent = 'Loading videos…';

    try {
      const res = await fetch('/api/videos');
      if (!res.ok) throw new Error('Request failed: ' + res.status);

      const data = await res.json();
      const videos = data.videos || [];
      libraryId = data.libraryId;

      if (videos.length === 0) {
        statusEl.textContent = 'No videos yet.';
        return;
      }

      statusEl.style.display = 'none';

      list.innerHTML = videos.map(v => `
        <div class="video-item" data-id="${v.id}" data-title="${escapeHtml(v.title)}" data-description="${escapeHtml(v.description)}">
          <iframe
            src="${BASE_URL}${libraryId}/${v.id}?autoplay=false&muted=true&loop=true&preload=true"
            loading="lazy"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowfullscreen></iframe>
          <div class="video-item-overlay"></div>
        </div>
      `).join('');

      setupAutoplay();
      setupClickHandlers();

    } catch (err) {
      statusEl.textContent = 'Could not load videos. Please try again later.';
      console.error('Video load error:', err);
    }
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // ── Autoplay muted iframes as they scroll into view ───────────────────────
  function setupAutoplay() {
    if (observer) observer.disconnect();

    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const iframe = entry.target.querySelector('iframe');
        const id     = entry.target.dataset.id;

        if (entry.isIntersecting) {
          iframe.src = `${BASE_URL}${libraryId}/${id}?autoplay=true&muted=true&loop=true&preload=true`;
        } else {
          iframe.src = `${BASE_URL}${libraryId}/${id}?autoplay=false&muted=true&loop=true&preload=true`;
        }
      });
    }, { threshold: 0.4 });

    document.querySelectorAll('.video-item').forEach(item => observer.observe(item));
  }

  // ── Lightbox ───────────────────────────────────────────────────────────────
  function setupClickHandlers() {
    document.querySelectorAll('.video-item').forEach(item => {
      item.querySelector('.video-item-overlay').addEventListener('click', () => {
        openLightbox(item);
      });
    });
  }

  function openLightbox(item) {
    const id          = item.dataset.id;
    const title       = item.dataset.title;
    const description = item.dataset.description;

    vlbIframe.src = `${BASE_URL}${libraryId}/${id}?autoplay=true&muted=false&loop=false&preload=true`;
    vlbTitle.textContent = title;
    vlbDesc.textContent  = description;
    vlbDesc.style.display = description ? 'block' : 'none';

    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    vlbIframe.src = '';
    document.body.style.overflow = '';
  }

  vlbClose.addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && lightbox.classList.contains('open')) {
      closeLightbox();
    }
  });

  // ── Init ───────────────────────────────────────────────────────────────────
  loadVideos();
})();
