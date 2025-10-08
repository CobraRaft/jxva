/**
 * /api/auth.js
 * Vercel serverless endpoint to:
 *  - exchange Discord OAuth2 code for tokens
 *  - fetch user info (/users/@me)
 *  - fetch user's guilds (/users/@me/guilds)
 *
 * Requirements:
 *  - Set DISCORD_CLIENT_SECRET in Vercel env vars
 *  - Discord app redirect URI must match REDIRECT_URI below
 *
 * Returns JSON:
 *  { ok: true, user: {...}, guilds: [...], token: {...} }
 * or
 *  { ok: false, error: "message", details: {...} }
 */

const CLIENT_ID = "1425450445140393994";
const REDIRECT_URI = "https://jxva.vercel.app";

async function jsonResponse(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

// Vercel provides fetch in Node 18+. If not available, uncomment node-fetch import and bundle accordingly.
// const fetch = require('node-fetch');

export default async function handler(req, res) {
  try {
    // Allow GET or POST
    const method = req.method || "GET";

    // Get the code param from query (GET) or body (POST)
    let code = "";
    if (method === "GET") {
      code = (req.query && req.query.code) || "";
    } else if (method === "POST") {
      // Accept JSON body { code: "..." }
      try {
        const body = await new Promise((resolve) => {
          let data = "";
          req.on("data", chunk => data += chunk);
          req.on("end", () => {
            try { resolve(JSON.parse(data || "{}")); } catch(e) { resolve({}); }
          });
        });
        code = body.code || "";
      } catch (e) {
        code = "";
      }
    }

    if (!code) {
      return jsonResponse(res, 400, { ok: false, error: "Missing OAuth2 code. Provide ?code= from Discord redirect." });
    }

    // Validate env var
    const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
    if (!CLIENT_SECRET) {
      return jsonResponse(res, 500, { ok: false, error: "Server misconfiguration: DISCORD_CLIENT_SECRET not set." });
    }

    // Exchange code for access token
    const tokenUrl = "https://discord.com/api/oauth2/token";
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    });

    let tokenResp;
    try {
      tokenResp = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
    } catch (networkErr) {
      console.error("Token fetch network error:", networkErr);
      return jsonResponse(res, 502, { ok: false, error: "Network error while contacting Discord token endpoint.", details: String(networkErr) });
    }

    let tokenData;
    try {
      tokenData = await tokenResp.json();
    } catch (e) {
      console.error("Invalid token response (non-json):", e);
      return jsonResponse(res, 502, { ok: false, error: "Invalid response from token endpoint.", details: await tokenResp.text().catch(()=>null) });
    }

    if (!tokenResp.ok) {
      console.error("Token endpoint returned error:", tokenData);
      return jsonResponse(res, tokenResp.status || 400, { ok: false, error: "Token exchange failed", details: tokenData });
    }

    if (!tokenData.access_token) {
      console.error("No access_token in token response:", tokenData);
      return jsonResponse(res, 502, { ok: false, error: "Token exchange did not return access_token", details: tokenData });
    }

    const accessToken = tokenData.access_token;
    const tokenType = tokenData.token_type || "Bearer";

    // Helper to fetch with Authorization header
    async function discordGet(path) {
      const url = `https://discord.com/api${path}`;
      const r = await fetch(url, {
        headers: { Authorization: `${tokenType} ${accessToken}` },
      });
      const txt = await r.text().catch(()=>null);
      try {
        const j = txt ? JSON.parse(txt) : null;
        return { ok: r.ok, status: r.status, json: j, raw: txt };
      } catch (e) {
        return { ok: r.ok, status: r.status, json: null, raw: txt };
      }
    }

    // Fetch user
    let userFetch = await discordGet("/users/@me");
    if (!userFetch.ok) {
      console.error("Failed to fetch /users/@me:", userFetch.status, userFetch.json || userFetch.raw);
      return jsonResponse(res, 502, { ok: false, error: "Failed to fetch user from Discord", details: userFetch.json || userFetch.raw });
    }

    const userData = userFetch.json || null;
    if (!userData || !userData.id) {
      console.error("Invalid user data:", userData);
      return jsonResponse(res, 502, { ok: false, error: "Invalid user data from Discord", details: userData });
    }

    // Fetch guilds (optional). If scope didn't include 'guilds', this will still return 403 or empty.
    let guilds = [];
    try {
      const guildsFetch = await discordGet("/users/@me/guilds");
      if (guildsFetch.ok && Array.isArray(guildsFetch.json)) {
        guilds = guildsFetch.json;
      } else {
        // Not fatal; log for visibility
        console.warn("Could not fetch guilds (maybe scope missing) - response:", guildsFetch.status, guildsFetch.json || guildsFetch.raw);
      }
    } catch (e) {
      console.warn("Error fetching guilds:", e);
    }

    // Build avatar URL (handle null avatars and format)
    const avatar = userData.avatar ?
      `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png?size=256` :
      `https://cdn.discordapp.com/embed/avatars/${parseInt(userData.discriminator || "0") % 5}.png`;

    // Return sanitized user + guilds + token metadata (no client_secret)
    const out = {
      ok: true,
      user: {
        id: userData.id,
        username: userData.username,
        discriminator: userData.discriminator,
        avatar,
        locale: userData.locale || null,
      },
      guilds: guilds.map(g => ({ id: g.id, name: g.name, icon: g.icon || null, permissions: g.permissions })),
      token: {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        scope: tokenData.scope,
        expires_in: tokenData.expires_in || null,
        refresh_token: tokenData.refresh_token || null,
      },
    };

    return jsonResponse(res, 200, out);

  } catch (err) {
    console.error("Unhandled error in /api/auth:", err);
    return jsonResponse(res, 500, { ok: false, error: "Internal server error", details: String(err) });
  }
}
