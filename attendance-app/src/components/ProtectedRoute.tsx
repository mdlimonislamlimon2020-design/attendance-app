import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-2 text-navy/60 dark:text-slate-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-teal" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-teal [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-teal [animation-delay:300ms]" />
        <span className="ml-2 text-sm">লোড হচ্ছে...</span>
      </div>
    </div>
  );
}

export function RequireStudent({ children }: { children: ReactNode }) {
  const { firebaseUser, student, loading } = useAuth();
  if (loading) return <Loading />;
  if (!firebaseUser || !student) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RequireTeacher({ children }: { children: ReactNode }) {
  const { firebaseUser, teacher, loading } = useAuth();
  if (loading) return <Loading />;
  if (!firebaseUser || !teacher) return <Navigate to="/teacher/login" replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { firebaseUser, isAdminUser, loading } = useAuth();
  if (loading) return <Loading />;
  if (!firebaseUser || !isAdminUser)
    return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
