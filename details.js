import { show, hide, escapeHtml } from './utils.js';

const API_BASE = '/.netlify/functions';

const els = {
  loading: document.getElementById('details-loading'),
  error: document.getElementById('details-error'),
  errorMessage: document.getElementById('details-error-message'),
  content: document.getElementById('details-content'),
  backBtn: document.getElementById('back-btn'),
};

function getAppIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('appid');
}

function goBack() {
  window.location.href = 'index.html';
}

async function loadDetails(appid) {
  hide(els.error);
  show(els.loading);
  hide(els.content);

  try {
    const res = await fetch(
      `${API_BASE}/steam-game-details?appid=${encodeURIComponent(appid)}`
    );
    const data = await res.json();

    if (!res.ok) {
      els.errorMessage.textContent = data.error || 'Failed to load game details.';
      hide(els.loading);
      show(els.error);
      return;
    }

    const name = data.name || 'Unknown game';
    const header = data.headerImage;
    const shortDesc = data.shortDescription || 'No description available.';
    const release = data.releaseDate || 'Unknown release date';
    const genres = (data.genres || []).join(', ');
    const devs = (data.developers || []).join(', ');
    const pubs = (data.publishers || []).join(', ');
    const steamUrl = data.steamUrl;

    const html = `
        <article class="details-layout">
          ${
            header
              ? `<div class="details-hero">
                   <img src="${escapeHtml(
                     header
                   )}" alt="Header art for ${escapeHtml(name)}" class="details-image" loading="lazy" />
                 </div>`
              : ''
          }
          <div class="details-body">
            <h2 class="details-title">${escapeHtml(name)}</h2>
            <p class="details-meta text-muted">
              <span>Release date: ${escapeHtml(release)}</span>
              ${genres ? ` &middot; <span>Genres: ${escapeHtml(genres)}</span>` : ''}
            </p>
            <p class="details-description">${shortDesc}</p>
            <dl class="details-list text-muted">
              ${
                devs
                  ? `<div><dt>Developer</dt><dd>${escapeHtml(devs)}</dd></div>`
                  : ''
              }
              ${
                pubs
                  ? `<div><dt>Publisher</dt><dd>${escapeHtml(pubs)}</dd></div>`
                  : ''
              }
            </dl>
            <div class="details-actions">
              ${
                steamUrl
                  ? `<a href="${escapeHtml(
                      steamUrl
                  )}" class="btn btn-primary" target="_blank" rel="noreferrer">View on Steam</a>`
                  : ''
              }
            </div>
          </div>
        </article>
      `;

    els.content.innerHTML = html;
    hide(els.loading);
    show(els.content);
  } catch (err) {
    console.error(err);
    els.errorMessage.textContent = 'Network error while loading game details.';
    hide(els.loading);
    show(els.error);
  }
}

els.backBtn.addEventListener('click', goBack);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') goBack();
});

const appid = getAppIdFromUrl();
if (!appid) {
  els.errorMessage.textContent = 'No game specified.';
  hide(els.loading);
  show(els.error);
} else {
  loadDetails(appid);
}

