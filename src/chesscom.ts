// Thin client over the chess.com Published-Data API (no auth; a User-Agent is required).
// Docs: https://www.chess.com/news/view/published-data-api

const UA = 'chess-cameo/0.1 (https://github.com/ThomasHartDev; thomashartdev@gmail.com)';

export interface ChessComPlayer {
  username: string;
  rating?: number;
  result?: string;
}

export interface ChessComGame {
  url: string;
  pgn: string;
  time_class: string;
  rules: string;
  end_time: number;
  white: ChessComPlayer;
  black: ChessComPlayer;
  eco?: string;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`chess.com API ${res.status} ${res.statusText} for ${url}`);
  }
  return (await res.json()) as T;
}

/** Every monthly archive URL for a player, oldest -> newest. */
export async function listArchives(username: string): Promise<string[]> {
  const data = await getJson<{ archives: string[] }>(
    `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/games/archives`,
  );
  return data.archives;
}

/** All games in one monthly archive (chronological). */
export async function getArchiveGames(archiveUrl: string): Promise<ChessComGame[]> {
  const data = await getJson<{ games: ChessComGame[] }>(archiveUrl);
  return data.games ?? [];
}

/** A single game by its public url (…/game/live/12345). */
export async function getGameByUrl(gameUrl: string): Promise<ChessComGame> {
  // The public game page has no JSON, but the id shows up in recent archives.
  // Walk archives newest-first and match on the url field.
  const idMatch = gameUrl.match(/(\d+)(?:\D*)$/);
  const id = idMatch?.[1];
  if (!id) throw new Error(`Could not parse a game id out of ${gameUrl}`);
  const archives = await listArchives(usernameFromGameUrl(gameUrl) ?? '');
  for (const archive of archives.slice().reverse()) {
    const games = await getArchiveGames(archive);
    const hit = games.find((g) => g.url === gameUrl || g.url.endsWith(`/${id}`));
    if (hit) return hit;
  }
  throw new Error(`Game ${gameUrl} not found in any archive`);
}

function usernameFromGameUrl(_gameUrl: string): string | null {
  // chess.com game urls don't carry the username; caller should supply --user with --url.
  return null;
}

/** The most recent game for a player (across their latest non-empty archive). */
export async function getLatestGame(username: string): Promise<ChessComGame> {
  const archives = await listArchives(username);
  for (const archive of archives.slice().reverse()) {
    const games = await getArchiveGames(archive);
    if (games.length) return games[games.length - 1];
  }
  throw new Error(`No games found for ${username}`);
}

/** The Nth game (0-based) of a specific month's archive. Negative indexes from the end. */
export async function getGameByIndex(
  username: string,
  year: number,
  month: number,
  index: number,
): Promise<ChessComGame> {
  const mm = String(month).padStart(2, '0');
  const games = await getArchiveGames(
    `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/games/${year}/${mm}`,
  );
  if (!games.length) throw new Error(`No games in ${username} ${year}/${mm}`);
  const i = index < 0 ? games.length + index : index;
  const game = games[i];
  if (!game) throw new Error(`Index ${index} out of range (0..${games.length - 1})`);
  return game;
}
