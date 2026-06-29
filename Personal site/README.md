# Xavi Flores — Portfolio Site

## Folder Structure

```
xavi-flores/
├── index.html          ← Home page (full-screen video)
├── css/
│   └── style.css       ← All styles (shared across every page)
├── js/
│   └── main.js         ← Shared JavaScript (header behaviour, etc.)
├── images/
│   └── Timeline_2.mov  ← Place your video and photo assets here
└── pages/
    ├── about.html      ← About Me page
    ├── video.html      ← Video page
    └── photo.html      ← Photo page
```

## Getting Started

1. Copy your video file (`Timeline_2.mov`) into the `images/` folder.
2. Open `index.html` in a browser — all links are relative so no server is needed for local development.
3. To deploy, upload the entire `xavi-flores/` folder to your host (Netlify, Vercel, GitHub Pages, etc.).

## Adding Content

- **Video page** — edit `pages/video.html` and add `<video>` embeds or iframe embeds (YouTube/Vimeo) inside `.page-wrap`.
- **Photo page** — edit `pages/photo.html` and add your `<img>` tags (sourced from `../images/`) inside `.page-wrap`.
- **About page** — replace the lorem ipsum in `pages/about.html` with your real bio.
- **Styles** — all design tokens (colors, fonts, spacing) live at the top of `css/style.css` inside `:root {}`.
