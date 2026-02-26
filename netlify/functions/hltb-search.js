/**
 * Looks up "How Long to Beat" data for a game by name.
 * Uses the howlongtobeat package (https://github.com/ckatzorke/howlongtobeat).
 * No API key required; runs server-side to avoid CORS.
 */
const hltb = require('howlongtobeat');
const hltbService = new hltb.HowLongToBeatService();

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  };
}

exports.handler = async (event) => {
  let name = event.queryStringParameters?.name;
  if (event.body && event.httpMethod === 'POST') {
    try {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      name = body.name ?? name;
    } catch (_) {
      return jsonResponse(400, { error: 'Invalid JSON body.' });
    }
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return jsonResponse(400, { error: 'name is required (query ?name=... or POST body { "name": "..." }).' });
  }

  const searchName = name.trim();

  try {
    const results = await hltbService.search(searchName);
    if (!results || results.length === 0) {
      return jsonResponse(200, { found: false, name: searchName });
    }

    // Use best match (first result has highest similarity)
    const entry = results[0];
    const main = entry.gameplayMain != null ? entry.gameplayMain : null;
    const mainExtra = entry.gameplayMainExtra != null ? entry.gameplayMainExtra : null;
    const completionist = entry.gameplayCompletionist != null ? entry.gameplayCompletionist : null;

    return jsonResponse(200, {
      found: true,
      name: entry.name,
      main,
      mainExtra,
      completionist,
    });
  } catch (err) {
    console.error('HLTB search error:', err);
    return jsonResponse(502, {
      error: 'How Long to Beat lookup failed.',
      details: err.message || String(err),
    });
  }
};
