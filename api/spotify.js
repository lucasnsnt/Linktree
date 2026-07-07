const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_NOW_PLAYING_URL = "https://api.spotify.com/v1/me/player/currently-playing";
const SPOTIFY_PLAYLIST_TRACKS_URL = (playlistId, limit = 100, offset = 0) =>
  `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}&fields=items(track(id)),next`;
const SPOTIFY_PLAYLIST_SNAPSHOT_URL = (playlistId) =>
  `https://api.spotify.com/v1/playlists/${playlistId}?fields=snapshot_id`;

function buildPayloadSnapshot(payload) {
  return {
    is_playing: payload?.is_playing ?? null,
    currently_playing_type: payload?.currently_playing_type ?? null,
    progress_ms: payload?.progress_ms ?? null,
    item: payload?.item
      ? {
          id: payload.item.id ?? null,
          name: payload.item.name ?? null,
          explicit: Boolean(payload.item.explicit),
          artists: Array.isArray(payload.item.artists)
            ? payload.item.artists.map((artist) => artist?.name ?? null)
            : [],
        }
      : null,
  };
}

function logNotPlaying(reason, payload) {
  console.log(
    "[api/spotify] returning not-playing",
    JSON.stringify({
      reason,
      received: buildPayloadSnapshot(payload),
    }),
  );
}

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

function isValidationDebugEnabled(req) {
  const queryDebug = req?.query?.debug;
  const queryEnabled = queryDebug === "1" || queryDebug === "true";
  const envEnabled = process.env.SPOTIFY_VALIDATION_DEBUG === "true";
  return queryEnabled || envEnabled;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const validationDebugEnabled = isValidationDebugEnabled(req);
    const accessToken = await fetchAccessToken();
    const spotifyResponse = await fetch(SPOTIFY_NOW_PLAYING_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (spotifyResponse.status === 204) {
      logNotPlaying("spotify-204-no-content", null);
      return res.status(200).json({ status: "not-playing" });
    }

    if (!spotifyResponse.ok) {
      const details = await spotifyResponse.text();
      throw new Error(`Now playing failed (${spotifyResponse.status}): ${details}`);
    }

    const payload = await spotifyResponse.json();
    if (!payload?.is_playing) {
      logNotPlaying("is_playing_false", payload);
      return res.status(200).json({ status: "not-playing" });
    }

    if (payload?.currently_playing_type !== "track") {
      logNotPlaying("currently_playing_type_not_track", payload);
      return res.status(200).json({ status: "not-playing" });
    }

    if (!payload?.item) {
      logNotPlaying("missing_item", payload);
      return res.status(200).json({ status: "not-playing" });
    }

    // Decidir allowed com base no conjunto de track IDs da playlist mesclada.
    // Modo estrito: se não for possível validar, bloqueia.
    let allowed = false;
    let validationDebug = null;
    try {
      const allowedSnapshot = await getAllowedSet(accessToken);
      const allowedSet = allowedSnapshot.allowedSet;
      const trackId = payload.item?.id ?? null;

      if (validationDebugEnabled) {
        validationDebug = {
          trackId,
          spotifyContext: {
            type: payload?.context?.type ?? null,
            uri: payload?.context?.uri ?? null,
          },
          playlistValidation: {
            playlistId: allowedSnapshot.playlistId,
            source: allowedSnapshot.source,
            cacheSize: allowedSnapshot.cacheSize,
            usedStaleCache: allowedSnapshot.usedStaleCache,
            fetchError: allowedSnapshot.fetchError,
          },
        };
      }

      if (allowedSet && trackId) {
        allowed = allowedSet.has(trackId);
      } else if (allowedSet && !trackId) {
        // sem trackId, consideramos não permitido por segurança
        allowed = false;
      } else {
        // sem conjunto válido de permissões, bloqueia por segurança
        allowed = false;
      }
    } catch (err) {
      console.error("[api/spotify] error determining allowed:", err instanceof Error ? err.message : err);
      // Em erro, bloqueia por segurança
      allowed = false;
      if (validationDebugEnabled) {
        validationDebug = {
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    const responseBody = {
      status: "playing",
      track: normalizeTrack(payload.item),
      allowed,
    };

    if (validationDebugEnabled) {
      responseBody.debug = validationDebug;
    }

    return res.status(200).json(responseBody);
  } catch (error) {
    return res.status(500).json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown spotify error",
    });
  }
}

/* ---------------- playlist membership validation ---------------- */
/*
 * DESIGN NOTES (por que este desenho e não outro):
 *
 * 1. A resposta do Spotify em /me/player/currently-playing NÃO garante que a
 *    faixa pertence a uma playlist específica. Ela só informa a faixa atual
 *    e, opcionalmente, um `context` (de onde a reprodução foi iniciada).
 *
 * 2. `context.uri` foi CONSIDERADO e REJEITADO como fonte de verdade:
 *    ele reflete apenas de onde o usuário deu play, não se a faixa atual
 *    está de fato na playlist permitida (ex.: pode tocar via álbum, rádio,
 *    autoplay ou link direto). Usá-lo como bypass criaria falso-positivo
 *    de segurança. Por isso ele é usado apenas para fins de log/debug.
 *
 * 3. A única fonte de verdade confiável é MEMBERSHIP: buscar os IDs de
 *    faixas da playlist permitida e comparar com o `track.id` atual.
 *
 * 4. Buscar todas as faixas a cada request seria caro/lento. Em vez de
 *    confiar apenas em TTL (que pode servir dados desatualizados por
 *    minutos após uma edição na playlist), usamos o campo `snapshot_id`
 *    da playlist: ele muda sempre que o conteúdo da playlist muda.
 *    - Consulta barata (sem paginação) ao snapshot_id a cada request.
 *    - Só repaginamos a playlist inteira quando o snapshot_id muda
 *      (ou não há cache ainda).
 *    - TTL continua como rede de segurança adicional (defesa em profundidade),
 *      caso o snapshot_id não mude mas queiramos forçar refresh periódico.
 *
 * 5. Modo fail-closed: qualquer incerteza (env ausente, erro de rede,
 *    falta de permissão, resposta inesperada) resulta em `allowed = false`.
 *    Preferimos esconder uma faixa válida por engano a expor uma faixa
 *    fora da playlist permitida.
 */

const playlistCache = {
  playlistId: null,
  snapshotId: null,
  ids: new Set(),
  fetchedAt: 0,
  ttl: Number(process.env.ALLOWED_SPOTIFY_PLAYLIST_CACHE_TTL_MS || 10 * 60 * 1000),
};

async function fetchPlaylistSnapshotId(playlistId, accessToken) {
  const resp = await fetch(SPOTIFY_PLAYLIST_SNAPSHOT_URL(playlistId), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    const details = await resp.text();
    throw new Error(`Failed fetching playlist snapshot_id (${resp.status}): ${details}`);
  }

  const payload = await resp.json();
  const snapshotId = payload?.snapshot_id ?? null;
  if (!snapshotId) {
    throw new Error("Playlist response missing snapshot_id");
  }
  return snapshotId;
}

async function fetchPlaylistTrackIds(playlistId, accessToken) {
  const ids = new Set();
  const limit = 100;
  let offset = 0;

  // Guard-rail contra loop infinito em caso de resposta inesperada da API.
  const MAX_PAGES = 200; // 200 * 100 = 20k faixas, limite generoso.
  let pageCount = 0;

  while (pageCount < MAX_PAGES) {
    pageCount += 1;
    const url = SPOTIFY_PLAYLIST_TRACKS_URL(playlistId, limit, offset);
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!resp.ok) {
      const details = await resp.text();
      throw new Error(`Failed fetching playlist tracks (${resp.status}): ${details}`);
    }

    const payload = await resp.json();
    if (!Array.isArray(payload.items)) break;

    for (const item of payload.items) {
      // Faixas locais/removidas podem vir com `track` nulo ou sem `id`.
      const track = item.track;
      if (track && track.id) {
        ids.add(track.id);
      }
    }

    if (!payload.next || payload.items.length < limit) break;
    offset += limit;
  }

  return ids;
}

/**
 * Retorna um snapshot com o conjunto de IDs permitidos (ou null se não for
 * possível validar com segurança) junto de metadados úteis para debug.
 */
async function getAllowedSet(accessToken) {
  const playlistId = process.env.ALLOWED_SPOTIFY_PLAYLIST_ID;
  const result = {
    playlistId: playlistId ?? null,
    source: "none",
    cacheSize: playlistCache.ids.size,
    usedStaleCache: false,
    fetchError: null,
    allowedSet: null,
  };

  if (!playlistId) {
    // Sem playlist configurada, não é possível validar com segurança.
    return result;
  }

  const now = Date.now();
  const cacheIsForThisPlaylist = playlistCache.playlistId === playlistId;
  const cacheHasData = cacheIsForThisPlaylist && playlistCache.ids.size > 0;
  const cacheExpiredByTtl = now - playlistCache.fetchedAt > playlistCache.ttl;

  try {
    // Passo barato: descobrir se o conteúdo da playlist mudou.
    const currentSnapshotId = await fetchPlaylistSnapshotId(playlistId, accessToken);

    if (cacheHasData && playlistCache.snapshotId === currentSnapshotId && !cacheExpiredByTtl) {
      // Nada mudou desde a última vez: reaproveita cache sem repaginar.
      result.source = "snapshot-match";
    } else {
      // Playlist mudou (ou cache expirou/não existe): repagina tudo.
      const ids = await fetchPlaylistTrackIds(playlistId, accessToken);
      playlistCache.playlistId = playlistId;
      playlistCache.snapshotId = currentSnapshotId;
      playlistCache.ids = ids;
      playlistCache.fetchedAt = now;
      result.source = "refreshed";
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/spotify] could not validate playlist snapshot:", message);
    result.fetchError = message;

    // Defesa em profundidade: se já temos cache válido para esta playlist,
    // toleramos uma falha pontual da API (rate limit, instabilidade) usando
    // o cache existente. Sem isso, qualquer soluço da API do Spotify
    // bloquearia o card do site sem necessidade.
    if (cacheHasData) {
      result.source = "stale-cache";
      result.usedStaleCache = true;
    } else {
      result.source = "unavailable";
      result.cacheSize = 0;
      return result;
    }
  }

  result.cacheSize = playlistCache.ids.size;
  result.allowedSet = playlistCache.ids;
  return result;
}
