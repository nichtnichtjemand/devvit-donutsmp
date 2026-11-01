
import { useState } from "react";

type EntryType = "vouch" | "report";

type PlayerEntry = {
    id: string;
    username: string;
    submittedBy: string;
    note: string;
    type: EntryType;
    updatedAt: string;
};

type AdminDashboardProps = {
    isAdmin: boolean;
    players: PlayerEntry[];
    adminMessage: string;
    isDeletingId: string | null;
    onDelete: (id: string) => void;
};

export default function AdminDashboard({
    isAdmin,
    players,
    adminMessage,
    isDeletingId,
    onDelete,
}: AdminDashboardProps) {
    const [deleteConfirmationId, setDeleteConfirmationId] = useState<
        string | null
    >(null);

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

    if (!isAdmin) {
        return null;
    }

    return (
        <>
            {/* Admin dashboard */}
            <section className="mb-8 rounded-3xl border border-lavender-grey-300/40 bg-lavender-grey-200 p-5 shadow-xl shadow-black/10 sm:p-6">
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-bold">Admin Dashboard</h2>
                    </div>
                </div>

                {adminMessage && (
                    <p
                        role="status"
                        aria-live="polite"
                        className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${adminMessage === "Entry removed successfully."
                                ? "border-green-300/30 bg-green-200/10 text-green-700"
                                : "border-soft-blush-300/40 bg-soft-blush-100 text-soft-blush-900"
                            }`}
                    >
                        {adminMessage}
                    </p>
                )}

                <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold">All entries</h3>
                    <span className="text-xs text-lavender-grey-600">
                        {players.length} total
                    </span>
                </div>

                {players.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-lavender-grey-300/50 bg-lavender-grey-100/50 px-4 py-6 text-center text-sm text-lavender-grey-600">
                        No entries found.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {[...players]
                            .sort(
                                (a, b) =>
                                    new Date(b.updatedAt).getTime() -
                                    new Date(a.updatedAt).getTime(),
                            )
                            .map((entry) => (
                                <article
                                    key={entry.id}
                                    className="rounded-xl border border-lavender-grey-300/40 bg-lavender-grey-100/40 p-4"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                                <a
                                                    href={`https://www.reddit.com/user/${encodeURIComponent(entry.username)}/`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm font-bold underline underline-offset-2"
                                                >
                                                    u/{entry.username}
                                                </a>

                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entry.type === "vouch"
                                                            ? "bg-green-100/10 text-green-700"
                                                            : "bg-soft-blush-200/10 text-soft-blush-700"
                                                        }`}
                                                >
                                                    {entry.type === "vouch" ? "Vouch" : "Report"}
                                                </span>
                                            </div>

                                            <p className="whitespace-pre-wrap wrap-break-word text-sm leading-6 text-lavender-grey-900">
                                                {entry.note}
                                            </p>

                                            <p className="mt-2 text-xs text-lavender-grey-600">
                                                Submitted by u/{entry.submittedBy} ·{" "}
                                                {formatDate(entry.updatedAt)} · ID: {entry.id}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setDeleteConfirmationId(entry.id)}
                                            disabled={isDeletingId === entry.id}
                                            className="shrink-0 rounded-lg border border-soft-blush-300/50 bg-soft-blush-100 px-3 py-2 text-sm font-semibold text-soft-blush-900 transition hover:bg-soft-blush-200 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {isDeletingId === entry.id
                                                ? "Deleting..."
                                                : "Delete entry"}
                                        </button>
                                    </div>
                                </article>
                            ))}
                    </div>
                )}
            </section>

            {/* Delete confirmation dialog */}
            {deleteConfirmationId && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setDeleteConfirmationId(null);
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-confirmation-title"
                        className="w-full max-w-md rounded-2xl border border-lavender-grey-300/40 bg-lavender-grey-100 p-6 shadow-2xl"
                    >
                        <h2
                            id="delete-confirmation-title"
                            className="text-lg font-bold text-lavender-grey-900"
                        >
                            Delete entry?
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-lavender-grey-600">
                            Are you sure you want to permanently delete this entry from the
                            database? This action cannot be undone.
                        </p>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmationId(null)}
                                className="rounded-xl border border-lavender-grey-300 px-4 py-2.5 text-sm font-semibold text-lavender-grey-700 transition hover:bg-lavender-grey-200"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    const id = deleteConfirmationId;
                                    setDeleteConfirmationId(null);
                                    onDelete(id);
                                }}
                                disabled={isDeletingId === deleteConfirmationId}
                                className="rounded-xl bg-soft-blush-400 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-soft-blush-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Confirm delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
