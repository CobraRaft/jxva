import type { VercelRequest, VercelResponse } from '@vercel/node'
import fetch from 'node-fetch'

const CLIENT_ID = '1425450445140393994'
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET // put in vercel env vars
const REDIRECT_URI = 'https://jxva.vercel.app'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string
  if (!code) return res.status(400).json({ error: 'Missing code' })

  try {
    // exchange code for access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) throw new Error(tokenData.error_description || 'Token exchange failed')

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    const userData = await userRes.json()

    return res.status(200).json({
      user: {
        id: userData.id,
        username: userData.username,
        avatar: `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`,
      },
      access_token: tokenData.access_token,
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
