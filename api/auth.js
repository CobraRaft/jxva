// api/auth.js
export default async function handler(req, res) {
  try {
    const CLIENT_ID = "1425450445140393994";
    const CLIENT_SECRET = "z80i1j4trC9fLpmvfZo04NFGOHs40N1M";
    const REDIRECT_URI = "https://jxva.vercel.app";

    // 1️⃣ Extract ?code=
    const code = req.query.code;
    if (!code) {
      return res.status(400).json({ error: "Missing code" });
    }

    // 2️⃣ Exchange code for token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error("Token error:", tokenData);
      return res.status(400).json({ error: "Token exchange failed" });
    }

    // 3️⃣ Fetch user info
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userResponse.json();

    if (!user || user.id == null) {
      return res.status(400).json({ error: "Failed to fetch user info" });
    }

    // 4️⃣ Return user info
    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
          : "https://cdn.discordapp.com/embed/avatars/0.png",
      },
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
    });
  } catch (err) {
    console.error("OAuth error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
