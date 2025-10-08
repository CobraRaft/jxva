export default async function handler(req, res) {
  const code = req.query.code;
  if (!code) return res.status(400).json({ error: "Missing code" });

  const client_id = "1425450445140393994";
  const client_secret = process.env.DISCORD_CLIENT_SECRET;
  const redirect_uri = "https://jxva.vercel.app";

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
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

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token)
      return res.status(400).json({ error: "Invalid token data", tokenData });

    // Fetch user info
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userResponse.json();

    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
