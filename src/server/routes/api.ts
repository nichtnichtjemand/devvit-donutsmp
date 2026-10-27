import { Hono } from 'hono';
import { redis } from '@devvit/web/server';

export const api = new Hono();

api.post('/player', async (c) => {
  const { username, note, rank } = await c.req.json();

  if (!username) {
    return c.json({ error: 'Benutzername ist erforderlich' }, 400);
  }

  const cleanUsername = username.toLowerCase();

  const playerData = {
    username,
    note,
    rank,
    updatedAt: new Date().toISOString(),
  };

await redis.hSet('players', {
    [cleanUsername]: JSON.stringify(playerData),
  });

  return c.json({ success: true, message: `Eintrag für ${username} gespeichert!` });
});
api.get('/player/:username', async (c) => {
  const username = c.req.param('username').toLowerCase();

  // Einzelnen Spieler direkt aus dem Hash 'players' holen
  const data = await redis.hGet('players', username);

  if (!data) {
    return c.json({ error: 'Spieler nicht gefunden' }, 404);
  }

  return c.json(JSON.parse(data));
});

api.get('/players', async (c) => {
  // Direktes Verwenden von redis.get
  const data = await redis.hGetAll('players');

  const players = Object.values(data).map((item) => JSON.parse(item));

  if (!data) {
    return c.json({ error: 'Unknown Error' }, 404);
  }

  return c.json(players);
});