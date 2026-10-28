
import { Hono } from 'hono';
import { redis, reddit } from '@devvit/web/server';

export const api = new Hono();

type EntryType = 'vouch' | 'report';

interface PlayerEntry {
  id: string;
  username: string;
  submittedBy: string;
  note: string;
  type: EntryType;
  updatedAt: string;
}

function normalizeUsername(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const username = value.trim().replace(/^u\//i, '');

  if (!/^[A-Za-z0-9_-]{1,20}$/.test(username)) {
    return null;
  }

  return username;
}

function parseEntry(
  value: string,
  id: string
): PlayerEntry | null {
  try {
    const item: unknown = JSON.parse(value);

    if (!item || typeof item !== 'object') {
      return null;
    }

    const data = item as Record<string, unknown>;
    const username = normalizeUsername(data.username);

    if (
      !username ||
      typeof data.note !== 'string' ||
      (data.type !== 'vouch' && data.type !== 'report')
    ) {
      return null;
    }

    return {
      id: typeof data.id === 'string' ? data.id : id,
      username,
      submittedBy:
        typeof data.submittedBy === 'string'
          ? data.submittedBy
          : '',
      note: data.note,
      type: data.type,
      updatedAt:
        typeof data.updatedAt === 'string'
          ? data.updatedAt
          : '',
    };
  } catch {
    return null;
  }
}

// POST /player
// Creates a new vouch or report.
// The author is retrieved server-side from Reddit.
api.post('/player', async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { error: 'Invalid JSON request.' },
      400
    );
  }

  if (!body || typeof body !== 'object') {
    return c.json(
      { error: 'Invalid request.' },
      400
    );
  }

  const input = body as Record<string, unknown>;
  const username = normalizeUsername(input.username);

  if (!username) {
    return c.json(
      { error: 'Enter a valid Reddit username.' },
      400
    );
  }

  if (
    typeof input.note !== 'string' ||
    !input.note.trim()
  ) {
    return c.json(
      { error: 'A description is required.' },
      400
    );
  }

  const note = input.note.trim();

  if (note.length > 2000) {
    return c.json(
      {
        error:
          'The description must be at most 2000 characters long.',
      },
      400
    );
  }

  if (input.type !== 'vouch' && input.type !== 'report') {
    return c.json(
      { error: 'The type must be either vouch or report.' },
      400
    );
  }

  let submittedBy: string | undefined;

  try {
    submittedBy = await reddit.getCurrentUsername();
  } catch {
    return c.json(
      { error: 'Could not verify your Reddit account.' },
      500
    );
  }

  if (!submittedBy) {
    return c.json(
      { error: 'You must be logged in to submit an entry.' },
      401
    );
  }

  const id = crypto.randomUUID();

  const playerData: PlayerEntry = {
    id,
    username,
    submittedBy,
    note,
    type: input.type,
    updatedAt: new Date().toISOString(),
  };

  try {
    await redis.hSet('players', {
      [`entry:${id}`]: JSON.stringify(playerData),
    });

    return c.json(
      {
        success: true,
        message: `Entry for u/${username} saved.`,
        player: playerData,
      },
      201
    );
  } catch {
    return c.json(
      { error: 'Error while saving to Redis.' },
      500
    );
  }
});

// GET /player/:username
// Returns all vouches and reports for a player.
api.get('/player/:username', async (c) => {
  const username = normalizeUsername(
    c.req.param('username')
  );

  if (!username) {
    return c.json(
      { error: 'Invalid Reddit username.' },
      400
    );
  }

  try {
    const data = await redis.hGetAll('players');

    const players = Object.entries(data ?? {})
      .filter(([key]) => key.startsWith('entry:'))
      .map(([key, value]) => parseEntry(value, key))
      .filter(
        (player): player is PlayerEntry => player !== null
      )
      .filter(
        (player) =>
          player.username.toLowerCase() ===
          username.toLowerCase()
      )
      .sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      );

    if (players.length === 0) {
      return c.json(
        { error: 'No entries found for this player.' },
        404
      );
    }

    return c.json({
      username,
      count: players.length,
      entries: players,
    });
  } catch {
    return c.json(
      { error: 'Error while fetching player entries.' },
      500
    );
  }
});

// GET /players
// Returns all vouches and reports.
api.get('/players', async (c) => {
  try {
    const data = await redis.hGetAll('players');

    const players = Object.entries(data ?? {})
      .filter(([key]) => key.startsWith('entry:'))
      .map(([key, value]) => parseEntry(value, key))
      .filter(
        (player): player is PlayerEntry => player !== null
      )
      .sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      );

    return c.json(players);
  } catch {
    return c.json(
      { error: 'Error while loading the player list.' },
      500
    );
  }
});
