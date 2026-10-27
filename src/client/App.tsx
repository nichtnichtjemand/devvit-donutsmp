import { useState, useEffect } from 'react';

interface Player {
  username: string;
  note: string;
  rank: string;
  updatedAt: string;
}

export function App() {
  const [username, setUsername] = useState('');
  const [note, setNote] = useState('');
  const [rank, setRank] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players');
      if (response.ok) {
        const data = await response.json();
        setPlayers(data);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Spieler:', err);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, note, rank }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(`Eintrag für ${username} gespeichert!`);
        setUsername('');
        setNote('');
        setRank('');
        fetchPlayers();
      } else {
        setStatus(`Fehler: ${data.error || 'Speichern fehlgeschlagen'}`);
      }
    } catch (err) {
      setStatus('Netzwerkfehler beim Senden.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-lavender-grey-100 text-lavender-900 p-6 font-sans">
      <div className="max-w-xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-thistle flex items-center gap-2">
          🍩 DonutSMP Player Tool
        </h2>

        <form onSubmit={handleSubmit} className="bg-lavender-grey-200 border border-lavender-grey-300 p-5 rounded-xl shadow-lg flex flex-col gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-lavender-700 mb-1">
              Spielername:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="z.B. Player123"
              required
              className="w-full bg-lavender-grey-100 border border-lavender-grey-300 rounded-lg px-3 py-2 text-lavender-900 placeholder-lavender-grey-400 focus:outline-none focus:ring-2 focus:ring-thistle"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-lavender-700 mb-1">
              Rang (optional):
            </label>
            <input
              type="text"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              placeholder="z.B. Admin / Member"
              className="w-full bg-lavender-grey-100 border border-lavender-grey-300 rounded-lg px-3 py-2 text-lavender-900 placeholder-lavender-grey-400 focus:outline-none focus:ring-2 focus:ring-thistle"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-lavender-700 mb-1">
              Notiz:
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Notiz eingeben..."
              rows={3}
              className="w-full bg-lavender-grey-100 border border-lavender-grey-300 rounded-lg px-3 py-2 text-lavender-900 placeholder-lavender-grey-400 focus:outline-none focus:ring-2 focus:ring-thistle resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-thistle hover:bg-thistle-400 disabled:opacity-50 text-lavender-grey-100 font-bold py-2.5 rounded-lg transition cursor-pointer shadow"
          >
            {loading ? 'Speichere...' : 'Eintrag Speichern'}
          </button>
        </form>

        {status && (
          <p className="mt-2 mb-4 p-3 rounded-lg bg-lavender-grey-200 border border-lavender-grey-300 font-medium text-thistle text-sm">
            {status}
          </p>
        )}

        <h3 className="text-xl font-bold mb-4 text-lavender-800">Gespeicherte Einträge</h3>
        {players.length === 0 ? (
          <p className="text-lavender-grey-400 italic">Noch keine Spieler eingetragen.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {players.map((p, idx) => (
              <div key={idx} className="bg-lavender-grey-200 border border-lavender-grey-300 p-4 rounded-xl shadow-sm flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <strong className="text-thistle text-lg">{p.username}</strong>
                  {p.rank && (
                    <span className="text-xs bg-lavender-grey-300 text-lavender-900 px-2 py-0.5 rounded-full border border-lavender-grey-400">
                      {p.rank}
                    </span>
                  )}
                </div>
                <p className="text-lavender-700 text-sm mt-1">{p.note || <span className="text-lavender-grey-400 italic">Keine Notiz</span>}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}