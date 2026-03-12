import { show, hide, escapeHtml } from './utils.js';

const API_BASE = '/.netlify/functions';
const FILTERS_STORAGE_KEY = 'playtimeFilters';

let allGames = [];
let activeFilters = null;

const els = {
    loginBtn: document.getElementById('login-btn'),
    userArea: document.getElementById('user-area'),
    userName: document.getElementById('user-name'),
    logoutBtn: document.getElementById('logout-btn'),
    welcome: document.getElementById('welcome'),
    loading: document.getElementById('loading'),
    gamesSection: document.getElementById('games-section'),
    gamesList: document.getElementById('games-list'),
    totalPlaytime: document.getElementById('total-playtime'),
    error: document.getElementById('error'),
    errorMessage: document.getElementById('error-message'),
    filtersForm: document.getElementById('filters-form'),
    filtersError: document.getElementById('filters-error'),
    filtersReset: document.getElementById('filters-reset'),
    filtersMinHours: document.getElementById('min-hours'),
    filtersStatusAll: document.getElementById('status-all'),
    filtersStatusPlayed: document.getElementById('status-played'),
    filtersStatusUnplayed: document.getElementById('status-unplayed'),
  };

function getSteamId() {
    return localStorage.getItem('steamId');
  }
function setSteamId(id) {
    if (id) localStorage.setItem('steamId', id);
    else localStorage.removeItem('steamId');
  }

function readSteamIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('steamid');
    if (id) {
      setSteamId(id);
      window.history.replaceState({}, document.title, window.location.pathname);
      return id;
    }
    return getSteamId();
  }

function loadFilters() {
    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (!raw) {
        return { playStatus: 'all', minHours: null };
      }
      const parsed = JSON.parse(raw);
      const playStatus =
        parsed.playStatus === 'played' || parsed.playStatus === 'unplayed'
          ? parsed.playStatus
          : 'all';
      const min =
        typeof parsed.minHours === 'number' && parsed.minHours >= 0
          ? parsed.minHours
          : null;
      return { playStatus, minHours: min };
    } catch (_) {
      return { playStatus: 'all', minHours: null };
    }
  }

function saveFilters(filters) {
    try {
      localStorage.setItem(
        FILTERS_STORAGE_KEY,
        JSON.stringify({
          playStatus: filters.playStatus || 'all',
          minHours:
            typeof filters.minHours === 'number' && filters.minHours >= 0
              ? filters.minHours
              : null,
        })
      );
    } catch (_) {
      // ignore storage errors
    }
  }

function syncFilterForm() {
    if (!els.filtersForm) return;
    if (!activeFilters) {
      activeFilters = loadFilters();
    }

    const playStatus = activeFilters.playStatus || 'all';
    if (playStatus === 'played' && els.filtersStatusPlayed) {
      els.filtersStatusPlayed.checked = true;
    } else if (playStatus === 'unplayed' && els.filtersStatusUnplayed) {
      els.filtersStatusUnplayed.checked = true;
    } else if (els.filtersStatusAll) {
      els.filtersStatusAll.checked = true;
    }

    if (els.filtersMinHours) {
      if (typeof activeFilters.minHours === 'number') {
        els.filtersMinHours.value = String(activeFilters.minHours);
      } else {
        els.filtersMinHours.value = '';
      }
    }

    if (els.filtersError) {
      els.filtersError.textContent = '';
    }
  }

function setLoginUrl() {
    const base = window.location.origin;
    els.loginBtn.href = `${base}${API_BASE}/steam-login?returnTo=${encodeURIComponent(base + window.location.pathname)}`;
  }

function renderUI(steamId) {
    if (steamId) {
      hide(els.loginBtn);
      els.userName.textContent = `Steam ID: ${steamId}`;
      show(els.userArea);
      loadGames(steamId);
    } else {
      show(els.loginBtn);
      hide(els.userArea);
      hide(els.gamesSection);
      hide(els.loading);
      hide(els.error);
      show(els.welcome);
    }
  }

function showError(msg) {
    hide(els.loading);
    hide(els.welcome);
    els.errorMessage.textContent = msg;
    show(els.error);
  }

function applyFiltersToGames(games, filters) {
    if (!Array.isArray(games)) return [];
    const filt = filters || { playStatus: 'all', minHours: null };
    const playStatus = filt.playStatus || 'all';
    const minHours =
      typeof filt.minHours === 'number' && filt.minHours >= 0
        ? filt.minHours
        : null;

    return games.filter(function (g) {
      const minutes = g.playtime_forever || 0;
      const hours = minutes / 60;

      if (playStatus === 'played' && !(hours > 0)) {
        return false;
      }
      if (playStatus === 'unplayed' && !(hours === 0)) {
        return false;
      }

      if (minHours != null && !(hours >= minHours)) {
        return false;
      }

      return true;
    });
  }

function renderGamesList() {
    if (!els.gamesSection || !els.gamesList || !els.totalPlaytime) return;

    const games = Array.isArray(allGames) ? allGames : [];

    if (games.length === 0) {
      show(els.gamesSection);
      els.totalPlaytime.textContent = '';
      els.gamesList.innerHTML =
        '<li class="card empty-state">No games in your library (or profile is private).</li>';
      return;
    }

    const filteredGames = applyFiltersToGames(games, activeFilters);

    if (filteredGames.length === 0) {
      show(els.gamesSection);
      els.totalPlaytime.textContent = '';
      els.gamesList.innerHTML =
        '<li class="card empty-state">No games match your filters. Try changing the play status or minimum hours.</li>';
      return;
    }

    const totalMinutes = filteredGames.reduce(
      (sum, g) => sum + (g.playtime_forever || 0),
      0
    );
    els.totalPlaytime.textContent = `Total playtime (filtered): ${formatMinutes(
      totalMinutes
    )}`;

    const sortedGames = filteredGames
      .slice()
      .sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0));

    els.gamesList.innerHTML = sortedGames
      .map(function (g) {
        const playtime = formatMinutes(g.playtime_forever || 0);
        const name = g.name || 'Unknown';
        const appid = g.appid != null ? String(g.appid) : '';
        return (
          '<li class="game-row" data-appid="' + escapeHtml(appid) + '" tabindex="0">' +
          `<span class="game-name">${escapeHtml(name)}</span>` +
          `<span class="game-playtime">${escapeHtml(playtime)}</span>` +
          '</li>'
        );
      })
      .join('');

    show(els.gamesSection);
  }

function formatMinutes(minutes) {
    if (minutes === 0) return 'Not played';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h >= 24) {
      const d = Math.floor(h / 24);
      const restH = h % 24;
      return restH ? `${d}d ${restH}h` : `${d}d`;
    }
    return m ? `${h}h ${m}m` : `${h}h`;
  }

async function loadGames(steamId) {
    hide(els.welcome);
    hide(els.error);
    show(els.loading);
    hide(els.gamesSection);

    try {
      const res = await fetch(`${API_BASE}/steam-owned-games?steamid=${encodeURIComponent(steamId)}`);
      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Failed to load games.');
        return;
      }

      const games = data.games || [];
      hide(els.loading);

      if (games.length === 0) {
        allGames = [];
        renderGamesList();
        return;
      }

      allGames = games;
      renderGamesList();
    } catch (err) {
      showError('Network error. Check the console.');
      console.error(err);
    }
  }

function handleGameRowActivate(row) {
    const appid = row?.getAttribute('data-appid');
    if (!appid) return;
    window.location.href = `details.html?appid=${encodeURIComponent(appid)}`;
  }

els.gamesList.addEventListener('click', function (event) {
    const row = event.target.closest('.game-row');
    if (!row) return;
    handleGameRowActivate(row);
  });

els.gamesList.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('.game-row');
    if (!row) return;
    event.preventDefault();
    handleGameRowActivate(row);
  });

if (els.filtersForm) {
    activeFilters = loadFilters();
    syncFilterForm();

    els.filtersForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!els.filtersForm) return;

      if (els.filtersError) {
        els.filtersError.textContent = '';
      }

      const formData = new FormData(els.filtersForm);
      const playStatusRaw = (formData.get('playStatus') || 'all').toString();
      const playStatus =
        playStatusRaw === 'played' || playStatusRaw === 'unplayed'
          ? playStatusRaw
          : 'all';

      const minHoursStr = (formData.get('minHours') || '').toString().trim();

      let minHours = null;
      if (minHoursStr) {
        const parsed = Number(minHoursStr);
        if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10000) {
          if (els.filtersError) {
            els.filtersError.textContent =
              'Enter a number of hours between 0 and 10,000.';
          }
          if (els.filtersMinHours) {
            els.filtersMinHours.focus();
          }
          return;
        }
        minHours = parsed;
      }

      activeFilters = { playStatus, minHours };
      saveFilters(activeFilters);
      renderGamesList();
    });
  }

if (els.filtersReset) {
  els.filtersReset.addEventListener('click', function () {
    activeFilters = { playStatus: 'all', minHours: null };
    saveFilters(activeFilters);
    syncFilterForm();
    renderGamesList();
  });
}

els.logoutBtn.addEventListener('click', function () {
  setSteamId(null);
  renderUI(null);
});

const steamId = readSteamIdFromUrl();
setLoginUrl();
renderUI(steamId);

