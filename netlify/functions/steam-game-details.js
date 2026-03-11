/**
 * Returns Steam store details for a single appid.
 * Uses the unofficial Storefront API (no API key required).
 */
exports.handler = async (event) => {
  const appid = event.queryStringParameters?.appid;

  if (!appid) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'appid is required.' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  const url = `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(
    appid
  )}&cc=us&l=english`;

  try {
    const res = await fetch(url);
    const json = await res.json();

    const entry = json?.[appid];
    if (!res.ok || !entry || !entry.success || !entry.data) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Game details not found for this appid.' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    const data = entry.data;
    const genres = (data.genres || []).map((g) => g.description);
    const developers = data.developers || [];
    const publishers = data.publishers || [];

    const payload = {
      appid: data.steam_appid,
      name: data.name,
      shortDescription: data.short_description || '',
      headerImage: data.header_image || '',
      website: data.website || '',
      isFree: !!data.is_free,
      releaseDate: data.release_date?.date || '',
      genres,
      developers,
      publishers,
      steamUrl: `https://store.steampowered.com/app/${data.steam_appid}`,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (err) {
    console.error('steam-game-details error:', err);
    return {
      statusCode: 502,
      body: JSON.stringify({
        error: 'Failed to reach Steam store API.',
        details: err.message || String(err),
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};

