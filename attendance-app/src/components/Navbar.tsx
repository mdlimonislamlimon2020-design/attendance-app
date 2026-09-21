import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function Navbar() {
  const { firebaseUser, student, teacher, isAdminUser, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  const utilityBtn =
    "flex h-9 w-9 items-center justify-center rounded-full text-navy/60 dark:text-slate-400 transition hover:bg-navy/5 dark:hover:bg-white/5 hover:text-navy dark:hover:text-slate-100 flex-shrink-0";

  return (
    <header className="sticky top-0 z-30 border-b border-navy/10 dark:border-white/10 bg-paper/90 dark:bg-slate-900/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-3 sm:px-4 py-3">
        {/* লোগো ও টাইটেল */}
        <Link to="/" className="flex items-center gap-2 min-w-0 mr-1">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-navy to-teal shadow-sm shadow-navy/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="white" strokeOpacity="0.55" />
              <path d="M8 3.5v3M16 3.5v3" strokeOpacity="0.55" />
              <path d="M8.5 12.5l2.2 2.2L15.5 10" />
            </svg>
          </span>
          <div className="leading-tight truncate">
            <p className="font-display text-sm sm:text-base font-semibold text-navy dark:text-slate-100 truncate">
              ম্যাথহাব
            </p>
            <p className="text-[10px] sm:text-[11px] text-navy/50 dark:text-slate-400 truncate hidden xs:block">
              গণিত বিভাগ · সরকারি তিতুমীর কলেজ
            </p>
          </div>
        </Link>

        {/* নেভবার অ্যাকশন বাটন */}
        <nav className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm flex-shrink-0">
          {firebaseUser ? (
            <>
              <div className="mr-1 hidden items-center gap-2 sm:flex">
                {student && (
                  <span className="text-navy/70 dark:text-slate-400">
                    {student.name}
                    {student.isCR && (
                      <span className="ml-1.5 rounded-full bg-gold-light dark:bg-gold/20 px-2 py-0.5 text-[11px] font-semibold text-gold">
                        CR
                      </span>
                    )}
                  </span>
                )}
                {teacher && (
                  <span className="text-navy/70 dark:text-slate-400">
                    {teacher.name}
                    <span className="ml-1.5 rounded-full bg-teal-light dark:bg-teal/20 px-2 py-0.5 text-[11px] font-semibold text-teal">
                      শিক্ষক
                    </span>
                  </span>
                )}
                {isAdminUser && (
                  <span className="rounded-full bg-navy px-2.5 py-1 text-[11px] font-semibold text-white">
                    অ্যাডমিন
                  </span>
                )}
              </div>
              <button
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "লাইট মোড চালু করুন" : "ডার্ক মোড চালু করুন"}
                className={utilityBtn}
              >
                {theme === "dark" ? <SunIcon /> : <MoonIcon />}
              </button>
              <button
                onClick={handleSignOut}
                className="rounded-lg border border-navy/15 dark:border-white/10 px-3 sm:px-3.5 py-1.5 font-medium text-navy dark:text-slate-100 transition hover:border-danger/40 hover:text-danger text-xs sm:text-sm shadow-xs"
              >
                লগ আউট
              </button>
            </>
          ) : (
            <>
              <button
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "লাইট মোড চালু করুন" : "ডার্ক মোড চালু করুন"}
                className={utilityBtn}
              >
                {theme === "dark" ? <SunIcon /> : <MoonIcon />}
              </button>
              <Link
                to="/teacher/login"
                className="rounded-lg border border-navy/15 dark:border-white/10 px-2.5 sm:px-3 py-1.5 font-medium text-navy dark:text-slate-100 hover:border-teal/50 hover:text-teal transition text-[11px] sm:text-sm shadow-xs"
              >
                শিক্ষক লগইন
              </Link>
              <Link
                to="/admin/login"
                className="rounded-lg border border-navy/15 dark:border-white/10 px-2.5 sm:px-3 py-1.5 font-medium text-navy dark:text-slate-100 hover:border-teal/50 hover:text-teal transition text-[11px] sm:text-sm shadow-xs"
              >
                অ্যাডমিন
              </Link>
              <Link
                to="/login"
                className="rounded-lg bg-teal/15 dark:bg-teal/20 border border-teal/40 px-3 sm:px-4 py-1.5 font-semibold text-teal dark:text-teal-light transition hover:bg-teal/25 text-xs sm:text-sm shadow-sm"
              >
                লগইন
              </Link>
              <Link
                to="/signup"
                className="rounded-lg bg-teal px-3 sm:px-4 py-1.5 font-medium text-white shadow-sm shadow-teal/30 transition hover:bg-teal/90 text-xs sm:text-sm"
              >
                সাইনআপ
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}