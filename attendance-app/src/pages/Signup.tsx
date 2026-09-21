import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, phoneToPseudoEmail } from "../firebase";
import { getSessions, findStudentByReg, completeStudentSignup } from "../utils/db";
import type { Session, Student } from "../types";

type Step = "find" | "confirm";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "জানা নেই"];

export default function Signup() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [reg, setReg] = useState("");
  const [step, setStep] = useState<Step>("find");
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [bloodGroup, setBloodGroup] = useState(BLOOD_GROUPS[0]);
  const [guardianPhone, setGuardianPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

useEffect(() => {
  getSessions().then((list) => {
    const active = list
      .filter((s) => !s.archived)
      .sort((a, b) => {
        // ============================================
        // Academic Level বের করার function
        // ============================================
        const getLevelOrder = (session: Session) => {
          const text = `${session.name} ${session.year}`.toLowerCase();

          // ১ম বর্ষ
          if (
            text.includes("১ম বর্ষ") ||
            text.includes("1st year") ||
            text.includes("first year") ||
            text.includes("1st")
          ) {
            return 1;
          }

          // ২য় বর্ষ
          if (
            text.includes("২য় বর্ষ") ||
            text.includes("২য় বর্ষ") ||
            text.includes("2nd year") ||
            text.includes("second year") ||
            text.includes("2nd")
          ) {
            return 2;
          }

          // ৩য় বর্ষ
          if (
            text.includes("৩য় বর্ষ") ||
            text.includes("৩য় বর্ষ") ||
            text.includes("3rd year") ||
            text.includes("third year") ||
            text.includes("3rd")
          ) {
            return 3;
          }

          // ৪র্থ বর্ষ
          if (
            text.includes("৪র্থ বর্ষ") ||
            text.includes("4th year") ||
            text.includes("fourth year") ||
            text.includes("4th")
          ) {
            return 4;
          }

          // Masters
          if (
            text.includes("মাস্টার্স") ||
            text.includes("মাস্টার") ||
            text.includes("masters") ||
            text.includes("master")
          ) {
            return 5;
          }

          // অজানা হলে শেষে যাবে
          return 999;
        };

        // ============================================
        // Session-এর starting year বের করা
        // ============================================
        const getSessionStartYear = (session: Session) => {
          const text = `${session.name} ${session.year}`;

          // যেমন:
          // 2021-2022
          // 2021–2022
          // 2021/2022
          // 2021-22
          const match = text.match(/20\d{2}/);

          return match ? Number(match[0]) : 0;
        };

        const levelA = getLevelOrder(a);
        const levelB = getLevelOrder(b);

        // ============================================
        // প্রথমে Academic Level
        // 1st → 2nd → 3rd → 4th → Masters
        // ============================================
        if (levelA !== levelB) {
          return levelA - levelB;
        }

        // ============================================
        // একই level হলে নতুন session আগে
        // ============================================
        return (
          getSessionStartYear(b) -
          getSessionStartYear(a)
        );
      });

    setSessions(active);

    // প্রথম session automatically selected
    if (active.length > 0) {
      setSessionId(active[0].id);
    }
  });
}, []);

  async function handleFind(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!sessionId || !reg.trim()) {
      setError("সেশন আর রেজিস্ট্রেশন নম্বর দিন");
      return;
    }
    setLoading(true);
    try {
      const student = await findStudentByReg(sessionId, reg.trim());
      if (!student) {
        setError("এই রেজিস্ট্রেশন নম্বরে কোনো স্টুডেন্ট পাওয়া যায়নি। নম্বরটা আবার চেক করুন।");
        return;
      }
      if (student.signedUp) {
        setError("এই রেজিস্ট্রেশন নম্বর দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে। লগইন করুন।");
        return;
      }
      setFoundStudent(student);
      setStep("confirm");
    } catch {
      setError("কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!foundStudent) return;
    const cleanedPhone = phone.replace(/[^0-9]/g, "");
    const cleanedGuardianPhone = guardianPhone.replace(/[^0-9]/g, "");
    if (cleanedPhone.length < 11) {
      setError("সঠিক ফোন নম্বর দিন (১১ ডিজিট)");
      return;
    }
    if (password.length < 6) {
      setError("পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("একটা সঠিক ইমেইল ঠিকানা দিন");
      return;
    }
    if (cleanedGuardianPhone.length < 11) {
      setError("অভিভাবকের সঠিক ফোন নম্বর দিন (১১ ডিজিট) — জরুরি প্রয়োজনে যোগাযোগের জন্য");
      return;
    }
    if (cleanedGuardianPhone === cleanedPhone) {
      setError("অভিভাবকের নম্বর আপনার নিজের নম্বরের মতো হতে পারবে না");
      return;
    }
    setLoading(true);
    try {
      const authEmail = phoneToPseudoEmail(cleanedPhone);
      const cred = await createUserWithEmailAndPassword(auth, authEmail, password);
      await completeStudentSignup(sessionId, foundStudent.id, cleanedPhone, cred.user.uid, {
        email: email.trim(),
        bloodGroup,
        guardianPhone: cleanedGuardianPhone,
      });
      navigate("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/email-already-in-use") {
        setError("এই ফোন নম্বর দিয়ে আগেই একটা অ্যাকাউন্ট আছে।");
      } else {
        setError("অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-1 font-display text-2xl font-bold text-navy dark:text-slate-100">
        অ্যাকাউন্ট খুলুন
      </h1>
      <p className="mb-6 text-sm text-navy/60 dark:text-slate-400">
        {step === "find"
          ? "প্রথমে আপনার সেশন আর রেজিস্ট্রেশন নম্বর দিয়ে ভেরিফাই করুন"
          : `হ্যালো, ${foundStudent?.name} — এবার নিচের তথ্যগুলো দিন`}
      </p>

      {step === "find" && (
        <form onSubmit={handleFind} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">
              সেশন
            </label>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full rounded-lg border border-navy/15 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm shadow-slate-900/5 dark:shadow-none px-3 py-2 text-sm focus:border-teal"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">
              রেজিস্ট্রেশন নম্বর
            </label>
            <input
              value={reg}
              onChange={(e) => setReg(e.target.value)}
              placeholder="যেমন: 2021935945"
              className="font-data w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-navy py-2.5 text-sm font-semibold text-gold-light transition hover:bg-navy-deep disabled:opacity-50"
          >
            {loading ? "চেক করা হচ্ছে..." : "যাচাই করুন"}
          </button>
        </form>
      )}

      {step === "confirm" && (
        <form onSubmit={handleCreateAccount} className="space-y-4">
          <div className="rounded-lg bg-teal-light dark:bg-teal/20 px-3 py-2 text-sm text-navy dark:text-slate-100">
            <p className="font-medium">{foundStudent?.name}</p>
            <p className="font-data text-xs text-navy/60 dark:text-slate-400">{foundStudent?.reg}</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-navy/50 dark:text-slate-400">
              লগইন তথ্য
            </h3>
            <div>
              <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">
                ফোন নম্বর (নিজের)
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="font-data w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">
                পাসওয়ার্ড
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="কমপক্ষে ৬ ক্যারেক্টার"
                className="w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-navy/50 dark:text-slate-400">
              জরুরি যোগাযোগ তথ্য
            </h3>
            <div>
              <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">
                ইমেইল
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">
                রক্তের গ্রুপ
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full rounded-lg border border-navy/15 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-teal"
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">
                অভিভাবকের ফোন নম্বর
              </label>
              <input
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="font-data w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
              />
              <p className="mt-1 text-[11px] text-navy/40 dark:text-slate-400">
                বিশেষ প্রয়োজনে (যেমন জরুরি অবস্থা) কলেজ থেকে অভিভাবকের সাথে যোগাযোগ করতে
                ব্যবহার হবে।
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal py-2.5 text-sm font-semibold text-white transition hover:bg-teal/90 disabled:opacity-50"
          >
            {loading ? "তৈরি হচ্ছে..." : "অ্যাকাউন্ট তৈরি করুন"}
          </button>
          <button
            type="button"
            onClick={() => setStep("find")}
            className="w-full text-center text-xs text-navy/50 dark:text-slate-400 hover:text-navy dark:hover:text-slate-100"
          >
            ← ফিরে যান
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-navy/60 dark:text-slate-400">
        আগে থেকেই অ্যাকাউন্ট আছে?{" "}
        <Link to="/login" className="font-medium text-teal hover:underline">
          লগইন করুন
        </Link>
      </p>
    </div>
  );
}
