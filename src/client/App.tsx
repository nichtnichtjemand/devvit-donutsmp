import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { requestExpandedMode } from '@devvit/web/client';


type EntryType = "vouch" | "report";
type FilterType = "all" | EntryType;

type PlayerEntry = {
  id: string;
  username: string;
  submittedBy: string;
  note: string;
  type: EntryType;
  updatedAt: string;
};

const API_URL = "/api";

export default function App() {
  const [players, setPlayers] = useState<PlayerEntry[]>([]);
  const [username, setUsername] = useState("");
  const [note, setNote] = useState("");
  const [type, setType] = useState<EntryType>("vouch");
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [noteError, setNoteError] = useState("");

  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || ('ontouchstart' in window)
        || (navigator.maxTouchPoints > 0);

      if (isMobile) {
        requestExpandedMode(event, 'default');
      }
    };

    window.addEventListener('click', handleGlobalClick);

    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/players`);

      if (!response.ok) {
        throw new Error("Could not load player entries.");
      }

      const data: unknown = await response.json();

      let entries: unknown[] = [];

      if (Array.isArray(data)) {
        entries = data;
      } else if (
        data !== null &&
        typeof data === "object" &&
        "players" in data &&
        Array.isArray(data.players)
      ) {
        entries = data.players;
      }

      setPlayers(entries as PlayerEntry[]);
      setError("");
    } catch {
      setError("Could not connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPlayers();
  }, [fetchPlayers]);

  const stats = useMemo(() => {
    const vouches = players.filter(
      (player) => player.type === "vouch",
    ).length;

    const reports = players.filter(
      (player) => player.type === "report",
    ).length;

    return {
      total: players.length,
      vouches,
      reports,
    };
  }, [players]);

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return players
      .filter((player) => {
        const matchesSearch =
          player.username.toLowerCase().includes(query) ||
          player.note.toLowerCase().includes(query);

        const matchesFilter =
          filter === "all" || player.type === filter;

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt).getTime() || 0;
        const dateB = new Date(b.updatedAt).getTime() || 0;

        return dateB - dateA;
      });
  }, [players, search, filter]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");



    const cleanUsername = username.trim();
    const cleanNote = note.trim();

    setUsernameError("");
    setNoteError("");

    let hasError = false;

    if (!cleanUsername) {
      setUsernameError("Please enter a Reddit Username.");
      hasError = true;
    }

    if (!cleanNote) {
      setNoteError("Please add a description.");
      hasError = true;
    }

    if (hasError) return;

    if (!cleanUsername) {
      setError("Please enter a reddit username.");
      return;
    }

    if (!cleanNote) {
      setError("Please add a note explaining this entry.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/player`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: cleanUsername,
          note: cleanNote,
          type,
        }),
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data !== null &&
            typeof data === "object" &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Failed to submit your entry.";

        throw new Error(message);
      }

      setUsername("");
      setNote("");

      await fetchPlayers();

      setSuccess(
        type === "vouch"
          ? "Your vouch was submitted successfully."
          : "Your report was submitted successfully.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <main className="min-h-screen bg-lavender-grey-100 px-4 py-10 text-lavender-grey-900 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-10 text-center">

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Player <span className="text-lavender-500">Vouches</span>
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-lavender-grey-600 sm:text-lg">
            Help the community with sharing your experiences!
          </p>
        </header>

        {/* Statistics */}
        <section
          aria-label="Community statistics"
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <StatCard
            label="Total entries"
            value={stats.total}
            accent="lavender"
          />

          <StatCard
            label="Vouches"
            value={stats.vouches}
            accent="thistle"
          />

          <StatCard
            label="Reports"
            value={stats.reports}
            accent="blush"
          />
        </section>




        {/* Submission form */}
        <section className="mb-8 rounded-3xl border border-lavender-grey-300/40 bg-lavender-grey-200 p-5 shadow-xl shadow-black/10 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Add a player entry</h2>
              <p className="mt-1 text-sm text-lavender-grey-600">
                Vouch for a player or report suspicious behavior.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsFormOpen(!isFormOpen)}
              aria-expanded={isFormOpen}
              className="shrink-0 rounded-xl bg-lavender-500 px-4 py-2.5 text-sm font-semibold text-lavender-100 transition hover:bg-lavender-400"
            >
              {isFormOpen ? "Close" : "Add entry"}
            </button>
          </div>

          {isFormOpen && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {/* Vouch / Report toggle */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-lavender-grey-800">
                  Entry type
                </label>

                <div className="relative isolate grid grid-cols-2 rounded-xl border border-lavender-grey-300/50 bg-lavender-grey-100 p-1">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-1 left-1 top-1 rounded-lg shadow-lg"
                    style={{
                      width: "calc(50% - 4px)",
                      transform:
                        type === "vouch" ? "translateX(0)" : "translateX(100%)",
                      backgroundColor:
                        type === "vouch"
                          ? "var(--color-green-200)"
                          : "var(--color-soft-blush-400)",
                      transition:
                        "transform 450ms cubic-bezier(0.22, 1, 0.36, 1), background-color 300ms ease",
                      willChange: "transform",
                    }}
                  />


                  <button
                    type="button"
                    onClick={() => setType("vouch")}
                    aria-pressed={type === "vouch"}
                    className={`relative z-10 rounded-lg px-4 py-3 text-sm font-semibold transition-colors duration-200 ${type === "vouch"
                      ? "text-thistle-100"
                      : "text-lavender-grey-600 hover:text-lavender-grey-900"
                      }`}
                  >
                    Vouch
                  </button>

                  <button
                    type="button"
                    onClick={() => setType("report")}
                    aria-pressed={type === "report"}
                    className={`relative z-10 rounded-lg px-4 py-3 text-sm font-semibold transition-colors duration-200 ${type === "report"
                      ? "text-soft-blush-100"
                      : "text-lavender-grey-600 hover:text-lavender-grey-900"
                      }`}
                  >
                    Report
                  </button>
                </div>

                <p className="mt-2 text-xs text-lavender-grey-500 min-h-[48px] sm:min-h-[32px]">
                  {type === "vouch"
                    ? "Recommend a player based on a positive experience."
                    : "Describe a concern clearly and factually. Please note that we don't allow scamming. If you have proof for the scam, you can write a modmail to the moderators of r/DonutSMP with the link below."}
                </p>


              </div>

              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-semibold text-lavender-grey-800"
                >
                  Reddit username
                </label>

                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="u/nichtnichtjemand"
                  maxLength={20}
                  autoComplete="off"
                  className="w-full rounded-xl border border-lavender-grey-300/50 bg-lavender-grey-100 px-4 py-3 text-sm text-lavender-grey-900 outline-none transition placeholder:text-lavender-grey-500 focus:border-lavender-400 focus:ring-4 focus:ring-lavender-500/10"
                />
              </div>
              {usernameError && (
                <p className="mt-1 text-sm text-rose-600">
                  {usernameError}
                </p>
              )}

              {/* Note */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="note"
                    className="block text-sm font-semibold text-lavender-grey-800"
                  >
                    Details
                  </label>

                  <span className="text-xs tabular-nums text-lavender-grey-500">
                    {note.length}/2000
                  </span>
                </div>

                <textarea
                  id="note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={
                    type === "vouch"
                      ? "I traded 16 skeleton spawners with this player, I went first, and they didn't scam me."
                      : "I tried buying skeleton spawners, but I got scammed and they blocked me immediately after."
                  }
                  rows={4}
                  maxLength={2000}
                  className="w-full resize-y rounded-xl border border-lavender-grey-300/50 bg-lavender-grey-100 px-4 py-3 text-sm leading-6 text-lavender-grey-900 outline-none transition placeholder:text-lavender-grey-500 focus:border-lavender-400 focus:ring-4 focus:ring-lavender-500/10"
                />
              </div>
              {noteError && (
                <p className="mt-1 text-sm text-rose-600">
                  {noteError}
                </p>
              )}

              {/* Feedback */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-soft-blush-300/40 bg-soft-blush-100 px-4 py-3 text-sm text-soft-blush-900"
                >
                  {error}
                </div>
              )}

              {success && (
                <div
                  role="status"
                  className="rounded-xl border border-thistle-300/40 bg-thistle-100 px-4 py-3 text-sm text-thistle-900"
                >
                  {success}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold shadow-lg transition duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 ${type === "vouch"
                  ? "bg-green-200 text-thistle-100 hover:bg-thistle-600"
                  : "bg-soft-blush-400 text-soft-blush-100 hover:bg-soft-blush-300"
                  }`}
              >
                {submitting
                  ? "Submitting..."
                  : type === "vouch"
                    ? "Submit vouch"
                    : "Submit report"}
              </button>
            </form>
          )}
        </section>



        {/* Community entries */}
        <section className="rounded-3xl border border-lavender-grey-300/40 bg-lavender-grey-200 p-5 shadow-xl shadow-black/10 sm:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Community entries</h2>
              <p className="mt-1 text-sm text-lavender-grey-600">
                Browse the latest Player feedback.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void fetchPlayers()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-lavender-grey-300/50 bg-lavender-grey-100 px-4 py-2.5 text-sm font-semibold text-lavender-grey-700 transition hover:border-lavender-400 hover:text-lavender-veil-900 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
            >
              <span className={loading ? "animate-spin" : ""}>↻</span>
              Refresh
            </button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <label htmlFor="search" className="sr-only">
              Search entries
            </label>

            <input
              id="search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search usernames or notes..."
              className="w-full rounded-xl border border-lavender-grey-300/50 bg-lavender-grey-100 px-4 py-3 text-sm text-lavender-grey-900 outline-none transition placeholder:text-lavender-grey-500 focus:border-lavender-400 focus:ring-4 focus:ring-lavender-500/10"
            />
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-2">
            {(
              [
                ["all", "All entries"],
                ["vouch", "Vouches"],
                ["report", "Reports"],
              ] as const
            ).map(([value, label]) => {
              const active = filter === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={active}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition duration-200 ${active
                    ? "border-lavender-400 bg-lavender-500 text-lavender-100"
                    : "border-lavender-grey-300/50 bg-lavender-grey-100 text-lavender-grey-600 hover:border-lavender-400 hover:text-lavender-grey-900"
                    }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Entry list */}
          {loading && players.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-lavender-grey-300 border-t-lavender-400" />

              <p className="text-sm text-lavender-grey-600">
                Loading community entries...
              </p>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-lavender-grey-300/60 bg-lavender-grey-100/50 px-5 py-12 text-center">
              <div className="mb-3 text-3xl text-lavender-500">✦</div>

              <h3 className="font-semibold text-lavender-grey-900">
                No entries found
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-lavender-grey-600">
                {players.length === 0
                  ? "Be the first to add a player vouch or report."
                  : "Try a different search term or filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPlayers.map((player) => {
                const isVouch = player.type === "vouch";

                return (

                  <article
                    key={player.id}
                    className={`rounded-2xl border p-4 transition duration-200 hover:shadow-lg sm:p-5 ${isVouch
                      ? "border-green-100/30 bg-green-200/10 hover:bg-green-200/20 text-lavender-grey-900"
                      : "border-soft-blush-300/30 bg-soft-blush-200/10 hover:bg-soft-blush-200/20 text-lavender-grey-900"
                      }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="break-all text-base font-bold">
                            {player.username}
                          </h3>

                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${isVouch
                              ? "bg-emerald-200 text-emerald-900"
                              : "bg-rose-200 text-rose-900"
                              }`}
                          >
                            {isVouch ? "Vouch" : "Report"}
                          </span>
                        </div>

                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 opacity-90">
                          {player.note}
                        </p>
                      </div>

                      <time
                        dateTime={player.updatedAt}
                        className="shrink-0 text-xs opacity-75"
                      >
                        {formatDate(player.updatedAt)}
                      </time>
                    </div>

                    {player.submittedBy && (
                      <div className="mt-3 flex justify-end">
                        <span className="text-xs opacity-60">
                          {isVouch ? "Vouched by " : "Reported by "}
                          <a
                            href={`https://www.reddit.com/user/${encodeURIComponent(player.submittedBy)}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium underline underline-offset-2 transition-opacity hover:opacity-100"
                          >
                            u/{player.submittedBy}
                          </a>
                        </span>
                      </div>
                    )}
                  </article>

                );
              })}
            </div>
          )}

          <p className="mt-5 text-center text-xs text-lavender-grey-500">
            Showing {filteredPlayers.length} of {players.length} entries
          </p>
        </section>

        {/* Footer */}
        <footer className="py-8 text-center text-xs leading-6 text-lavender-grey-500">
          <p>Built for the community, by the community.</p>
          <p className="mt-1">
            Please don't lie about your experiences. If you have any questions,
            <a href="https://www.reddit.com/message/compose?to=r/DonutSMP" target="_blank" rel="noopener noreferrer"> write a modmail</a>.
          </p>
        </footer>
      </div>
    </main>
  );
}


type StatCardProps = {
  label: string;
  value: number;
  accent: "lavender" | "thistle" | "blush";
};

function StatCard({ label, value, accent }: StatCardProps) {
  const accentClasses = {
    lavender: "bg-lavender-500/10 text-lavender-500",
    thistle: "bg-green-100/10 text-green-200",
    blush: "bg-soft-blush-200/10 text-soft-blush-200",
  };
  return (
    <div className={`rounded-2xl border border-lavender-grey-300/40 ${accentClasses[accent]} p-5 transition duration-200 hover:-translate-y-0.5 hover:border-lavender-grey-400/60 hover:shadow-lg hover:shadow-black/10`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-lavender-grey-600">
          {label}
        </p>

      </div>

      <p className="mt-3 text-3xl font-bold tracking-tight text-lavender-grey-900">
        {value.toLocaleString("en-US")}
      </p>
    </div>
  );
}
