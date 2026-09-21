export interface Session {
  id: string;
  name: string; // e.g. "H3 (22-23)"
  year: string; // e.g. "Honours 3rd Year"
  batch: string; // e.g. "2022-23"
  department: string;
  college: string;
  createdAt: number;
  archived?: boolean;
}

export interface Student {
  id: string; // key = reg number
  sl: number;
  reg: string;
  name: string;
  sessionId: string;
  session?: string;     // এটি যোগ করুন (যেমন: "2022-23")
  role?: string;        // এটি যোগ করুন (যেমন: "student" বা "CR")
  isCR?: boolean;
  signedUp?: boolean;
  signedUpAt?: number;
}

// Only readable by admins + written once at signup time.
// Kept out of the public "students" node so students can't read
// each other's phone numbers via direct database access.
export interface StudentPrivate {
  phone: string;
  uid: string;
  email?: string;
  bloodGroup?: string;
  guardianPhone?: string;
}

export interface Teacher {
  id: string;
  name: string;
  sessionId: string;
  createdAt: number;
}

// Mirrors StudentPrivate — phone/uid kept out of the public "teachers" node.
export interface TeacherPrivate {
  phone: string;
  uid: string;
}

export interface TeacherAuthMapEntry {
  sessionId: string;
  teacherId: string;
}

export interface ClassSession {
  id: string;
  sessionId: string;
  teacherId: string;
  date: string; // yyyy-mm-dd
  serialNo: number; // running class number in the session
  note?: string;
  createdAt: number;
}

// attendance/{sessionId}/{classId}/{studentId} = true  (present only, sparse)
export type AttendanceMap = Record<string, Record<string, boolean>>; // classId -> studentId -> true

export interface Notice {
  id: string;
  sessionId: string;
  title: string;
  body: string;
  postedByName: string;
  createdAt: number;
}

// Institute-wide holiday, visible to every student and teacher regardless
// of session.
export interface Holiday {
  id: string;
  date: string; // yyyy-mm-dd
  title: string;
  note?: string;
  createdAt: number;
}

// Draft exam metadata — visible only to admin and the owning teacher until
// published. examResults/{sessionId}/{examId}/{studentId} = number holds
// the draft marks (sparse — only graded students have an entry).
export interface Exam {
  id: string;
  sessionId: string;
  teacherId: string;
  title: string; // e.g. "১ম ইনকোর্স — ক্যালকুলাস"
  totalMarks: number;
  date: string; // yyyy-mm-dd
  published?: boolean;
  publishedAt?: number;
  createdAt: number;
}

// publishedResults/{sessionId}/{studentId}/{examId} — written only by the
// publishExamResults Cloud Function (Admin SDK), never directly by a
// client. Each student can read only their own.
export interface PublishedResult {
  examTitle: string;
  totalMarks: number;
  marks: number;
  date: string;
  teacherName: string;
  publishedAt: number;
}

export interface StudentAuthMapEntry {
  sessionId: string;
  studentId: string;
}
