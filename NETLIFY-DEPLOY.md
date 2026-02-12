# Deploying Steam Playtime to Netlify

This app uses **Netlify Functions** as a small backend so the browser never talks to the Steam API directly (Steam does not send CORS headers, so direct calls from the front end would fail). The functions handle Steam login and proxying the “owned games” API.

Follow these steps to host the site on Netlify and configure the Steam API key.

---

## 1. Get a Steam Web API Key

1. Log in to Steam and go to: **https://steamcommunity.com/dev/apikey**
2. Enter a domain name (e.g. `localhost` for testing, or your Netlify site URL later).
3. Agree to the terms and click **Register**. Copy the key; you’ll add it to Netlify in step 4.

---

## 2. Push the Project to Git (optional but recommended)

Netlify works best when the project is in a Git repo (GitHub, GitLab, or Bitbucket).

1. Initialize a repo in the project folder (if you haven’t already):
   ```bash
   cd teamProj
   git init
   git add .
   git commit -m "Initial commit"
   ```
2. Create a new repository on GitHub/GitLab/Bitbucket and push:
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
   (Use `master` if your default branch is `master`.)

---

## 3. Create a Netlify Site and Deploy

1. Go to **https://app.netlify.com** and sign in.
2. Click **Add new site** → **Import an existing project**.
3. Connect your Git provider and choose the repo that contains `teamProj` (or the repo whose root is `teamProj`).
4. **Build settings:**
   - **Base directory:**  
     - If the repo root is the `teamProj` folder, leave this blank.  
     - If `teamProj` is inside the repo (e.g. `WDD_231/teamProj`), set **Base directory** to `teamProj`.
   - **Build command:** leave empty (static site).
   - **Publish directory:** `.` (current directory; your `index.html` is at the root of what you publish).
5. Click **Deploy site**. Wait for the first deploy to finish.

---

## 4. Set the Steam API Key (Environment Variable)

Netlify Functions need your Steam key so they can call the Steam API. Do **not** put the key in your code or in Git.

1. In Netlify: **Site settings** → **Environment variables** (under **Build & deploy**).
2. Click **Add a variable** or **Add environment variable**.
3. Set:
   - **Key:** `STEAM_API_KEY`
   - **Value:** the Steam Web API key you copied in step 1.
   - **Scopes:** enable **All** (or at least “Functions” if you use scopes).
4. Save.

Then either:

- **Redeploy:** **Deploys** → **Trigger deploy** → **Deploy site**, or  
- Push a new commit so Netlify redeploys.

Functions only see env vars after a new deploy.

---

## 5. Update Steam API Key Domain (after you have the Netlify URL)

1. In Netlify, open your site and copy the URL (e.g. `https://your-site-name.netlify.app`).
2. Go to **https://steamcommunity.com/dev/apikey**.
3. Edit your key and add or set the domain to your Netlify site (e.g. `your-site-name.netlify.app`).  
   This avoids Steam rejecting requests from your live site.

---

## 6. How the Netlify “Backend” Works

- **No CORS from Steam:** The Steam Web API does not allow browser requests from other origins. So the front end never calls `api.steampowered.com` directly.
- **Netlify Functions:** The browser calls your own site:
  - `/.netlify/functions/steam-login` – redirects the user to Steam to sign in.
  - `/.netlify/functions/steam-callback` – Steam redirects back here; the function reads the Steam ID and redirects to your app with `?steamid=...`.
  - `/.netlify/functions/steam-owned-games?steamid=...` – the function calls the Steam API with `STEAM_API_KEY`, then returns the list of games and playtime to the browser.

So the “backend” is just these serverless functions that run on Netlify and proxy/auth for Steam.

---

## 7. Testing Locally (optional)

You can run the site and functions on your machine before deploying:

1. Install the Netlify CLI:  
   `npm install -g netlify-cli`
2. In the `teamProj` directory, run:  
   `netlify dev`
3. Create a `.env` file in `teamProj` (do not commit it) with:  
   `STEAM_API_KEY=your_steam_key_here`
4. Open the URL Netlify CLI prints (e.g. `http://localhost:8888`).  
   For Steam login to work, your Steam API key must have a domain that matches (e.g. `localhost`).

---

## 8. Adding “How Long to Beat” Later

The UI already has a column **“Avg. time to beat: —”** for each game. When you’re ready to use an external “time to beat” API (e.g. HowLongToBeat), add a **new Netlify Function** that:

1. Accepts a game name or app ID.
2. Calls the external API from the server (to avoid CORS and to hide any API keys).
3. Returns the average time to beat to the front end.

Then in `app.js`, call that function (e.g. per game or in batch) and replace the “—” with the returned value.

---

## Quick checklist

- [ ] Steam Web API key created and domain set (localhost and/or Netlify URL).
- [ ] Repo connected to Netlify, base directory and publish directory set.
- [ ] `STEAM_API_KEY` set in Netlify **Environment variables**.
- [ ] Site redeployed after adding the env var.
- [ ] Steam key domain updated to your Netlify URL for production.

If something doesn’t work, check the **Functions** tab in Netlify for errors and the browser console for failed requests to `/.netlify/functions/...`.
