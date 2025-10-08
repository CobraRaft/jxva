// /api/auth.js
export default async function handler(req, res) {
  const code = req.query.code;
  if (!code) return res.status(400).json({ error: "Missing code" });

  const client_id = "1425450445140393994";
  const client_secret = process.env.DISCORD_CLIENT_SECRET;
  const redirect_uri = "https://jxva.vercel.app";

  try {
    // exchange code for token
    const tokenResp = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id,
        client_secret,
        grant_type: "authorization_code",
        code,
        redirect_uri,
      }),
    });

    const tokenData = await tokenResp.json();
    if (!tokenData || !tokenData.access_token) {
      return res.status(400).json({ error: "Token exchange failed", tokenData });
    }

    const accessToken = tokenData.access_token;

    // fetch user
    const userResp = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const user = await userResp.json();

    // fetch guilds (requires scope= guilds ) — optional but useful on dashboard
    const guildsResp = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const guilds = await guildsResp.json();

    // return combined object
    return res.status(200).json({ ...user, guilds });
  } catch (err) {
    console.error("auth error:", err);
    return res.status(500).json({ error: err.message });
  }
}
