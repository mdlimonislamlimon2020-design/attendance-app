import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getClasses,
  getStudents,
  getAttendanceForSession,
  createClass,
  saveAttendance,
  getHolidays,
  getSessions,
} from "../utils/db";
import type { ClassSession, Student, Holiday, Session } from "../types";
import ChangePassword from "../components/ChangePassword";
import StatCard from "../components/StatCard";
import ResultsTab from "./admin/ResultsTab";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

interface ParsedNote {
  approved: string;
  banga: string;
  days: string;
  remark: string;
}

// স্টুডেন্ট ড্যাশবোর্ডের ছুটির তথ্য পার্স করার ফাংশন
const parseHolidayNote = (noteStr?: string): ParsedNote => {
  if (!noteStr) return { approved: "—", banga: "—", days: "০১", remark: "—" };

  if (noteStr.includes("•")) {
    const parts = noteStr.split("•").map((p) => p.trim());
    return {
      approved: parts[0] || "—",
      banga: parts[1] || "—",
      days: parts[2]?.replace("দিন:", "").trim() || "০১",
      remark: "—",
    };
  }

  const parts = noteStr.split("|").map((p) => p.trim());
  const approved = parts[0]?.replace("অনুমোদিত তারিখ:", "").trim() || "—";
  const banga = parts[1]?.replace("বঙ্গাব্দ:", "").trim() || "—";
  const days = parts[2]?.replace("দিন সংখ্যা:", "").trim() || "০১";
  const remark = parts[3]?.replace("মন্তব্য:", "").trim() || "—";

  return { approved, banga, days, remark };
};

export default function TeacherDashboard() {
  const { teacher } = useAuth();
  
  // সেশন সম্পর্কিত স্টেট
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  // ডাটা স্টেট
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Record<string, boolean>>>({});
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // অ্যাক্টিভ ট্যাব স্টেট: 'classes' | 'results' | 'holidays'
  const [activeTab, setActiveTab] = useState<"classes" | "results" | "holidays">("classes");

  // ক্লাস তৈরি ও হাজিরা মার্ক করার স্টেট
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);

  const [markingClassId, setMarkingClassId] = useState<string | null>(null);
  const [presentSet, setPresentSet] = useState<Set<string>>(new Set());
  const [savingAttendance, setSavingAttendance] = useState(false);

  // প্রথমবার সেশন এবং ছুটির তালিকা লোড করা
  useEffect(() => {
    async function init() {
      if (!teacher) return;
      setLoading(true);
      try {
        const [allSessions, hols] = await Promise.all([
          getSessions(),
          getHolidays(),
        ]);
        
        // সেশন সর্টিং
        const sortedSessions = allSessions.sort((a, b) => 
          (a.name || a.id).localeCompare(b.name || b.id, undefined, { numeric: true })
        );

        setSessions(sortedSessions);
        setHolidays(hols);

        const defaultSess = teacher.sessionId || (sortedSessions.length > 0 ? sortedSessions[0].id : "");
        setSelectedSessionId(defaultSess);
      } catch (err) {
        console.error(err);
        setLoadError("তথ্য লোড করা যায়নি। পেজ রিফ্রেশ করুন।");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [teacher]);

  // সিলেক্ট করা সেশনের ডাটা লোড করা
  async function loadSessionData(sessionId: string) {
    if (!teacher || !sessionId) return;
    setSessionLoading(true);
    setLoadError("");
    setMarkingClassId(null);
    try {
      const [allClasses, studs, att] = await Promise.all([
        getClasses(sessionId),
        getStudents(sessionId),
        getAttendanceForSession(sessionId),
      ]);
      setClasses(allClasses.filter((c) => c.teacherId === teacher.id));
      setStudents(studs.sort((a, b) => a.sl - b.sl));
      setAttendance(att);
    } catch (err) {
      console.error(err);
      setLoadError("সেশনের ডাটা লোড করতে সমস্যা হয়েছে।");
    } finally {
      setSessionLoading(false);
    }
  }

  useEffect(() => {
    if (selectedSessionId) {
      loadSessionData(selectedSessionId);
    }
  }, [selectedSessionId]);

  if (!teacher) return null;

  const currentSessionObj = sessions.find((s) => s.id === selectedSessionId);
  const currentSessionName = currentSessionObj?.name || selectedSessionId;

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    if (!teacher || !selectedSessionId) return;
    setCreating(true);
    try {
      const cls = await createClass(selectedSessionId, teacher.id, date, note.trim());
      setNote("");
      await loadSessionData(selectedSessionId);
      openMarking(cls.id, {});
    } finally {
      setCreating(false);
    }
  }

  function openMarking(classId: string, currentAttendance: Record<string, Record<string, boolean>>) {
    setMarkingClassId(classId);
    const existing = currentAttendance[classId] || {};
    setPresentSet(new Set(Object.keys(existing).filter((id) => existing[id])));
  }

  function toggleStudent(studentId: string) {
    setPresentSet((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  async function handleSaveAttendance() {
    if (!markingClassId || !teacher || !selectedSessionId) return;
    setSavingAttendance(true);
    try {
      await saveAttendance(selectedSessionId, markingClassId, Array.from(presentSet));
      await loadSessionData(selectedSessionId);
      setMarkingClassId(null);
    } finally {
      setSavingAttendance(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-center text-navy/50 dark:text-slate-400">
        লোড হচ্ছে...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* হেডার ও পাসওয়ার্ড চেঞ্জ */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-navy/10 dark:border-white/10 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy dark:text-slate-100">
            হ্যালো, {teacher.name}
          </h1>
          <p className="mt-1 text-xs text-navy/50 dark:text-slate-400">
            শিক্ষক ড্যাশবোর্ড — আপনার কোর্স ও ক্লাসের সকল কার্যক্রম পরিচালনা করুন
          </p>
        </div>
        <ChangePassword />
      </div>

      {/* সেশন সিলেক্টর */}
      <div className="rounded-xl border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <label className="text-sm font-semibold text-navy dark:text-slate-200">
          বর্তমান শিক্ষাবর্ষ / সেশন নির্বাচন করুন:
        </label>
        <select
          value={selectedSessionId}
          onChange={(e) => setSelectedSessionId(e.target.value)}
          className="rounded-lg border border-navy/20 dark:border-white/20 bg-slate-50 dark:bg-slate-900 px-4 py-2 text-sm font-medium text-navy dark:text-slate-100 focus:border-teal focus:outline-none"
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name ? `সেশন: ${s.name}` : s.id}
            </option>
          ))}
        </select>
      </div>

      {/* ট্যাবস নেভিগেশন */}
      <div className="flex border-b border-navy/10 dark:border-white/10 gap-2">
        <button
          onClick={() => setActiveTab("classes")}
          className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "classes"
              ? "border-teal text-teal font-semibold"
              : "border-transparent text-navy/60 dark:text-slate-400 hover:text-navy dark:hover:text-slate-200"
          }`}
        >
          রোল কল ও ক্লাস
        </button>
        <button
          onClick={() => setActiveTab("results")}
          className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "results"
              ? "border-teal text-teal font-semibold"
              : "border-transparent text-navy/60 dark:text-slate-400 hover:text-navy dark:hover:text-slate-200"
          }`}
        >
          ইনকোর্স নম্বর
        </button>
        <button
          onClick={() => setActiveTab("holidays")}
          className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "holidays"
              ? "border-teal text-teal font-semibold"
              : "border-transparent text-navy/60 dark:text-slate-400 hover:text-navy dark:hover:text-slate-200"
          }`}
        >
          ছুটির তালিকা
        </button>
      </div>

      {/* লোডিং বা এরর স্টেট */}
      {sessionLoading && (
        <div className="py-8 text-center text-sm text-navy/50 dark:text-slate-400">
          সেশনের ডাটা লোড হচ্ছে...
        </div>
      )}
      {loadError && !sessionLoading && (
        <div className="py-4 text-center text-sm text-danger">{loadError}</div>
      )}

      {!sessionLoading && (
        <>
          {/* ট্যাব ১: রোল কল ও ক্লাস */}
          {activeTab === "classes" && (
            <div className="space-y-6">
              {/* স্ট্যাটাস কার্ড */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <StatCard label="মোট ক্লাস নিয়েছেন" value={classes.length} accent="navy" />
                <StatCard label="মোট স্টুডেন্ট" value={students.length} accent="teal" />
                <StatCard
                  label="সর্বশেষ ক্লাস"
                  value={classes.length > 0 ? classes[classes.length - 1].date : "—"}
                  accent="gold"
                />
              </div>

              {/* রোল কল নেওয়ার ফর্ম */}
              <div className="rounded-xl border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 p-5 shadow-sm">
                <h2 className="mb-4 font-display text-lg font-semibold text-navy dark:text-slate-100">
                  নতুন রোল কল শুরু করুন ({currentSessionName})
                </h2>
                <form onSubmit={handleCreateClass} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">
                        তারিখ
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-lg border border-navy/15 dark:border-white/10 bg-transparent px-3 py-2 text-sm focus:border-teal focus:outline-none dark:text-slate-100"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        disabled={creating}
                        className="w-full rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-50 transition-colors"
                      >
                        {creating ? "শুরু হচ্ছে..." : "এক ক্লিকে রোল কল শুরু করুন"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">
                      ক্লাস নোট (ঐচ্ছিক) — কী পড়ালেন স্টুডেন্টরা দেখতে পাবে
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder="যেমন: চ্যাপ্টার ৫ — ডিফারেনশিয়াল ইকুয়েশন"
                      className="w-full rounded-lg border border-navy/15 dark:border-white/10 bg-transparent px-3 py-2 text-sm focus:border-teal focus:outline-none dark:text-slate-100"
                    />
                  </div>
                </form>
              </div>

              {/* রোল কল করার প্যানেল */}
              {markingClassId && (
                <div className="rounded-xl border border-teal/30 bg-teal/5 dark:bg-teal/10 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-base font-semibold text-navy dark:text-slate-100">
                      উপস্থিতি মার্ক করুন — {presentSet.size} / {students.length} জন
                    </h4>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setPresentSet(new Set(students.map((s) => s.id)))}
                        className="text-xs font-medium text-teal hover:underline"
                      >
                        সবাইকে উপস্থিত করুন
                      </button>
                      <button
                        onClick={() => setPresentSet(new Set())}
                        className="text-xs font-medium text-navy/50 dark:text-slate-400 hover:underline"
                      >
                        রিসেট
                      </button>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800">
                    {students.map((s) => {
                      const present = presentSet.has(s.id);
                      return (
                        <label
                          key={s.id}
                          className="flex cursor-pointer items-center gap-3 border-b border-navy/5 dark:border-white/10 px-4 py-2.5 text-sm last:border-b-0 hover:bg-navy/5 dark:hover:bg-white/5 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={present}
                            onChange={() => toggleStudent(s.id)}
                            className="h-4 w-4 accent-teal rounded"
                          />
                          <span className="w-8 text-xs font-mono text-navy/40 dark:text-slate-400">{s.sl}</span>
                          <span className="w-28 shrink-0 font-mono text-navy/60 dark:text-slate-300">
                            {s.reg}
                          </span>
                          <span className="font-medium text-navy dark:text-slate-100">{s.name}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveAttendance}
                      disabled={savingAttendance}
                      className="rounded-lg bg-teal px-5 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-50"
                    >
                      {savingAttendance ? "সেভ হচ্ছে..." : "হাজিরা সেভ করুন"}
                    </button>
                    <button
                      onClick={() => setMarkingClassId(null)}
                      className="rounded-lg border border-navy/15 dark:border-white/10 px-4 py-2 text-sm font-medium text-navy dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800"
                    >
                      বাতিল
                    </button>
                  </div>
                </div>
              )}

              {/* ক্লাস হিস্ট্রি */}
              <div>
                <h2 className="mb-3 font-display text-lg font-semibold text-navy dark:text-slate-100">
                  {currentSessionName}-এর নেওয়া ক্লাসসমূহ ({classes.length})
                </h2>
                <div className="divide-y divide-navy/5 dark:divide-white/10 rounded-xl border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                  {classes
                    .slice()
                    .reverse()
                    .map((c) => (
                      <div key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                        <div>
                          <span className="font-mono mr-2 text-xs text-navy/40 dark:text-slate-400">
                            #{c.serialNo}
                          </span>
                          <span className="font-medium text-navy dark:text-slate-100">{c.date}</span>
                          {c.note && (
                            <span className="ml-2 text-xs text-navy/60 dark:text-slate-400">· {c.note}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-navy/50 dark:text-slate-400">
                            {Object.values(attendance[c.id] || {}).filter(Boolean).length} উপস্থিত
                          </span>
                          <button
                            onClick={() => openMarking(c.id, attendance)}
                            className="text-xs font-semibold text-teal hover:underline"
                          >
                            এডিট করুন
                          </button>
                        </div>
                      </div>
                    ))}
                  {classes.length === 0 && (
                    <p className="px-4 py-8 text-center text-sm text-navy/40 dark:text-slate-400">
                      এই সেশনে এখনো কোনো ক্লাস নেননি।
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ট্যাব ২: ইনকোর্স ফলাফল */}
          {activeTab === "results" && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-navy dark:text-slate-100">
                ইনকোর্স ফলাফল ব্যবস্থাপনা ({currentSessionName})
              </h2>
              <ResultsTab sessionId={selectedSessionId} lockedTeacherId={teacher.id} />
            </div>
          )}

          {/* ট্যাব ৩: ছুটির তালিকা (স্টুডেন্ট ড্যাশবোর্ডের মতো সেম টেবিল লেআউট) */}
          {activeTab === "holidays" && (
            <div className="space-y-6">
              <div>
                <h2 className="mb-3 font-display text-lg font-semibold text-navy dark:text-slate-100">
                  সরকারি ছুটির তালিকা
                </h2>
                <div className="overflow-x-auto rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm">
                  <table className="w-full text-center text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-navy dark:text-slate-200 border-b border-navy/10 dark:border-white/10 font-semibold uppercase">
                      <tr>
                        <th className="px-3 py-3 text-center border-r border-navy/10 dark:border-white/10 w-12 whitespace-nowrap">ক্র.</th>
                        <th className="px-4 py-3 text-center border-r border-navy/10 dark:border-white/10 whitespace-nowrap">ছুটির উপলক্ষ্য</th>
                        <th className="px-4 py-3 text-center border-r border-navy/10 dark:border-white/10 whitespace-nowrap">অনুমোদিত ছুটির তারিখ ও দিন</th>
                        <th className="px-4 py-3 text-center border-r border-navy/10 dark:border-white/10 whitespace-nowrap">বঙ্গাব্দের তারিখ</th>
                        <th className="px-4 py-3 text-center border-r border-navy/10 dark:border-white/10 w-24 whitespace-nowrap">দিন সংখ্যা</th>
                        <th className="px-4 py-3 text-center whitespace-nowrap">মন্তব্য</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy/10 dark:divide-white/10">
                      {holidays.map((h, index) => {
                        const details = parseHolidayNote(h.note);

                        return (
                          <tr
                            key={h.id || index}
                            className="hover:bg-navy/5 dark:hover:bg-white/5 transition-colors text-center"
                          >
                            <td className="px-3 py-3 text-center font-data text-navy/50 dark:text-slate-400 border-r border-navy/10 dark:border-white/10">
                              {String(index + 1).padStart(2, "0")}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-navy dark:text-slate-100 border-r border-navy/10 dark:border-white/10">
                              {h.title}
                            </td>
                            <td className="px-4 py-3 text-center font-data text-navy/80 dark:text-slate-300 border-r border-navy/10 dark:border-white/10">
                              {details.approved !== "—" ? details.approved : h.date}
                            </td>
                            <td className="px-4 py-3 text-center font-data text-navy/70 dark:text-slate-400 border-r border-navy/10 dark:border-white/10">
                              {details.banga}
                            </td>
                            <td className="px-4 py-3 text-center font-data font-medium text-teal border-r border-navy/10 dark:border-white/10 whitespace-nowrap">
                              {details.days}
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-navy/60 dark:text-slate-400">
                              {details.remark}
                            </td>
                          </tr>
                        );
                      })}

                      {holidays.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-navy/40 dark:text-slate-400">
                            কোনো ছুটির ডাটা পাওয়া যায়নি।
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}