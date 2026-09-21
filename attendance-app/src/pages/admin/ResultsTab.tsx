import { useEffect, useMemo, useState } from "react";
import {
  getExams,
  createExam,
  deleteExam,
  getExamResults,
  saveExamResults,
  publishExamResults,
  getTeachers,
  getStudents,
} from "../../utils/db";

import type { Exam, Teacher, Student } from "../../types";
import { useConfirm } from "../../context/ConfirmContext";

interface Props {
  sessionId: string;
  lockedTeacherId?: string;
}

// =====================================================
// ১ম থেকে ৪র্থ বর্ষের বিষয় কোড ও নাম
// =====================================================

const SUBJECT_OPTIONS = [
  // ==================== First Year ====================
  {
    year: "১ম বর্ষ",
    code: "211501",
    name: "History of the Emergence of Independent Bangladesh",
  },
  {
    year: "১ম বর্ষ",
    code: "ECO-101",
    name: "Principles of Microeconomics",
  },
  {
    year: "১ম বর্ষ",
    code: "ECO-102",
    name: "Principles of Macroeconomics",
  },
  {
    year: "১ম বর্ষ",
    code: "MAT-101",
    name: "Fundamentals of Mathematics",
  },
  {
    year: "১ম বর্ষ",
    code: "MAT-102",
    name: "Differential Calculus-I",
  },
  {
    year: "১ম বর্ষ",
    code: "MAT-103",
    name: "Analytic Geometry",
  },
  {
    year: "১ম বর্ষ",
    code: "MAT-104",
    name: "Linear Algebra I",
  },
  {
    year: "১ম বর্ষ",
    code: "MAT-105",
    name: "Integral Calculus I",
  },
  {
    year: "১ম বর্ষ",
    code: "MAT-150",
    name: "Math Lab I (MATHEMATICA)",
  },
  {
    year: "১ম বর্ষ",
    code: "MAT-199",
    name: "Viva-Voce",
  },
  {
    year: "১ম বর্ষ",
    code: "Stat.NM-101",
    name: "Introduction to Statistics",
  },
  {
    year: "১ম বর্ষ",
    code: "Stat.NML-103",
    name: "Statistics Practical-I",
  },

  // ==================== Second Year ====================
  {
    year: "২য় বর্ষ",
    code: "ECO 201",
    name: "Mathematical Economics",
  },
  {
    year: "২য় বর্ষ",
    code: "ECO 202",
    name: "Economy of Bangladesh",
  },
  {
    year: "২য় বর্ষ",
    code: "MAT 201",
    name: "Real Analysis I",
  },
  {
    year: "২য় বর্ষ",
    code: "MAT 202",
    name: "Differential Calculus II",
  },
  {
    year: "২য় বর্ষ",
    code: "MAT 203",
    name: "Ordinary Differential Equations I",
  },
  {
    year: "২য় বর্ষ",
    code: "MAT 204",
    name: "Linear Algebra II",
  },
  {
    year: "২য় বর্ষ",
    code: "MAT 205",
    name: "Integral Calculus II",
  },
  {
    year: "২য় বর্ষ",
    code: "MAT 206",
    name: "Numerical Analysis I",
  },
  {
    year: "২য় বর্ষ",
    code: "MAT 207",
    name: "Programming Fundamentals",
  },
  {
    year: "২য় বর্ষ",
    code: "MAT 250",
    name: "Math Lab II (Fortran)",
  },
  {
    year: "২য় বর্ষ",
    code: "MAT 299",
    name: "Viva Voce",
  },
  {
    year: "২য় বর্ষ",
    code: "Stat NM-202",
    name: "Principles of Statistics",
  },
  {
    year: "২য় বর্ষ",
    code: "Stat NM-203",
    name: "Lab (Principles of Statistics)",
  },

  // ==================== Third Year ====================
  {
    year: "৩য় বর্ষ",
    code: "MAT 301",
    name: "Real Analysis II",
  },
  {
    year: "৩য় বর্ষ",
    code: "MAT 302",
    name: "Complex Analysis",
  },
  {
    year: "৩য় বর্ষ",
    code: "MAT 303",
    name: "Ordinary Differential Equations II",
  },
  {
    year: "৩য় বর্ষ",
    code: "MAT 304",
    name: "Abstract Algebra I : Theory of Groups",
  },
  {
    year: "৩য় বর্ষ",
    code: "MAT 305",
    name: "Fundamentals of Topology",
  },
  {
    year: "৩য় বর্ষ",
    code: "MAT 306",
    name: "Numerical Analysis II",
  },
  {
    year: "৩য় বর্ষ",
    code: "MAT 307",
    name: "Mathematical Methods",
  },
  {
    year: "৩য় বর্ষ",
    code: "MAT 308",
    name: "Optimizations",
  },
  {
    year: "৩য় বর্ষ",
    code: "MAT 309",
    name: "Discrete Mathematics",
  },
  {
    year: "৩য় বর্ষ",
    code: "MAT 350",
    name: "Math Lab III (FORTRAN)",
  },
  {
    year: "৩য় বর্ষ",
    code: "MAT 399",
    name: "Viva Voce",
  },

  // ==================== Fourth Year ====================
  {
    year: "৪র্থ বর্ষ",
    code: "MAT 401",
    name: "Introduction to Functional Analysis",
  },
  {
    year: "৪র্থ বর্ষ",
    code: "MAT 402",
    name: "Partial Differential Equations",
  },
  {
    year: "৪র্থ বর্ষ",
    code: "MAT 403",
    name: "Differential Geometry and Tensor Calculus",
  },
  {
    year: "৪র্থ বর্ষ",
    code: "MAT 404",
    name: "Abstract Algebra II : Theory of Rings and Modules",
  },
  {
    year: "৪র্থ বর্ষ",
    code: "MAT 405",
    name: "Mechanics",
  },
  {
    year: "৪র্থ বর্ষ",
    code: "MAT 406",
    name: "Hydrodynamics",
  },
  {
    year: "৪র্থ বর্ষ",
    code: "MAT 407",
    name: "Introduction to Number Theory",
  },
  {
    year: "৪র্থ বর্ষ",
    code: "MAT 408",
    name: "Fuzzy Mathematics (Optional)",
  },
  {
    year: "৪র্থ বর্ষ",
    code: "MAT 409",
    name: "Population Dynamics (Optional)",
  },
  {
    year: "৪র্থ বর্ষ",
    code: "MAT 410",
    name: "Lattice Theory (Optional)",
  },
  {
    year: "৪র্থ বর্ষ",
    code: "MTH 411",
    name: "Difference Equations (Optional)",
  },
  {
    year: "৪র্থ বর্ষ",
    code: "MAT 412",
    name: "Introduction to Actuarial Mathematics (Optional)",
  },
  {
    year: "৪র্থ বর্ষ",
    code: "MAT 450",
    name: "Math Lab IV",
  },
  {
    year: "৪র্থ বর্ষ",
    code: "MAT 499",
    name: "Viva-voce",
  },
];

// =====================================================
// Subject ordering
// =====================================================

const SUBJECT_ORDER_MAP = new Map(
  SUBJECT_OPTIONS.map((sub, index) => [sub.code, index])
);

// =====================================================
// Today's date
// =====================================================

function todayStr() {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

// =====================================================
// Results Tab
// =====================================================

export default function ResultsTab({
  sessionId,
  lockedTeacherId,
}: Props) {
  const confirm = useConfirm();

  // ===================================================
  // State
  // ===================================================

  const [exams, setExams] = useState<Exam[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Year & Subject
  const [selectedYear, setSelectedYear] = useState("১ম বর্ষ");
  const [selectedSubject, setSelectedSubject] = useState(
    SUBJECT_OPTIONS[0].code
  );

  // Exam information
  const [inCourseType, setInCourseType] =
    useState<"1st" | "2nd">("1st");

  const [totalMarks, setTotalMarks] = useState(25);
  const [date, setDate] = useState(todayStr());

  const [teacherId, setTeacherId] = useState(
    lockedTeacherId || ""
  );

  const [creating, setCreating] = useState(false);

  // Marks
  const [openExamId, setOpenExamId] =
    useState<string | null>(null);

  const [marks, setMarks] =
    useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [statusMsg, setStatusMsg] = useState("");

  // ===================================================
  // Filter subjects according to selected year
  // ===================================================

  const filteredSubjects = useMemo(() => {
    return SUBJECT_OPTIONS.filter(
      (sub) => sub.year === selectedYear
    );
  }, [selectedYear]);

  // ===================================================
  // Change year
  // ===================================================

  const handleYearChange = (year: string) => {
    setSelectedYear(year);

    const firstSubOfSelectedYear =
      SUBJECT_OPTIONS.find(
        (sub) => sub.year === year
      );

    if (firstSubOfSelectedYear) {
      setSelectedSubject(
        firstSubOfSelectedYear.code
      );
    }
  };

  // ===================================================
  // Load all data
  // ===================================================

  async function loadAll() {
    setLoading(true);
    setLoadError("");

    try {
      const [ex, tch, studs] = await Promise.all([
        getExams(sessionId),
        getTeachers(sessionId),
        getStudents(sessionId),
      ]);

      // Teacher locked থাকলে শুধু সেই teacher-এর exam
      let filteredExams = lockedTeacherId
        ? ex.filter(
            (e) => e.teacherId === lockedTeacherId
          )
        : ex;

      // =================================================
      // Subject order অনুযায়ী exam sort
      // =================================================

      filteredExams.sort((a, b) => {
        const getOrder = (title: string) => {
          for (const [code] of SUBJECT_ORDER_MAP) {
            if (title.includes(code)) {
              return SUBJECT_ORDER_MAP.get(code) ?? 999;
            }
          }

          return 999;
        };

        return (
          getOrder(a.title) -
          getOrder(b.title)
        );
      });

      setExams(filteredExams);
      setTeachers(tch);

      // Student serial অনুযায়ী sort
      setStudents(
        [...studs].sort((a, b) => a.sl - b.sl)
      );

      // প্রথম teacher automatically select
      if (
        !lockedTeacherId &&
        tch.length > 0 &&
        !teacherId
      ) {
        setTeacherId(tch[0].id);
      }
    } catch (err) {
      console.error(err);

      setLoadError(
        "তালিকা লোড করা যায়নি। ইন্টারনেট চেক করে আবার চেষ্টা করুন।"
      );
    } finally {
      setLoading(false);
    }
  }

  // ===================================================
  // Initial load
  // ===================================================

  useEffect(() => {
    loadAll();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, lockedTeacherId]);

  // ===================================================
  // Create Exam
  // ===================================================

  async function handleCreateExam(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (
      !selectedSubject ||
      !teacherId ||
      totalMarks <= 0
    ) {
      return;
    }

    setCreating(true);

    try {
      const subObj = SUBJECT_OPTIONS.find(
        (s) => s.code === selectedSubject
      );

      const subName = subObj
        ? `${subObj.code} - ${subObj.name}`
        : selectedSubject;

      // ইনকোর্সের ধরণ + subject
      const formattedTitle = `${
        inCourseType === "1st"
          ? "১ম ইনকোর্স"
          : "২য় ইনকোর্স"
      } — ${subName}`;

      const exam = await createExam(
        sessionId,
        teacherId,
        formattedTitle,
        totalMarks,
        date
      );

      await loadAll();

      await openExam(exam.id);
    } catch (err) {
      console.error(err);
      setStatusMsg(
        "পরীক্ষা তৈরি করতে সমস্যা হয়েছে।"
      );
    } finally {
      setCreating(false);
    }
  }

  // ===================================================
  // Open Exam
  // ===================================================

  async function openExam(examId: string) {
    setOpenExamId(examId);
    setStatusMsg("");

    try {
      const existing = await getExamResults(
        sessionId,
        examId
      );

      const asStrings: Record<string, string> = {};

      Object.entries(existing).forEach(
        ([sid, m]) => {
          asStrings[sid] = String(m);
        }
      );

      setMarks(asStrings);
    } catch (err) {
      console.error(err);

      setStatusMsg(
        "আগের নম্বর লোড করতে সমস্যা হয়েছে।"
      );
    }
  }

  // ===================================================
  // Save Draft
  // ===================================================

  async function handleSaveDraft() {
    if (!openExamId) return;

    setSaving(true);

    try {
      const numeric: Record<string, number> = {};

      Object.entries(marks).forEach(
        ([sid, value]) => {
          const n = parseFloat(value);

          if (!isNaN(n)) {
            numeric[sid] = n;
          }
        }
      );

      await saveExamResults(
        sessionId,
        openExamId,
        numeric
      );

      setStatusMsg(
        "নম্বর সেভ হয়েছে এবং স্টুডেন্ট ড্যাশবোর্ডে আপডেট হয়েছে।"
      );

      await loadAll();
    } catch (err) {
      console.error(err);

      setStatusMsg(
        "নম্বর সেভ করতে সমস্যা হয়েছে।"
      );
    } finally {
      setSaving(false);
    }
  }

  // ===================================================
  // Publish Results
  // ===================================================

  async function handlePublish() {
    if (!openExamId) return;

    const exam = exams.find(
      (e) => e.id === openExamId
    );

    const ok = await confirm({
      message: exam?.published
        ? "এই পরীক্ষার ফলাফল আগেই প্রকাশিত হয়েছে। আবার প্রকাশ করলে সংশোধিত নম্বর যাবে। এগোতে চান?"
        : "ফলাফল প্রকাশ করলে স্টুডেন্টরা তাদের প্যানেলে দেখতে পাবে। এগোতে চান?",

      confirmLabel: "প্রকাশ করুন",
    });

    if (!ok) return;

    setPublishing(true);
    setStatusMsg("");

    try {
      // আগে marks save
      await handleSaveDraft();

      // তারপর publish
      const result = await publishExamResults(
        sessionId,
        openExamId
      );

      setStatusMsg(
        `✅ ${result.published} জনের ফলাফল সফলভাবে প্রকাশিত হয়েছে।`
      );

      await loadAll();
    } catch (err: unknown) {
      console.error(err);

      setStatusMsg(
        "⚠️ প্রকাশ করতে সমস্যা হয়েছে। কনসোলে বিস্তারিত দেখুন।"
      );
    } finally {
      setPublishing(false);
    }
  }

  // ===================================================
  // Delete Exam
  // ===================================================

  async function handleDeleteExam(
    examId: string
  ) {
    const ok = await confirm({
      message:
        "এই পরীক্ষা ও এর সব নম্বর মুছে ফেলা হবে। নিশ্চিত?",

      danger: true,
      confirmLabel: "মুছুন",
    });

    if (!ok) return;

    try {
      await deleteExam(
        sessionId,
        examId
      );

      if (openExamId === examId) {
        setOpenExamId(null);
        setMarks({});
      }

      await loadAll();
    } catch (err) {
      console.error(err);

      setStatusMsg(
        "পরীক্ষা মুছতে সমস্যা হয়েছে।"
      );
    }
  }

  // ===================================================
  // Maps / Current exam
  // ===================================================

  const teacherMap = new Map(
    teachers.map((t) => [t.id, t.name])
  );

  const openExam2 = exams.find(
    (e) => e.id === openExamId
  );

  // ===================================================
  // Loading / Error
  // ===================================================

  if (loading) {
    return (
      <p className="text-sm text-slate-500">
        লোড হচ্ছে...
      </p>
    );
  }

  if (loadError) {
    return (
      <p className="text-sm text-red-500">
        {loadError}
      </p>
    );
  }

  // ===================================================
  // UI
  // ===================================================

  return (
    <div className="space-y-6">

      {/* =================================================
          CREATE EXAM FORM
      ================================================= */}

      <form
        onSubmit={handleCreateExam}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm"
      >

        {/* ইনকোর্স */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            ইনকোর্সের ধরণ
          </label>

          <select
            value={inCourseType}
            onChange={(e) =>
              setInCourseType(
                e.target.value as "1st" | "2nd"
              )
            }
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
          >
            <option value="1st">
              ১ম ইনকোর্স
            </option>

            <option value="2nd">
              ২য় ইনকোর্স
            </option>
          </select>
        </div>

        {/* =================================================
            YEAR
        ================================================= */}

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            বর্ষ
          </label>

          <select
            value={selectedYear}
            onChange={(e) =>
              handleYearChange(e.target.value)
            }
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
          >
            <option value="১ম বর্ষ">
              ১ম বর্ষ
            </option>

            <option value="২য় বর্ষ">
              ২য় বর্ষ
            </option>

            <option value="৩য় বর্ষ">
              ৩য় বর্ষ
            </option>

            <option value="৪র্থ বর্ষ">
              ৪র্থ বর্ষ
            </option>
          </select>
        </div>

        {/* =================================================
            SUBJECT
        ================================================= */}

        <div className="flex-1 min-w-[14rem]">
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            সাবজেক্ট কোড ও নাম
          </label>

          <select
            value={selectedSubject}
            onChange={(e) =>
              setSelectedSubject(e.target.value)
            }
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
          >

            {/* 
              IMPORTANT:
              এখানে সরাসরি filteredSubjects.map()
              ব্যবহার করা হয়েছে।
            */}

            {filteredSubjects.map((sub) => (
              <option
                key={sub.code}
                value={sub.code}
              >
                {sub.code} — {sub.name}
              </option>
            ))}

          </select>
        </div>

        {/* =================================================
            TEACHER
        ================================================= */}

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            শিক্ষক
          </label>

          {lockedTeacherId ? (
            <input
              disabled
              value={
                teachers.find(
                  (t) =>
                    t.id === lockedTeacherId
                )?.name || ""
              }
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 px-3 py-2 text-sm text-slate-600 dark:text-slate-400"
            />
          ) : (
            <select
              value={teacherId}
              onChange={(e) =>
                setTeacherId(e.target.value)
              }
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
            >
              {teachers.map((t) => (
                <option
                  key={t.id}
                  value={t.id}
                >
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* =================================================
            TOTAL MARKS
        ================================================= */}

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            পূর্ণমান
          </label>

          <input
            type="number"
            min={1}
            value={totalMarks}
            onChange={(e) =>
              setTotalMarks(
                Number(e.target.value)
              )
            }
            className="w-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
          />
        </div>

        {/* =================================================
            DATE
        ================================================= */}

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            তারিখ
          </label>

          <input
            type="date"
            value={date}
            onChange={(e) =>
              setDate(e.target.value)
            }
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
          />
        </div>

        {/* =================================================
            CREATE BUTTON
        ================================================= */}

        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-slate-900 dark:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {creating
            ? "তৈরি হচ্ছে..."
            : "নতুন পরীক্ষা যোগ করুন"}
        </button>
      </form>

      {/* =================================================
          MARKS INPUT PANEL
      ================================================= */}

      {openExamId && openExam2 && (
        <div className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">

          <div className="mb-3 flex items-center justify-between">

            <h4 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {openExam2.title} — নম্বর প্রদান
              {" "}
              (পূর্ণমান {openExam2.totalMarks})
            </h4>

            {openExam2.published && (
              <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                প্রকাশিত
              </span>
            )}

          </div>

          {/* Student list */}

          <div className="max-h-96 overflow-y-auto rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">

            {students.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-3 py-2 text-sm last:border-b-0"
              >

                <span className="font-data w-6 text-slate-400">
                  {s.sl}
                </span>

                <span className="font-data w-28 shrink-0 text-slate-500">
                  {s.reg}
                </span>

                <span className="flex-1 text-slate-800 dark:text-slate-100 font-medium">
                  {s.name}
                </span>

                <input
                  type="number"
                  min={0}
                  max={openExam2.totalMarks}
                  value={marks[s.id] ?? ""}
                  onChange={(e) =>
                    setMarks({
                      ...marks,
                      [s.id]: e.target.value,
                    })
                  }
                  placeholder="—"
                  className="font-data w-20 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-center text-slate-900 dark:text-slate-100"
                />

              </div>
            ))}

          </div>

          {/* Status */}

          {statusMsg && (
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              {statusMsg}
            </p>
          )}

          {/* Buttons */}

          <div className="mt-3 flex flex-wrap gap-2">

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              {saving
                ? "সেভ হচ্ছে..."
                : "খসড়া সেভ করুন"}
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className="rounded-lg bg-slate-900 dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {publishing
                ? "প্রকাশ হচ্ছে..."
                : openExam2.published
                ? "সংশোধন প্রকাশ করুন"
                : "ফলাফল প্রকাশ করুন"}
            </button>

            <button
              type="button"
              onClick={() => {
                setOpenExamId(null);
                setMarks({});
                setStatusMsg("");
              }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
            >
              বন্ধ করুন
            </button>

          </div>
        </div>
      )}

      {/* =================================================
          EXAM LIST
      ================================================= */}

      <div>

        <h3 className="mb-2 font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          পরীক্ষার তালিকা ({exams.length})
        </h3>

        <div className="divide-y divide-slate-200 dark:divide-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">

          {exams.map((ex) => (
            <div
              key={ex.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >

              <div>

                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {ex.title}
                </span>

                <span className="ml-2 font-data text-slate-500">
                  {teacherMap.get(ex.teacherId) ||
                    "—"}{" "}
                  · {ex.date} · পূর্ণমান:{" "}
                  {ex.totalMarks}
                </span>

                {ex.published && (
                  <span className="ml-2 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                    প্রকাশিত
                  </span>
                )}

              </div>

              <div className="flex items-center gap-3">

                <button
                  type="button"
                  onClick={() =>
                    openExam(ex.id)
                  }
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline"
                >
                  নম্বর দিন / দেখুন
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDeleteExam(ex.id)
                  }
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  মুছুন
                </button>

              </div>

            </div>
          ))}

          {exams.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
              এখনো কোনো পরীক্ষা যোগ করা হয়নি।
            </p>
          )}

        </div>
      </div>
    </div>
  );
}