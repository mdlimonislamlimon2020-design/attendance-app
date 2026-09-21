import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, teacherPhoneToPseudoEmail } from "../firebase";

export default function TeacherLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const email = teacherPhoneToPseudoEmail(phone);
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/teacher");
    } catch {
      setError("ফোন নম্বর অথবা পাসওয়ার্ড ভুল হয়েছে।");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-1 font-display text-2xl font-bold text-navy dark:text-slate-100">
        শিক্ষক লগইন
      </h1>
      <p className="mb-6 text-sm text-navy/60 dark:text-slate-400">
        আপনার ফোন নম্বর আর পাসওয়ার্ড দিয়ে প্রবেশ করুন
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">
            ফোন নম্বর
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
            className="w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-navy py-2.5 text-sm font-semibold text-gold-light transition hover:bg-navy-deep disabled:opacity-50"
        >
          {loading ? "লগইন হচ্ছে..." : "লগইন"}
        </button>
      </form>
      <p className="mt-4 text-xs text-navy/40 dark:text-slate-400 text-center">
  লগইনের তথ্য না থাকলে অ্যাডমিনের সাথে যোগাযোগ করুন 
</p>
      <p className="mt-2 text-center text-xs text-navy/40 dark:text-slate-400">
        <Link to="/login" className="hover:text-navy/60 dark:hover:text-slate-300">
          
        </Link>
      </p>
    </div>
  );
}
