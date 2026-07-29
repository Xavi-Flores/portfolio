// lib/layout.js
//
// Shared HTML shell for server-rendered pages (/api/video-page, /api/photo-page).
// Mirrors the static markup in pages/about.html so header/nav/meta stay identical
// whether a page is served as a static file or rendered by a serverless function.

const PERSON_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Xavi Flores',
  url: 'https://www.xaviflores.com',
  image: 'https://www.xaviflores.com/images/og-image.webp',
  jobTitle: 'Filmmaker & Photographer',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Brooklyn',
    addressRegion: 'NY',
    addressCountry: 'US',
  },
  sameAs: [
    'https://www.instagram.com/xf.photo/',
    'https://www.tiktok.com/@xfphoto',
    'https://www.youtube.com/@xavifloresfilm',
  ],
};

export function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export function renderPage({ title, description, canonical, activePage, bodyHtml, bootstrapScript = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="author" content="Xavi Flores" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="https://www.xaviflores.com/images/og-image.webp" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="https://www.xaviflores.com/images/og-image.webp" />
  <link rel="icon" type="image/png" sizes="32x32" href="../images/favicon-32x32.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="../images/favicon-32x32.png" />
  <link rel="stylesheet" href="../css/style.css" />
  <script type="application/ld+json">${JSON.stringify(PERSON_SCHEMA)}</script>
</head>
<body>
  <header id="site-header">
    <a class="logo" href="../index.html">Xavi Flores</a>
    <nav id="desktop-nav">
      <a href="about.html" id="nav-about">About</a>
      <a href="video.html" id="nav-video">Video</a>
      <a href="photo.html" id="nav-photo">Photo</a>
    </nav>
    <button class="hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </header>
  <div class="mobile-menu" id="mobile-menu">
    <nav class="mobile-nav">
      <a href="about.html" id="mnav-about">About</a>
      <a href="video.html" id="mnav-video">Video</a>
      <a href="photo.html" id="mnav-photo">Photo</a>
    </nav>
  </div>
  ${bodyHtml}
  <script src="../js/main.js"></script>
  ${bootstrapScript}
  <script>initPage('${activePage}');</script>
</body>
</html>
`;
}
