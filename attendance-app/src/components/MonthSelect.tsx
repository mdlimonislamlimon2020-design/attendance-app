import { ALL_MONTHS, monthLabel, type MonthFilter } from "../utils/months";

interface Props {
  months: string[]; // sorted ascending "yyyy-mm" keys
  value: MonthFilter;
  onChange: (value: MonthFilter) => void;
}

export default function MonthSelect({ months, value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-navy/15 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm shadow-slate-900/5 dark:shadow-none px-3 py-2 text-sm focus:border-teal"
    >
      <option value={ALL_MONTHS}>সব মিলিয়ে (পুরো সেশন)</option>
      {months
        .slice()
        .reverse()
        .map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
    </select>
  );
}
