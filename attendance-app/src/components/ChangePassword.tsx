import { useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { auth } from "../firebase";

export default function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    const user = auth.currentUser;
    if (!user || !user.email) return;
    if (newPassword.length < 6) {
      setError("নতুন পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে");
      return;
    }
    setSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      setError("বর্তমান পাসওয়ার্ড ভুল হয়েছে।");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-teal hover:underline"
      >
        পাসওয়ার্ড পরিবর্তন করুন
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 max-w-xs space-y-2 rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm shadow-slate-900/5 dark:shadow-none p-3"
    >
      <input
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder="বর্তমান পাসওয়ার্ড"
        className="w-full rounded-lg border border-navy/15 dark:border-white/10 px-2.5 py-1.5 text-sm focus:border-teal"
      />
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="নতুন পাসওয়ার্ড"
        className="w-full rounded-lg border border-navy/15 dark:border-white/10 px-2.5 py-1.5 text-sm focus:border-teal"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      {success && <p className="text-xs text-success">✅ পাসওয়ার্ড বদলে গেছে।</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-50"
        >
          {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-navy/15 dark:border-white/10 px-3 py-1.5 text-xs text-navy dark:text-slate-100 hover:bg-navy/5 dark:hover:bg-white/5"
        >
          বাতিল
        </button>
      </div>
    </form>
  );
}
