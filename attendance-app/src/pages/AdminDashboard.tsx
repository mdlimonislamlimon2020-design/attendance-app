import { useEffect, useState } from "react";
import { getSessions } from "../utils/db";
import type { Session } from "../types";
import SessionsTab from "./admin/SessionsTab";
import StudentsTab from "./admin/StudentsTab";
import TeachersTab from "./admin/TeachersTab";
import ClassesTab from "./admin/ClassesTab";
import NoticesTab from "./admin/NoticesTab";
import ReportsTab from "./admin/ReportsTab";
import HolidaysTab from "./admin/HolidaysTab";
import ResultsTab from "./admin/ResultsTab";

type Tab = "sessions" | "students" | "teachers" | "classes" | "notices" | "reports" | "holidays" | "results";

const TABS: { id: Tab; label: string }[] = [
  { id: "sessions", label: "সেশন" },
  { id: "students", label: "স্টুডেন্ট" },
  { id: "teachers", label: "শিক্ষক" },
  { id: "classes", label: "ক্লাস ও হাজিরা" },
  { id: "results", label: "ফলাফল" },
  { id: "notices", label: "নোটিশ" },
  { id: "reports", label: "রিপোর্ট" },
  { id: "holidays", label: "ছুটির তালিকা" },
];

// tabs that don't depend on a selected session
const SESSION_INDEPENDENT: Tab[] = ["sessions", "holidays"];

// সেশন অনুযায়ী প্রায়োরিটি র‍্যাংক ডিফাইন করার ফাংশন (H1, H2, H3, H4, MSc সাজানোর জন্য)
function getSessionRank(name: string): number {
  const upper = name.toUpperCase();
  if (upper.includes("H-1") || upper.includes("H1")) return 1;
  if (upper.includes("H-2") || upper.includes("H2")) return 2;
  if (upper.includes("H-3") || upper.includes("H3")) return 3;
  if (upper.includes("H-4") || upper.includes("H4")) return 4;
  if (upper.includes("MSC") || upper.includes("মাষ্টার্স")) return 5;
  return 99; // অন্য কিছু থাকলে সবার শেষে দেখাবে
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("sessions");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState("");

  // অ্যাক্টিভ সেশনগুলোকে সঠিক ক্রমানুসারে সর্ট করে নেওয়া হলো
  const activeSessions = sessions
    .filter((s) => !s.archived)
    .sort((a, b) => getSessionRank(a.name) - getSessionRank(b.name));

  async function refreshSessions() {
    try {
      const list = await getSessions();
      setSessions(list);
      const active = list
        .filter((s) => !s.archived)
        .sort((a, b) => getSessionRank(a.name) - getSessionRank(b.name));
      
      setSessionId((prev) => {
        if (prev && active.some((s) => s.id === prev)) return prev;
        return active.length > 0 ? active[0].id : "";
      });
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    refreshSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const needsSession = !SESSION_INDEPENDENT.includes(tab);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-4 font-display text-2xl font-bold text-navy dark:text-slate-100">
        অ্যাডমিন প্যানেল
      </h1>

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-lg bg-navy/5 dark:bg-white/5 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-medium transition " +
              (tab === t.id
                ? "bg-white dark:bg-slate-800 text-navy dark:text-slate-100 shadow-sm"
                : "text-navy/50 dark:text-slate-400 hover:text-navy dark:hover:text-slate-100")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {needsSession && (
        <div className="mb-5">
          <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">
            সেশন নির্বাচন করুন
          </label>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-navy/15 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm shadow-slate-900/5 dark:shadow-none px-3 py-2 text-sm focus:border-teal"
          >
            {activeSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.year}
              </option>
            ))}
          </select>
          {activeSessions.length === 0 && sessions.length > 0 && (
            <p className="mt-1 text-xs text-navy/40 dark:text-slate-400">
              সব সেশন আর্কাইভ করা আছে — "সেশন" ট্যাব থেকে একটা ফিরিয়ে আনো।
            </p>
          )}
        </div>
      )}

      {tab === "sessions" && (
        <SessionsTab sessions={sessions} onChanged={refreshSessions} />
      )}
      {tab === "holidays" && <HolidaysTab />}
      {tab === "students" && sessionId && <StudentsTab sessionId={sessionId} />}
      {tab === "teachers" && sessionId && <TeachersTab sessionId={sessionId} />}
      {tab === "classes" && sessionId && <ClassesTab sessionId={sessionId} />}
      {tab === "results" && sessionId && <ResultsTab sessionId={sessionId} />}
      {tab === "notices" && sessionId && <NoticesTab sessionId={sessionId} />}
      {tab === "reports" && sessionId && <ReportsTab sessionId={sessionId} />}

      {needsSession && !sessionId && (
        <p className="text-sm text-navy/40 dark:text-slate-400">
          প্রথমে "সেশন" ট্যাব থেকে একটা সেশন তৈরি করুন।
        </p>
      )}
    </div>
  );
}