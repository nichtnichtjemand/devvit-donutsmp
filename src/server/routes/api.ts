
import { Hono } from 'hono';
import { redis } from '@devvit/web/server';

export const api = new Hono();

type EntryType = 'vouch' | 'report';

interface PlayerEntry {
  id: string;
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
// Erstellt einen neuen Vouch oder Report.
// Jeder Eintrag bekommt einen eigenen Redis-Schlüssel.
api.post('/player', async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { error: 'Ungültiger JSON-Request.' },
      400
    );
  }

  if (!body || typeof body !== 'object') {
    return c.json(
      { error: 'Ungültige Anfrage.' },
      400
    );
  }

  const input = body as Record<string, unknown>;
  const username = normalizeUsername(input.username);

  if (!username) {
    return c.json(
      { error: 'Bitte gib einen gültigen Reddit-Benutzernamen ein.' },
      400
    );
  }

  if (
    typeof input.note !== 'string' ||
    !input.note.trim()
  ) {
    return c.json(
      { error: 'Eine Beschreibung ist erforderlich.' },
      400
    );
  }

  const note = input.note.trim();

  if (note.length > 2000) {
    return c.json(
      { error: 'Die Beschreibung darf höchstens 2000 Zeichen lang sein.' },
      400
    );
  }

  if (input.type !== 'vouch' && input.type !== 'report') {
    return c.json(
      { error: 'Der Typ muss vouch oder report sein.' },
      400
    );
  }

  const id = crypto.randomUUID();

  const playerData: PlayerEntry = {
    id,
    username,
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
        message: `Eintrag für u/${username} gespeichert.`,
        player: playerData,
      },
      201
    );
  } catch {
    return c.json(
      { error: 'Fehler beim Speichern in Redis.' },
      500
    );
  }
});

// GET /player/:username
// Gibt ALLE Vouches und Reports eines Spielers zurück.
api.get('/player/:username', async (c) => {
  const username = normalizeUsername(
    c.req.param('username')
  );

  if (!username) {
    return c.json(
      { error: 'Ungültiger Reddit-Benutzername.' },
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
        { error: 'Keine Einträge für diesen Spieler gefunden.' },
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
      { error: 'Fehler beim Abrufen der Spielereinträge.' },
      500
    );
  }
});

// GET /players
// Gibt alle Vouches und Reports zurück.
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
      { error: 'Fehler beim Laden der Spielerliste.' },
      500
    );
  }
});
