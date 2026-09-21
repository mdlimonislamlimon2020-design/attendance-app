import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { RequireStudent, RequireTeacher, RequireAdmin } from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherLogin from "./pages/TeacherLogin";
import TeacherDashboard from "./pages/TeacherDashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <ThemeProvider>
      <ConfirmProvider>
        <BrowserRouter basename="/attendance-app">
          <AuthProvider>
            <div className="min-h-screen bg-paper dark:bg-slate-900">
              <Navbar />
              <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route
                  path="/dashboard"
                  element={
                    <RequireStudent>
                      <StudentDashboard />
                    </RequireStudent>
                  }
                />
                <Route path="/teacher/login" element={<TeacherLogin />} />
                <Route
                  path="/teacher"
                  element={
                    <RequireTeacher>
                      <TeacherDashboard />
                    </RequireTeacher>
                  }
                />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route
                  path="/admin"
                  element={
                    <RequireAdmin>
                      <AdminDashboard />
                    </RequireAdmin>
                  }
                />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </ConfirmProvider>
    </ThemeProvider>
  );
}

export default App;