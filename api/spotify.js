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

/**
 * Normaliza um valor de playlist ID vindo de variável de ambiente. Aceita:
 * - ID puro: "6TaosFlkbYy8gbYUksrpcl"
 * - URI do Spotify: "spotify:playlist:6TaosFlkbYy8gbYUksrpcl"
 * - Link de compartilhamento (com ou sem tracking): 
 *   "https://open.spotify.com/playlist/6TaosFlkbYy8gbYUksrpcl?si=xxxxx"
 *
 * Isso evita quebrar a validação quando alguém cola o link direto do
 * Spotify (que inclui o parâmetro `?si=...` de rastreamento) em vez do
 * ID puro — erro fácil de cometer e que quebra tanto a comparação por
 * contexto quanto as chamadas à API de membership.
 */
function normalizePlaylistId(rawValue) {
  if (typeof rawValue !== "string") return null;
  let value = rawValue.trim();
  if (!value) return null;

  // Remove query string (ex.: "?si=...") e fragmento, se houver.
  value = value.split("?")[0].split("#")[0];

  // URI: "spotify:playlist:<id>"
  const uriMatch = value.match(/^spotify:playlist:([A-Za-z0-9]+)$/);
  if (uriMatch) return uriMatch[1];

  // URL: ".../playlist/<id>"
  const urlMatch = value.match(/playlist\/([A-Za-z0-9]+)\/?$/);
  if (urlMatch) return urlMatch[1];

  // Já deve ser o ID puro nesse ponto; remove barra final se houver.
  value = value.replace(/\/$/, "");
  return value || null;
}

/**
 * Lê as playlists permitidas a partir de variáveis de ambiente individuais
 * (PLAYLIST_1_ID..PLAYLIST_4_ID). Ignora valores vazios/ausentes, então
 * funciona mesmo que só 1, 2 ou 3 estejam preenchidas. Normaliza cada valor
 * (aceita ID puro, URI ou link de compartilhamento) e deduplica.
 */
function getAllowedPlaylistIds() {
  const envNames = ["PLAYLIST_1_ID", "PLAYLIST_2_ID", "PLAYLIST_3_ID", "PLAYLIST_4_ID"];
  const ids = envNames
    .map((name) => normalizePlaylistId(process.env[name]))
    .filter((value) => Boolean(value));

  return Array.from(new Set(ids));
}

/**
 * Extrai o ID da playlist a partir do `context` retornado por
 * /currently-playing (ex.: context.uri = "spotify:playlist:<id>").
 * Retorna null se a reprodução não estiver no contexto de uma playlist.
 */
function extractContextPlaylistId(payload) {
  const context = payload?.context;
  if (!context || context.type !== "playlist" || typeof context.uri !== "string") {
    return null;
  }
  const match = context.uri.match(/^spotify:playlist:(.+)$/);
  return match ? match[1] : null;
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

    // Estratégia de validação em duas camadas:
    //
    // 1) PRIMÁRIA — contexto de reprodução: o próprio /currently-playing já
    //    informa de qual playlist a faixa está tocando (`context.uri`). Se
    //    bater com alguma das playlists permitidas, aceitamos direto. Não
    //    depende de nenhum scope extra e não faz chamada adicional à API.
    //
    // 2) SECUNDÁRIA (fallback) — membership real: busca as faixas de cada
    //    playlist permitida e verifica se o `track.id` atual está em
    //    alguma delas. Só é usada quando o contexto não bate (ex.: tocou
    //    fora do contexto de playlist, ou o campo veio nulo). Se essa
    //    chamada falhar (ex.: 403 por falta de scope `playlist-read-private`),
    //    NÃO derruba o site: apenas essa camada fica indisponível, e o
    //    resultado final permanece fail-closed (allowed=false) se nenhuma
    //    das duas camadas confirmou.
    let allowed = false;
    let validationDebug = null;
    let validationMethod = "none";
    try {
      const trackId = payload.item?.id ?? null;
      const allowedPlaylistIds = getAllowedPlaylistIds();
      const contextPlaylistId = extractContextPlaylistId(payload);
      const contextMatches = Boolean(
        contextPlaylistId && allowedPlaylistIds.includes(contextPlaylistId),
      );

      let membershipSnapshot = null;

      if (contextMatches) {
        allowed = true;
        validationMethod = "context-match";
      } else if (allowedPlaylistIds.length === 0) {
        // Nenhuma playlist configurada: não há como validar com segurança.
        allowed = false;
        validationMethod = "unconfigured";
      } else {
        // Contexto não confirmou: tenta a validação por membership como reforço.
        membershipSnapshot = await getMembershipSnapshot(allowedPlaylistIds, accessToken);
        const allowedSet = membershipSnapshot.allowedSet;

        if (allowedSet && trackId && allowedSet.has(trackId)) {
          allowed = true;
          validationMethod = "membership-match";
        } else if (allowedSet) {
          allowed = false;
          validationMethod = "membership-no-match";
        } else {
          // Nenhuma playlist pôde ser lida (todas falharam): bloqueia por segurança.
          allowed = false;
          validationMethod = "unavailable";
        }
      }

      if (validationDebugEnabled) {
        validationDebug = {
          trackId,
          validationMethod,
          allowedPlaylistIds,
          spotifyContext: {
            type: payload?.context?.type ?? null,
            uri: payload?.context?.uri ?? null,
            extractedPlaylistId: contextPlaylistId,
          },
          contextMatches,
          membershipValidation: membershipSnapshot
            ? {
                combinedCacheSize: membershipSnapshot.cacheSize,
                perPlaylist: membershipSnapshot.perPlaylist,
              }
            : { skipped: true, reason: "context-match ou sem playlists configuradas" },
        };
      }
    } catch (err) {
      console.error("[api/spotify] error determining allowed:", err instanceof Error ? err.message : err);
      // Em erro inesperado, bloqueia por segurança
      allowed = false;
      if (validationDebugEnabled) {
        validationDebug = {
          validationMethod: "error",
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

/* ---------------- playlist membership validation (fallback) ---------------- */
/*
 * DESIGN NOTES:
 *
 * 1. A resposta do Spotify em /me/player/currently-playing NÃO garante, por
 *    si só, que a faixa pertence a uma playlist específica — ela só informa
 *    a faixa atual e, opcionalmente, um `context` (de onde a reprodução foi
 *    iniciada). Usamos o `context` como validação PRIMÁRIA (ver handler),
 *    por ser rápida e não exigir permissões extras.
 *
 * 2. Esta camada de MEMBERSHIP é o fallback: busca de fato os IDs de faixas
 *    de cada playlist permitida e compara com o `track.id` atual. É mais
 *    cara (uma ou mais chamadas de API) e depende do scope
 *    `playlist-read-private` (e `playlist-read-collaborative` se aplicável)
 *    estar concedido no refresh token. Se o scope estiver ausente, as
 *    chamadas falham com 403 e esta camada simplesmente fica indisponível —
 *    sem derrubar a validação primária.
 *
 * 3. Cache por playlist usando `snapshot_id`: esse campo muda sempre que o
 *    conteúdo da playlist é editado. Consultamos esse valor (barato, sem
 *    paginação) e só repaginamos a playlist inteira quando ele muda (ou não
 *    há cache ainda). Um TTL adicional serve como rede de segurança.
 *
 * 4. Modo fail-closed: se uma playlist não puder ser lida (erro de rede,
 *    permissão, etc.) e não houver cache válido anterior para ela, essa
 *    playlist simplesmente não contribui com IDs. Se NENHUMA playlist
 *    puder ser lida, o resultado final é "não foi possível validar" e o
 *    handler bloqueia por segurança.
 */

const playlistCaches = new Map(); // playlistId -> { snapshotId, ids: Set, fetchedAt }
const PLAYLIST_CACHE_TTL_MS = Number(process.env.ALLOWED_SPOTIFY_PLAYLIST_CACHE_TTL_MS || 10 * 60 * 1000);

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
 * Garante que o cache de uma playlist individual esteja atualizado
 * (via snapshot_id) e retorna metadados de debug sobre a operação.
 */
async function refreshPlaylistCacheEntry(playlistId, accessToken) {
  const now = Date.now();
  const cached = playlistCaches.get(playlistId);
  const cacheHasData = Boolean(cached && cached.ids.size > 0);
  const cacheExpiredByTtl = !cached || now - cached.fetchedAt > PLAYLIST_CACHE_TTL_MS;

  try {
    const currentSnapshotId = await fetchPlaylistSnapshotId(playlistId, accessToken);

    if (cacheHasData && cached.snapshotId === currentSnapshotId && !cacheExpiredByTtl) {
      return { playlistId, source: "snapshot-match", cacheSize: cached.ids.size, fetchError: null };
    }

    const ids = await fetchPlaylistTrackIds(playlistId, accessToken);
    playlistCaches.set(playlistId, { snapshotId: currentSnapshotId, ids, fetchedAt: now });
    return { playlistId, source: "refreshed", cacheSize: ids.size, fetchError: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[api/spotify] could not validate playlist ${playlistId}:`, message);

    if (cacheHasData) {
      return { playlistId, source: "stale-cache", cacheSize: cached.ids.size, fetchError: message };
    }
    return { playlistId, source: "unavailable", cacheSize: 0, fetchError: message };
  }
}

/**
 * Atualiza o cache de todas as playlists permitidas em paralelo e retorna
 * um Set combinado com todos os IDs de faixas encontrados, além de
 * metadados por playlist para debug. Se todas as playlists falharem (sem
 * cache válido em nenhuma), `allowedSet` vem null (fail-closed).
 */
async function getMembershipSnapshot(allowedPlaylistIds, accessToken) {
  const perPlaylist = await Promise.all(
    allowedPlaylistIds.map((playlistId) => refreshPlaylistCacheEntry(playlistId, accessToken)),
  );

  const anyPlaylistReadable = perPlaylist.some((entry) => entry.source !== "unavailable");

  const combinedIds = new Set();
  if (anyPlaylistReadable) {
    for (const playlistId of allowedPlaylistIds) {
      const cached = playlistCaches.get(playlistId);
      if (cached) {
        for (const id of cached.ids) combinedIds.add(id);
      }
    }
  }

  return {
    allowedSet: anyPlaylistReadable ? combinedIds : null,
    cacheSize: combinedIds.size,
    perPlaylist,
  };
}

