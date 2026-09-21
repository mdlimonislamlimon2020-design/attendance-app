import { useEffect, useState } from "react";
import {
  addTeacher,
  deleteTeacher,
  getTeachers,
  updateTeacherName,
  setTeacherCredentials,
  resetTeacherCredentials,
  getTeachersPrivateMap,
} from "../../utils/db";
import type { Teacher, TeacherPrivate } from "../../types";
import { useConfirm } from "../../context/ConfirmContext";

interface Props {
  sessionId: string;
}

export default function TeachersTab({ sessionId }: Props) {
  const confirm = useConfirm();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [privateMap, setPrivateMap] = useState<Record<string, TeacherPrivate>>({});
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [credTeacherId, setCredTeacherId] = useState<string | null>(null);
  const [credPhone, setCredPhone] = useState("");
  const [credPassword, setCredPassword] = useState("");
  const [credSaving, setCredSaving] = useState(false);
  const [credError, setCredError] = useState("");

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const [list, priv] = await Promise.all([
        getTeachers(sessionId),
        getTeachersPrivateMap(sessionId),
      ]);
      setTeachers(list);
      setPrivateMap(priv);
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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await addTeacher(sessionId, name.trim());
      setName("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      message: "এই শিক্ষককে মুছে ফেলতে চান? তার লগইন অ্যাকাউন্টও মুছে যাবে। (আগের ক্লাস রেকর্ড অক্ষত থাকবে)",
      danger: true,
      confirmLabel: "মুছুন",
    });
    if (!ok) return;
    await deleteTeacher(id);
    await load();
  }

  function startEdit(t: Teacher) {
    setEditingId(t.id);
    setEditName(t.name);
  }

  async function saveEdit(t: Teacher) {
    if (editName.trim() && editName.trim() !== t.name) {
      await updateTeacherName(t.id, editName.trim());
      await load();
    }
    setEditingId(null);
  }

  function openCredentialForm(teacherId: string) {
    setCredTeacherId(teacherId);
    setCredPhone("");
    setCredPassword("");
    setCredError("");
  }

  async function handleSetCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!credTeacherId) return;
    const cleaned = credPhone.replace(/[^0-9]/g, "");
    if (cleaned.length < 11) {
      setCredError("সঠিক ফোন নম্বর দিন (১১ ডিজিট)");
      return;
    }
    if (credPassword.length < 6) {
      setCredError("পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে");
      return;
    }
    setCredSaving(true);
    setCredError("");
    try {
      await setTeacherCredentials(sessionId, credTeacherId, cleaned, credPassword);
      setCredTeacherId(null);
      await load();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "";
      if (code.includes("email-already-in-use")) {
        setCredError(
          "এই ফোন নম্বরে আগে থেকেই একটা লগইন আছে। অন্য নম্বর ব্যবহার করুন, অথবা Firebase Console থেকে পুরোনোটা মুছে আবার চেষ্টা করুন।"
        );
      } else {
        setCredError("লগইন তৈরি করা যায়নি। আবার চেষ্টা করুন।");
      }
    } finally {
      setCredSaving(false);
    }
  }

  async function handleResetCredentials(teacherId: string) {
    const ok = await confirm({
      message:
        "এই শিক্ষকের লগইন রিসেট করতে চান? নতুন ফোন নম্বর + পাসওয়ার্ড আবার সেট করতে হবে। একই ফোন নম্বর আবার ব্যবহার করতে চাইলে Firebase Console > Authentication থেকে পুরোনো অ্যাকাউন্টটা আগে মুছে দিও।",
      danger: true,
      confirmLabel: "রিসেট করুন",
    });
    if (!ok) return;
    await resetTeacherCredentials(teacherId);
    await load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="mb-3 font-display text-base font-semibold text-navy dark:text-slate-100">
          শিক্ষক তালিকা
        </h3>
        {loading ? (
          <p className="text-sm text-navy/40 dark:text-slate-400">লোড হচ্ছে...</p>
        ) : loadError ? (
          <p className="text-sm text-danger">{loadError}</p>
        ) : (
          <div className="space-y-2">
            {teachers.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm shadow-slate-900/5 dark:shadow-none px-4 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  {editingId === t.id ? (
                    <div className="flex flex-1 items-center gap-1.5">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                        className="flex-1 rounded border border-teal px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => saveEdit(t)}
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
                    <>
                      <button
                        onClick={() => startEdit(t)}
                        className="text-left font-medium text-navy dark:text-slate-100 hover:underline"
                        title="নাম এডিট করতে ক্লিক করুন"
                      >
                        {t.name}
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-xs font-medium text-danger hover:underline"
                      >
                        মুছুন
                      </button>
                    </>
                  )}
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                  {privateMap[t.id] ? (
                    <>
                      <span className="font-data text-navy/50 dark:text-slate-400">
                        লগইন: {privateMap[t.id].phone}
                      </span>
                      <button
                        onClick={() => handleResetCredentials(t.id)}
                        className="font-medium text-teal hover:underline"
                      >
                        লগইন রিসেট
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-navy/30 dark:text-slate-500">লগইন সেট করা হয়নি</span>
                      <button
                        onClick={() => openCredentialForm(t.id)}
                        className="font-medium text-teal hover:underline"
                      >
                        লগইন সেট করুন
                      </button>
                    </>
                  )}
                </div>

                {credTeacherId === t.id && (
                  <form
                    onSubmit={handleSetCredentials}
                    className="mt-2 space-y-1.5 rounded-lg bg-navy/5 dark:bg-white/5 p-2.5"
                  >
                    <input
                      value={credPhone}
                      onChange={(e) => setCredPhone(e.target.value)}
                      placeholder="ফোন নম্বর (01XXXXXXXXX)"
                      className="font-data w-full rounded border border-navy/15 dark:border-white/10 px-2 py-1 text-xs"
                    />
                    <input
                      type="password"
                      value={credPassword}
                      onChange={(e) => setCredPassword(e.target.value)}
                      placeholder="পাসওয়ার্ড (কমপক্ষে ৬ ক্যারেক্টার)"
                      className="w-full rounded border border-navy/15 dark:border-white/10 px-2 py-1 text-xs"
                    />
                    {credError && <p className="text-xs text-danger">{credError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={credSaving}
                        className="rounded bg-teal px-2.5 py-1 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-50"
                      >
                        {credSaving ? "তৈরি হচ্ছে..." : "সেভ করুন"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCredTeacherId(null)}
                        className="rounded border border-navy/15 dark:border-white/10 px-2.5 py-1 text-xs text-navy dark:text-slate-100"
                      >
                        বাতিল
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
            {teachers.length === 0 && (
              <p className="text-sm text-navy/40 dark:text-slate-400">এখনো কোনো শিক্ষক যোগ হয়নি।</p>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 font-display text-base font-semibold text-navy dark:text-slate-100">
          নতুন শিক্ষক যোগ করুন
        </h3>
        <form
          onSubmit={handleAdd}
          className="flex gap-2 rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm shadow-slate-900/5 dark:shadow-none p-4"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="শিক্ষকের নাম"
            className="flex-1 rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50"
          >
            যোগ করুন
          </button>
        </form>
        <p className="mt-2 text-xs text-navy/40 dark:text-slate-400">
          নাম যোগ করার পর তালিকায় "লগইন সেট করুন" থেকে ফোন নম্বর ও পাসওয়ার্ড দিয়ে তার
          লগইন চালু করুন — তাহলে সে নিজে <span className="font-data">/teacher/login</span>{" "}
          থেকে ঢুকে নিজের ক্লাসের হাজিরা নিতে পারবে।
        </p>
      </div>
    </div>
  );
}
