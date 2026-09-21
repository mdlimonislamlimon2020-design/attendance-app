import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getClasses,
  getTeachers,
  getAttendanceForSession,
  getStudents,
  getNotices,
  addNotice,
  deleteNotice,
  getHolidays,
  getMyPublishedResults,
} from "../utils/db";
import type { ClassSession, Teacher, Notice, Student, Holiday, PublishedResult } from "../types";
import {
  computeTeacherBreakdown,
  computeLeaderboard,
  computeMyTotalAttendance,
} from "../utils/stats";
import { ALL_MONTHS, getAvailableMonths, filterClassesByMonth, type MonthFilter } from "../utils/months";
import StatCard from "../components/StatCard";
import TeacherProgress from "../components/TeacherProgress";
import Leaderboard from "../components/Leaderboard";
import NoticeBoard from "../components/NoticeBoard";
import NoticeForm from "../components/NoticeForm";
import ChangePassword from "../components/ChangePassword";
import MonthSelect from "../components/MonthSelect";
import StudentResults from "../components/StudentResults";

const LOW_ATTENDANCE_THRESHOLD = 75;
const NOTICES_PER_PAGE = 10;

interface ParsedNote {
  approved: string;
  banga: string;
  days: string;
  remark: string;
}

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

export default function StudentDashboard() {
  const { student } = useAuth();
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Record<string, boolean>>>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [results, setResults] = useState<Array<PublishedResult & { examId: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [month, setMonth] = useState<MonthFilter>(ALL_MONTHS);

  // Active Tab State (লিডারবোর্ড ট্যাবে মেডেল ব্যাজ দেখানোর ব্যবস্থা সহ)
  const [activeTab, setActiveTab] = useState<
    "overview" | "leaderboard" | "results" | "notices" | "holidays"
  >("overview");

  // রেজাল্ট ট্যাবের ভেতরের সাব-ট্যাব (1st বা 2nd In-course)
  const [resultsSubTab, setResultsSubTab] = useState<"1st" | "2nd">("1st");

  const [noticePage, setNoticePage] = useState(1);

  async function loadAll() {
    if (!student) return;
    setLoading(true);
    setLoadError("");
    try {
      const [cls, tch, att, studs, ntcs, hols, res] = await Promise.all([
        getClasses(student.sessionId),
        getTeachers(student.sessionId),
        getAttendanceForSession(student.sessionId),
        getStudents(student.sessionId),
        getNotices(student.sessionId),
        getHolidays(),
        getMyPublishedResults(student.sessionId, student.id),
      ]);
      setClasses(cls);
      setTeachers(tch);
      setAttendance(att);
      setStudents(studs);
      setNotices(ntcs);
      setHolidays(hols);
      setResults(res);
    } catch (err) {
      console.error(err);
      setLoadError("তথ্য লোড করা যায়নি। ইন্টারনেট চেক করে পেজ রিফ্রেশ করুন।");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [student?.id]);

  const availableMonths = useMemo(() => getAvailableMonths(classes), [classes]);
  const filteredClasses = useMemo(
    () => filterClassesByMonth(classes, month),
    [classes, month]
  );

  const totalNoticePages = Math.ceil(notices.length / NOTICES_PER_PAGE);
  const paginatedNotices = useMemo(() => {
    const start = (noticePage - 1) * NOTICES_PER_PAGE;
    return notices.slice(start, start + NOTICES_PER_PAGE);
  }, [notices, noticePage]);

  if (!student) return null;
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-center text-navy/50 dark:text-slate-400">
        লোড হচ্ছে...
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-center text-danger">{loadError}</div>
    );
  }

  const myTotal = computeMyTotalAttendance(filteredClasses, attendance, student.id);
  const totalClasses = filteredClasses.length;
  const pct = totalClasses > 0 ? Math.round((myTotal / totalClasses) * 100) : 0;
  const breakdown = computeTeacherBreakdown(filteredClasses, teachers, attendance, student.id);
  const leaderboard = computeLeaderboard(students, filteredClasses, attendance, 10);
  const crNames = students.filter((s) => s.isCR).map((s) => s.name);
  const showLowAttendanceWarning = totalClasses > 0 && pct < LOW_ATTENDANCE_THRESHOLD;

  async function handleAddNotice(title: string, body: string) {
    if (!student) return;
    await addNotice(student.sessionId, title, body, `${student.name} (CR)`);
    const ntcs = await getNotices(student.sessionId);
    setNotices(ntcs);
    setNoticePage(1);
  }

  async function handleDeleteNotice(noticeId: string) {
    if (!student) return;
    await deleteNotice(student.sessionId, noticeId);
    setNotices((prev) => prev.filter((n) => n.id !== noticeId));
  }

  // Helper function to render tab button cleanly
  const renderTabButton = (
    id: "overview" | "leaderboard" | "results" | "notices" | "holidays",
    label: string
  ) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`pb-2.5 px-3 text-sm font-semibold transition-colors border-b-2 ${
        activeTab === id
          ? "border-teal text-teal dark:text-teal"
          : "border-transparent text-navy/60 dark:text-slate-400 hover:text-navy dark:hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Header Info */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 font-display text-2xl font-bold text-navy dark:text-slate-100">
            হ্যালো, {student.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-navy/50 dark:text-slate-400 font-data">{student.reg}</p>
        </div>
        {availableMonths.length > 0 && (
          <MonthSelect months={availableMonths} value={month} onChange={setMonth} />
        )}
      </div>

      <div className="mb-6">
        <ChangePassword />
      </div>

      {showLowAttendanceWarning && (
        <div className="mb-6 rounded-lg border border-danger/30 bg-danger-light dark:bg-danger/20 px-4 py-3 text-sm text-danger">
          ⚠️ আপনার উপস্থিতি এখন <span className="font-data font-semibold">{pct}%</span> —{" "}
          {LOW_ATTENDANCE_THRESHOLD}% এর নিচে। পরীক্ষায় বসার শর্ত পূরণ করতে বাকি ক্লাসগুলোতে
          নियमित থাকার চেষ্টা করুন।
        </div>
      )}

      {/* Tabs Navigation (লিডারবোর্ড আগে এবং ফলাফল ট্যাব একসাথে) */}
      <div className="mb-6 flex flex-wrap border-b border-navy/10 dark:border-white/10 gap-1 sm:gap-2">
        {renderTabButton("overview", "উপস্থিতি ওভারভিউ")}
        {renderTabButton("leaderboard", "লিডারবোর্ড")}
        {renderTabButton("results", "ফলাফল")}
        {renderTabButton("notices", "নোটিশ বোর্ড")}
        {renderTabButton("holidays", "ছুটির তালিকা")}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="মোট ক্লাস হয়েছে" value={totalClasses} accent="navy" />
            <StatCard
              label="আপনি এসেছেন"
              value={myTotal}
              sub={`${pct}% উপস্থিতি`}
              accent={pct < LOW_ATTENDANCE_THRESHOLD ? "danger" : "teal"}
            />
            <StatCard label="মোট শিক্ষক" value={teachers.length} accent="navy" />
            <StatCard
              label="আপনার র‍্যাংক"
              value={
                leaderboard.findIndex((r) => r.studentId === student.id) === -1
                  ? "—"
                  : `#${leaderboard.findIndex((r) => r.studentId === student.id) + 1}`
              }
              accent="gold"
            />
          </div>

          <div>
            <h2 className="mb-3 font-display text-lg font-semibold text-navy dark:text-slate-100">
              শিক্ষক অনুযায়ী উপস্থিতি
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {breakdown.map((row) => (
                <TeacherProgress
                  key={row.teacherId}
                  teacherName={row.teacherName}
                  classes={filteredClasses.filter((c) => c.teacherId === row.teacherId)}
                  attendance={attendance}
                  studentId={student.id}
                />
              ))}
              {breakdown.length === 0 && (
                <p className="text-sm text-navy/40 dark:text-slate-400">এই সময়ে কোনো ক্লাস হয়নি।</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LEADERBOARD (১ম, ২য়, ৩য় পজিশনের জন্য মেডেল/ব্যাজ সহ) */}
      {activeTab === "leaderboard" && (
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold text-navy dark:text-slate-100">
            লিডারবোর্ড
          </h2>
          <Leaderboard rows={leaderboard} currentStudentId={student.id} />
        </div>
      )}

      {/* TAB 3: RESULTS (১ম ও ২য় ইনকোর্স সাব-ট্যাবসহ) */}
      {activeTab === "results" && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-navy dark:text-slate-100">
            ইনকোর্স পরীক্ষার ফলাফল
          </h2>
          
          {/* সাব-ট্যাব নেভিগেশন */}
          <div className="flex gap-2 border-b border-navy/10 dark:border-white/10 pb-2">
            <button
              onClick={() => setResultsSubTab("1st")}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                resultsSubTab === "1st"
                  ? "bg-teal text-white"
                  : "bg-navy/5 dark:bg-white/5 text-navy/70 dark:text-slate-300 hover:bg-navy/10"
              }`}
            >
              ১ম ইনকোর্স রেজাল্ট
            </button>
            <button
              onClick={() => setResultsSubTab("2nd")}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                resultsSubTab === "2nd"
                  ? "bg-teal text-white"
                  : "bg-navy/5 dark:bg-white/5 text-navy/70 dark:text-slate-300 hover:bg-navy/10"
              }`}
            >
              ২য় ইনকোর্স রেজাল্ট
            </button>
          </div>

          {/* সাব-ট্যাব অনুযায়ী রেজাল্ট কম্পোনেন্ট রেন্ডারিং */}
          <StudentResults 
            results={results} 
            student={student} 
            subTab={resultsSubTab} 
          />
        </div>
      )}

      {/* TAB 4: NOTICES */}
      {activeTab === "notices" && (
        <div className="space-y-6">
          <div>
            <h2 className="mb-1 font-display text-lg font-semibold text-navy dark:text-slate-100">
              নোটিশ বোর্ড
            </h2>
            {crNames.length > 0 && (
              <p className="mb-4 text-xs text-navy/50 dark:text-slate-400">
                এই সেশনের CR: <span className="font-medium text-navy/70 dark:text-slate-400">{crNames.join(", ")}</span>
              </p>
            )}
            {student.isCR && (
              <div className="mb-4">
                <NoticeForm onSubmit={handleAddNotice} />
              </div>
            )}
            
            <NoticeBoard
              notices={paginatedNotices}
              onDelete={student.isCR ? handleDeleteNotice : undefined}
            />

            {totalNoticePages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-navy/10 dark:border-white/10 pt-4">
                <p className="text-xs text-navy/60 dark:text-slate-400">
                  মোট {notices.length} টি নোটিশের মধ্যে {((noticePage - 1) * NOTICES_PER_PAGE) + 1} - {Math.min(noticePage * NOTICES_PER_PAGE, notices.length)} দেখাচ্ছে
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={noticePage === 1}
                    onClick={() => setNoticePage((prev) => Math.max(prev - 1, 1))}
                    className="rounded border border-navy/20 dark:border-white/20 px-3 py-1 text-xs font-semibold text-navy dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-navy/5 dark:hover:bg-white/5 transition-colors"
                  >
                    আগের পেজ
                  </button>
                  <span className="text-xs font-data font-semibold text-navy dark:text-slate-300">
                    {noticePage} / {totalNoticePages}
                  </span>
                  <button
                    disabled={noticePage === totalNoticePages}
                    onClick={() => setNoticePage((prev) => Math.min(prev + 1, totalNoticePages))}
                    className="rounded border border-navy/20 dark:border-white/20 px-3 py-1 text-xs font-semibold text-navy dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-navy/5 dark:hover:bg-white/5 transition-colors"
                  >
                    পরবর্তী পেজ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: HOLIDAYS */}
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
    </div>
  );
}