import { useState } from "react";

interface Props {
  onSubmit: (title: string, body: string) => Promise<void>;
}

export default function NoticeForm({ onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    setError("");
    try {
      await onSubmit(title.trim(), body.trim());
      setTitle("");
      setBody("");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "";
      if (code.includes("PERMISSION_DENIED")) {
        setError(
          "পোস্ট করার অনুমতি নেই। আপনি কি এই সেশনের CR হিসেবে ঠিকভাবে সেট আছেন? অ্যাডমিনকে জানান।"
        );
      } else {
        setError("নোটিশ পোস্ট করা যায়নি। আবার চেষ্টা করুন।");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm shadow-slate-900/5 dark:shadow-none p-4"
    >
      <h4 className="mb-3 font-display text-[15px] font-semibold text-navy dark:text-slate-100">
        নতুন নোটিশ দিন
      </h4>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="শিরোনাম"
        className="mb-2 w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="বিস্তারিত লিখুন..."
        rows={3}
        className="mb-3 w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
      />
      {error && <p className="mb-2 text-xs text-danger">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white transition hover:bg-teal/90 disabled:opacity-50"
      >
        {saving ? "পোস্ট হচ্ছে..." : "নোটিশ পোস্ট করুন"}
      </button>
    </form>
  );
}
