/**
 * Redirects the user to Steam OpenID login.
 * Requires STEAM_API_KEY in Netlify env (used later for API calls; realm is your site URL).
 */
exports.handler = async (event) => {
  const returnTo = event.queryStringParameters?.returnTo || event.headers?.referer || '/';
  const base = new URL(returnTo).origin;
  const callbackUrl = `${base}/.netlify/functions/steam-callback?returnTo=${encodeURIComponent(returnTo)}`;

  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': callbackUrl,
    'openid.realm': base + '/',
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });

  const steamLoginUrl = `https://steamcommunity.com/openid/login?${params.toString()}`;

  return {
    statusCode: 302,
    headers: { Location: steamLoginUrl },
    body: '',
  };
};
