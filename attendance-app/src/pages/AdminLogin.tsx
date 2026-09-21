import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { isAdmin } from "../utils/db";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const admin = await isAdmin(cred.user.uid);
      if (!admin) {
        setError("এই অ্যাকাউন্টের অ্যাডমিন অ্যাক্সেস নেই।");
        return;
      }
      navigate("/admin");
    } catch {
      setError("ইমেইল অথবা পাসওয়ার্ড ভুল হয়েছে।");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-1 font-display text-2xl font-bold text-navy dark:text-slate-100">
        অ্যাডমিন লগইন
      </h1>
      <p className="mb-6 text-sm text-navy/60 dark:text-slate-400">সেশন, শিক্ষক, ক্লাস আর হাজিরা পরিচালনা</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ইমেইল"
          className="w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="পাসওয়ার্ড"
          className="w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-navy py-2.5 text-sm font-semibold text-gold-light transition hover:bg-navy-deep disabled:opacity-50"
        >
          {loading ? "লগইন হচ্ছে..." : "লগইন"}
        </button>
      </form>
      <p className="mt-4 text-xs text-navy/40 dark:text-slate-400">
        
      </p>
    </div>
  );
}
