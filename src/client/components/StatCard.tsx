type StatCardProps = {
    label: string;
    value: number;
    accent: "lavender" | "thistle" | "blush";
};

export default function StatCard({
    label,
    value,
    accent,
}: StatCardProps) {
    const accentClasses = {
        lavender: "bg-lavender-500/10 text-lavender-500",
        thistle: "bg-green-100/10 text-green-200",
        blush: "bg-soft-blush-200/10 text-soft-blush-200",
    };

    return (
        <div
            className={`rounded-2xl border border-lavender-grey-300/40 ${accentClasses[accent]} p-5 transition duration-200 hover:-translate-y-0.5 hover:border-lavender-grey-400/60 hover:shadow-lg hover:shadow-black/10`}
        >
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