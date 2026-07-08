// ─── Video Page: preview clips + Stream lightbox ──────────────────────────────

(function () {
  const EMBED_BASE = 'https://player.mediadelivery.net/embed/';

  const list      = document.getElementById('video-list');
  const statusEl  = document.getElementById('video-status');
  const lightbox  = document.getElementById('video-lightbox');
  const vlbIframe = document.getElementById('vlb-iframe');
  const vlbTitle  = document.getElementById('vlb-title');
  const vlbDesc   = document.getElementById('vlb-description');
  const vlbClose  = document.getElementById('vlb-close');

  let libraryId  = null;
  let activeItem = null;

  // ── Fetch video list and build the page ──────────────────────────────────
  async function loadVideos() {
    statusEl.style.display = 'block';
    statusEl.textContent = 'Loading videos…';

    try {
      const data = window.__PRELOADED_VIDEOS__ || await (async () => {
        const res = await fetch('/api/videos');
        if (!res.ok) throw new Error('Request failed: ' + res.status);
        return res.json();
      })();

      const videos = data.videos || [];
      libraryId    = data.libraryId;

      if (videos.length === 0) {
        statusEl.textContent = 'No videos yet.';
        return;
      }

      statusEl.style.display = 'none';

      list.innerHTML = videos.map(v => `
        <div class="video-item"
             data-video-id="${v.videoId}"
             data-title="${escapeHtml(v.title)}"
             data-description="${escapeHtml(v.description)}">
          <video class="video-preview" autoplay muted loop playsinline>
            <source src="${v.previewUrl}" type="video/${v.previewExt === 'mov' ? 'mp4' : v.previewExt}" />
          </video>
          <div class="video-item-overlay"></div>
        </div>
      `).join('');

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

  // ── Lightbox ──────────────────────────────────────────────────────────────
  function setupClickHandlers() {
    document.querySelectorAll('.video-item').forEach(item => {
      item.querySelector('.video-item-overlay').addEventListener('click', () => {
        if (item.dataset.videoId) openLightbox(item);
      });
    });
  }

  function openLightbox(item) {
    activeItem    = item;
    const videoId = item.dataset.videoId;

    vlbIframe.src         = `${EMBED_BASE}${libraryId}/${videoId}?autoplay=true&muted=false&loop=false&preload=true`;
    vlbTitle.textContent  = item.dataset.title;
    vlbDesc.textContent   = item.dataset.description;
    vlbDesc.style.display = item.dataset.description ? 'block' : 'none';

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

  // ── Reset preview videos on tab refocus ──────────────────────────────────
  function setupVisibilityReset() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        document.querySelectorAll('.video-preview').forEach(video => {
          video.currentTime = 0;
          video.play().catch(() => {});
        });
      }
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  loadVideos();
})();
