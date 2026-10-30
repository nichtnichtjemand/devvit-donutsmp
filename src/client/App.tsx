import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { requestExpandedMode } from '@devvit/web/client';

type EntryType = "vouch" | "report";

type PlayerEntry = {
  id: string;
  username: string;
  submittedBy: string;
  note: string;
  type: EntryType;
  updatedAt: string;
};

type LookupResult = {
  username: string;
  status: 'trusted' | 'dangerous' | 'neutral';
  stats: { vouches: number; reports: number; total: number };
  entries: Array<{
    id: string;
    type: EntryType;
    note: string;
    submittedBy: string;
    updatedAt: string;
  }>;
};

const API_URL = "/api";

export default function App() {
  const [players, setPlayers] = useState<PlayerEntry[]>([]);
  const [username, setUsername] = useState("");
  const [note, setNote] = useState("");
  const [type, setType] = useState<EntryType>("vouch");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [noteError, setNoteError] = useState("");
  const [lookupName, setLookupName] = useState("");
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [isAboutYouOpen, setIsAboutYouOpen] = useState(false);
  const [isMySubmissionsOpen, setIsMySubmissionsOpen] = useState(false);

  async function handlePlayerLookup(event: FormEvent) {
    event.preventDefault();

    const cleanName = lookupName.trim().replace(/^u\//i, "");

    if (!cleanName) return;

    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);

    try {
      const response = await fetch(`${API_URL}/player/${encodeURIComponent(cleanName)}/summary`);

      if (response.status === 404) {
        setLookupError(`No entries found for u/${cleanName}.`);
        return;
      }

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();
      setLookupResult(data as LookupResult);
    } catch {
      setLookupError("Could not fetch player summary. Please try again.");
    } finally {
      setLookupLoading(false);
    }
  }

  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const response = await fetch(`${API_URL}/me`);

        if (!response.ok) {
          throw new Error("Could not fetch current user.");
        }

        const data: { user: string } = await response.json();
        setCurrentUser(data.user);
      } catch (error) {
        console.error(error);
      }
    }

    void fetchCurrentUser();
  }, []);

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

  const myEntries = useMemo(() => {
    if (!currentUser) return [];

    return players.filter(
      (player) =>
        player.submittedBy.toLowerCase() === currentUser.toLowerCase()
    );
  }, [players, currentUser]);

  const receivedEntries = useMemo(() => {
    if (!currentUser) return [];

    return players.filter(
      (player) =>
        player.username.toLowerCase() === currentUser.toLowerCase()
    );
  }, [players, currentUser]);

  const myStats = useMemo(() => ({
    submittedVouches: myEntries.filter(
      (entry) => entry.type === "vouch"
    ).length,

    submittedReports: myEntries.filter(
      (entry) => entry.type === "report"
    ).length,

    receivedVouches: receivedEntries.filter(
      (entry) => entry.type === "vouch"
    ).length,

    receivedReports: receivedEntries.filter(
      (entry) => entry.type === "report"
    ).length,
  }), [myEntries, receivedEntries]);

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

  const lookupVouches = (lookupResult?.entries ?? [])
    .filter((entry) => entry.type === "vouch")
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime() || 0;
      const dateB = new Date(b.updatedAt).getTime() || 0;
      return dateB - dateA;
    });

  const lookupReports = (lookupResult?.entries ?? [])
    .filter((entry) => entry.type === "report")
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime() || 0;
      const dateB = new Date(b.updatedAt).getTime() || 0;
      return dateB - dateA;
    });

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


        {/* My Overview */}
        <section className="mb-8 rounded-3xl border border-lavender-grey-300/40 bg-lavender-grey-200 p-5 shadow-xl shadow-black/10 sm:p-6">
          <button
            type="button"
            onClick={() => setIsOverviewOpen(!isOverviewOpen)}
            aria-expanded={isOverviewOpen}
            className="flex w-full items-center justify-between gap-4 text-left"
          >
            <div>
              <h2 className="text-lg font-bold">My Overview</h2>
              <p className="mt-1 text-sm text-lavender-grey-600">
                Your personal activity and reputation.
              </p>
            </div>

            <span
              className={`text-xl transition-transform duration-300 ${isOverviewOpen ? "rotate-180" : ""
                }`}
            >
              ⌄
            </span>
          </button>

          {isOverviewOpen && (
            <div className="mt-5">
              {/* Current user */}
              <div className="mb-5 text-sm font-semibold text-lavender-500">
                {currentUser
                  ? `Logged in as u/${currentUser}`
                  : "Could not load your Reddit account."}
              </div>

              {/* Personal statistics */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  label="Vouches submitted"
                  value={myStats.submittedVouches}
                  accent="thistle"
                />
                <StatCard
                  label="Reports submitted"
                  value={myStats.submittedReports}
                  accent="blush"
                />
                <StatCard
                  label="Vouches received"
                  value={myStats.receivedVouches}
                  accent="thistle"
                />
                <StatCard
                  label="Reports received"
                  value={myStats.receivedReports}
                  accent="blush"
                />
              </div>

              {/* Entry sections */}
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

                {/* Your submissions */}
                <div className="rounded-2xl border border-lavender-grey-300/40 bg-lavender-grey-100/30 p-4">
                  <button
                    type="button"
                    onClick={() =>
                      setIsMySubmissionsOpen(!isMySubmissionsOpen)
                    }
                    aria-expanded={isMySubmissionsOpen}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <h3 className="text-sm font-bold">Your submissions</h3>
                      <p className="mt-1 text-xs text-lavender-grey-500">
                        {myEntries.length} entries submitted by you
                      </p>
                    </div>

                    <span
                      className={`text-xl transition-transform duration-300 ${isMySubmissionsOpen ? "rotate-180" : ""
                        }`}
                    >
                      ⌄
                    </span>
                  </button>

                  {isMySubmissionsOpen && (
                    <div className="mt-4 space-y-3">
                      {myEntries.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-lavender-grey-300/50 bg-lavender-grey-100/50 px-4 py-6 text-center text-sm text-lavender-grey-600">
                          You haven't submitted any entries yet.
                        </div>
                      ) : (
                        [...myEntries]
                          .sort(
                            (a, b) =>
                              new Date(b.updatedAt).getTime() -
                              new Date(a.updatedAt).getTime()
                          )
                          .map((entry) => (
                            <article
                              key={entry.id}
                              className={`rounded-xl border p-4 ${entry.type === "vouch"
                                ? "border-green-100/30 bg-green-200/10"
                                : "border-soft-blush-300/30 bg-soft-blush-200/10"
                                }`}
                            >
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <a
                                  href={`https://www.reddit.com/user/${encodeURIComponent(entry.username)}/`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-bold underline underline-offset-2"
                                >
                                  u/{entry.username}
                                </a>

                                <span
                                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${entry.type === "vouch"
                                    ? "bg-green-100/10 text-green-200"
                                    : "bg-soft-blush-200/10 text-soft-blush-200"
                                    }`}
                                >
                                  {entry.type === "vouch" ? "Vouch" : "Report"}
                                </span>
                              </div>

                              <p className="whitespace-pre-wrap wrap-break-word text-sm leading-6 text-lavender-grey-900">
                                {entry.note}
                              </p>

                              <time
                                dateTime={entry.updatedAt}
                                className="mt-3 block text-right text-xs text-lavender-grey-600"
                              >
                                {formatDate(entry.updatedAt)}
                              </time>
                            </article>
                          ))
                      )}
                    </div>
                  )}
                </div>

                {/* About you */}
                <div className="rounded-2xl border border-lavender-grey-300/40 bg-lavender-grey-100/30 p-4">
                  <button
                    type="button"
                    onClick={() => setIsAboutYouOpen(!isAboutYouOpen)}
                    aria-expanded={isAboutYouOpen}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <h3 className="text-sm font-bold">About you</h3>
                      <p className="mt-1 text-xs text-lavender-grey-500">
                        {receivedEntries.length} entries about you
                      </p>
                    </div>

                    <span
                      className={`text-xl transition-transform duration-300 ${isAboutYouOpen ? "rotate-180" : ""
                        }`}
                    >
                      ⌄
                    </span>
                  </button>

                  {isAboutYouOpen && (
                    <div className="mt-4 space-y-3">
                      {receivedEntries.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-lavender-grey-300/50 bg-lavender-grey-100/50 px-4 py-6 text-center text-sm text-lavender-grey-600">
                          There are no entries about you yet.
                        </div>
                      ) : (
                        [...receivedEntries]
                          .sort(
                            (a, b) =>
                              new Date(b.updatedAt).getTime() -
                              new Date(a.updatedAt).getTime()
                          )
                          .map((entry) => (
                            <article
                              key={entry.id}
                              className={`rounded-xl border p-4 ${entry.type === "vouch"
                                ? "border-green-100/30 bg-green-200/10"
                                : "border-soft-blush-300/30 bg-soft-blush-200/10"
                                }`}
                            >
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <a
                                  href={`https://www.reddit.com/user/${encodeURIComponent(entry.submittedBy)}/`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-bold underline underline-offset-2"
                                >
                                  u/{entry.submittedBy}
                                </a>

                                <span
                                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${entry.type === "vouch"
                                    ? "bg-green-100/10 text-green-200"
                                    : "bg-soft-blush-200/10 text-soft-blush-200"
                                    }`}
                                >
                                  {entry.type === "vouch" ? "Vouch" : "Report"}
                                </span>
                              </div>

                              <p className="whitespace-pre-wrap wrap-break-word text-sm leading-6 text-lavender-grey-900">
                                {entry.note}
                              </p>

                              <time
                                dateTime={entry.updatedAt}
                                className="mt-3 block text-right text-xs text-lavender-grey-600"
                              >
                                {formatDate(entry.updatedAt)}
                              </time>
                            </article>
                          ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Player Reputation Check */}
        <section className="mb-8 rounded-3xl border border-lavender-grey-300/40 bg-lavender-grey-200 p-5 shadow-xl shadow-black/10 sm:p-6">
          <h2 className="text-lg font-bold">
            Player Reputation Check
          </h2>

          <p className="mt-1 text-sm text-lavender-grey-600">
            Quickly verify a player's history before entering a trade.
          </p>

          <form onSubmit={handlePlayerLookup} className="mt-4 flex gap-2">
            <input
              type="text"
              value={lookupName}
              onChange={(e) => setLookupName(e.target.value)}
              placeholder="Enter username (e.g. nichtnichtjemand)"
              maxLength={20}
              className="w-full rounded-xl border border-lavender-grey-300/50 bg-lavender-grey-100 px-4 py-3 text-sm text-lavender-grey-900 outline-none transition placeholder:text-lavender-grey-500 focus:border-lavender-400 focus:ring-4 focus:ring-lavender-500/10"
            />

            <button
              type="submit"
              disabled={lookupLoading || !lookupName.trim()}
              className="shrink-0 rounded-xl bg-lavender-500 px-5 py-3 text-sm font-semibold text-lavender-100 transition hover:bg-lavender-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {lookupLoading ? "Checking..." : "Search"}
            </button>
          </form>

          {lookupError && (
            <p className="mt-3 text-sm text-rose-600 font-medium">
              {lookupError}
            </p>
          )}

          {lookupResult && (
            <div
              className="mt-6 rounded-2xl border border-lavender-grey-300/30 bg-lavender-grey-100/50 p-4"
              style={{ animation: 'fadeIn 300ms ease-out' }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold">
                    u/{lookupResult.username}
                  </h3>

                  <p className="text-xs text-lavender-grey-600 mt-0.5">
                    Based on {lookupResult.stats.total} community entries
                  </p>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-sm border ${lookupResult.status === "trusted"
                    ? "bg-green-100/10 text-green-200 border-green-200/20"
                    : lookupResult.status === "dangerous"
                      ? "bg-soft-blush-200/10 text-soft-blush-200 border-soft-blush-200/20"
                      : "bg-lavender-grey-300/10 text-lavender-grey-600 border-lavender-grey-300/20"
                    }`}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />

                  {lookupResult.status === "trusted" && "Trusted"}
                  {lookupResult.status === "dangerous" && "High Risk"}
                  {lookupResult.status === "neutral" && "Neutral"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-lavender-grey-200/60 p-3 text-center text-sm">
                <div>
                  <span className="block font-bold text-green-200">
                    {lookupResult.stats.vouches}
                  </span>

                  <span className="text-xs text-lavender-grey-600">
                    Vouches
                  </span>
                </div>

                <div className="border-l border-lavender-grey-300/30">
                  <span className="block font-bold text-soft-blush-200">
                    {lookupResult.stats.reports}
                  </span>

                  <span className="text-xs text-lavender-grey-600">
                    Reports
                  </span>
                </div>
              </div>

              {/* Vouches */}
              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-bold">
                    All vouches for u/{lookupResult.username}
                  </h4>

                  <span className="rounded-full bg-green-100/10 px-2.5 py-1 text-xs font-semibold text-green-200">
                    {lookupVouches.length}
                  </span>
                </div>

                {lookupVouches.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-lavender-grey-300/50 bg-lavender-grey-200/40 px-4 py-6 text-center text-sm text-lavender-grey-600">
                    No vouches have been submitted for this player yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lookupVouches.map((vouch) => (
                      <article
                        key={vouch.id}
                        className="rounded-xl border border-green-100/30 bg-green-200/10 p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <p className="min-w-0 whitespace-pre-wrap wrap-break-word text-sm leading-6 text-lavender-grey-900">
                            {vouch.note}
                          </p>

                          <time
                            dateTime={vouch.updatedAt}
                            className="shrink-0 text-xs text-lavender-grey-600"
                          >
                            {formatDate(vouch.updatedAt)}
                          </time>
                        </div>

                        {vouch.submittedBy && (
                          <div className="mt-3 text-right text-xs text-lavender-grey-600">
                            Vouched by{' '}

                            <a
                              href={`https://www.reddit.com/user/${encodeURIComponent(vouch.submittedBy)}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium underline underline-offset-2 hover:text-lavender-grey-900"
                            >
                              u/{vouch.submittedBy}
                            </a>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {/* Reports */}
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-bold">
                    All reports for u/{lookupResult.username}
                  </h4>

                  <span className="rounded-full bg-soft-blush-200/10 px-2.5 py-1 text-xs font-semibold text-soft-blush-200">
                    {lookupReports.length}
                  </span>
                </div>


                {lookupReports.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-lavender-grey-300/50 bg-lavender-grey-200/40 px-4 py-6 text-center text-sm text-lavender-grey-600">
                    No reports have been submitted for this player yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lookupReports.map((report) => (

                      <article
                        key={report.id}
                        className="rounded-xl border border-soft-blush-300/30 bg-soft-blush-200/10 p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <p className="min-w-0 whitespace-pre-wrap wrap-break-word text-sm leading-6 text-lavender-grey-900">
                            {report.note}
                          </p>

                          <time
                            dateTime={report.updatedAt}
                            className="shrink-0 text-xs text-lavender-grey-600"
                          >
                            {formatDate(report.updatedAt)}
                          </time>
                        </div>

                        {report.submittedBy && (
                          <div className="mt-3 text-right text-xs text-lavender-grey-600">
                            Reported by{' '}

                            <a
                              href={`https://www.reddit.com/user/${encodeURIComponent(report.submittedBy)}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium underline underline-offset-2 hover:text-lavender-grey-900"
                            >
                              u/{report.submittedBy}
                            </a>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Submission form */}
        <section className="mb-8 rounded-3xl border border-lavender-grey-300/40 bg-lavender-grey-200 p-5 shadow-xl shadow-black/10 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">
                Add a player entry
              </h2>

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

                <p className="mt-2 text-xs text-lavender-grey-500 min-h-12 sm:min-h-8">
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
                  className="rounded-xl border border-thistle-300/40 bg-green-100 px-4 py-3 text-sm text-black!"
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

        {/* Footer */}
        <footer className="py-8 text-center text-xs leading-6 text-lavender-grey-500">
          <p>Built for the community, by the community.</p>

          <p className="mt-1">
            Please don't lie about your experiences. If you have any questions,
            <a
              href="https://www.reddit.com/message/compose?to=r/DonutSMP"
              target="_blank"
              rel="noopener noreferrer"
            >
              {" "}write a modmail
            </a>.
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