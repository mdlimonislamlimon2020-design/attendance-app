interface Props {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "navy" | "teal" | "gold" | "danger";
}

export default function StatCard({ label, value, sub, accent = "navy" }: Props) {
  const accentColor =
    accent === "gold"
      ? "text-gold"
      : accent === "teal"
      ? "text-teal"
      : accent === "danger"
      ? "text-danger"
      : "text-navy dark:text-slate-100";

  return (
    <div className="rounded-xl border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm shadow-slate-900/5 dark:shadow-none p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-navy/50 dark:text-slate-400">
        {label}
      </p>
      <p className={`font-data mt-1 text-3xl font-semibold ${accentColor}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-navy/50 dark:text-slate-400">{sub}</p>}
    </div>
  );
}
