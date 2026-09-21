import type { ClassSession, Student, Teacher } from "../types";

export interface TeacherBreakdownRow {
  teacherId: string;
  teacherName: string;
  totalClasses: number;
  attendedByStudent: number;
}

export function computeTeacherBreakdown(
  classes: ClassSession[],
  teachers: Teacher[],
  attendance: Record<string, Record<string, boolean>>,
  studentId: string
): TeacherBreakdownRow[] {
  const teacherMap = new Map(teachers.map((t) => [t.id, t.name]));
  const rows = new Map<string, TeacherBreakdownRow>();

  for (const cls of classes) {
    const name = teacherMap.get(cls.teacherId) || "অজানা শিক্ষক";
    if (!rows.has(cls.teacherId)) {
      rows.set(cls.teacherId, {
        teacherId: cls.teacherId,
        teacherName: name,
        totalClasses: 0,
        attendedByStudent: 0,
      });
    }
    const row = rows.get(cls.teacherId)!;
    row.totalClasses += 1;
    if (attendance[cls.id]?.[studentId]) {
      row.attendedByStudent += 1;
    }
  }

  return Array.from(rows.values()).sort(
    (a, b) => b.totalClasses - a.totalClasses
  );
}

export interface LeaderboardRow {
  studentId: string;
  name: string;
  reg: string;
  totalAttended: number;
}

export function computeLeaderboard(
  students: Student[],
  classes: ClassSession[],
  attendance: Record<string, Record<string, boolean>>,
  topN = 10
): LeaderboardRow[] {
  const counts = new Map<string, number>();
  students.forEach((s) => counts.set(s.id, 0));

  for (const cls of classes) {
    const presentMap = attendance[cls.id];
    if (!presentMap) continue;
    for (const studentId of Object.keys(presentMap)) {
      if (presentMap[studentId] && counts.has(studentId)) {
        counts.set(studentId, (counts.get(studentId) || 0) + 1);
      }
    }
  }

  const rows: LeaderboardRow[] = students.map((s) => ({
    studentId: s.id,
    name: s.name,
    reg: s.reg,
    totalAttended: counts.get(s.id) || 0,
  }));

  return rows
    .sort((a, b) => b.totalAttended - a.totalAttended)
    .slice(0, topN);
}

export function computeMyTotalAttendance(
  classes: ClassSession[],
  attendance: Record<string, Record<string, boolean>>,
  studentId: string
): number {
  let count = 0;
  for (const cls of classes) {
    if (attendance[cls.id]?.[studentId]) count += 1;
  }
  return count;
}

export interface DefaulterRow {
  studentId: string;
  name: string;
  reg: string;
  attended: number;
  total: number;
  pct: number;
}

export function computeDefaulters(
  students: Student[],
  classes: ClassSession[],
  attendance: Record<string, Record<string, boolean>>,
  thresholdPct: number
): DefaulterRow[] {
  const total = classes.length;
  if (total === 0) return [];
  const rows: DefaulterRow[] = students.map((s) => {
    const attended = computeMyTotalAttendance(classes, attendance, s.id);
    return {
      studentId: s.id,
      name: s.name,
      reg: s.reg,
      attended,
      total,
      pct: Math.round((attended / total) * 100),
    };
  });
  return rows
    .filter((r) => r.pct < thresholdPct)
    .sort((a, b) => a.pct - b.pct);
}
