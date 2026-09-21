import { useEffect, useState } from "react";
import { addHoliday, deleteHoliday, getHolidays } from "../../utils/db";
import type { Holiday } from "../../types";
import { useConfirm } from "../../context/ConfirmContext";

const OFFICIAL_2026_HOLIDAYS = [
  { sl: "০১", title: "শব-ই-মিরাজ (*)", date: "১৭ জানুয়ারি, শনিবার ২০২৬", banga: "০৩ মাঘ, ১৪৩২", days: "০১", note: "" },
  { sl: "০২", title: "শ্রী শ্রী সরস্বতী পূজা", date: "২৩ জানুয়ারি, শুক্রবার ২০২৬", banga: "০৯ মাঘ, ১৪৩২", days: "০১", note: "" },
  { sl: "০৩", title: "মাঘী পূর্ণিমা", date: "০১ ফেব্রুয়ারি, রবিবার ২০২৬", banga: "১৮ মাঘ, ১৪৩২", days: "০১", note: "" },
  { sl: "০৪", title: "শব-ই-বরাত (*)", date: "০৪ ফেব্রুয়ারি, বুধবার ২০২৬", banga: "২১ মাঘ, ১৪৩২", days: "০১", note: "" },
  { sl: "০৫", title: "শ্রী শ্রী শিবরাত্রি ব্রত", date: "১৫ ফেব্রুয়ারি, রবিবার ২০২৬", banga: "০২ ফাল্গুন, ১৪৩২", days: "০১", note: "" },
  { sl: "০৬", title: "শহীদ দিবস ও আন্তর্জাতিক মাতৃভাষা দিবস", date: "২১ ফেব্রুয়ারি, শনিবার ২০২৬", banga: "০৮ ফাল্গুন, ১৪৩২", days: "০১", note: "" },
  { sl: "০৭", title: "পবিত্র রমজান, দোলযাত্রা, শব-ই-কদর, জুমাতুল বিদা, ঈদুল ফিতর ও গ্রীষ্মকালীন অবকাশ (*)", date: "১৮ ফেব্রুয়ারি ২০২৬ হতে ২৫ মার্চ ২০২৬ পর্যন্ত", banga: "০৫ মাঘ ১৪৩২ হতে ১১ চৈত্র ১৪৩২", days: "২৬", note: "চাঁদ দেখা সাপেক্ষে পরিবর্তন হতে পারে" },
  { sl: "০৮", title: "স্বাধীনতা ও জাতীয় দিবস", date: "২৬ মার্চ, বৃহস্পতিবার ২০২৬", banga: "১২ চৈত্র, ১৪৩২", days: "০১", note: "" },
  { sl: "০৯", title: "পুণ্য শুক্রবার", date: "০৩ এপ্রিল, শুক্রবার ২০২৬", banga: "২০ চৈত্র, ১৪৩২", days: "০১", note: "" },
  { sl: "১০", title: "পুণ্য শনিবার", date: "০৪ এপ্রিল, শনিবার ২০২৬", banga: "২১ চৈত্র, ১৪৩২", days: "০১", note: "" },
  { sl: "১১", title: "ইস্টার সানডে", date: "০৫ এপ্রিল, রবিবার ২০২৬", banga: "২২ চৈত্র, ১৪৩২", days: "০১", note: "" },
  { sl: "১২", title: "বৈসাবি ও পার্বত্য চট্টগ্রামের অন্যান্য ক্ষুদ্র নৃ-গোষ্ঠির অনুরূপ সামাজিক উৎসব", date: "১৩ এপ্রিল, সোমবার ২০২৬", banga: "৩০ চৈত্র, ১৪৩২", days: "০১", note: "শুধুমাত্র সংশ্লিষ্ট এলাকার জন্য প্রযোজ্য" },
  { sl: "১৩", title: "বাংলা নববর্ষ", date: "১৪ এপ্রিল, মঙ্গলবার ২০২৬", banga: "০১ বৈশাখ, ১৪৩৩", days: "০১", note: "" },
  { sl: "১৪", title: "মে দিবস ও বুদ্ধ পূর্ণিমা (বৈশাখী পূর্ণিমা)", date: "০১ মে, শুক্রবার ২০২৬", banga: "১৮ বৈশাখ, ১৪৩৩", days: "০১", note: "" },
  { sl: "১৫", title: "পবিত্র ঈদুল-আজহা (*)", date: "২৪ মে, রবিবার ২০২৬ হতে ০৪ জুন, বৃহস্পতিবার ২০২৬ পর্যন্ত", banga: "১০ জ্যৈষ্ঠ ১৪৩৩ হতে ২১ জ্যৈষ্ঠ ১৪৩৩", days: "১০", note: "" },
  { sl: "১৬", title: "পবিত্র আশুরা (*)", date: "২৬ জুন, শুক্রবার ২০২৬", banga: "১২ আষাঢ়, ১৪৩৩", days: "০১", note: "" },
  { sl: "১৭", title: "জুলাই গণঅভ্যুত্থান দিবস", date: "০৫ আগস্ট, বুধবার ২০২৬", banga: "২১ শ্রাবণ, ১৪৩৩", days: "০১", note: "" },
  { sl: "১৮", title: "আখেরী চাহার সোম্বা (*)", date: "১২ আগস্ট, বুধবার ২০২৬", banga: "২৮ শ্রাবণ, ১৪৩৩", days: "০১", note: "" },
  { sl: "১৯", title: "ঈদে-মিলাদুন্নবী (সা:) (*)", date: "২৬ আগস্ট, বুধবার ২০২৬", banga: "১১ ভাদ্র, ১৪৩৩", days: "০১", note: "" },
  { sl: "২০", title: "শুভ জন্মাষ্টমী", date: "০৪ সেপ্টেম্বর, শুক্রবার ২০২৬", banga: "২০ ভাদ্র, ১৪৩৩", days: "০১", note: "" },
  { sl: "২১", title: "ফাতিহা-ই-ইয়াযদাহম (*)", date: "২৪ সেপ্টেম্বর, বৃহস্পতিবার ২০২৬", banga: "০৯ আশ্বিন, ১৪৩৩", days: "০১", note: "" },
  { sl: "২২", title: "শ্রী শ্রী দুর্গা পূজা, বিজয়া দশমী, প্রবারণা পূর্ণিমা ও শ্রী শ্রী লক্ষ্মী পূজা", date: "১৮ অক্টোবর, রবিবার ২০২৬ হতে ২৯ অক্টোবর, বৃহস্পতিবার ২০২৬ পর্যন্ত", banga: "০২ কার্তিক ১৪৩৩ হতে ১৩ কার্তিক ১৪৩৩ পর্যন্ত", days: "১০", note: "" },
  { sl: "২৩", title: "শ্রী শ্রী শ্যামা পূজা", date: "০৮ নভেম্বর, রবিবার ২০২৬", banga: "২৩ কার্তিক, ১৪৩৩", days: "০১", note: "" },
  { sl: "২৪", title: "বিজয় দিবস", date: "১৬ ডিসেম্বর, বুধবার ২০২৬", banga: "০১ পৌষ, ১৪৩৩", days: "০১", note: "" },
  { sl: "২৫", title: "শীতকালীন অবকাশ এবং যিশু খ্রিষ্টের জন্মদিন (বড়দিন)", date: "১৭ ডিসেম্বর, বৃহস্পতিবার ২০২৬ হতে ৩১ ডিসেম্বর, বৃহস্পতিবার ২০২৬ পর্যন্ত", banga: "০২ পৌষ ১৪৩৩ হতে ১৬ পৌষ ১৪৩৩ পর্যন্ত", days: "১১", note: "" },
  { sl: "২৬", title: "প্রতিষ্ঠান প্রধানের সংরক্ষিত ছুটি", date: "প্রযোজ্য ক্ষেত্রে", banga: "—", days: "০৩", note: "সংরক্ষিত ছুটি" },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

interface ParsedNote {
  approved: string;
  banga: string;
  days: string;
  remark: string;
}

export default function HolidaysTab() {
  const confirm = useConfirm();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(todayStr());
  const [title, setTitle] = useState("");
  const [approvedDate, setApprovedDate] = useState("");
  const [bangaDate, setBangaDate] = useState("");
  const [daysCount, setDaysCount] = useState("০১");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      setHolidays(await getHolidays());
    } catch (err) {
      console.error(err);
      setLoadError("তালিকা লোড করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddOrUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !approvedDate) return;
    setSaving(true);
    try {
      const cleanTitle = title.replace(/^\(\S+\)\s*/, "").trim();
      const fullNote = `অনুমোদিত তারিখ: ${approvedDate} | বঙ্গাব্দ: ${bangaDate || "—"} | দিন সংখ্যা: ${daysCount} | মন্তব্য: ${note || "—"}`;
      
      if (editingId) {
        await deleteHoliday(editingId);
      }
      
      await addHoliday(date, cleanTitle, fullNote);
      
      setEditingId(null);
      setTitle("");
      setApprovedDate("");
      setBangaDate("");
      setDaysCount("০১");
      setNote("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(h: Holiday) {
    setEditingId(h.id || null);
    setDate(h.date || todayStr());
    setTitle(h.title || "");
    
    const parsed = parseHolidayNote(h.note);
    setApprovedDate(parsed.approved !== "—" ? parsed.approved : "");
    setBangaDate(parsed.banga !== "—" ? parsed.banga : "");
    setDaysCount(parsed.days || "০১");
    setNote(parsed.remark !== "—" ? parsed.remark : "");
    
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(holidayId?: string) {
    if (!holidayId) return;
    const ok = await confirm({ message: "এই ছুটিটি মুছে ফেলতে চান?", danger: true, confirmLabel: "মুছুন" });
    if (!ok) return;
    await deleteHoliday(holidayId);
    await load();
  }

  async function handleDeleteAll() {
    const ok = await confirm({ 
      title: "সকল ছুটি মুছে ফেলা", 
      message: "আপনি কি নিশ্চিতভাবে সব ছুটির তালিকা মুছে ফেলতে চান?", 
      danger: true, 
      confirmLabel: "সব মুছুন" 
    });
    if (!ok) return;

    setLoading(true);
    try {
      for (const h of holidays) {
        if (h.id) {
          await deleteHoliday(h.id);
        }
      }
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleOfficialImport() {
    const ok = await confirm({
      title: "২০২৬ সালের অফিশিয়াল ছুটি ইমপোর্ট",
      message: "আপনি কি প্রজ্ঞাপনের অবিকল ফরম্যাটে ২০২৬ সালের ২৬টি ছুটির তালিকা একসাথে ডাটাবেজে যুক্ত করতে চান?",
      confirmLabel: "ইমপোর্ট করুন",
    });
    if (!ok) return;

    setImporting(true);
    try {
      for (const h of OFFICIAL_2026_HOLIDAYS) {
        const fullNote = `অনুমোদিত তারিখ: ${h.date} | বঙ্গাব্দ: ${h.banga} | দিন সংখ্যা: ${h.days} | মন্তব্য: ${h.note || "—"}`;
        await addHoliday(todayStr(), h.title, fullNote);
      }
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setImporting(false);
    }
  }

  const parseHolidayNote = (noteStr?: string): ParsedNote => {
    if (!noteStr) return { approved: "—", banga: "—", days: "০১", remark: "—" };

    if (noteStr.includes("•")) {
      const parts = noteStr.split("•").map(p => p.trim());
      return {
        approved: parts[0] || "—",
        banga: parts[1] || "—",
        days: parts[2]?.replace("দিন:", "").trim() || "০১",
        remark: "—"
      };
    }

    const parts = noteStr.split("|").map(p => p.trim());
    const approved = parts[0]?.replace("অনুমোদিত তারিখ:", "").trim() || "—";
    const banga = parts[1]?.replace("বঙ্গাব্দ:", "").trim() || "—";
    const days = parts[2]?.replace("দিন সংখ্যা:", "").trim() || "০১";
    const remark = parts[3]?.replace("মন্তব্য:", "").trim() || "—";

    return { approved, banga, days, remark };
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 font-display text-base font-semibold text-navy dark:text-slate-100">
            {editingId ? "ছুটি এডিট বা আপডেট করুন" : "নতুন ছুটি যোগ করুন (প্রজ্ঞাপন ফরম্যাট)"}
          </h3>
          <form
            onSubmit={handleAddOrUpdate}
            className="space-y-3 rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 p-4 shadow-sm"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">সিস্টেম তারিখ</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">দিন সংখ্যা</label>
                <input
                  value={daysCount}
                  onChange={(e) => setDaysCount(e.target.value)}
                  placeholder="যেমন: ০১"
                  className="w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal font-data"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">ছুটির উপলক্ষ্য</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="যেমন: শব-ই-মিরাজ (*)"
                className="w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">অনুমোদিত ছুটির তারিখ ও দিন</label>
                <input
                  value={approvedDate}
                  onChange={(e) => setApprovedDate(e.target.value)}
                  placeholder="১৭ জানুয়ারি, শনিবার ২০২৬"
                  className="w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">বঙ্গাব্দের তারিখ</label>
                <input
                  value={bangaDate}
                  onChange={(e) => setBangaDate(e.target.value)}
                  placeholder="০৩ মাঘ, ১৪৩২"
                  className="w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">মন্তব্য</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="চাঁদ দেখার উপর নির্ভরশীল"
                className="w-full rounded-lg border border-navy/15 dark:border-white/10 px-3 py-2 text-sm focus:border-teal"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-teal py-2.5 text-sm font-semibold text-white transition hover:bg-teal/90 disabled:opacity-50"
              >
                {saving ? "সংরক্ষণ হচ্ছে..." : editingId ? "আপডেট করুন" : "ছুটি যোগ করুন"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setTitle("");
                    setApprovedDate("");
                    setBangaDate("");
                    setDaysCount("০১");
                    setNote("");
                  }}
                  className="rounded-lg bg-slate-300 dark:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-navy dark:text-slate-200"
                >
                  বাতিল
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="flex flex-col justify-between">
          <div>
            <h3 className="mb-3 font-display text-base font-semibold text-navy dark:text-slate-100">
              ২০২৬ সালের সরকারি ছুটির প্রজ্ঞাপন ইমপোর্ট
            </h3>
            <div className="rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 p-4 shadow-sm space-y-3">
              <p className="text-xs text-navy/60 dark:text-slate-400 leading-relaxed">
                শিক্ষা মন্ত্রণালয়ের সরকারি প্রজ্ঞাপনের সাথে সামঞ্জস্যপূর্ণ ২৬টি ছুটির তালিকা এক ক্লিকে টেবিল ফরম্যাটে যুক্ত করতে নিচের বাটনে ক্লিক করুন।
              </p>
              <button
                onClick={handleOfficialImport}
                disabled={importing}
                className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-gold-light hover:bg-navy-deep disabled:opacity-50"
              >
                {importing ? "ইমপোর্ট হচ্ছে..." : "২০২৬ সালের সরকারি তালিকা যুক্ত করুন"}
              </button>
            </div>
          </div>
          <p className="text-xs text-navy/40 dark:text-slate-400 mt-2">
            * ছকের কলামগুলো সরকারি ছুটির প্রজ্ঞাপনের মূল দলিলের আদলে ডিজাইন করা হয়েছে।
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-base font-semibold text-navy dark:text-slate-100">
            ছুটির তালিকা ২০২৬ 
          </h3>
          {holidays.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/20 transition"
            >
              সব মুছে ফেলুন (Delete All)
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-navy/40 dark:text-slate-400">লোড হচ্ছে...</p>
        ) : loadError ? (
          <p className="text-sm text-danger">{loadError}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-navy/20 dark:border-white/15 bg-white dark:bg-slate-800 shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-900 text-navy dark:text-slate-200 border-b border-navy/20 dark:border-white/15 uppercase font-semibold">
                <tr>
                  <th className="px-3 py-3 border-r border-navy/15 dark:border-white/10 text-center w-12">ক্র.</th>
                  <th className="px-3 py-3 border-r border-navy/15 dark:border-white/10 text-center">ছুটির উপলক্ষ্য</th>
                  <th className="px-3 py-3 border-r border-navy/15 dark:border-white/10 text-center">অনুমোদিত ছুটির তারিখ ও দিন</th>
                  <th className="px-3 py-3 border-r border-navy/15 dark:border-white/10 text-center">বঙ্গাব্দের তারিখ</th>
                  <th className="px-3 py-3 border-r border-navy/15 dark:border-white/10 text-center w-20">দিন সংখ্যা</th>
                  <th className="px-3 py-3 border-r border-navy/15 dark:border-white/10 text-center">মন্তব্য</th>
                  <th className="px-3 py-3 text-center w-28">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/10 dark:divide-white/10">
                {holidays.map((h, index) => {
                  const details = parseHolidayNote(h.note);
                  return (
                    <tr key={h.id || index} className="hover:bg-navy/[0.02] dark:hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5 border-r border-navy/10 dark:border-white/10 text-center font-data text-navy/70 dark:text-slate-400">
                        {String(index + 1).padStart(2, "0")}
                      </td>
                      <td className="px-3 py-2.5 border-r border-navy/10 dark:border-white/10 text-center font-medium text-navy dark:text-slate-100">
                        {h.title}
                      </td>
                      <td className="px-3 py-2.5 border-r border-navy/10 dark:border-white/10 text-center font-data text-navy/80 dark:text-slate-300">
                        {details.approved}
                      </td>
                      <td className="px-3 py-2.5 border-r border-navy/10 dark:border-white/10 text-center font-data text-navy/70 dark:text-slate-400">
                        {details.banga}
                      </td>
                      <td className="px-3 py-2.5 border-r border-navy/10 dark:border-white/10 text-center font-data text-navy/80 dark:text-slate-300">
                        {details.days}
                      </td>
                      <td className="px-3 py-2.5 border-r border-navy/10 dark:border-white/10 text-center text-navy/60 dark:text-slate-400">
                        {details.remark}
                      </td>
                      <td className="px-3 py-2.5 text-center space-x-2">
                        <button
                          onClick={() => handleEdit(h)}
                          className="text-xs font-medium text-teal hover:underline"
                        >
                          এডিট
                        </button>
                        <button
                          onClick={() => handleDelete(h.id)}
                          className="text-xs font-medium text-danger hover:underline"
                        >
                          মুছুন
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {holidays.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-navy/40 dark:text-slate-400">
                      কোনো ছুটির ডাটা পাওয়া যায়নি। উপরের বাটনে ক্লিক করে সরকারি তালিকা ইমপোর্ট করুন।
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