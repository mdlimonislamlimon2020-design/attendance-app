import { useState } from "react";
import { createSession, updateSession, deleteSessionCascade, archiveSession, exportFullBackup } from "../../utils/db";
import { downloadJson } from "../../utils/exportJson";
import { useConfirm } from "../../context/ConfirmContext";
import type { Session } from "../../types";

interface Props {
  sessions: Session[];
  onChanged: () => void;
}

const emptyForm = { name: "", year: "", batch: "", department: "Mathematics", college: "Govt. Titumir College, Dhaka" };

// 🟢 সেশন সাজানোর সঠিক অর্ডার ম্যাপিং (অনার্স ১ম বর্ষ থেকে মাস্টার্স)
const SESSION_ORDER: Record<string, number> = {
  h1: 1,
  "h1 — honours 1st year (24-25)": 1,
  h2: 2,
  "h2 — honours 2nd year (23-24)": 2,
  h3: 3,
  "h3 — honours 3rd year (22-23)": 3,
  h4: 4,
  "h4 — honours 4th year (21-22)": 4,
  msc: 5,
  "msc — masters (20-21)": 5,
};

function getSessionRank(name: string): number {
  const clean = name.toLowerCase().trim();
  for (const [key, rank] of Object.entries(SESSION_ORDER)) {
    if (clean.includes(key)) return rank;
  }
  if (clean.includes("1st") || clean.includes("১ম")) return 1;
  if (clean.includes("2nd") || clean.includes("২য়")) return 2;
  if (clean.includes("3rd") || clean.includes("৩য়")) return 3;
  if (clean.includes("4th") || clean.includes("৪র্থ")) return 4;
  if (clean.includes("msc") || clean.includes("master") || clean.includes("মাস্টার্স")) return 5;
  return 99; // অন্য কিছু হলে সবার শেষে যাবে
}

function sortSessions(list: Session[]) {
  return [...list].sort((a, b) => getSessionRank(a.name) - getSessionRank(b.name));
}

function SessionCard({
  s,
  onChanged,
}: {
  s: Session;
  onChanged: () => void;
}) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: s.name,
    year: s.year,
    batch: s.batch,
    department: s.department,
    college: s.college,
  });
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  async function saveEdit() {
    await updateSession(s.id, {
      name: editForm.name.trim(),
      year: editForm.year.trim(),
      batch: editForm.batch.trim(),
      department: editForm.department.trim(),
      college: editForm.college.trim(),
    });
    setEditing(false);
    onChanged();
  }

  async function handleConfirmDelete() {
    await deleteSessionCascade(s.id);
    setDeleting(false);
    setConfirmText("");
    onChanged();
  }

  async function handleToggleArchive() {
    const ok = await confirm({
      message: s.archived
        ? `"${s.name}" আবার সক্রিয় তালিকায় ফিরিয়ে আনতে চান?`
        : `"${s.name}" আর্কাইভ করতে চান? এটা তালিকা থেকে সরে যাবে, কিন্তু ডাটা অক্ষত থাকবে — চাইলে পরে আবার ফিরিয়ে আনা যাবে।`,
      confirmLabel: s.archived ? "ফিরিয়ে আনো" : "আর্কাইভ করুন",
    });
    if (!ok) return;
    await archiveSession(s.id, !s.archived);
    onChanged();
  }

  return (
    <div
      className={
        "rounded-lg border bg-white dark:bg-slate-800 shadow-sm shadow-slate-900/5 dark:shadow-none p-3 " +
        (s.archived ? "border-navy/10 dark:border-white/10 opacity-60" : "border-navy/10 dark:border-white/10")
      }
    >
      {editing ? (
        <div className="space-y-1.5">
          <input
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            className="w-full rounded border border-teal px-2 py-1 text-sm"
            placeholder="সেশনের নাম"
          />
          <input
            value={editForm.year}
            onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
            className="w-full rounded border border-navy/15 dark:border-white/10 px-2 py-1 text-sm"
            placeholder="Year"
          />
          <input
            value={editForm.batch}
            onChange={(e) => setEditForm({ ...editForm, batch: e.target.value })}
            className="w-full rounded border border-navy/15 dark:border-white/10 px-2 py-1 text-sm"
            placeholder="Batch"
          />
          <input
            value={editForm.department}
            onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
            className="w-full rounded border border-navy/15 dark:border-white/10 px-2 py-1 text-sm"
            placeholder="Department"
          />
          <input
            value={editForm.college}
            onChange={(e) => setEditForm({ ...editForm, college: e.target.value })}
            className="w-full rounded border border-navy/15 dark:border-white/10 px-2 py-1 text-sm"
            placeholder="College"
          />
          <div className="flex gap-2 pt-1">
            <button
              onClick={saveEdit}
              className="rounded bg-teal px-3 py-1 text-xs font-medium text-white hover:bg-teal/90"
            >
              সেভ করুন
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded border border-navy/15 dark:border-white/10 px-3 py-1 text-xs text-navy dark:text-slate-100 hover:bg-navy/5 dark:hover:bg-white/5"
            >
              বাতিল
            </button>
          </div>
        </div>
      ) : deleting ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-danger">
            "{s.name}" ডিলিট করলে এর সব স্টুডেন্ট, শিক্ষক, ক্লাস, হাজিরা আর নোটিশ
            চিরতরে মুছে যাবে। ফিরিয়ে আনা যাবে না।
          </p>
          <p className="text-xs text-navy/60 dark:text-slate-400">
            নিশ্চিত হতে নিচে <span className="font-data font-semibold">{s.name}</span> টাইপ করুন:
          </p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full rounded border border-danger px-2 py-1 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleConfirmDelete}
              disabled={confirmText !== s.name}
              className="rounded bg-danger px-3 py-1 text-xs font-medium text-white hover:bg-danger/90 disabled:opacity-40"
            >
              হ্যাঁ, স্থায়ীভাবে ডিলিট করুন
            </button>
            <button
              onClick={() => {
                setDeleting(false);
                setConfirmText("");
              }}
              className="rounded border border-navy/15 dark:border-white/10 px-3 py-1 text-xs text-navy dark:text-slate-100 hover:bg-navy/5 dark:hover:bg-white/5"
            >
              বাতিল
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-navy dark:text-slate-100">
              {s.name}
              {s.archived && (
                <span className="ml-2 rounded-full bg-navy/10 dark:bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-navy/60 dark:text-slate-400">
                  আর্কাইভড
                </span>
              )}
            </p>
            <p className="text-xs text-navy/50 dark:text-slate-400">
              {s.year} · {s.department} · {s.college}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <button
              onClick={handleToggleArchive}
              className="text-xs font-medium text-teal hover:underline"
            >
              {s.archived ? "ফিরিয়ে আনো" : "আর্কাইভ"}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-medium text-teal hover:underline"
            >
              এডিট
            </button>
            <button
              onClick={() => setDeleting(true)}
              className="text-xs font-medium text-danger hover:underline"
            >
              ডিলিট
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SessionsTab({ sessions, onChanged }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  // 🟢 সেশনগুলো সর্ট করে নেওয়া হলো (অনার্স ১ম বর্ষ থেকে মাস্টার্স ক্রমানুসারে)
  const sortedSessions = sortSessions(sessions);
  const activeSessions = sortedSessions.filter((s) => !s.archived);
  const archivedSessions = sortedSessions.filter((s) => s.archived);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.year.trim() || !form.batch.trim()) return;
    setSaving(true);
    try {
      await createSession({
        name: form.name.trim(),
        year: form.year.trim(),
        batch: form.batch.trim(),
        department: form.department.trim(),
        college: form.college.trim(),
      });
      setForm(emptyForm);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleBackup() {
    setBackingUp(true);
    try {
      const backup = await exportFullBackup();
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadJson(`attendance_backup_${dateStr}.json`, backup);
    } finally {
      setBackingUp(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-navy dark:text-slate-100">
            সেশন তালিকা
          </h3>
          <button
            onClick={handleBackup}
            disabled={backingUp}
            className="rounded-lg bg-navy px-3 py-1.5 text-xs font-medium text-gold-light hover:bg-navy-deep disabled:opacity-50"
          >
            {backingUp ? "তৈরি হচ্ছে..." : "সম্পূর্ণ ব্যাকআপ ডাউনলোড করুন"}
          </button>
        </div>
        <div className="space-y-2">
          {activeSessions.map((s) => (
            <SessionCard key={s.id} s={s} onChanged={onChanged} />
          ))}
          {sessions.length === 0 && (
            <p className="text-sm text-navy/40 dark:text-slate-400">এখনো কোনো সেশন তৈরি হয়নি।</p>
          )}
        </div>

        {archivedSessions.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-navy/40 dark:text-slate-500">
              আর্কাইভ করা সেশন ({archivedSessions.length})
            </h4>
            <div className="space-y-2">
              {archivedSessions.map((s) => (
                <SessionCard key={s.id} s={s} onChanged={onChanged} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 font-display text-base font-semibold text-navy dark:text-slate-100">
          নতুন সেশন তৈরি করুন
        </h3>
        <form onSubmit={handleCreate} className="space-y-2 rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm shadow-slate-900/5 dark:shadow-none p-4">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="সেশনের নাম, যেমন: H1 (২৪-২৫)"
            className="w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
          />
          <input
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
            placeholder="যেমন: Honours 1st Year"
            className="w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
          />
          <input
            value={form.batch}
            onChange={(e) => setForm({ ...form, batch: e.target.value })}
            placeholder="ব্যাচ, যেমন: 2024-25"
            className="w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
          />
          <input
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            placeholder="বিভাগ"
            className="w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
          />
          <input
            value={form.college}
            onChange={(e) => setForm({ ...form, college: e.target.value })}
            placeholder="কলেজ"
            className="w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-teal py-2.5 text-sm font-semibold text-white transition hover:bg-teal/90 disabled:opacity-50"
          >
            {saving ? "তৈরি হচ্ছে..." : "সেশন তৈরি করুন"}
          </button>
        </form>
        <p className="mt-3 text-xs text-navy/40 dark:text-slate-400">
          পুরো ব্যাকআপ ফাইলে সব সেশনের স্টুডেন্ট, শিক্ষক, ক্লাস, হাজিরা, নোটিশ আর ছুটির
          তালিকা JSON আকারে থাকে। এতে ফোন নম্বরও থাকে — তাই এই ফাইলটা নিরাপদ জায়গায়
          রাখুন।
        </p>
      </div>
    </div>
  );
}