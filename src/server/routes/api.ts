
import { Hono } from 'hono';
import { redis } from '@devvit/web/server';

export const api = new Hono();

type EntryType = 'vouch' | 'report';

interface PlayerEntry {
  username: string;
  note: string;
  type: EntryType;
  updatedAt: string;
}

function normalizeUsername(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const username = value.trim().replace(/^u\//i, '');

  if (!/^[A-Za-z0-9_]{1,20}$/.test(username)) {
    return null;
  }

  return username;
}

function parseEntry(value: string): PlayerEntry | null {
  try {
    const parsed: unknown = JSON.parse(value);

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const item = parsed as Record<string, unknown>;
    const username = normalizeUsername(item.username);

    if (!username || typeof item.note !== 'string') {
      return null;
    }

    if (item.type !== 'vouch' && item.type !== 'report') {
      return null;
    }

    return {
      username,
      note: item.note,
      type: item.type,
      updatedAt:
        typeof item.updatedAt === 'string'
          ? item.updatedAt
          : '',
    };
  } catch {
    return null;
  }
}

// Einen Spieler erstellen oder aktualisieren
api.post('/player', async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { error: 'Invalid JSON-Request.' },
      400
    );
  }

  if (!body || typeof body !== 'object') {
    return c.json(
      { error: 'Invalid Request.' },
      400
    );
  }

  const input = body as Record<string, unknown>;
  const username = normalizeUsername(input.username);

  if (!username) {
    return c.json(
      { error: 'Enter a valid reddit username.' },
      400
    );
  }

  if (
    typeof input.note !== 'string' ||
    !input.note.trim()
  ) {
    return c.json(
      { error: 'You need to add a description!' },
      400
    );
  }

  const note = input.note.trim();

  if (note.length > 2000) {
    return c.json(
      { error: 'The Description must be at most 2000 characters long.' },
      400
    );
  }

  if (input.type !== 'vouch' && input.type !== 'report') {
    return c.json(
      { error: 'Type must be vouch or report.' },
      400
    );
  }

  const playerData: PlayerEntry = {
    username,
    note,
    type: input.type,
    updatedAt: new Date().toISOString(),
  };

  try {
    await redis.hSet('players', {
      [username.toLowerCase()]: JSON.stringify(playerData),
    });

    return c.json({
      success: true,
      message: `Saved Entry for u/${username}.`,
      player: playerData,
    });
  } catch {
    return c.json(
      { error: 'Error saving .' },
      500
    );
  }
});

api.get('/player/:username', async (c) => {
  const username = normalizeUsername(
    c.req.param('username')
  );

  if (!username) {
    return c.json(
      { error: 'Invalid Username.' },
      400
    );
  }

  try {
    const data = await redis.hGet(
      'players',
      username.toLowerCase()
    );

    if (!data) {
      return c.json(
        { error: 'Player not found.' },
        404
      );
    }

    const player = parseEntry(data);

    if (!player) {
      return c.json(
        { error: 'The stored entry is invalid.' },
        500
      );
    }

    return c.json(player);
  } catch {
    return c.json(
      { error: 'Error loading Player.' },
      500
    );
  }
});

// Alle Spieler abrufen
api.get('/players', async (c) => {
  try {
    const data = await redis.hGetAll('players');

    const players = Object.values(data ?? {})
      .map((item) => parseEntry(item))
      .filter(
        (player): player is PlayerEntry => player !== null
      )
      .sort((a, b) =>
        a.username.localeCompare(b.username)
      );

    return c.json(players);
  } catch {
    return c.json(
      { error: 'Error loading Player List.' },
      500
    );
  }
});
