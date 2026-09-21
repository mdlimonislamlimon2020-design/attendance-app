import { useEffect, useMemo, useState } from "react";
import {
  getStudents,
  getClasses,
  getTeachers,
  getAttendanceForSession,
  getSessions,
} from "../../utils/db";
import { computeDefaulters } from "../../utils/stats";
import { ALL_MONTHS, getAvailableMonths, filterClassesByMonth, monthLabel, type MonthFilter } from "../../utils/months";
import MonthSelect from "../../components/MonthSelect";
import type { Student, ClassSession, Teacher, Session } from "../../types";
import * as XLSX from "xlsx";

interface Props {
  sessionId: string;
}

interface Subject {
  id: string;
  code: string;
  name: string;
}

export default function ReportsTab({ sessionId }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [, setTeachers] = useState<Teacher[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Record<string, boolean>>>({});
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [inCourseMarks, setInCourseMarks] = useState<Record<string, Record<string, { ic1?: number; ic2?: number }>>>({});

  const [session, setSession] = useState<Session | null>(null);
  const [threshold, setThreshold] = useState(75);
  const [month, setMonth] = useState<MonthFilter>(ALL_MONTHS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const [studs, cls, tch, att, sessions] = await Promise.all([
        getStudents(sessionId),
        getClasses(sessionId),
        getTeachers(sessionId),
        getAttendanceForSession(sessionId),
        getSessions(),
      ]);
      setStudents(studs);
      setClasses(cls);
      setTeachers(tch);
      setAttendance(att);
      setSession(sessions.find((s) => s.id === sessionId) || null);

      const dummySubjects: Subject[] = [
        { id: "sub1", code: "MATH-3101", name: "Real Analysis" },
        { id: "sub2", code: "MATH-3102", name: "Complex Analysis" },
        { id: "sub3", code: "MATH-3103", name: "Abstract Algebra" },
      ];
      setSubjects(dummySubjects);
      setInCourseMarks({});
    } catch (err) {
      console.error(err);
      setLoadError("তালিকা লোড করা যায়নি। ইন্টারনেট চেক করে আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const availableMonths = useMemo(() => getAvailableMonths(classes), [classes]);
  const filteredClasses = useMemo(
    () => filterClassesByMonth(classes, month),
    [classes, month]
  );

  if (loading) return <p className="text-sm text-navy/40 dark:text-slate-400">লোড হচ্ছে...</p>;
  if (loadError) return <p className="text-sm text-danger">{loadError}</p>;

  const defaulters = computeDefaulters(students, filteredClasses, attendance, threshold);

  // ১. হাজিরা রিপোর্ট এক্সেল ফাইল ডাউনলোড
  function handleAttendanceExcelExport() {
    if (!session || filteredClasses.length === 0) return;

    const headerRow = [
      "ক্র.",
      "রেজিস্ট্রেশন নং",
      "শিক্ষার্থীর নাম",
      ...filteredClasses.map((cls, idx) => `ক্লাস ${idx + 1} (${cls.date})`),
      "মোট উপস্থিত",
      "শতাংশ (%)",
    ];

    const dataRows = students.map((stu, index) => {
      let attendedCount = 0;
      const classMarks = filteredClasses.map((cls) => {
        const isPresent = attendance[cls.id]?.[stu.id] === true;
        if (isPresent) attendedCount++;
        return isPresent ? "P" : "A";
      });

      const totalClasses = filteredClasses.length;
      const percentage = totalClasses > 0 ? ((attendedCount / totalClasses) * 100).toFixed(1) + "%" : "0%";

      return [
        index + 1,
        stu.reg,
        stu.name,
        ...classMarks,
        `${attendedCount}/${totalClasses}`,
        percentage,
      ];
    });

    const wsData = [headerRow, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    
    const sheetName = month === ALL_MONTHS ? "Attendance" : `Report_${monthLabel(month)}`;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const colWidths = wsData[0].map((_, colIndex) => {
      return Math.max(
        ...wsData.map((row) => (row[colIndex] ? row[colIndex].toString().length : 10))
      );
    });
    worksheet["!cols"] = colWidths.map((w) => ({ wch: Math.max(w + 3, 10) }));

    const fileName = `${session.name}_Attendance_${month === ALL_MONTHS ? "All" : monthLabel(month)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  // হেল্পার ফাংশন: পাশাপাশি সাবজেক্ট কোড কলাম দিয়ে ইন-কোর্স বা গড় রিপোর্ট তৈরি করা
  function generateHorizontalInCourseRows(type: 'ic1' | 'ic2' | 'combined') {
    const rows: (string | number)[][] = [];
    
    const titleMain = type === 'ic1' ? "প্রথম ইন-কোর্স নম্বর তালিকা" : type === 'ic2' ? "দ্বিতীয় ইন-কোর্স নম্বর তালিকা" : "ইন-কোর্স ও গড় নম্বর মাস্টার তালিকা";
    rows.push([titleMain]);
    rows.push([]);

    const subjectCodes = subjects.map((s) => s.code);
    
    let headerRow: string[] = [];
    if (type === 'combined') {
      headerRow = [
        "ক্র.",
        "রেজিস্ট্রেশন নং",
        "শিক্ষার্থীর নাম",
        ...subjects.map((s) => `${s.code} (IC-1)`),
        ...subjects.map((s) => `${s.code} (IC-2)`),
        ...subjects.map((s) => `${s.code} (Avg)`),
      ];
    } else {
      const icLabel = type === 'ic1' ? "ইন-কোর্স ১" : "ইন-কোর্স ২";
      headerRow = [
        "ক্র.",
        "রেজিস্ট্রেশন নং",
        "শিক্ষার্থীর নাম",
        ...subjectCodes.map((code) => `${code} (${icLabel})`),
      ];
    }
    rows.push(headerRow);

    students.forEach((stu, index) => {
      const studentMarks = inCourseMarks[stu.id] || {};

      if (type === 'combined') {
        const ic1Marks = subjects.map((s) => studentMarks[s.code]?.ic1 ?? 0);
        const ic2Marks = subjects.map((s) => studentMarks[s.code]?.ic2 ?? 0);
        const avgMarks = subjects.map((s) => {
          const ic1 = studentMarks[s.code]?.ic1 ?? 0;
          const ic2 = studentMarks[s.code]?.ic2 ?? 0;
          return ((ic1 + ic2) / 2).toFixed(1);
        });

        rows.push([index + 1, stu.reg, stu.name, ...ic1Marks, ...ic2Marks, ...avgMarks]);
      } else {
        const marks = subjects.map((s) => {
          const val = type === 'ic1' ? studentMarks[s.code]?.ic1 : studentMarks[s.code]?.ic2;
          return val ?? 0;
        });

        rows.push([index + 1, stu.reg, stu.name, ...marks]);
      }
    });

    return rows;
  }

  function handleIC1ExcelExport() {
    if (!session || subjects.length === 0) return;
    const wsData = generateHorizontalInCourseRows('ic1');
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "In-Course 1");
    XLSX.writeFile(workbook, `${session.name}_InCourse_1_Report.xlsx`);
  }

  function handleIC2ExcelExport() {
    if (!session || subjects.length === 0) return;
    const wsData = generateHorizontalInCourseRows('ic2');
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "In-Course 2");
    XLSX.writeFile(workbook, `${session.name}_InCourse_2_Report.xlsx`);
  }

  function handleCombinedExcelExport() {
    if (!session || subjects.length === 0) return;
    const wsData = generateHorizontalInCourseRows('combined');
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "InCourse & Average");
    XLSX.writeFile(workbook, `${session.name}_InCourse_Combined_Average_Report.xlsx`);
  }

  return (
    <div className="space-y-6">
      {availableMonths.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-medium text-navy/60 dark:text-slate-400">
            সময়কাল বাছাই করুন (হাজিরার জন্য প্রযোজ্য)
          </label>
          <MonthSelect months={availableMonths} value={month} onChange={setMonth} />
        </div>
      )}

      <div className="rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm p-4">
        <h3 className="mb-2 font-display text-base font-semibold text-navy dark:text-slate-100">
          হাজিরা রিপোর্ট এক্সেল ফাইল (.xlsx)
        </h3>
        <p className="mb-3 text-xs text-navy/50 dark:text-slate-400">
          নির্বাচিত সময়কালের সবার হাজিরা — প্রতিটা ক্লাসের জন্য আলাদা কলাম (P = উপস্থিত, A = অনুপস্থিত), সাথে মোট উপস্থিতি ও শতাংশ।
        </p>
        <button
          onClick={handleAttendanceExcelExport}
          disabled={filteredClasses.length === 0}
          className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50 transition shadow-sm"
        >
          হাজিরা এক্সেল ফাইল ডাউনলোড করুন (.xlsx)
        </button>
        {filteredClasses.length === 0 && (
          <p className="mt-2 text-xs text-navy/40 dark:text-slate-400">এই সময়ে কোনো ক্লাস নেই।</p>
        )}
      </div>

      <div className="rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm p-4 space-y-4">
        <div>
          <h3 className="mb-1 font-display text-base font-semibold text-navy dark:text-slate-100">
            ইন-কোর্স নম্বর রিপোর্ট (সাবজেক্ট কোড অনুযায়ী পাশাপাশি কলাম)
          </h3>
          <p className="text-xs text-navy/50 dark:text-slate-400">
            প্রতিটি শিক্ষার্থীর নামের পাশে সাবজেক্ট কোডগুলো স্বয়ংক্রিয়ভাবে কলাম আকারে সাজিয়ে ৩টি আলাদা ফরম্যাটে ফাইল ডাউনলোড করুন।
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleIC1ExcelExport}
            disabled={subjects.length === 0}
            className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50 transition shadow-sm"
          >
            📥 প্রথম ইন-কোর্স ফাইল ডাউনলোড
          </button>

          <button
            onClick={handleIC2ExcelExport}
            disabled={subjects.length === 0}
            className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50 transition shadow-sm"
          >
            📥 দ্বিতীয় ইন-কোর্স ফাইল ডাউনলোড
          </button>

          <button
            onClick={handleCombinedExcelExport}
            disabled={subjects.length === 0}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
          >
            📊 ১ম, ২য় ও গড় মাস্টার ফাইল ডাউনলোড
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-base font-semibold text-navy dark:text-slate-100">
            কম উপস্থিতির স্টুডেন্ট
          </h3>
          <label className="flex items-center gap-2 text-xs text-navy/60 dark:text-slate-400">
            থ্রেশহোল্ড:
            <input
              type="number"
              min={0}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-16 rounded-lg border border-navy/15 dark:border-white/10 px-2 py-1 text-sm focus:border-teal"
            />
            %
          </label>
        </div>

        {filteredClasses.length === 0 ? (
          <p className="text-sm text-navy/40 dark:text-slate-400">এই সময়ে কোনো ক্লাস হয়নি।</p>
        ) : defaulters.length === 0 ? (
          <p className="text-sm text-navy/40 dark:text-slate-400">
            {threshold}% এর নিচে উপস্থিতি আছে এমন কেউ নেই।
          </p>
        ) : (
          <div className="max-h-96 overflow-x-auto overflow-y-auto rounded-lg border border-navy/10 dark:border-white/10">
            <table className="text-sm table-auto border-collapse w-full">
              {/* হেডার বা শিরোনামগুলো সেন্টারে রাখা হয়েছে */}
              <thead className="sticky top-0 z-20 bg-navy/5 dark:bg-slate-700 text-xs uppercase text-navy/60 dark:text-slate-300 border-b border-navy/10 dark:border-white/10 text-center">
                <tr>
                  <th className="px-6 py-3 whitespace-nowrap bg-navy/5 dark:bg-slate-700 border-r border-navy/10 dark:border-white/10">রেজি. নং</th>
                  <th className="px-8 py-3 whitespace-nowrap bg-navy/5 dark:bg-slate-700 border-r border-navy/10 dark:border-white/10">নাম</th>
                  <th className="px-6 py-3 whitespace-nowrap bg-navy/5 dark:bg-slate-700 border-r border-navy/10 dark:border-white/10">উপস্থিতি</th>
                  <th className="px-6 py-3 whitespace-nowrap bg-navy/5 dark:bg-slate-700">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5 dark:divide-white/10">
                {defaulters.map((d) => (
                  <tr key={d.studentId} className="hover:bg-navy/5 dark:hover:bg-white/5 transition-colors">
                    {/* রেজি. নং (সেন্টার) */}
                    <td className="font-data px-6 py-2.5 whitespace-nowrap text-navy/60 dark:text-slate-400 border-r border-navy/5 dark:border-white/5 text-center">{d.reg}</td>
                    {/* নাম (লেফট অ্যালাইনড - ডিফল্ট) */}
                    <td className="px-8 py-2.5 whitespace-nowrap text-navy dark:text-slate-100 border-r border-navy/5 dark:border-white/5 text-left">{d.name}</td>
                    {/* উপস্থিতি (সেন্টার) */}
                    <td className="font-data px-6 py-2.5 whitespace-nowrap text-navy/60 dark:text-slate-400 border-r border-navy/5 dark:border-white/5 text-center">
                      {d.attended}/{d.total}
                    </td>
                    {/* পার্সেন্টেজ (সেন্টার) */}
                    <td className="font-data px-6 py-2.5 whitespace-nowrap font-semibold text-danger text-center">
                      {d.pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}