import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { auth } from "../firebase";
import {
  getStudent,
  getStudentAuthMap,
  isAdmin,
  getTeacherAuthMap,
  getTeacher,
} from "../utils/db";
import type { Student, Teacher } from "../types";

interface AuthContextValue {
  firebaseUser: User | null;
  student: Student | null;
  teacher: Teacher | null;
  isAdminUser: boolean;
  loading: boolean;
  refreshStudent: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadProfile(user: User) {
    const adminFlag = await isAdmin(user.uid);
    if (adminFlag) {
      setIsAdminUser(true);
      setStudent(null);
      setTeacher(null);
      return;
    }
    setIsAdminUser(false);

    const studentMapEntry = await getStudentAuthMap(user.uid);
    if (studentMapEntry) {
      const s = await getStudent(studentMapEntry.sessionId, studentMapEntry.studentId);
      setStudent(s);
      setTeacher(null);
      return;
    }
    setStudent(null);

    const teacherMapEntry = await getTeacherAuthMap(user.uid);
    if (teacherMapEntry) {
      const t = await getTeacher(teacherMapEntry.teacherId);
      setTeacher(t);
    } else {
      setTeacher(null);
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setFirebaseUser(user);
      if (user) {
        await loadProfile(user);
      } else {
        setStudent(null);
        setTeacher(null);
        setIsAdminUser(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function refreshStudent() {
    if (firebaseUser) await loadProfile(firebaseUser);
  }

  async function signOut() {
    await fbSignOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{ firebaseUser, student, teacher, isAdminUser, loading, refreshStudent, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
