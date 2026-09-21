import { Fragment, useEffect, useMemo, useState } from "react";
import {
  bulkImportStudents,
  getStudents,
  getStudentsPrivateMap,
  setStudentCR,
  resetStudentSignup,
  updateStudentName,
  removeStudent,
  getRecentSignups,
} from "../../utils/db";
import type { Student, StudentPrivate } from "../../types";
import { useConfirm } from "../../context/ConfirmContext";

// সবগুলো সেশনের JSON ইমপোর্ট
import seedH1 from "../../data/students_h1_24_25.json";
import seedH2 from "../../data/students_h2_23_24.json";
import seedH3 from "../../data/students_h3_22_23.json";
import seedH4 from "../../data/students_h4_21_22.json";
import seedMSc from "../../data/students_msc_20_21.json";

// কোড বা সাধারণ আইডির জন্য ম্যাপিং
const SEED_BY_CODE: Record<string, any[]> = {
  h1: seedH1,
  h2: seedH2,
  h3: seedH3,
  h4: seedH4,
  msc: seedMSc,
};

// 🟢 ফায়ারবেস পুশ কি (Push Keys) অনুযায়ী সঠিক সেশন ডাটা ম্যাপিং
const PUSH_KEY_TO_SEED: Record<string, any[]> = {
  "-P1jdrzT04coedKrcdVi": seedH4, // H4
  "-P1mh6QCnJhRwj-9d5r_": seedH3, // H3
  "-P1jwQ3lpCsfG1mBMwym": seedH2, // H2
  "-P1jwZYOO_4vjS9myIYm": seedH1, // H1
  "-P1kDa-SKEcHErAFrPvC": seedMSc, // MSc
};

const SESSION_LABELS: Record<string, string> = {
  "-P1jdrzT04coedKrcdVi": "H4 — Honours 4th Year (21-22)",
  "-P1mh6QCnJhRwj-9d5r_": "H3 — Honours 3rd Year (22-23)",
  "-P1jwQ3lpCsfG1mBMwym": "H2 — Honours 2nd Year (23-24)",
  "-P1jwZYOO_4vjS9myIYm": "H1 — Honours 1st Year (24-25)",
  "-P1kDa-SKEcHErAFrPvC": "MSc — Masters (24-25)",
  // লোকাল শর্ট কোড ব্যাকআপ
  h1: "H1 — Honours 1st Year (24-25)",
  h2: "H2 — Honours 2nd Year (23-24)",
  h3: "H3 — Honours 3rd Year (22-23)",
  h4: "H4 — Honours 4th Year (21-22)",
  msc: "MSc — Masters (24-25)",
};

// 🟢 ফায়ারবেসের ডাইনামিক সেশন আইডি হ্যান্ডেল করার ফাংশন
function getSeedDataForSession(sessionId: string): any[] {
  if (!sessionId) return seedH4;
  const cleanId = sessionId.trim();
  const lowerId = cleanId.toLowerCase();

  if (PUSH_KEY_TO_SEED[cleanId]) return PUSH_KEY_TO_SEED[cleanId];
  if (SEED_BY_CODE[lowerId]) return SEED_BY_CODE[lowerId];

  if (lowerId.includes("msc") || lowerId.includes("master") || lowerId.includes("20-21")) return seedMSc;
  if (lowerId.includes("h1") || lowerId.includes("24-25") || lowerId.includes("1st")) return seedH1;
  if (lowerId.includes("h2") || lowerId.includes("23-24") || lowerId.includes("2nd")) return seedH2;
  if (lowerId.includes("h3") || lowerId.includes("22-23") || lowerId.includes("3rd")) return seedH3;
  if (lowerId.includes("h4") || lowerId.includes("21-22") || lowerId.includes("4th")) return seedH4;

  return seedH4;
}

// 🟢 সেশনের লেবেল সঠিকভাবে পাওয়ার ফাংশন
function getSessionLabel(sessionId: string): string {
  if (!sessionId) return "H4 — Honours 4th Year (21-22)";
  const cleanId = sessionId.trim();
  const lowerId = cleanId.toLowerCase();

  if (SESSION_LABELS[cleanId]) return SESSION_LABELS[cleanId];
  if (SESSION_LABELS[lowerId]) return SESSION_LABELS[lowerId];

  if (lowerId.includes("msc") || lowerId.includes("master") || lowerId.includes("20-21")) return "MSc — Masters (20-21)";
  if (lowerId.includes("h1") || lowerId.includes("24-25") || lowerId.includes("1st")) return "H1 — Honours 1st Year (24-25)";
  if (lowerId.includes("h2") || lowerId.includes("23-24") || lowerId.includes("2nd")) return "H2 — Honours 2nd Year (23-24)";
  if (lowerId.includes("h3") || lowerId.includes("22-23") || lowerId.includes("3rd")) return "H3 — Honours 3rd Year (22-23)";
  if (lowerId.includes("h4") || lowerId.includes("21-22") || lowerId.includes("4th")) return "H4 — Honours 4th Year (21-22)";

  return cleanId.startsWith("-P") ? "H4 — Honours 4th Year (21-22)" : cleanId;
}

interface Props {
  sessionId: string;
}

function formatWhen(ts?: number) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("bn-BD", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function StudentsTab({ sessionId }: Props) {
  const confirm = useConfirm();
  const [students, setStudents] = useState<Student[]>([]);
  const [privateMap, setPrivateMap] = useState<Record<string, StudentPrivate>>({});
  const [recentSignups, setRecentSignups] = useState<Student[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cleanSessionId = sessionId ? sessionId.trim() : "";
  const currentSeedData = getSeedDataForSession(cleanSessionId);
  const currentSessionLabel = getSessionLabel(cleanSessionId);

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const [list, priv, recent] = await Promise.all([
        getStudents(sessionId),
        getStudentsPrivateMap(sessionId),
        getRecentSignups(sessionId),
      ]);
      // স্টুডেন্ট লিস্ট সিরিয়াল অনুযায়ী সর্ট করা
      list.sort((a, b) => a.sl - b.sl);
      setStudents(list);
      setPrivateMap(priv);
      setRecentSignups(recent);
    } catch (err) {
      console.error(err);
      setLoadError("তালিকা লোড করা যায়নি। ইন্টারনেট চেক করে আবার চেষ্টা করুন, অথবা Firebase rules ঠিকভাবে Publish করা আছে কিনা দেখুন।");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function handleSeedImport() {
    if (currentSeedData.length === 0) {
      setMessage(`⚠️ ${currentSessionLabel}-এর জন্য কোনো বান্ডল ফাইল পাওয়া যায়নি।`);
      return;
    }
    setImporting(true);
    setMessage("");
    try {
      await bulkImportStudents(sessionId, currentSeedData);
      setMessage(`✅ ${currentSeedData.length} জন স্টুডেন্ট ইমপোর্ট হয়েছে।`);
      await load();
    } catch (err) {
      console.error(err);
      setMessage("⚠️ ইমপোর্ট করতে সমস্যা হয়েছে।");
    } finally {
      setImporting(false);
    }
  }

  async function handlePasteImport() {
    const lines = pasteText.split("\n").map((l) => l.trim()).filter(Boolean);
    const rows: { sl: number; reg: string; name: string }[] = [];
    for (const line of lines) {
      const m = line.match(/^(\d+)\s+(\d{6,15})\s+(.+)$/);
      if (m) {
        rows.push({ sl: parseInt(m[1], 10), reg: m[2], name: m[3].trim() });
      }
    }
    if (rows.length === 0) {
      setMessage("⚠️ কোনো বৈধ সারি পাওয়া যায়নি। ফরম্যাট: SL REG NAME (প্রতি লাইনে একজন)");
      return;
    }
    setImporting(true);
    setMessage("");
    try {
      await bulkImportStudents(sessionId, rows);
      setMessage(`✅ ${rows.length} জন স্টুডেন্ট ইমপোর্ট হয়েছে।`);
      setPasteText("");
      await load();
    } finally {
      setImporting(false);
    }
  }

  async function toggleCR(student: Student) {
    await setStudentCR(sessionId, student.id, !student.isCR);
    await load();
  }

  async function handleReset(student: Student) {
    const ok = await confirm({
      title: "সাইনআপ রিসেট",
      message: `${student.name}-এর সাইনআপ রিসেট করতে চান? সে আবার Reg নম্বর দিয়ে নতুন ফোন+পাসওয়ার্ড সেট করতে পারবে।\n\nমনে রাখুন: এর পাশাপাশি Firebase Console > Authentication > Users থেকে ওর পুরোনো অ্যাকাউন্টটাও মুছে দিতে হবে, নাহলে একই ফোন নম্বর দিয়ে আবার সাইনআপ করতে পারবে না (ভিন্ন ফোন নম্বর দিয়ে অবশ্য সমস্যা ছাড়াই পারবে)।`,
      danger: true,
      confirmLabel: "রিসেট করুন",
    });
    if (!ok) return;
    await resetStudentSignup(sessionId, student.id);
    await load();
  }

  async function handleRemove(student: Student) {
    const ok = await confirm({
      title: "স্টুডেন্ট মুছে ফেলুন",
      message: `${student.name}-কে রোস্টার থেকে পুরোপুরি মুছে ফেলতে চান? এটা ফিরিয়ে আনা যাবে না।`,
      danger: true,
      confirmLabel: "স্থায়ীভাবে মুছুন",
      requireTypedText: student.reg,
    });
    if (!ok) return;
    await removeStudent(sessionId, student.id);
    await load();
  }

  function startEdit(student: Student) {
    setEditingId(student.id);
    setEditName(student.name);
  }

  async function saveEdit(student: Student) {
    if (editName.trim() && editName.trim() !== student.name) {
      await updateStudentName(sessionId, student.id, editName.trim());
      await load();
    }
    setEditingId(null);
  }

  const signedUpCount = students.filter((s) => s.signedUp).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.reg.includes(q)
    );
  }, [students, search]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* ডাইনামিক বান্ডল্ড ইমপোর্ট কার্ড */}
        <div className="rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm shadow-slate-900/5 dark:shadow-none p-4">
          <h3 className="mb-2 font-display text-sm font-semibold text-navy dark:text-slate-100">
            {currentSessionLabel} বান্ডল করা রোস্টার ইমপোর্ট
          </h3>
          <p className="mb-3 text-xs text-navy/50 dark:text-slate-400">
            {currentSeedData.length > 0
              ? `আপলোড করা PDF থেকে বের করা ${currentSeedData.length} জন স্টুডেন্টের তালিকা। এই সেশনে একবারে বসাতে চাইলে বাটনে ক্লিক করুন।`
              : "এই সেশনের জন্য কোনো পূর্বনির্ধারিত ফাইল যোগ করা হয়নি। পাশের বক্স ব্যবহার করে ম্যানুয়ালি পেস্ট করুন।"}
          </p>
          <button
            onClick={handleSeedImport}
            disabled={importing || currentSeedData.length === 0}
            className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-gold-light hover:bg-navy-deep disabled:opacity-50"
          >
            {importing
              ? "ইমপোর্ট হচ্ছে..."
              : `${currentSessionLabel} রোস্টার বসান`}
          </button>
        </div>

        {/* ম্যানুয়াল পেস্ট ইমপোর্ট কার্ড */}
        <div className="rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm shadow-slate-900/5 dark:shadow-none p-4">
          <h3 className="mb-2 font-display text-sm font-semibold text-navy dark:text-slate-100">
            নতুন তালিকা পেস্ট করে ইমপোর্ট (অন্য সেশনের জন্য)
          </h3>
          <p className="mb-2 text-xs text-navy/50 dark:text-slate-400">
            প্রতি লাইনে: <span className="font-data">SL REG NAME</span>
          </p>
          <textarea
            id="paste-import-input"
            name="pasteImportInput"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={4}
            placeholder={"1 2022123456 STUDENT NAME\n2 2022123457 ANOTHER NAME"}
            className="font-data mb-2 w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-xs focus:border-teal"
          />
          <button
            onClick={handlePasteImport}
            disabled={importing}
            className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50"
          >
            {importing ? "ইমপোর্ট হচ্ছে..." : "পেস্ট করা তালিকা ইমপোর্ট করুন"}
          </button>
        </div>
      </div>

      {message && <p className="text-sm text-navy dark:text-slate-100">{message}</p>}

      {recentSignups.length > 0 && (
        <div className="rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm shadow-slate-900/5 dark:shadow-none p-4">
          <h3 className="mb-2 font-display text-sm font-semibold text-navy dark:text-slate-100">
            সম্প্রতি সাইনআপ করেছে
          </h3>
          <p className="mb-3 text-xs text-navy/50 dark:text-slate-400">
            চোখ বুলিয়ে দেখুন — অচেনা কিছু লাগলে (যেমন কারো নামে অন্য কেউ সাইনআপ করে ফেলেছে
            মনে হলে) নিচের তালিকায় গিয়ে সরাসরি "রিসেট" করে দিতে পারো।
          </p>
          <div className="space-y-1.5">
            {recentSignups.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg bg-navy/5 dark:bg-white/5 px-3 py-1.5 text-sm"
              >
                <div>
                  <span className="font-medium text-navy dark:text-slate-100">{s.name}</span>
                  <span className="font-data ml-2 text-xs text-navy/50 dark:text-slate-400">{s.reg}</span>
                </div>
                <span className="text-xs text-navy/40 dark:text-slate-400">
                  {formatWhen(s.signedUpAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold text-navy dark:text-slate-100">
            স্টুডেন্ট তালিকা ({filtered.length}
            {filtered.length !== students.length ? ` / ${students.length}` : ""})
          </h3>
          <p className="text-xs text-navy/50 dark:text-slate-400">
            সাইনআপ সম্পন্ন: {signedUpCount} / {students.length}
          </p>
        </div>

        <input
          id="student-search-input"
          name="studentSearchInput"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="নাম বা রেজি. নম্বর দিয়ে খুঁজুন..."
          className="mb-2 w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
        />

        {loading ? (
          <p className="text-sm text-navy/40 dark:text-slate-400">লোড হচ্ছে...</p>
        ) : loadError ? (
          <p className="text-sm text-danger">{loadError}</p>
        ) : (
          <div className="max-h-[32rem] overflow-x-auto overflow-y-auto rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm shadow-slate-900/5 dark:shadow-none">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 text-xs uppercase text-navy/50 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-3 whitespace-nowrap font-semibold">SL</th>
                  <th className="px-3 py-3 whitespace-nowrap font-semibold">রেজি. নং</th>
                  <th className="px-3 py-3 whitespace-nowrap font-semibold">নাম</th>
                  <th className="px-3 py-3 whitespace-nowrap font-semibold">ফোন</th>
                  <th className="px-3 py-3 whitespace-nowrap font-semibold">CR</th>
                  <th className="px-3 py-3 whitespace-nowrap font-semibold">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5 dark:divide-white/10">
                {filtered.map((s) => (
                  <Fragment key={s.id}>
                    <tr className="hover:bg-navy/5 dark:hover:bg-white/5 transition-colors">
                      <td className="font-data px-3 py-2.5 text-navy/60 dark:text-slate-400 whitespace-nowrap align-middle">{s.sl}</td>
                      <td className="font-data px-3 py-2.5 text-navy/60 dark:text-slate-400 whitespace-nowrap align-middle">{s.reg}</td>
                      <td className="px-3 py-2.5 text-navy dark:text-slate-100 align-middle">
                        {editingId === s.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              id={`edit-student-name-${s.id}`}
                              name={`editStudentName_${s.id}`}
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              autoFocus
                              className="w-40 rounded border border-teal px-1.5 py-0.5 text-sm"
                            />
                            <button
                              onClick={() => saveEdit(s)}
                              className="text-xs font-medium text-teal hover:underline"
                            >
                              সেভ
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-xs text-navy/40 dark:text-slate-400 hover:underline"
                            >
                              বাতিল
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(s)}
                            className="text-left hover:underline"
                            title="নাম এডিট করতে ক্লিক করুন"
                          >
                            {s.name}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap align-middle">
                        {s.signedUp ? (
                          <span className="font-data text-navy/60 dark:text-slate-400">
                            {privateMap[s.id]?.phone || "—"}
                          </span>
                        ) : (
                          <span className="text-xs text-navy/30 dark:text-slate-400">সাইনআপ হয়নি</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap align-middle">
                        <button
                          onClick={() => toggleCR(s)}
                          className={
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold transition " +
                            (s.isCR
                              ? "bg-gold-light dark:bg-gold/20 text-gold"
                              : "bg-navy/5 dark:bg-white/5 text-navy/40 dark:text-slate-400 hover:bg-navy/10 dark:hover:bg-white/10")
                          }
                        >
                          {s.isCR ? "CR ✓" : "CR করুন"}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle">
                        {s.signedUp && (
                          <button
                            onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                            className="mr-2 text-xs font-medium text-navy/60 dark:text-slate-400 hover:underline"
                          >
                            বিস্তারিত
                          </button>
                        )}
                        {s.signedUp && (
                          <button
                            onClick={() => handleReset(s)}
                            className="mr-2 text-xs font-medium text-teal hover:underline"
                          >
                            রিসেট
                          </button>
                        )}
                        <button
                          onClick={() => handleRemove(s)}
                          className="text-xs font-medium text-danger hover:underline"
                        >
                          মুছুন
                        </button>
                      </td>
                    </tr>
                    {expandedId === s.id && (
                      <tr className="bg-navy/[0.03] dark:bg-white/[0.03]">
                        <td colSpan={6} className="px-4 py-3 text-xs">
                          <div className="grid gap-2 sm:grid-cols-3">
                            <div>
                              <p className="text-navy/40 dark:text-slate-500">ইমেইল</p>
                              <p className="text-navy dark:text-slate-100">
                                {privateMap[s.id]?.email || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-navy/40 dark:text-slate-500">রক্তের গ্রুপ</p>
                              <p className="text-navy dark:text-slate-100">
                                {privateMap[s.id]?.bloodGroup || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-navy/40 dark:text-slate-500">অভিভাবকের ফোন</p>
                              <p className="font-data text-navy dark:text-slate-100">
                                {privateMap[s.id]?.guardianPhone || "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-navy/40 dark:text-slate-400">
                      কোনো স্টুডেন্ট পাওয়া যায়নি।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}