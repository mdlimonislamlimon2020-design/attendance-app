import {
  ref,
  get,
  set,
  push,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";
import { db, teacherPhoneToPseudoEmail, createUserWithoutSigningIn, functions } from "../firebase";
import { httpsCallable } from "firebase/functions";
import type {
  Session,
  Student,
  StudentPrivate,
  Teacher,
  TeacherPrivate,
  TeacherAuthMapEntry,
  ClassSession,
  Notice,
  Holiday,
  Exam,
  PublishedResult,
  StudentAuthMapEntry,
} from "../types";

// ---------- Sessions ----------
export async function getSessions(): Promise<Session[]> {
  const snap = await get(ref(db, "sessions"));
  if (!snap.exists()) return [];
  const val = snap.val();
  return Object.values(val) as Session[];
}

export async function createSession(
  session: Omit<Session, "id" | "createdAt">
): Promise<string> {
  const newRef = push(ref(db, "sessions"));
  const id = newRef.key as string;
  await set(newRef, { ...session, id, createdAt: Date.now() });
  return id;
}

export async function updateSession(
  sessionId: string,
  fields: Omit<Session, "id" | "createdAt">
): Promise<void> {
  await update(ref(db, `sessions/${sessionId}`), fields);
}

// Admin: hide/show a session from the active dropdowns (signup, students,
// teachers, classes, notices, reports) without deleting any of its data.
// Useful once a batch/year is over, to keep the working list short.
export async function archiveSession(
  sessionId: string,
  archived: boolean
): Promise<void> {
  await update(ref(db, `sessions/${sessionId}`), { archived });
}

// Admin: permanently delete a session and everything under it — students,
// their private records, teachers, classes, attendance, notices, and any
// studentAuthMap entries pointing at students in this session. This cannot
// be undone.
export async function deleteSessionCascade(sessionId: string): Promise<void> {
  const [studentsPrivSnap, teachersSnap] = await Promise.all([
    get(ref(db, `studentsPrivate/${sessionId}`)),
    get(query(ref(db, "teachers"), orderByChild("sessionId"), equalTo(sessionId))),
  ]);

  const updates: Record<string, unknown> = {};

  updates[`sessions/${sessionId}`] = null;
  updates[`students/${sessionId}`] = null;
  updates[`studentsPrivate/${sessionId}`] = null;
  updates[`classes/${sessionId}`] = null;
  updates[`attendance/${sessionId}`] = null;
  updates[`notices/${sessionId}`] = null;
  updates[`sessionCRs/${sessionId}`] = null;
  updates[`exams/${sessionId}`] = null;
  updates[`examResults/${sessionId}`] = null;
  updates[`publishedResults/${sessionId}`] = null;

  if (studentsPrivSnap.exists()) {
    const privMap = studentsPrivSnap.val() as Record<string, StudentPrivate>;
    Object.values(privMap).forEach((p) => {
      if (p?.uid) updates[`studentAuthMap/${p.uid}`] = null;
    });
  }

  if (teachersSnap.exists()) {
    const sessionTeachers = Object.entries(teachersSnap.val() as Record<string, Teacher>);
    const teacherPrivPromises = sessionTeachers.map(([teacherId]) =>
      get(ref(db, `teachersPrivate/${teacherId}`))
    );
    const teacherPrivSnaps = await Promise.all(teacherPrivPromises);

    sessionTeachers.forEach(([teacherId], index) => {
      updates[`teachers/${teacherId}`] = null;
      updates[`teachersPrivate/${teacherId}`] = null;

      const privSnap = teacherPrivSnaps[index];
      if (privSnap.exists()) {
        const uid = (privSnap.val() as TeacherPrivate)?.uid;
        if (uid) updates[`teacherAuthMap/${uid}`] = null;
      }
    });
  }

  // Single Multi-path update-এর বদলে আলাদা আলাদা মুছে ফেলা (DEBUGGING)
  console.log("Deleting nodes one by one to find the issue...");
  for (const [path, value] of Object.entries(updates)) {
    try {
      await update(ref(db), { [path]: value });
      console.log(`✅ Successfully deleted: ${path}`);
    } catch (err) {
      console.error(`❌ FAILED at path: ${path}`, err);
    }
  }
}
// ---------- Students ----------
export async function getStudents(sessionId: string): Promise<Student[]> {
  const snap = await get(ref(db, `students/${sessionId}`));
  if (!snap.exists()) return [];
  const val = snap.val();
  return Object.values(val) as Student[];
}

export async function getStudent(
  sessionId: string,
  studentId: string
): Promise<Student | null> {
  const snap = await get(ref(db, `students/${sessionId}/${studentId}`));
  return snap.exists() ? (snap.val() as Student) : null;
}

export async function findStudentByReg(
  sessionId: string,
  reg: string
): Promise<Student | null> {
  // student id === reg number, so this is a direct lookup
  return getStudent(sessionId, reg);
}

export async function bulkImportStudents(
  sessionId: string,
  students: { sl: number; reg: string; name: string }[]
): Promise<void> {
  const updates: Record<string, unknown> = {};
  students.forEach((s) => {
    const student: Student = {
      id: s.reg,
      sl: s.sl,
      reg: s.reg,
      name: s.name,
      sessionId,
      signedUp: false,
      isCR: false,
    };
    updates[`students/${sessionId}/${s.reg}`] = student;
  });
  await update(ref(db), updates);
}

export async function completeStudentSignup(
  sessionId: string,
  studentId: string,
  phone: string,
  uid: string,
  extra: { email: string; bloodGroup: string; guardianPhone: string }
): Promise<void> {
  const updates: Record<string, unknown> = {};
  // phone + uid go in the private node — only admins can read this back.
  const priv: StudentPrivate = {
    phone,
    uid,
    email: extra.email,
    bloodGroup: extra.bloodGroup,
    guardianPhone: extra.guardianPhone,
  };
  updates[`studentsPrivate/${sessionId}/${studentId}`] = priv;
  updates[`students/${sessionId}/${studentId}/signedUp`] = true;
  updates[`students/${sessionId}/${studentId}/signedUpAt`] = Date.now();
  const authMapEntry: StudentAuthMapEntry = { sessionId, studentId };
  updates[`studentAuthMap/${uid}`] = authMapEntry;
  await update(ref(db), updates);
}

// Admin: the most recently signed-up students across a session, so admin/CR
// can glance for anything that looks off (e.g. a name they don't recognize
// signing up) and reset it if needed — a lightweight safety net instead of
// a blocking verification step.
export async function getRecentSignups(
  sessionId: string,
  limit = 15
): Promise<Student[]> {
  const students = await getStudents(sessionId);
  return students
    .filter((s) => s.signedUp)
    .sort((a, b) => (b.signedUpAt || 0) - (a.signedUpAt || 0))
    .slice(0, limit);
}

// Admin-only: fetch phone numbers for a whole session's roster in one read.
export async function getStudentsPrivateMap(
  sessionId: string
): Promise<Record<string, StudentPrivate>> {
  const snap = await get(ref(db, `studentsPrivate/${sessionId}`));
  if (!snap.exists()) return {};
  return snap.val();
}

// CR status is stored in two places: the public "isCR" flag (for display),
// and a sessionCRs/{sessionId}/{uid} lookup (for a simple, reliable
// security-rule check when a CR posts a notice). If the student hasn't
// signed up yet (no uid on record), only the display flag is set — once
// they sign up, toggle CR off/on again here to sync sessionCRs.
export async function setStudentCR(
  sessionId: string,
  studentId: string,
  isCR: boolean
): Promise<void> {
  const priv = await get(ref(db, `studentsPrivate/${sessionId}/${studentId}`));
  const updates: Record<string, unknown> = {};
  updates[`students/${sessionId}/${studentId}/isCR`] = isCR;
  if (priv.exists()) {
    const uid = (priv.val() as StudentPrivate).uid;
    if (uid) {
      updates[`sessionCRs/${sessionId}/${uid}`] = isCR ? true : null;
    }
  }
  await update(ref(db), updates);
}

// Admin: undo a student's signup so they can register again (e.g. forgot
// password, or lost access to their old phone number). This clears our own
// records; the old Firebase Auth account is left orphaned and unusable once
// its pseudo-email is detached — admin should also delete it from
// Authentication > Users in the Firebase console (see SETUP.md).
export async function resetStudentSignup(
  sessionId: string,
  studentId: string
): Promise<void> {
  const priv = await get(ref(db, `studentsPrivate/${sessionId}/${studentId}`));
  const updates: Record<string, unknown> = {};
  updates[`studentsPrivate/${sessionId}/${studentId}`] = null;
  updates[`students/${sessionId}/${studentId}/signedUp`] = false;
  if (priv.exists()) {
    const oldUid = (priv.val() as StudentPrivate).uid;
    if (oldUid) updates[`studentAuthMap/${oldUid}`] = null;
  }
  await update(ref(db), updates);
}

export async function updateStudentName(
  sessionId: string,
  studentId: string,
  name: string
): Promise<void> {
  await update(ref(db, `students/${sessionId}/${studentId}`), { name });
}

// Admin: remove a student from the roster entirely (public + private
// records and their auth map entry). Past attendance rows referencing this
// student id are left as-is — harmless orphaned entries, not shown anywhere
// once the student record is gone.
export async function removeStudent(
  sessionId: string,
  studentId: string
): Promise<void> {
  const priv = await get(ref(db, `studentsPrivate/${sessionId}/${studentId}`));
  const updates: Record<string, unknown> = {};
  updates[`students/${sessionId}/${studentId}`] = null;
  updates[`studentsPrivate/${sessionId}/${studentId}`] = null;
  if (priv.exists()) {
    const oldUid = (priv.val() as StudentPrivate).uid;
    if (oldUid) updates[`studentAuthMap/${oldUid}`] = null;
  }
  await update(ref(db), updates);
}

export async function getStudentAuthMap(
  uid: string
): Promise<StudentAuthMapEntry | null> {
  const snap = await get(ref(db, `studentAuthMap/${uid}`));
  return snap.exists() ? (snap.val() as StudentAuthMapEntry) : null;
}

// ---------- Admins ----------
export async function isAdmin(uid: string): Promise<boolean> {
  const snap = await get(ref(db, `admins/${uid}`));
  return snap.exists() && snap.val() === true;
}

// ---------- Teachers ----------
export async function getTeachers(sessionId: string): Promise<Teacher[]> {
  const snap = await get(
    query(ref(db, "teachers"), orderByChild("sessionId"))
  );
  if (!snap.exists()) return [];
  const all = Object.values(snap.val()) as Teacher[];
  return all.filter((t) => t.sessionId === sessionId);
}

export async function addTeacher(
  sessionId: string,
  name: string
): Promise<string> {
  const newRef = push(ref(db, "teachers"));
  const id = newRef.key as string;
  const teacher: Teacher = { id, name, sessionId, createdAt: Date.now() };
  await set(newRef, teacher);
  return id;
}

export async function deleteTeacher(id: string): Promise<void> {
  const priv = await get(ref(db, `teachersPrivate/${id}`));
  const updates: Record<string, unknown> = {};
  updates[`teachers/${id}`] = null;
  updates[`teachersPrivate/${id}`] = null;
  if (priv.exists()) {
    const uid = (priv.val() as TeacherPrivate).uid;
    if (uid) updates[`teacherAuthMap/${uid}`] = null;
  }
  await update(ref(db), updates);
}

export async function updateTeacherName(
  id: string,
  name: string
): Promise<void> {
  await update(ref(db, `teachers/${id}`), { name });
}

// ---------- Teacher login credentials ----------
// Unlike students (who self-register), teachers are few in number, so admin
// sets their phone+password directly. A secondary Firebase app instance is
// used under the hood so this doesn't sign the admin out of their own session.
export async function setTeacherCredentials(
  sessionId: string,
  teacherId: string,
  phone: string,
  password: string
): Promise<void> {
  const cleanedPhone = phone.replace(/[^0-9]/g, "");
  const email = teacherPhoneToPseudoEmail(cleanedPhone);
  const uid = await createUserWithoutSigningIn(email, password);
  const updates: Record<string, unknown> = {};
  const priv: TeacherPrivate = { phone: cleanedPhone, uid };
  updates[`teachersPrivate/${teacherId}`] = priv;
  const authMapEntry: TeacherAuthMapEntry = { sessionId, teacherId };
  updates[`teacherAuthMap/${uid}`] = authMapEntry;
  await update(ref(db), updates);
}

// Admin: clear a teacher's login so setTeacherCredentials can be called again
// with a new phone/password. Like resetStudentSignup, the old Firebase Auth
// account is left orphaned — delete it from the console first if the same
// phone number needs to be reused.
export async function resetTeacherCredentials(teacherId: string): Promise<void> {
  const priv = await get(ref(db, `teachersPrivate/${teacherId}`));
  const updates: Record<string, unknown> = {};
  updates[`teachersPrivate/${teacherId}`] = null;
  if (priv.exists()) {
    const oldUid = (priv.val() as TeacherPrivate).uid;
    if (oldUid) updates[`teacherAuthMap/${oldUid}`] = null;
  }
  await update(ref(db), updates);
}

export async function getTeachersPrivateMap(
  sessionId: string
): Promise<Record<string, TeacherPrivate>> {
  const teachers = await getTeachers(sessionId);
  const snap = await get(ref(db, "teachersPrivate"));
  if (!snap.exists()) return {};
  const all = snap.val() as Record<string, TeacherPrivate>;
  const result: Record<string, TeacherPrivate> = {};
  teachers.forEach((t) => {
    if (all[t.id]) result[t.id] = all[t.id];
  });
  return result;
}

export async function getTeacherAuthMap(
  uid: string
): Promise<TeacherAuthMapEntry | null> {
  const snap = await get(ref(db, `teacherAuthMap/${uid}`));
  return snap.exists() ? (snap.val() as TeacherAuthMapEntry) : null;
}

export async function getTeacher(teacherId: string): Promise<Teacher | null> {
  const snap = await get(ref(db, `teachers/${teacherId}`));
  return snap.exists() ? (snap.val() as Teacher) : null;
}

// ---------- Classes ----------
export async function getClasses(sessionId: string): Promise<ClassSession[]> {
  const snap = await get(ref(db, `classes/${sessionId}`));
  if (!snap.exists()) return [];
  const all = Object.values(snap.val()) as ClassSession[];
  return all.sort((a, b) => a.serialNo - b.serialNo);
}

export async function createClass(
  sessionId: string,
  teacherId: string,
  date: string,
  note?: string
): Promise<ClassSession> {
  const existing = await getClasses(sessionId);
  const serialNo = existing.length + 1;
  const newRef = push(ref(db, `classes/${sessionId}`));
  const id = newRef.key as string;
  const cls: ClassSession = {
    id,
    sessionId,
    teacherId,
    date,
    serialNo,
    note: note || "",
    createdAt: Date.now(),
  };
  await set(newRef, cls);
  return cls;
}

export async function deleteClass(
  sessionId: string,
  classId: string
): Promise<void> {
  const updates: Record<string, unknown> = {};
  updates[`classes/${sessionId}/${classId}`] = null;
  updates[`attendance/${sessionId}/${classId}`] = null;
  await update(ref(db), updates);
}

// Edit a class's date/teacher/note without touching its attendance records
// or its serial number.
export async function updateClassMeta(
  sessionId: string,
  classId: string,
  fields: { teacherId: string; date: string; note?: string }
): Promise<void> {
  await update(ref(db, `classes/${sessionId}/${classId}`), fields);
}

// ---------- Attendance ----------
export async function getAttendanceForSession(
  sessionId: string
): Promise<Record<string, Record<string, boolean>>> {
  const snap = await get(ref(db, `attendance/${sessionId}`));
  if (!snap.exists()) return {};
  return snap.val();
}

export async function saveAttendance(
  sessionId: string,
  classId: string,
  presentStudentIds: string[]
): Promise<void> {
  const updates: Record<string, unknown> = {};
  // clear existing then write present-only sparse map
  updates[`attendance/${sessionId}/${classId}`] = null;
  await update(ref(db), updates);
  const presentMap: Record<string, boolean> = {};
  presentStudentIds.forEach((id) => (presentMap[id] = true));
  await set(ref(db, `attendance/${sessionId}/${classId}`), presentMap);
}

// ---------- Notices ----------
export async function getNotices(sessionId: string): Promise<Notice[]> {
  const snap = await get(ref(db, `notices/${sessionId}`));
  if (!snap.exists()) return [];
  const all = Object.values(snap.val()) as Notice[];
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addNotice(
  sessionId: string,
  title: string,
  body: string,
  postedByName: string
): Promise<void> {
  const newRef = push(ref(db, `notices/${sessionId}`));
  const id = newRef.key as string;
  const notice: Notice = {
    id,
    sessionId,
    title,
    body,
    postedByName,
    createdAt: Date.now(),
  };
  await set(newRef, notice);
}

export async function deleteNotice(
  sessionId: string,
  noticeId: string
): Promise<void> {
  await remove(ref(db, `notices/${sessionId}/${noticeId}`));
}

// ---------- Holidays (institute-wide, not tied to a session) ----------
export async function getHolidays(): Promise<Holiday[]> {
  const snap = await get(ref(db, "holidays"));
  if (!snap.exists()) return [];
  const all = Object.values(snap.val()) as Holiday[];
  return all.sort((a, b) => a.date.localeCompare(b.date));
}

export async function addHoliday(
  date: string,
  title: string,
  note?: string
): Promise<void> {
  const newRef = push(ref(db, "holidays"));
  const id = newRef.key as string;
  const holiday: Holiday = { id, date, title, note: note || "", createdAt: Date.now() };
  await set(newRef, holiday);
}

export async function deleteHoliday(id: string): Promise<void> {
  await remove(ref(db, `holidays/${id}`));
}

// ---------- Exams & incourse results ----------
// Draft workflow: create exam -> enter marks (examResults) -> publish
// (Cloud Function copies each student's mark into publishedResults, texts
// their guardian, and flips exam.published = true). Nothing in
// publishedResults is ever written directly by a client.

export async function getExams(sessionId: string): Promise<Exam[]> {
  const snap = await get(ref(db, `exams/${sessionId}`));
  if (!snap.exists()) return [];
  const all = Object.values(snap.val()) as Exam[];
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function createExam(
  sessionId: string,
  teacherId: string,
  title: string,
  totalMarks: number,
  date: string
): Promise<Exam> {
  const newRef = push(ref(db, `exams/${sessionId}`));
  const id = newRef.key as string;
  const exam: Exam = {
    id,
    sessionId,
    teacherId,
    title,
    totalMarks,
    date,
    published: false,
    createdAt: Date.now(),
  };
  await set(newRef, exam);
  return exam;
}

export async function deleteExam(sessionId: string, examId: string): Promise<void> {
  const updates: Record<string, unknown> = {};
  updates[`exams/${sessionId}/${examId}`] = null;
  updates[`examResults/${sessionId}/${examId}`] = null;
  await update(ref(db), updates);
}

export async function getExamResults(
  sessionId: string,
  examId: string
): Promise<Record<string, number>> {
  const snap = await get(ref(db, `examResults/${sessionId}/${examId}`));
  return snap.exists() ? (snap.val() as Record<string, number>) : {};
}

// Saves the whole marks sheet for an exam in one write (sparse — students
// left blank are simply omitted, meaning "not graded / didn't sit exam").
export async function saveExamResults(
  sessionId: string,
  examId: string,
  marks: Record<string, number>
): Promise<void> {
  await set(ref(db, `examResults/${sessionId}/${examId}`), marks);
}

// Calls the Cloud Function that copies draft marks into each student's
// private publishedResults, texts their guardian, and marks the exam
// published. Requires the SMS Cloud Functions to be deployed (see SETUP.md).
export async function publishExamResults(
  sessionId: string,
  examId: string
): Promise<{ published: number; smsSent: number; skipped: number }> {
  const fn = httpsCallable<
    { sessionId: string; examId: string },
    { published: number; smsSent: number; skipped: number }
  >(functions, "publishExamResults");
  const result = await fn({ sessionId, examId });
  return result.data;
}

// Student: their own published results across all exams in their session.
export async function getMyPublishedResults(
  sessionId: string,
  studentId: string
): Promise<Array<PublishedResult & { examId: string }>> {
  try {
    const [exams, pubSnap] = await Promise.all([
      getExams(sessionId),
      get(ref(db, `publishedResults/${sessionId}/${studentId}`))
    ]);

    const pubVal = pubSnap.exists() ? (pubSnap.val() as Record<string, PublishedResult>) : {};
    const results: Array<PublishedResult & { examId: string }> = [];

    for (const exam of exams) {
      const examResults = await getExamResults(sessionId, exam.id);
      
      if (examResults && examResults[studentId] !== undefined) {
        const pubInfo = pubVal[exam.id];
        
        results.push({
          examId: exam.id,
          examTitle: exam.title,
          totalMarks: exam.totalMarks,
          marks: examResults[studentId],
          date: exam.date,
          publishedAt: pubInfo?.publishedAt || Date.now(),
          teacherName: pubInfo?.teacherName || "",
        });
      }
    }

    return results.sort((a, b) => b.publishedAt - a.publishedAt);
  } catch (error) {
    console.error("getMyPublishedResults Error:", error);
    return []; // পারমিশন এরর হলে ফাঁকা অ্যারে রিটার্ন করবে যেন পুরো ড্যাশবোর্ড লোড হওয়া বন্ধ না হয়
  }
}

// ---------- Guardian SMS (Cloud Functions — see /functions) ----------
// These require the Cloud Function to be deployed and a BulkSMSBD account
// configured (see SETUP.md). They throw if functions aren't deployed yet.
interface SendDailyAttendanceSmsResult {
  sent: number;
  skipped: number;
  message?: string;
  batches?: number;
}

export async function sendDailyAttendanceSms(
  sessionId: string,
  date: string
): Promise<SendDailyAttendanceSmsResult> {
  const fn = httpsCallable<{ sessionId: string; date: string }, SendDailyAttendanceSmsResult>(
    functions,
    "sendDailyAttendanceSms"
  );
  const result = await fn({ sessionId, date });
  return result.data;
}

// ---------- Full backup (admin safety net) ----------
// Exports everything the client is actually permitted to read: all
// sessions' public + private student/teacher data, classes, attendance,
// notices, CR flags, and holidays. Login-wiring collections
// (studentAuthMap/teacherAuthMap) and the admins list aren't included —
// Firebase only allows reading those one entry at a time (by uid), not as
// a bulk listing, and they're not meaningful "data" to restore anyway
// (Firebase Auth accounts themselves live outside our database and can't
// be exported via the client SDK regardless).
export async function exportFullBackup(): Promise<Record<string, unknown>> {
  const sessions = await getSessions();
  const backup: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    sessions: {},
    students: {},
    studentsPrivate: {},
    teachers: {},
    teachersPrivate: {},
    classes: {},
    attendance: {},
    notices: {},
    sessionCRs: {},
    exams: {},
    examResults: {},
    publishedResults: {},
    holidays: await getHolidays(),
  };

  for (const session of sessions) {
    (backup.sessions as Record<string, unknown>)[session.id] = session;
    const [
      students,
      studentsPriv,
      teachers,
      teachersPriv,
      classes,
      attendance,
      notices,
      crSnap,
      examsSnap,
      examResultsSnap,
      publishedResultsSnap,
    ] = await Promise.all([
      getStudents(session.id),
      getStudentsPrivateMap(session.id),
      getTeachers(session.id),
      getTeachersPrivateMap(session.id),
      getClasses(session.id),
      getAttendanceForSession(session.id),
      getNotices(session.id),
      get(ref(db, `sessionCRs/${session.id}`)),
      get(ref(db, `exams/${session.id}`)),
      get(ref(db, `examResults/${session.id}`)),
      get(ref(db, `publishedResults/${session.id}`)),
    ]);
    (backup.students as Record<string, unknown>)[session.id] = students;
    (backup.studentsPrivate as Record<string, unknown>)[session.id] = studentsPriv;
    (backup.teachers as Record<string, unknown>)[session.id] = teachers;
    (backup.teachersPrivate as Record<string, unknown>)[session.id] = teachersPriv;
    (backup.classes as Record<string, unknown>)[session.id] = classes;
    (backup.attendance as Record<string, unknown>)[session.id] = attendance;
    (backup.notices as Record<string, unknown>)[session.id] = notices;
    (backup.sessionCRs as Record<string, unknown>)[session.id] = crSnap.exists()
      ? crSnap.val()
      : {};
    (backup.exams as Record<string, unknown>)[session.id] = examsSnap.exists()
      ? examsSnap.val()
      : {};
    (backup.examResults as Record<string, unknown>)[session.id] = examResultsSnap.exists()
      ? examResultsSnap.val()
      : {};
    (backup.publishedResults as Record<string, unknown>)[session.id] =
      publishedResultsSnap.exists() ? publishedResultsSnap.val() : {};
  }

  return backup;
}
