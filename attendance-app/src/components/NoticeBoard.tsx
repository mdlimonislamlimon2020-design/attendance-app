import { Fragment, useState } from "react";
import type { Notice } from "../types";

interface Props {
  notices: Notice[];
  onDelete?: (id: string) => void;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("bn-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function CalendarIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      className="inline-block shrink-0"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export default function NoticeBoard({ notices, onDelete }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm shadow-slate-900/5 dark:shadow-none">
      <div className="border-b border-navy/10 dark:border-white/10 px-4 py-3">
        <h3 className="text-center font-display text-lg font-semibold text-navy dark:text-slate-100">
          নোটিশ
        </h3>
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-navy/10 dark:border-white/10 bg-navy/5 dark:bg-white/5 text-xs uppercase text-navy/50 dark:text-slate-400">
            <th className="w-10 px-3 py-2 text-center">#</th>
            <th className="px-3 py-2">শিরোনাম</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy/5 dark:divide-white/10">
          {notices.map((n, i) => {
            const isOpen = openId === n.id;
            return (
              <Fragment key={n.id}>
                <tr
                  onClick={() => setOpenId(isOpen ? null : n.id)}
                  className={
                    "cursor-pointer transition " +
                    (isOpen
                      ? "bg-teal-light dark:bg-teal/20"
                      : i % 2 === 1
                      ? "bg-navy/[0.02] dark:bg-white/[0.02] hover:bg-navy/5 dark:hover:bg-white/5"
                      : "hover:bg-navy/5 dark:hover:bg-white/5")
                  }
                >
                  <td className="px-3 py-3 text-center font-data text-navy/50 dark:text-slate-400">
                    {i + 1}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-navy dark:text-slate-100">{n.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-gold">
                      <CalendarIcon />
                      {formatDate(n.createdAt)}
                    </p>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="bg-navy/[0.03] dark:bg-white/[0.03]">
                    <td colSpan={2} className="px-4 py-3">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-navy/80 dark:text-slate-300">
                        {n.body}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-[11px] text-navy/40 dark:text-slate-400">
                          {n.postedByName}
                        </p>
                        {onDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(n.id);
                            }}
                            className="text-xs font-medium text-danger hover:underline"
                          >
                            মুছুন
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {notices.length === 0 && (
            <tr>
              <td colSpan={2} className="px-4 py-8 text-center text-sm text-navy/40 dark:text-slate-400">
                এখনো কোনো নোটিশ নেই।
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
