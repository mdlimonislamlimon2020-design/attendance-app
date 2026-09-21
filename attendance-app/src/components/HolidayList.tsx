import type { Holiday } from "../types";

interface Props {
  holidays: Holiday[];
  compact?: boolean;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("bn-BD", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function HolidayList({ holidays, compact = false }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = holidays.filter((h) => h.date >= today);
  const list = compact ? upcoming.slice(0, 3) : holidays;

  return (
    <div className="rounded-xl border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm shadow-slate-900/5 dark:shadow-none">
      <div className="border-b border-navy/10 dark:border-white/10 px-4 py-3">
        <h3 className="font-display text-base font-semibold text-navy dark:text-slate-100">
          ছুটির তালিকা
        </h3>
      </div>
      <ul className="divide-y divide-navy/5 dark:divide-white/10">
        {list.map((h) => (
          <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <div>
              <p className="font-medium text-navy dark:text-slate-100">{h.title}</p>
              {h.note && <p className="text-xs text-navy/50 dark:text-slate-400">{h.note}</p>}
            </div>
            <span className="font-data shrink-0 text-xs text-navy/60 dark:text-slate-400">
              {formatDate(h.date)}
            </span>
          </li>
        ))}
        {list.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-navy/40 dark:text-slate-400">
            {compact ? "সামনে কোনো ছুটি নেই।" : "এখনো কোনো ছুটি যোগ হয়নি।"}
          </li>
        )}
      </ul>
    </div>
  );
}
