/**
 * Proxies Steam GetOwnedGames API to avoid CORS in the browser.
 * Requires STEAM_API_KEY in Netlify environment variables.
 */
exports.handler = async (event) => {
  const key = process.env.STEAM_API_KEY;
  if (!key) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'STEAM_API_KEY is not set in Netlify.' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  const steamid = event.queryStringParameters?.steamid;
  if (!steamid) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'steamid is required.' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  const params = new URLSearchParams({
    key,
    steamid,
    include_appinfo: '1',
    format: 'json',
  });

  const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1?${params.toString()}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: data.error?.message || 'Steam API error.' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    const games = data.response?.games || [];
    return {
      statusCode: 200,
      body: JSON.stringify({ games }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Failed to reach Steam API.' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};
