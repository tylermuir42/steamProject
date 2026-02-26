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
    totalPlaytime: document.getElementById('total-playtime'),
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

  function formatHltbHours(hours) {
    if (hours == null || hours <= 0) return null;
    if (hours >= 100) return Math.round(hours) + 'h';
    return hours % 1 === 0 ? hours + 'h' : hours.toFixed(1) + 'h';
  }

  async function loadHltbForGames(games) {
    const CONCURRENCY = 4;
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    let hltbWarned = false;
    let hltbUnavailable = false;

    for (let i = 0; i < games.length && !hltbUnavailable; i += CONCURRENCY) {
      const chunk = games.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async (g) => {
          if (hltbUnavailable) return;
          const name = g.name || 'Unknown';
          const appid = g.appid != null ? String(g.appid) : '';
          try {
            const res = await fetch(
              `${API_BASE}/hltb-search?name=${encodeURIComponent(name)}`
            );
            const data = await res.json();
            const row = els.gamesList.querySelector(`[data-appid="${appid}"]`);
            const span = row?.querySelector('.game-avg-placeholder');
            if (!span) return;
            if (!res.ok || data.error) {
              hltbUnavailable = true;
              if (!hltbWarned) {
                console.warn('How Long to Beat is temporarily unavailable (site changed their API). Time-to-beat column will show —.');
                hltbWarned = true;
              }
              span.textContent = 'Avg. time to beat: —';
              return;
            }
            if (data.found && data.main != null) {
              const mainStr = formatHltbHours(data.main);
              span.textContent = mainStr ? `Avg. time to beat: ${mainStr}` : 'Avg. time to beat: —';
            } else {
              span.textContent = 'Avg. time to beat: —';
            }
          } catch (_) {
            hltbUnavailable = true;
            if (!hltbWarned) {
              console.warn('How Long to Beat lookups failed (network or function). Check the Network tab for /.netlify/functions/hltb-search.');
              hltbWarned = true;
            }
            const row = els.gamesList.querySelector(`[data-appid="${appid}"]`);
            const span = row?.querySelector('.game-avg-placeholder');
            if (span) span.textContent = 'Avg. time to beat: —';
          }
        })
      );
      if (i + CONCURRENCY < games.length && !hltbUnavailable) await delay(200);
    }
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
        els.totalPlaytime.textContent = '';
        els.gamesList.innerHTML = '<p class="card">No games in your library (or profile is private).</p>';
        return;
      }

      const totalMinutes = games.reduce((sum, g) => sum + (g.playtime_forever || 0), 0);
      els.totalPlaytime.textContent = `Total playtime: ${formatMinutes(totalMinutes)}`;

      const sortedGames = games.slice().sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0));
      els.gamesList.innerHTML = sortedGames
        .map(function (g) {
          const playtime = formatMinutes(g.playtime_forever || 0);
          const name = g.name || 'Unknown';
          const appid = g.appid != null ? String(g.appid) : '';
          return (
            '<div class="game-row" data-appid="' + escapeHtml(appid) + '">' +
            `<span class="game-name">${escapeHtml(name)}</span>` +
            `<span class="game-playtime">${escapeHtml(playtime)}</span>` +
            '<span class="game-avg-placeholder">Avg. time to beat: —</span>' +
            '</div>'
          );
        })
        .join('');
      show(els.gamesSection);

      loadHltbForGames(sortedGames);
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
