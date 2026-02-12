(function () {
  const API_BASE = '/.netlify/functions';

  const els = {
    loginBtn: document.getElementById('login-btn'),
    userArea: document.getElementById('user-area'),
    userName: document.getElementById('user-name'),
    logoutBtn: document.getElementById('logout-btn'),
    welcome: document.getElementById('welcome'),
    loading: document.getElementById('loading'),
    gamesSection: document.getElementById('games-section'),
    gamesList: document.getElementById('games-list'),
    error: document.getElementById('error'),
    errorMessage: document.getElementById('error-message'),
  };

  function show(el) {
    el.classList.remove('hidden');
  }
  function hide(el) {
    el.classList.add('hidden');
  }

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
        show(els.gamesSection);
        els.gamesList.innerHTML = '<p class="card">No games in your library (or profile is private).</p>';
        return;
      }

      els.gamesList.innerHTML = games
        .sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0))
        .map(function (g) {
          const playtime = formatMinutes(g.playtime_forever || 0);
          const name = g.name || 'Unknown';
          return (
            '<div class="game-row">' +
            `<span class="game-name">${escapeHtml(name)}</span>` +
            `<span class="game-playtime">${escapeHtml(playtime)}</span>` +
            '<span class="game-avg-placeholder">Avg. time to beat: —</span>' +
            '</div>'
          );
        })
        .join('');
      show(els.gamesSection);
    } catch (err) {
      showError('Network error. Check the console.');
      console.error(err);
    }
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  els.logoutBtn.addEventListener('click', function () {
    setSteamId(null);
    renderUI(null);
  });

  const steamId = readSteamIdFromUrl();
  setLoginUrl();
  renderUI(steamId);
})();
