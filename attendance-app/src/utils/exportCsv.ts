import type { ClassSession, Student, Teacher } from "../types";

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const content = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
  // BOM so Excel opens Bengali text as UTF-8 instead of guessing wrong
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAttendanceCsv(
  sessionName: string,
  students: Student[],
  classes: ClassSession[],
  teachers: Teacher[],
  attendance: Record<string, Record<string, boolean>>
) {
  const teacherMap = new Map(teachers.map((t) => [t.id, t.name]));
  const sortedStudents = [...students].sort((a, b) => a.sl - b.sl);
  const sortedClasses = [...classes].sort((a, b) => a.serialNo - b.serialNo);

  const header = [
    "SL",
    "Reg",
    "Name",
    ...sortedClasses.map(
      (c) => `#${c.serialNo} ${c.date} (${teacherMap.get(c.teacherId) || "?"})`
    ),
    "Total",
    "Percentage",
  ];

  const rows: (string | number)[][] = [header];

  for (const s of sortedStudents) {
    let attended = 0;
    const cells = sortedClasses.map((c) => {
      const present = !!attendance[c.id]?.[s.id];
      if (present) attended += 1;
      return present ? "P" : "A";
    });
    const pct =
      sortedClasses.length > 0
        ? `${Math.round((attended / sortedClasses.length) * 100)}%`
        : "-";
    rows.push([s.sl, s.reg, s.name, ...cells, attended, pct]);
  }

  const safeSessionName = sessionName.replace(/[^\w\u0980-\u09FF-]+/g, "_");
  downloadCsv(`attendance_${safeSessionName}.csv`, rows);
}
