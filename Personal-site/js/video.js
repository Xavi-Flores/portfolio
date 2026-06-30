// ─── Video Page: dynamic loading + autoplay on scroll + lightbox with quality toggle ──
//
// List view:    always WebM, muted, autoplay on scroll — toggle has no effect here
// Lightbox:     opens in whichever format the global toggle is set to (WebM or 4K MP4)
//               falls back to WebM if no MP4 match exists for that video

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
  let useMp4     = false;   // global toggle state
  let activeItem = null;    // video-item currently open in lightbox

  // ── Fetch video list and build the page ────────────────────────────────────
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

      // List always uses WebM, muted, looping — toggle doesn't affect list
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

  // ── Autoplay muted iframes as they scroll into view ────────────────────────
  function setupAutoplay() {
    if (observer) observer.disconnect();

    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const iframe = entry.target.querySelector('iframe');
        const id     = entry.target.dataset.id; // always WebM in list

        iframe.src = `${BASE_URL}${libraryId}/${id}?autoplay=${entry.isIntersecting}&muted=true&loop=true&preload=true`;
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

  function lightboxSrc(item) {
    const webmId = item.dataset.id;
    const mp4Id  = item.dataset.mp4Id;
    // Use MP4 if toggle is on AND this video has an MP4 counterpart
    const id = (useMp4 && mp4Id) ? mp4Id : webmId;
    return `${BASE_URL}${libraryId}/${id}?autoplay=true&muted=false&loop=false&preload=true`;
  }

  function openLightbox(item) {
    activeItem = item;

    vlbIframe.src         = lightboxSrc(item);
    vlbTitle.textContent  = item.dataset.title;
    vlbDesc.textContent   = item.dataset.description;
    vlbDesc.style.display = item.dataset.description ? 'block' : 'none';

    // Show the "playing in 4K MP4" indicator if toggle is on and match exists
    if (vlbQuality) {
      const isPlayingMp4 = useMp4 && !!item.dataset.mp4Id;
      vlbQuality.style.display = isPlayingMp4 ? 'block' : 'none';
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

  // ── Global quality toggle ──────────────────────────────────────────────────
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
    // If lightbox is open, immediately reload it in the new quality
    if (activeItem && lightbox.classList.contains('open')) {
      vlbIframe.src = lightboxSrc(activeItem);
      if (vlbQuality) {
        const isPlayingMp4 = useMp4 && !!activeItem.dataset.mp4Id;
        vlbQuality.style.display = isPlayingMp4 ? 'block' : 'none';
      }
    }
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  setToggleUI();
  loadVideos();
})();
