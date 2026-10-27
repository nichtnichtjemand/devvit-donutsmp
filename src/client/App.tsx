
import React, { useCallback, useEffect, useState } from 'react';

type EntryType = 'vouch' | 'report';

interface PlayerEntry {
  username: string;
  note: string;
  type: EntryType;
  updatedAt?: string;
}

const API_BASE = '/api';

export default function App() {
  const [username, setUsername] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState<EntryType>('vouch');
  const [players, setPlayers] = useState<PlayerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [status, setStatus] = useState('');

  const loadPlayers = useCallback(async () => {
    setLoadingPlayers(true);

    try {
      const response = await fetch(`${API_BASE}/players`);

      if (!response.ok) {
        throw new Error('Spielerliste konnte nicht geladen werden.');
      }

      const data: PlayerEntry[] = await response.json();
      setPlayers(Array.isArray(data) ? data : []);
    } catch {
      setStatus(
        'Spielerliste konnte nicht geladen werden. Bitte später erneut versuchen.'
      );
    } finally {
      setLoadingPlayers(false);
    }
  }, []);

  useEffect(() => {
    void loadPlayers();
  }, [loadPlayers]);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setStatus('');

    const cleanUsername = username.trim().replace(/^u\//i, '');
    const cleanNote = note.trim();

    if (!cleanUsername) {
      setStatus('Bitte gib einen Reddit-Benutzernamen ein.');
      return;
    }

    if (!cleanNote) {
      setStatus('Bitte gib eine Beschreibung ein.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/player`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: cleanUsername,
          note: cleanNote,
          type,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error || 'Eintrag konnte nicht gespeichert werden.'
        );
      }

      setStatus(
        `${type === 'vouch' ? 'Vouch' : 'Report'} für u/${cleanUsername} gespeichert.`
      );

      setUsername('');
      setNote('');

      await loadPlayers();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'Fehler beim Speichern.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-lavender-grey-100 text-lavender-900 p-6 font-sans no-scrollbar overflow-y-auto">
      <div className="max-w-xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-thistle flex items-center gap-2">
          🍩 DonutSMP Player Tool
        </h2>

        <form
          onSubmit={handleSubmit}
          className="bg-lavender-grey-200 border border-lavender-grey-300 p-5 rounded-xl shadow-lg flex flex-col gap-4 mb-8"
        >
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-lavender-700 mb-1"
            >
              Reddit Username:
            </label>

            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="u/username"
              required
              maxLength={40}
              autoComplete="off"
              className="w-full bg-lavender-grey-100 border border-lavender-grey-300 rounded-lg px-3 py-2 text-lavender-900 placeholder-lavender-grey-400 focus:outline-none focus:ring-2 focus:ring-thistle"
            />
          </div>

          <fieldset>
            <legend className="block text-sm font-medium text-lavender-700 mb-2">
              Entry Type:
            </legend>

            <div className="relative grid grid-cols-2 bg-lavender-grey-100 p-1 rounded-xl border border-lavender-grey-300 max-w-xs overflow-hidden">
              <div
                aria-hidden="true"
                className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg transition-all duration-300 ease-in-out shadow-md ${type === 'report'
                  ? 'translate-x-full bg-rose-500'
                  : 'translate-x-0 bg-purple-600'
                  }`}
              />

              <button
                type="button"
                aria-pressed={type === 'vouch'}
                onClick={() => setType('vouch')}
                className={`relative z-10 py-2.5 px-4 text-sm font-bold rounded-lg transition-colors duration-200 cursor-pointer text-center ${type === 'vouch'
                  ? 'text-white'
                  : 'text-lavender-700 hover:text-lavender-900'
                  }`}
              >
                🟢 Vouch
              </button>

              <button
                type="button"
                aria-pressed={type === 'report'}
                onClick={() => setType('report')}
                className={`relative z-10 py-2.5 px-4 text-sm font-bold rounded-lg transition-colors duration-200 cursor-pointer text-center ${type === 'report'
                  ? 'text-white'
                  : 'text-lavender-700 hover:text-lavender-900'
                  }`}
              >
                🔴 Report
              </button>
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="note"
              className="block text-sm font-medium text-lavender-700 mb-1"
            >
              Description:
            </label>

            <textarea
              id="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Enter description..."
              required
              maxLength={2000}
              rows={3}
              className="w-full bg-lavender-grey-100 border border-lavender-grey-300 rounded-lg px-3 py-2 text-lavender-900 placeholder-lavender-grey-400 focus:outline-none focus:ring-2 focus:ring-thistle resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-thistle hover:bg-thistle-400 disabled:opacity-50 text-lavender-grey-900 font-bold py-2.5 rounded-lg transition cursor-pointer shadow"
          >
            {loading
              ? 'Saving...'
              : `Save ${type === 'vouch' ? 'Vouch' : 'Report'}`}
          </button>
        </form>

        {status && (
          <p
            role="status"
            className="mt-2 mb-4 p-3 rounded-lg bg-lavender-grey-200 border border-lavender-grey-300 font-medium text-thistle text-sm"
          >
            {status}
          </p>
        )}

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-lavender-800">
            Saved Entries
          </h3>

          <button
            type="button"
            onClick={() => void loadPlayers()}
            disabled={loadingPlayers}
            className="text-sm font-semibold text-lavender-700 hover:text-lavender-900 disabled:opacity-50"
          >
            {loadingPlayers ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {loadingPlayers ? (
          <p className="text-lavender-grey-400 italic">
            Loading entries...
          </p>
        ) : players.length === 0 ? (
          <p className="text-lavender-grey-400 italic">
            Nothing here yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {players.map((player) => {
              const isReport = player.type === 'report';

              return (
                <article
                  key={player.username.toLowerCase()}
                  className={`border p-4 rounded-xl shadow-sm flex flex-col gap-1 ${isReport
                      ? 'bg-red-500/15 border-red-500/40'
                      : 'bg-green-500/15 border-green-500/40'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <strong className="text-thistle text-lg">
                      u/{player.username.replace(/^u\//i, '')}
                    </strong>

                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${isReport
                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        : 'bg-purple-600/10 text-purple-400 border-purple-600/20'
                        }`}
                    >
                      {isReport ? 'Report' : 'Vouch'}
                    </span>
                  </div>

                  <p className="text-lavender-700 text-sm mt-1 whitespace-pre-wrap break-words">
                    {player.note || (
                      <span className="text-lavender-grey-400 italic">
                        No Note
                      </span>
                    )}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
