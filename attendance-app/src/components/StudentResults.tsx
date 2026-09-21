import type { PublishedResult, Student, Session } from "../types";

interface Props {
  results: Array<PublishedResult & { examId: string }>;
  student: Student;
  subTab: "1st" | "2nd";
  sessions?: Session[];
}

export default function StudentResults({ results, student, subTab, sessions }: Props) {
  const handlePrint = () => {
    window.print();
  };

  const stud = student as any;

  // ফিল্টারিং লজিক
  const filteredResults = results.filter((r: any) => {
    const title = (r.examTitle || r.title || "").toLowerCase();
    if (subTab === "1st") {
      return title.includes("১ম") || title.includes("first") || title.includes("1st") || (!title.includes("২য়") && !title.includes("2nd"));
    } else {
      return title.includes("২য়") || title.includes("second") || title.includes("2nd");
    }
  });

  const displayResults = filteredResults.length > 0 ? filteredResults : results;

  const firstItem: any = displayResults[0] || {};
  const examYear = firstItem.year || firstItem.examYear || new Date().getFullYear();
  const sessionName = stud.session || (sessions && sessions[0]?.name) || "2021-2022";
  const subjectName = "Mathematics";

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-result-area, #printable-result-area * {
            visibility: visible;
          }
          #printable-result-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="space-y-4">
        {/* মূল প্রিন্টেবল মার্কশীট */}
        <div 
          id="printable-result-area"
          className="overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md p-6 text-slate-800 dark:text-slate-100"
        >
          {/* অফিশিয়াল হেডার */}
          <div className="text-center pb-4 border-b border-slate-300 dark:border-slate-700 space-y-1.5">
            {/* আসল কলেজ লোগো ইমেজ */}
            <div className="flex justify-center mb-1.5">
              <img 
                
              />
            </div>
            
            <h2 className="font-display text-base font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100">
              Government Titumir College, Dhaka
            </h2>
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Attested, Dhaka Central University.
            </p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 tracking-wider uppercase">
              Department of Mathematics
            </p>
            <h3 className="font-display text-sm font-bold mt-2 text-slate-900 dark:text-slate-100">
              {subTab === "1st" ? "১ম ইনকোর্স পরীক্ষার ফলাফল" : "২য় ইনকোর্স পরীক্ষার ফলাফল"}
            </h3>
          </div>

          {/* শিক্ষার্থীর তথ্য (পাশাপাশি সুন্দরভাবে সাজানো) */}
          <div className="py-4 border-b border-slate-300 dark:border-slate-700 grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6 text-xs bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-lg my-3">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">শিক্ষার্থীর নাম:</span>
              <strong className="font-semibold text-slate-900 dark:text-slate-100">{student.name}</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">রোল / সিরিয়াল:</span>
              <strong className="font-data text-slate-900 dark:text-slate-100">{stud.roll || stud.serial || stud.sl || "—"}</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">রেজিস্ট্রেশন নম্বর:</span>
              <strong className="font-data text-slate-900 dark:text-slate-100">{student.reg || "—"}</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">সেশন (Session):</span>
              <strong className="font-data text-slate-900 dark:text-slate-100">{sessionName}</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">সাবজেক্ট:</span>
              <strong className="font-data text-slate-900 dark:text-slate-100 font-semibold">{subjectName}</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">পরীক্ষার বছর ও Held in:</span>
              <strong className="font-data text-slate-900 dark:text-slate-100">{examYear} {firstItem.heldIn || firstItem.date ? `(${firstItem.heldIn || firstItem.date})` : ""}</strong>
            </div>
          </div>

          {/* ফলাফল টেবিল */}
          <div className="py-2 overflow-x-auto">
            <table className="w-full border-collapse text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-b border-slate-300 dark:border-slate-700 text-center">
                  <th className="p-3 border-r border-slate-300 dark:border-slate-700 w-12 text-center">ক্র.</th>
                  <th className="p-3 border-r border-slate-300 dark:border-slate-700 w-32 text-center">বিষয় কোড</th>
                  <th className="p-3 border-r border-slate-300 dark:border-slate-700 text-center">কোর্স টাইটেল / শিরোনাম</th>
                  <th className="p-3 border-r border-slate-300 dark:border-slate-700 text-center w-20">প্রাপ্ত নম্বর</th>
                  <th className="p-3 text-center w-20">মোট নম্বর</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 dark:divide-slate-700">
                {displayResults.map((item: any, index: number) => {
                  let rawTitle = item.courseTitle || item.title || item.examTitle || "";
                  
                  let cleanTitle = rawTitle
                    .replace(/১ম ইনকোর্স\s*—\s*|২য় ইনকোর্স\s*—\s*|1st In-course\s*—\s*|2nd In-course\s*—\s*|১ম ইনকোর্স|২য় ইনকোর্স/gi, "")
                    .trim();

                  let courseCode = item.courseCode || item.code || "";
                  let courseTitle = cleanTitle;

                  if (!courseCode && cleanTitle.includes("—")) {
                    const parts = cleanTitle.split("—");
                    courseCode = parts[0].trim();
                    courseTitle = parts.slice(1).join("—").trim();
                  } else if (!courseCode && cleanTitle.includes("-")) {
                    const parts = cleanTitle.split("-");
                    if (parts[0].trim().length <= 10) {
                      courseCode = parts[0].trim();
                      courseTitle = parts.slice(1).join("-").trim();
                    }
                  }

                  if (!courseCode) {
                    courseCode = `MATH-310${index + 1}`;
                  }

                  return (
                    <tr key={item.examId || index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 text-center font-data text-slate-600 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700">
                        {String(index + 1).padStart(2, "0")}
                      </td>
                      <td className="p-3 text-center font-data font-semibold text-slate-900 dark:text-slate-100 border-r border-slate-300 dark:border-slate-700">
                        {courseCode}
                      </td>
                      <td className="p-3 text-left font-semibold text-slate-900 dark:text-slate-100 border-r border-slate-300 dark:border-slate-700">
                        {courseTitle || "Advanced Mathematics"}
                      </td>
                      <td className="p-3 text-center font-data font-bold text-slate-900 dark:text-slate-100 border-r border-slate-300 dark:border-slate-700">
                        {item.obtainedMarks ?? item.marks ?? "—"}
                      </td>
                      <td className="p-3 text-center font-data text-slate-800 dark:text-slate-200">
                        {item.totalMarks || "25"}
                      </td>
                    </tr>
                  );
                })}

                {displayResults.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                      এই ইনকোর্সের কোনো ফলাফল প্রকাশিত হয়নি।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ফুটার সিগনেচার (বিভাগীয় প্রধান) */}
          <div className="mt-8 pt-4 border-t border-slate-300 dark:border-slate-700 flex justify-between items-end text-[11px] text-slate-600 dark:text-slate-300">
            <div>
              <p>Printed on: {new Date().toLocaleDateString("en-GB")}</p>
              <p className="mt-1">Department of Mathematics, Government Titumir College</p>
            </div>
            <div className="text-center pt-6">
              <div className="w-32 border-b border-slate-400 dark:border-slate-500 mb-1"></div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">বিভাগীয় প্রধান</p>
              <p className="text-[10px]">গণিত বিভাগ, সরকারি তিতুমীর কলেজ</p>
            </div>
          </div>
        </div>

        {/* প্রিন্ট বাটন */}
        <div className="flex justify-end no-print">
          <button
            onClick={handlePrint}
            className="rounded-lg bg-slate-800 dark:bg-slate-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-900 transition-colors flex items-center gap-2 shadow-sm"
          >
            🖨️ প্রিন্ট / PDF ডাউনলোড করুন
          </button>
        </div>
      </div>
    </>
  );
}