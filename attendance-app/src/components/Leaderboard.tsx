import type { LeaderboardRow } from "../utils/stats";

interface Props {
  rows: LeaderboardRow[];
  currentStudentId?: string;
}

const medalColors = ["text-gold", "text-navy/40 dark:text-slate-400", "text-teal/60"];

export default function Leaderboard({ rows, currentStudentId }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-md shadow-slate-900/5 dark:shadow-none">
      {/* হেডিং মাঝখানে এবং আরও আকর্ষণীয় করা হয়েছে */}
      <div className="border-b border-navy/10 dark:border-white/10 bg-navy/[0.02] dark:bg-slate-900/40 px-4 py-4 text-center">
        <h3 className="font-display text-base font-bold tracking-wide text-navy dark:text-slate-100 flex items-center justify-center gap-2">
          <span>🏆</span> সর্বোচ্চ উপস্থিতি লিডারবোর্ড
        </h3>
        <p className="text-xs text-navy/50 dark:text-slate-400 mt-0.5">
          ক্লাসে নিয়মিত উপস্থিতির ভিত্তিতে সেরা শিক্ষার্থীদের তালিকা
        </p>
      </div>

      <ol className="divide-y divide-navy/5 dark:divide-white/10">
        {rows.map((row, i) => {
          const isMe = row.studentId === currentStudentId;
          return (
            <li
              key={row.studentId}
              className={
                "flex items-center gap-4 px-4 py-3 text-sm transition-colors " +
                (isMe 
                  ? "bg-teal-light/60 dark:bg-teal/20 border-l-4 border-teal" 
                  : "hover:bg-navy/[0.01] dark:hover:bg-white/[0.02]")
              }
            >
              {/* র‍্যাংক নম্বর */}
              <span
                className={
                  "font-data w-6 text-center font-bold text-base flex-shrink-0 " +
                  (medalColors[i] || "text-navy/40 dark:text-slate-400")
                }
              >
                {i + 1}
              </span>

              {/* নাম, ব্যাজ এবং রেজিস্ট্রেশন */}
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-navy dark:text-slate-100 truncate">
                    {row.name}
                  </span>
                  {isMe && (
                    <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-bold text-teal">
                      (আপনি)
                    </span>
                  )}

                  {/* মেডেল ব্যাজ */}
                  {i === 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 shadow-xs">
                      🥇 ১ম স্থান
                    </span>
                  )}
                  {i === 1 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 shadow-xs">
                      🥈 ২য় স্থান
                    </span>
                  )}
                  {i === 2 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-700/15 text-amber-900 dark:bg-amber-900/20 dark:text-amber-400 shadow-xs">
                      🥉 ৩য় স্থান
                    </span>
                  )}
                </div>
                <span className="font-data text-xs text-navy/40 dark:text-slate-400 mt-0.5">
                  {row.reg}
                </span>
              </div>

              {/* ডান পাশের উপস্থিতি সংখ্যা */}
              <div className="flex-shrink-0 text-right pl-2">
                <span className="font-data text-base font-bold text-navy dark:text-slate-100">
                  {row.totalAttended}
                </span>
                <span className="block text-[10px] font-medium text-navy/40 dark:text-slate-400">ক্লাস</span>
              </div>
            </li>
          );
        })}
        {rows.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-navy/40 dark:text-slate-400">
            এখনো কোনো তথ্য নেই
          </li>
        )}
      </ol>
    </div>
  );
}