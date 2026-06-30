// ─── Video Page: dynamic loading + WebM/MP4 toggle + autoplay on scroll + Lightbox ──

(function () {
  const BASE_URL = 'https://player.mediadelivery.net/embed/';

  const list         = document.getElementById('video-list');
  const statusEl     = document.getElementById('video-status');
  const lightbox     = document.getElementById('video-lightbox');
  const vlbIframe    = document.getElementById('vlb-iframe');
  const vlbTitle     = document.getElementById('vlb-title');
  const vlbDesc      = document.getElementById('vlb-description');
  const vlbClose     = document.getElementById('vlb-close');
  const qualityToggle = document.getElementById('quality-toggle');
  const labelWebm    = document.getElementById('label-webm');
  const labelMp4     = document.getElementById('label-mp4');

  let libraryId  = null;
  let observer   = null;
  let useMp4     = false;      // false = WebM (default), true = MP4
  let openItemId = null;       // tracks which video is currently open in the lightbox (by webm id)

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
        <div class="video-item"
             data-id="${v.id}"
             data-mp4-id="${v.mp4Id || ''}"
             data-title="${escapeHtml(v.title)}"
             data-description="${escapeHtml(v.description)}">
          <iframe
            src="${embedUrl(v.id, false, false)}"
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

  // Builds the embed URL for a given video id, choosing WebM or MP4 source
  // based on the current toggle state (falls back to WebM id if no MP4 match).
  function embedUrl(webmId, mp4Id, autoplay) {
    const id = (useMp4 && mp4Id) ? mp4Id : webmId;
    return `${BASE_URL}${libraryId}/${id}?autoplay=${autoplay}&muted=true&loop=true&preload=true`;
  }

  function currentIdFor(item) {
    const webmId = item.dataset.id;
    const mp4Id  = item.dataset.mp4Id;
    return (useMp4 && mp4Id) ? mp4Id : webmId;
  }

  // ── Autoplay muted iframes as they scroll into view ───────────────────────
  function setupAutoplay() {
    if (observer) observer.disconnect();

    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const iframe = entry.target.querySelector('iframe');
        const id     = currentIdFor(entry.target);

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
    const id          = currentIdFor(item);
    const title       = item.dataset.title;
    const description = item.dataset.description;

    openItemId = item.dataset.id; // track by webm id so the toggle can find it again

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
    openItemId = null;
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

  // ── Quality Toggle (WebM / MP4) ────────────────────────────────────────────
  function applyQualityToAll() {
    // Update every grid item's iframe src to the new format, preserving
    // play state: items currently in view keep autoplaying.
    document.querySelectorAll('.video-item').forEach(item => {
      const iframe = item.querySelector('iframe');
      const id     = currentIdFor(item);
      const rect   = item.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;

      iframe.src = `${BASE_URL}${libraryId}/${id}?autoplay=${inView}&muted=true&loop=true&preload=true`;
    });

    // If a video is currently open in the lightbox, swap it too.
    if (openItemId) {
      const openItem = document.querySelector(`.video-item[data-id="${openItemId}"]`);
      if (openItem) {
        const id = currentIdFor(openItem);
        vlbIframe.src = `${BASE_URL}${libraryId}/${id}?autoplay=true&muted=false&loop=false&preload=true`;
      }
    }
  }

  function setToggleUI() {
    qualityToggle.setAttribute('aria-pressed', useMp4 ? 'true' : 'false');
    labelWebm.classList.toggle('active', !useMp4);
    labelMp4.classList.toggle('active', useMp4);
  }

  qualityToggle.addEventListener('click', () => {
    useMp4 = !useMp4;
    setToggleUI();
    applyQualityToAll();
  });

  // ── Init ───────────────────────────────────────────────────────────────────
  setToggleUI();
  loadVideos();
})();
