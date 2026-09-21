import { useEffect, useState } from "react";
import {
  createClass,
  deleteClass,
  getClasses,
  getTeachers,
  getStudents,
  getAttendanceForSession,
  saveAttendance,
  updateClassMeta,
  sendDailyAttendanceSms,
} from "../../utils/db";
import type { ClassSession, Teacher, Student } from "../../types";
import { useConfirm } from "../../context/ConfirmContext";

interface Props {
  sessionId: string;
}

function todayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// YYYY-MM-DD কে DD-MM-YY (যেমন: 17-09-26) বানানোর হেলপার ফাংশন
function formatDateToShortDMY(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const shortYear = year.length === 4 ? year.slice(-2) : year;
  return `${day}-${month}-${shortYear}`;
}

export default function ClassesTab({ sessionId }: Props) {
  const confirm = useConfirm();
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [date, setDate] = useState(todayStr());
  const [teacherId, setTeacherId] = useState("");
  const [note, setNote] = useState("");
  const [smsDate, setSmsDate] = useState(todayStr());
  const [sendingSms, setSendingSms] = useState(false);
  const [smsResult, setSmsResult] = useState("");
  const [creating, setCreating] = useState(false);

  const [markingClassId, setMarkingClassId] = useState<string | null>(null);
  const [presentSet, setPresentSet] = useState<Set<string>>(new Set());
  const [savingAttendance, setSavingAttendance] = useState(false);

  const [editingMetaId, setEditingMetaId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editNote, setEditNote] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);

  async function loadAll() {
    setLoading(true);
    setLoadError("");
    try {
      const [cls, tch, studs, att] = await Promise.all([
        getClasses(sessionId),
        getTeachers(sessionId),
        getStudents(sessionId),
        getAttendanceForSession(sessionId),
      ]);
      setClasses(cls);
      setTeachers(tch);
      setStudents(studs.sort((a, b) => a.sl - b.sl));
      setAttendance(att);
      if (tch.length > 0 && !teacherId) setTeacherId(tch[0].id);
    } catch (err) {
      console.error(err);
      setLoadError("তালিকা লোড করা যায়নি। ইন্টারনেট চেক করে আবার চেষ্টা করুন, অথবা Firebase rules ঠিকভাবে Publish করা আছে কিনা দেখুন।");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    if (!teacherId) return;
    setCreating(true);
    try {
      const cls = await createClass(sessionId, teacherId, date, note.trim());
      setNote("");
      await loadAll();
      openMarking(cls.id, {});
    } finally {
      setCreating(false);
    }
  }

  async function handleSendSms() {
    const formattedSmsDate = formatDateToShortDMY(smsDate);
    const ok = await confirm({
      message: `${formattedSmsDate} তারিখের হাজিরার SMS সব অভিভাবককে পাঠাতে চান? প্রতিটা SMS-এর জন্য খরচ হবে (BulkSMSBD অ্যাকাউন্ট থেকে কাটবে)।`,
      confirmLabel: "SMS পাঠান",
    });
    if (!ok) return;
    setSendingSms(true);
    setSmsResult("");
    try {
      const result = await sendDailyAttendanceSms(sessionId, smsDate);
      if (result.message) {
        setSmsResult(result.message);
      } else {
        setSmsResult(
          `✅ ${result.sent} জন অভিভাবককে SMS পাঠানো হয়েছে।` +
            (result.skipped ? ` (${result.skipped} জনের অভিভাবকের নম্বর নেই, বাদ পড়েছে)` : "")
        );
      }
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || "";
      if (message.includes("not-found") || message.includes("NOT_FOUND")) {
        setSmsResult(
          "⚠️ SMS পাঠানো যায়নি — মনে হচ্ছে Cloud Function এখনো ডিপ্লয় করা হয়নি। SETUP.md-এর SMS সেকশন দেখুন।"
        );
      } else {
        setSmsResult("⚠️ SMS পাঠাতে সমস্যা হয়েছে। কনসোলে বিস্তারিত এরর দেখুন।");
      }
      console.error(err);
    } finally {
      setSendingSms(false);
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
    if (!markingClassId) return;
    setSavingAttendance(true);
    try {
      await saveAttendance(sessionId, markingClassId, Array.from(presentSet));
      await loadAll();
      setMarkingClassId(null);
    } finally {
      setSavingAttendance(false);
    }
  }

  async function handleDeleteClass(classId: string) {
    const ok = await confirm({
      message: "এই ক্লাস আর এর হাজিরা ডিলিট হয়ে যাবে। নিশ্চিত?",
      danger: true,
      confirmLabel: "মুছুন",
    });
    if (!ok) return;
    await deleteClass(sessionId, classId);
    if (markingClassId === classId) setMarkingClassId(null);
    await loadAll();
  }

  function startEditMeta(c: ClassSession) {
    setEditingMetaId(c.id);
    setEditDate(c.date);
    setEditTeacherId(c.teacherId);
    setEditNote(c.note || "");
  }

  async function saveEditMeta(classId: string) {
    if (!editTeacherId || !editDate) return;
    setSavingMeta(true);
    try {
      await updateClassMeta(sessionId, classId, {
        teacherId: editTeacherId,
        date: editDate,
        note: editNote.trim(),
      });
      setEditingMetaId(null);
      await loadAll();
    } finally {
      setSavingMeta(false);
    }
  }

  const teacherMap = new Map(teachers.map((t) => [t.id, t.name]));

  if (loading) return <p className="text-sm text-navy/40 dark:text-slate-400">লোড হচ্ছে...</p>;
  if (loadError) return <p className="text-sm text-danger">{loadError}</p>;

  if (teachers.length === 0) {
    return (
      <p className="text-sm text-navy/50 dark:text-slate-400">
        প্রথমে "শিক্ষক" ট্যাব থেকে অন্তত একজন শিক্ষক যোগ করুন।
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCreateClass}
        className="space-y-3 rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm shadow-slate-900/5 dark:shadow-none p-4"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">তারিখ</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-navy/15 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-teal"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">শিক্ষক</label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="rounded-lg border border-navy/15 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-teal"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id} className="bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-gold-light hover:bg-navy-deep disabled:opacity-50"
          >
            {creating ? "তৈরি হচ্ছে..." : "নতুন ক্লাস যোগ করুন"}
          </button>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">
            ক্লাস নোট (ঐচ্ছিক) — কী পড়ানো হয়েছে, হোমওয়ার্ক ইত্যাদি স্টুডেন্টরা দেখতে পাবে
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="যেমন: চ্যাপ্টার ৫ — ডিফারেনশিয়াল ইকুয়েশন, হোমওয়ার্ক: প্রবলেম সেট ৩"
            className="w-full rounded-lg border border-navy/15 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-teal"
          />
        </div>
      </form>

      <div className="rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm shadow-slate-900/5 dark:shadow-none p-4">
        <h4 className="mb-1 font-display text-sm font-semibold text-navy dark:text-slate-100">
          অভিভাবকের কাছে হাজিরার SMS পাঠান
        </h4>
        <p className="mb-3 text-xs text-navy/50 dark:text-slate-400">
          নির্দিষ্ট দিনের ক্লাস শেষ হয়ে গেলে এখানে সেই তারিখ দিয়ে পাঠান — প্রতিটা
          স্টুডেন্টের অভিভাবককে আলাদা করে জানানো হবে সেদিন কয়টা ক্লাস হয়েছে আর তার
          সন্তান কয়টায় উপস্থিত ছিল। (SMS পাঠাতে BulkSMSBD অ্যাকাউন্টে টাকা লাগবে —
          বিস্তারিত SETUP.md-এ।)
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">
              তারিখ
            </label>
            <input
              type="date"
              value={smsDate}
              onChange={(e) => setSmsDate(e.target.value)}
              className="rounded-lg border border-navy/15 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-teal"
            />
          </div>
          <button
            onClick={handleSendSms}
            disabled={sendingSms}
            className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50"
          >
            {sendingSms ? "পাঠানো হচ্ছে..." : "SMS পাঠান"}
          </button>
        </div>
        {smsResult && <p className="mt-2 text-sm text-navy dark:text-slate-100">{smsResult}</p>}
      </div>

      {markingClassId && (
        <div className="rounded-lg border border-teal/30 bg-teal-light dark:bg-teal/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-display text-base font-semibold text-navy dark:text-slate-100">
              হাজিরা মার্ক করুন — {presentSet.size} / {students.length} উপস্থিত
            </h4>
            <div className="flex gap-2">
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
          <div className="max-h-96 overflow-y-auto rounded-lg bg-white dark:bg-slate-800">
            {students.map((s) => {
              const present = presentSet.has(s.id);
              return (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-navy/5 dark:border-white/10 px-3 py-2 text-sm last:border-b-0 hover:bg-navy/5 dark:hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={present}
                    onChange={() => toggleStudent(s.id)}
                    className="h-4 w-4 accent-teal"
                  />
                  <span className="font-data w-6 text-navy/40 dark:text-slate-400">{s.sl}</span>
                  <span className="font-data w-24 shrink-0 text-navy/50 dark:text-slate-400">{s.reg}</span>
                  <span className="text-navy dark:text-slate-100">{s.name}</span>
                </label>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleSaveAttendance}
              disabled={savingAttendance}
              className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-50"
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

      <div>
        <h3 className="mb-2 font-display text-base font-semibold text-navy dark:text-slate-100">
          ক্লাসের তালিকা ({classes.length})
        </h3>
        <div className="divide-y divide-navy/5 dark:divide-white/10 rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm shadow-slate-900/5 dark:shadow-none">
          {classes
            .slice()
            .reverse()
            .map((c) =>
              editingMetaId === c.id ? (
                <div key={c.id} className="space-y-2 px-4 py-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="mb-1 block text-[11px] text-navy/50 dark:text-slate-400">তারিখ</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="rounded-lg border border-teal bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-2.5 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-navy/50 dark:text-slate-400">শিক্ষক</label>
                      <select
                        value={editTeacherId}
                        onChange={(e) => setEditTeacherId(e.target.value)}
                        className="rounded-lg border border-teal bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-2.5 py-1.5 text-sm"
                      >
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id} className="bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-navy/50 dark:text-slate-400">ক্লাস নোট</label>
                    <textarea
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-navy/15 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-2.5 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEditMeta(c.id)}
                      disabled={savingMeta}
                      className="rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-50"
                    >
                      {savingMeta ? "সেভ হচ্ছে..." : "সেভ করুন"}
                    </button>
                    <button
                      onClick={() => setEditingMetaId(null)}
                      className="rounded-lg border border-navy/15 dark:border-white/10 px-3 py-1.5 text-xs text-navy dark:text-slate-100 hover:bg-navy/5 dark:hover:bg-white/5"
                    >
                      বাতিল
                    </button>
                  </div>
                </div>
              ) : (
                <div key={c.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div>
                    <span className="font-data mr-2 text-navy/40 dark:text-slate-400">#{c.serialNo}</span>
                    <span className="font-medium text-navy dark:text-slate-100">{teacherMap.get(c.teacherId) || "—"}</span>
                    <span className="ml-2 font-data text-navy/50 dark:text-slate-400">{formatDateToShortDMY(c.date)}</span>
                    {c.note && <span className="ml-2 text-navy/40 dark:text-slate-400">· {c.note}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-data text-xs text-navy/50 dark:text-slate-400">
                      {Object.values(attendance[c.id] || {}).filter(Boolean).length} উপস্থিত
                    </span>
                    <button
                      onClick={() => openMarking(c.id, attendance)}
                      className="text-xs font-medium text-teal hover:underline"
                    >
                      হাজিরা এডিট
                    </button>
                    <button
                      onClick={() => startEditMeta(c)}
                      className="text-xs font-medium text-navy/60 dark:text-slate-400 hover:underline"
                    >
                      তথ্য এডিট
                    </button>
                    <button
                      onClick={() => handleDeleteClass(c.id)}
                      className="text-xs font-medium text-danger hover:underline"
                    >
                      মুছুন
                    </button>
                  </div>
                </div>
              )
            )}
          {classes.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-navy/40 dark:text-slate-400">এখনো কোনো ক্লাস যোগ হয়নি।</p>
          )}
        </div>
      </div>
    </div>
  );
}