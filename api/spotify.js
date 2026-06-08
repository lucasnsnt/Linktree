const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_NOW_PLAYING_URL = "https://api.spotify.com/v1/me/player/currently-playing";

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing env: ${name}`);
  }
  return value.trim();
}

async function fetchAccessToken() {
  const refreshToken = getRequiredEnv("SPOTIFY_REFRESH_TOKEN");
  const clientId = getRequiredEnv("SPOTIFY_CLIENT_ID");
  const clientSecret = getRequiredEnv("SPOTIFY_CLIENT_SECRET");

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Token request failed (${response.status}): ${details}`);
  }

  const payload = await response.json();
  const accessToken = payload?.access_token;
  if (!accessToken) {
    throw new Error("Spotify token response missing access_token");
  }

  return accessToken;
}

function normalizeTrack(item) {
  const artistNames = Array.isArray(item?.artists)
    ? item.artists
        .map((artist) => artist?.name)
        .filter(Boolean)
        .join(", ")
    : "";

  return {
    songName: item?.name?.trim() || "Faixa sem nome",
    artistNames: artistNames || "Artista desconhecido",
    albumName: item?.album?.name?.trim() || "Album desconhecido",
    albumImageUrl: item?.album?.images?.[0]?.url || null,
    trackUrl: item?.external_urls?.spotify || null,
    isExplicit: Boolean(item?.explicit),
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const accessToken = await fetchAccessToken();
    const spotifyResponse = await fetch(SPOTIFY_NOW_PLAYING_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (spotifyResponse.status === 204) {
      return res.status(200).json({ status: "not-playing" });
    }

    if (!spotifyResponse.ok) {
      const details = await spotifyResponse.text();
      throw new Error(`Now playing failed (${spotifyResponse.status}): ${details}`);
    }

    const payload = await spotifyResponse.json();
    if (!payload?.is_playing || payload?.currently_playing_type !== "track" || !payload?.item) {
      return res.status(200).json({ status: "not-playing" });
    }

    return res.status(200).json({
      status: "playing",
      track: normalizeTrack(payload.item),
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown spotify error",
    });
  }
}