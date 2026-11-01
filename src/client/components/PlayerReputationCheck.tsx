import type { FormEvent } from "react";

type EntryType = "vouch" | "report";

type LookupResult = {
    username: string;
    status: "trusted" | "dangerous" | "neutral";
    stats: {
        vouches: number;
        reports: number;
        total: number;
    };
    entries: Array<{
        id: string;
        type: EntryType;
        note: string;
        submittedBy: string;
        updatedAt: string;
    }>;
};

type PlayerReputationCheckProps = {
    lookupName: string;
    setLookupName: (value: string) => void;
    lookupResult: LookupResult | null;
    lookupLoading: boolean;
    lookupError: string;
    onLookup: (event: FormEvent) => void;
};

export default function PlayerReputationCheck({
    lookupName,
    setLookupName,
    lookupResult,
    lookupLoading,
    lookupError,
    onLookup,
}: PlayerReputationCheckProps) {
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
        <section className="mb-8 rounded-3xl border border-lavender-grey-300/40 bg-lavender-grey-200 p-5 shadow-xl shadow-black/10 sm:p-6">
            <h2 className="text-lg font-bold">
                Player Reputation Check
            </h2>

            <p className="mt-1 text-sm text-lavender-grey-600">
                Quickly verify a player's history before entering a trade.
            </p>

            <form onSubmit={onLookup} className="mt-4 flex gap-2">
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
                    style={{ animation: "fadeIn 300ms ease-out" }}
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
                                                Vouched by{" "}

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
                                                Reported by{" "}

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
    );
}