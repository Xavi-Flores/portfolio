// ─── Video Page: dynamic loading + autoplay on scroll + lightbox quality toggle ──

(function () {
  const BASE_URL = 'https://player.mediadelivery.net/embed/';

  const list          = document.getElementById('video-list');
  const statusEl      = document.getElementById('video-status');
  const lightbox      = document.getElementById('video-lightbox');
  const vlbIframe     = document.getElementById('vlb-iframe');
  const vlbTitle      = document.getElementById('vlb-title');
  const vlbDesc       = document.getElementById('vlb-description');
  const vlbClose      = document.getElementById('vlb-close');
  const qualityToggle = document.getElementById('quality-toggle');
  const labelWebm     = document.getElementById('label-webm');
  const labelMp4      = document.getElementById('label-mp4');
  const vlbQuality    = document.getElementById('vlb-quality');

  let libraryId  = null;
  let observer   = null;
  let useMp4     = false;
  let activeItem = null;

  // ── Fetch video list and build the page ──────────────────────────────────
  async function loadVideos() {
    statusEl.style.display = 'block';
    statusEl.textContent = 'Loading videos…';

    try {
      const res = await fetch('/api/videos');
      if (!res.ok) throw new Error('Request failed: ' + res.status);

      const data   = await res.json();
      const videos = data.videos || [];
      libraryId    = data.libraryId;

      if (videos.length === 0) {
        statusEl.textContent = 'No videos yet.';
        return;
      }

      statusEl.style.display = 'none';

      list.innerHTML = videos.map(v => `
        <div class="video-item"
             data-id="${v.id}"
             data-mp4-id="${v.mp4Id || ''}"
             data-title="${escapeHtml(v.title)}"
             data-description="${escapeHtml(v.description)}">
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
      setupVisibilityReset();

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
        iframe.src   = `${BASE_URL}${libraryId}/${id}?autoplay=${entry.isIntersecting}&muted=true&loop=true&preload=true`;
      });
    }, { threshold: 0.4 });

    document.querySelectorAll('.video-item').forEach(item => observer.observe(item));
  }

  // ── Lightbox ──────────────────────────────────────────────────────────────
  function setupClickHandlers() {
    document.querySelectorAll('.video-item').forEach(item => {
      item.querySelector('.video-item-overlay').addEventListener('click', () => {
        openLightbox(item);
      });
    });
  }

  function lightboxSrc(item) {
    const webmId = item.dataset.id;
    const mp4Id  = item.dataset.mp4Id;
    const id     = (useMp4 && mp4Id) ? mp4Id : webmId;
    return `${BASE_URL}${libraryId}/${id}?autoplay=true&muted=false&loop=false&preload=true`;
  }

  function openLightbox(item) {
    activeItem            = item;
    vlbIframe.src         = lightboxSrc(item);
    vlbTitle.textContent  = item.dataset.title;
    vlbDesc.textContent   = item.dataset.description;
    vlbDesc.style.display = item.dataset.description ? 'block' : 'none';

    if (vlbQuality) {
      vlbQuality.style.display = (useMp4 && !!item.dataset.mp4Id) ? 'block' : 'none';
    }

    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    vlbIframe.src = '';
    activeItem    = null;
    document.body.style.overflow = '';
  }

  vlbClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
  });

  // ── Global quality toggle ─────────────────────────────────────────────────
  function setToggleUI() {
    qualityToggle.setAttribute('aria-pressed', useMp4 ? 'true' : 'false');
    labelWebm.classList.toggle('active', !useMp4);
    labelMp4.classList.toggle('active', useMp4);
    qualityToggle.dataset.tooltip = useMp4
      ? 'Currently playing in 4K MP4 for best quality. Switch to WebM for faster loading.'
      : 'Currently playing in WebM for best web performance. Switch to 4K MP4 for full resolution.';
  }

  qualityToggle.addEventListener('click', () => {
    useMp4 = !useMp4;
    setToggleUI();
    console.log('[Toggle] useMp4:', useMp4);
    console.log('[Toggle] activeItem:', activeItem);
    console.log('[Toggle] lightbox open:', lightbox.classList.contains('open'));
    if (activeItem && lightbox.classList.contains('open')) {
      const src = lightboxSrc(activeItem);
      console.log('[Toggle] switching lightbox to:', src);
      vlbIframe.src = src;
      if (vlbQuality) {
        vlbQuality.style.display = (useMp4 && !!activeItem.dataset.mp4Id) ? 'block' : 'none';
      }
    } else {
      console.log('[Toggle] lightbox not open — toggle only affects next video opened');
    }
  });

  // ── Reset list iframes on tab refocus to prevent player UI flash ──────────
  function setupVisibilityReset() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        document.querySelectorAll('.video-item iframe').forEach(iframe => {
          const src = iframe.src;
          if (!src) return;
          iframe.src = '';
          setTimeout(() => { iframe.src = src; }, 50);
        });
      }
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  setToggleUI();
  loadVideos();
})();
