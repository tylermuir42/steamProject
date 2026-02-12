/**
 * Handles the redirect from Steam after login.
 * Extracts Steam ID from OpenID response and redirects back to the app with ?steamid=...
 */
exports.handler = async (event) => {
  const query = event.queryStringParameters || {};
  const returnTo = query.returnTo || '/';
  const host = event.headers['x-forwarded-host'] || event.headers.host || 'localhost';
  const protocol = event.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const origin = `${protocol}://${host}`;
  const siteReturn = returnTo.startsWith('http') ? returnTo : `${origin}${returnTo.startsWith('/') ? returnTo : '/' + returnTo}`;

  // Steam sends GET with openid.claimed_id (e.g. https://steamcommunity.com/openid/id/76561198012345678)
  const q = event.queryStringParameters || {};
  const claimedId = q['openid.claimed_id'] || q.claimed_id;
  let steamId = null;
  if (claimedId) {
    const match = claimedId.match(/\/openid\/id\/(\d+)$/);
    if (match) steamId = match[1];
  }

  const redirectUrl = steamId
    ? `${siteReturn}${siteReturn.includes('?') ? '&' : '?'}steamid=${steamId}`
    : siteReturn;

  return {
    statusCode: 302,
    headers: { Location: redirectUrl },
    body: '',
  };
};
