import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { requestExpandedMode } from '@devvit/web/client';


import Footer from "./components/Footer";
import Header from "./components/Header";
import StatsOverview from "./components/StatsOverview";
import AdminDashboard from "./components/AdminDashboard";
import PlayerReputationCheck from "./components/PlayerReputationCheck";
import MyOverview from "./components/MyOverview";

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState("");

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

  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const response = await fetch(`${API_URL}/me`);

        if (!response.ok) {
          throw new Error("Could not fetch current user.");
        }

        const data: { user: string } = await response.json();
        setCurrentUser(data.user);

        const adminResponse = await fetch(`${API_URL}/admin/verify`);
        if (adminResponse.ok) {
          const adminData: { isAdmin: boolean } = await adminResponse.json();
          setIsAdmin(adminData.isAdmin);
        }
      } catch (error) {
        console.error(error);
      }
    }

    void fetchCurrentUser();
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

  async function handleAdminDelete(id: string) {
    setIsDeletingId(id);
    setAdminMessage("");
    try {
      const response = await fetch(`${API_URL}/admin/player/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          data !== null && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : `Failed to delete the entry (HTTP ${response.status}).`;
        throw new Error(message);
      }
      setAdminMessage("Entry removed successfully.");
      await fetchPlayers();
      setLookupResult((current) => {
        if (!current) return current;
        const deletedEntry = current.entries.find((entry) => entry.id === id);
        return {
          ...current,
          entries: current.entries.filter((entry) => entry.id !== id),
          stats: {
            ...current.stats,
            total: Math.max(0, current.stats.total - (deletedEntry ? 1 : 0)),
            vouches: Math.max(0, current.stats.vouches - (deletedEntry?.type === "vouch" ? 1 : 0)),
            reports: Math.max(0, current.stats.reports - (deletedEntry?.type === "report" ? 1 : 0)),
          },
        };
      });
    } catch (err) {
      setAdminMessage(err instanceof Error ? err.message : "An error occurred while deleting the entry.");
    } finally {
      setIsDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-reddit px-4 py-10 text-lavender-grey-900 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <Header />


        {/* Statistics */}
        <StatsOverview stats={stats} />



        {/* My Overview */}
        <MyOverview
          currentUser={currentUser}
          myEntries={myEntries}
          receivedEntries={receivedEntries}
          myStats={myStats}
        />


        {/* Player Reputation Check */}
        <PlayerReputationCheck
          lookupName={lookupName}
          setLookupName={setLookupName}
          lookupResult={lookupResult}
          lookupLoading={lookupLoading}
          lookupError={lookupError}
          onLookup={handlePlayerLookup}
        />

        {/* Submission form */}
        <section className="mb-8 rounded-3xl border border-lavender-grey-300/40 bg-lavender-grey-200 p-5 shadow-xl shadow-black/10 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">
                Add a player entry
              </h2>

              <p className="mt-1 text-sm text-lavender-grey-600">
                Vouch for a player or report bad behavior.
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

        {/* Admin dashboard */}
        <AdminDashboard
          isAdmin={isAdmin}
          players={players}
          adminMessage={adminMessage}
          isDeletingId={isDeletingId}
          onDelete={handleAdminDelete}
        />

        {/* Footer */}
        <Footer />
      </div>
    </main>
  );
}