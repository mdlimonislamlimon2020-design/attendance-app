import { useState } from "react";
import type { ClassSession } from "../types";

interface Props {
  teacherName: string;
  classes: ClassSession[]; // this teacher's classes, in serial order
  attendance: Record<string, Record<string, boolean>>;
  studentId: string;
}

/**
 * প্রতিটা ডট একটা ক্লাসকে বোঝায় — ঠিক কাগজের হাজিরা শিটে যেমন প্রতিটা
 * ক্লাসের জন্য একটা করে "H" কলাম থাকে, তারই ডিজিটাল রূপ।
 * ভরাট ডট = উপস্থিত, ফাঁকা রিং = অনুপস্থিত।
 *
 * ডটের উপর হোভার করলে তারিখ দেখা যায় (ডেস্কটপে), কিন্তু ফোনে হোভার নেই —
 * তাই নিচে "বিস্তারিত" থেকে পুরো তালিকা টেক্সট আকারেও দেখা যাবে।
 */
export default function TeacherProgress({
  teacherName,
  classes,
  attendance,
  studentId,
}: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const attended = classes.filter(
    (c) => attendance[c.id]?.[studentId]
  ).length;
  const total = classes.length;
  const pct = total > 0 ? Math.round((attended / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm shadow-slate-900/5 dark:shadow-none p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h4 className="font-display text-[15px] font-semibold text-navy dark:text-slate-100">
          {teacherName}
        </h4>
        <p className="font-data text-sm text-navy/70 dark:text-slate-400">
          <span className="text-base font-semibold text-teal">{attended}</span>
          <span className="text-navy/40 dark:text-slate-400"> / {total}</span>
        </p>
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {classes.map((c) => {
          const present = !!attendance[c.id]?.[studentId];
          return (
            <span
              key={c.id}
              title={`ক্লাস #${c.serialNo} — ${c.date} — ${
                present ? "উপস্থিত" : "অনুপস্থিত"
              }`}
              className={
                "h-3 w-3 rounded-full transition " +
                (present
                  ? "bg-teal"
                  : "border-2 border-navy/15 dark:border-white/10 bg-transparent")
              }
            />
          );
        })}
        {total === 0 && (
          <p className="text-xs text-navy/40 dark:text-slate-400">এখনো কোনো ক্লাস হয়নি</p>
        )}
      </div>

      {total > 0 && (
        <>
          <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-navy/5 dark:bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal to-gold"
              style={{ width: `${pct}%` }}
            />
          </div>
          <button
            onClick={() => setShowDetail((v) => !v)}
            className="text-[11px] font-medium text-teal hover:underline"
          >
            {showDetail ? "বিস্তারিত লুকাও ▲" : "বিস্তারিত দেখাও ▼"}
          </button>
          {showDetail && (
            <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-navy/5 dark:bg-white/5 text-xs">
              {classes.map((c) => {
                const present = !!attendance[c.id]?.[studentId];
                return (
                  <li
                    key={c.id}
                    className="border-b border-white/60 dark:border-white/10 px-2.5 py-1.5 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-data text-navy/60 dark:text-slate-400">
                        #{c.serialNo} · {c.date}
                      </span>
                      <span
                        className={
                          "font-medium " +
                          (present ? "text-success" : "text-danger")
                        }
                      >
                        {present ? "উপস্থিত" : "অনুপস্থিত"}
                      </span>
                    </div>
                    {c.note && (
                      <p className="mt-0.5 text-navy/50 dark:text-slate-400">📝 {c.note}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
