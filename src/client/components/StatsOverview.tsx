import StatCard from "./StatCard";

type StatsOverviewProps = {
    stats: {
        total: number;
        vouches: number;
        reports: number;
    };
};

export default function StatsOverview({ stats }: StatsOverviewProps) {
    return (
        <section
            aria-label="Community statistics"
            className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
            <StatCard label="Total entries" value={stats.total} accent="lavender" />
            <StatCard label="Vouches" value={stats.vouches} accent="thistle" />
            <StatCard label="Reports" value={stats.reports} accent="blush" />
        </section>
    );
}