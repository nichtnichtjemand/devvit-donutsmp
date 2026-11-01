import { useState } from "react";
import StatCard from "./StatCard";

type EntryType = "vouch" | "report";

type PlayerEntry = {
    id: string;
    username: string;
    submittedBy: string;
    note: string;
    type: EntryType;
    updatedAt: string;
};

type MyStats = {
    submittedVouches: number;
    submittedReports: number;
    receivedVouches: number;
    receivedReports: number;
};

type MyOverviewProps = {
    currentUser: string | null;
    myEntries: PlayerEntry[];
    receivedEntries: PlayerEntry[];
    myStats: MyStats;
};

export default function MyOverview({
    currentUser,
    myEntries,
    receivedEntries,
    myStats,
}: MyOverviewProps) {
    const [isOverviewOpen, setIsOverviewOpen] = useState(false);
    const [isAboutYouOpen, setIsAboutYouOpen] = useState(false);
    const [isMySubmissionsOpen, setIsMySubmissionsOpen] = useState(false);

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

    function renderEntries(entries: PlayerEntry[], isSubmitted: boolean) {
        if (entries.length === 0) {
            return (
                <div className="rounded-xl border border-dashed border-lavender-grey-300/50 bg-lavender-grey-100/50 px-4 py-6 text-center text-sm text-lavender-grey-600">
                    {isSubmitted
                        ? "You haven't submitted any entries yet."
                        : "There are no entries about you yet."}
                </div>
            );
        }

        return [...entries]
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
                            href={`https://www.reddit.com/user/${encodeURIComponent(
                                isSubmitted ? entry.username : entry.submittedBy
                            )}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold underline underline-offset-2"
                        >
                            u/{isSubmitted ? entry.username : entry.submittedBy}
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
            ));
    }

    return (
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
                    <div className="mb-5 text-sm font-semibold text-lavender-500">
                        {!currentUser && "Could not load your Reddit account."}
                    </div>

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
                                    {renderEntries(myEntries, true)}
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
                                    {renderEntries(receivedEntries, false)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}