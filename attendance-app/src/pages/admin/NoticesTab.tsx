import { useEffect, useState } from "react";
import { addNotice, deleteNotice, getNotices } from "../../utils/db";
import type { Notice } from "../../types";
import { useConfirm } from "../../context/ConfirmContext";

interface Props {
  sessionId: string;
}

export default function NoticesTab({ sessionId }: Props) {
  const confirm = useConfirm();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ফর্ম এবং এডিট স্টেট
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [postedByName, setPostedByName] = useState("অ্যাডমিন");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const list = await getNotices(sessionId);
      setNotices(list);
    } catch (err) {
      console.error(err);
      setLoadError("নোটিশ লোড করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // নোটিশ যোগ বা আপডেট করার হ্যান্ডলার
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSubmitting(true);
    try {
      if (editingId) {
        await deleteNotice(sessionId, editingId);
      }
      // সঠিক Notice ইন্টারফেস অনুযায়ী postedByName পাস করা হলো
      await addNotice(sessionId, title.trim(), body.trim(), postedByName.trim() || "অ্যাডমিন");

      // ফর্ম রিসেট
      setEditingId(null);
      setTitle("");
      setBody("");
      setPostedByName("অ্যাডমিন");
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  // এডিট মোডে নেওয়ার জন্য
  function handleEdit(notice: Notice) {
    setEditingId(notice.id || null);
    setTitle(notice.title);
    setBody(notice.body);
    setPostedByName(notice.postedByName || "অ্যাডমিন");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "নোটিশ মুছে ফেলা",
      message: "আপনি কি নিশ্চিতভাবে এই নোটিশটি মুছে ফেলতে চান?",
      danger: true,
      confirmLabel: "মুছুন",
    });
    if (!ok) return;

    try {
      await deleteNotice(sessionId, id);
      await load();
    } catch (err) {
      console.error(err);
    }
  }

  // createdAt (timestamp) কে সুন্দর ডেট ফরম্যাটে রূপান্তর করার ফাংশন
  function formatDate(createdAt?: number) {
    if (!createdAt) return "";
    const d = new Date(createdAt);
    return d.toLocaleDateString("bn-BD", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* বাম পাশ: নোটিশ ফর্ম (যোগ বা এডিট) */}
      <div className="space-y-4">
        <h3 className="font-display text-base font-semibold text-navy dark:text-slate-100">
          {editingId ? "নোটিশ এডিট বা আপডেট করুন" : "নতুন নোটিশ প্রকাশ করুন"}
        </h3>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 p-5 shadow-sm"
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium text-navy/70 dark:text-slate-300">
              নোটিশের শিরোনাম
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="যেমন: জরুরি বিজ্ঞপ্তি..."
              required
              className="w-full rounded-lg border border-navy/15 dark:border-white/10 bg-transparent px-3.5 py-2.5 text-sm text-navy dark:text-slate-100 focus:border-teal focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-navy/70 dark:text-slate-300">
              প্রকাশক / পদবী (postedByName)
            </label>
            <input
              type="text"
              value={postedByName}
              onChange={(e) => setPostedByName(e.target.value)}
              placeholder="যেমন: বিভাগীয় প্রধান / অ্যাডমিন"
              className="w-full rounded-lg border border-navy/15 dark:border-white/10 bg-transparent px-3.5 py-2.5 text-sm text-navy dark:text-slate-100 focus:border-teal focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-navy/70 dark:text-slate-300">
              বিস্তারিত বিবরণ
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="নোটিশের বিস্তারিত এখানে লিখুন..."
              rows={5}
              required
              className="w-full rounded-lg border border-navy/15 dark:border-white/10 bg-transparent px-3.5 py-2.5 text-sm text-navy dark:text-slate-100 focus:border-teal focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-teal py-2.5 text-sm font-semibold text-white transition hover:bg-teal/90 disabled:opacity-50 shadow-sm"
            >
              {submitting ? "সংরক্ষণ হচ্ছে..." : editingId ? "নোটিশ আপডেট করুন" : "নোটিশ প্রকাশ করুন"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setTitle("");
                  setBody("");
                  setPostedByName("অ্যাডমিন");
                }}
                className="rounded-lg bg-slate-200 dark:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-navy dark:text-slate-200 transition"
              >
                বাতিল
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ডান পাশ: নোটিশ বোর্ড তালিকা */}
      <div className="space-y-4">
        <h3 className="font-display text-base font-semibold text-navy dark:text-slate-100">
          প্রকাশিত নোটিশসমূহ ({notices.length})
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-12 rounded-xl border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800">
            <p className="text-sm text-navy/40 dark:text-slate-400 animate-pulse">নোটিশ লোড হচ্ছে...</p>
          </div>
        ) : loadError ? (
          <div className="p-4 rounded-xl border border-danger/20 bg-danger/5 text-center">
            <p className="text-sm text-danger">{loadError}</p>
          </div>
        ) : notices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 text-center">
            <p className="text-sm text-navy/40 dark:text-slate-400">কোনো নোটিশ পাওয়া যায়নি।</p>
            <p className="text-xs text-navy/30 dark:text-slate-500 mt-1">বাম পাশ থেকে নতুন নোটিশ প্রকাশ করুন।</p>
          </div>
        ) : (
          <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className="group relative rounded-xl border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 p-4.5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-display text-sm font-bold text-navy dark:text-slate-100">
                      {notice.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-medium text-teal bg-teal/10 px-2 py-0.5 rounded-full">
                        {notice.postedByName || "অ্যাডমিন"}
                      </span>
                      {notice.createdAt && (
                        <span className="text-[11px] text-navy/40 dark:text-slate-400 font-data">
                          {formatDate(notice.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* অ্যাকশন বাটনস (এডিট ও ডিলিট) */}
                  <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleEdit(notice)}
                      className="text-xs font-medium text-teal hover:underline px-1.5 py-1"
                    >
                      এডিট
                    </button>
                    <button
                      onClick={() => notice.id && handleDelete(notice.id)}
                      className="text-xs font-medium text-danger hover:underline px-1.5 py-1"
                    >
                      মুছুন
                    </button>
                  </div>
                </div>

-                <p className="mt-3 text-xs text-navy/70 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {notice.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}