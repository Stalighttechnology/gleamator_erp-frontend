import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { lazy, Suspense, useState, useEffect } from "react";
import Index from "./components/common/Index";
import CreateAssessment from "@/components/faculty/CreateAssessment";
import AssignAssessment from "@/components/faculty/AssignAssessment";
import StudentTest from "@/components/student/StudentTest";
import ResultsPage from "@/components/common/ResultsPage";
import StudentResults from "@/components/student/StudentResults";
import DashboardLayout from "@/components/common/DashboardLayout";

// Lazy loaded components
const NotFound = lazy(() => import("./components/common/NotFound"));
const PaymentSuccess = lazy(() => import("./components/common/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./components/common/PaymentCancel"));
const ResultsView = lazy(() => import("./components/common/ResultsView"));
const StudentDashboard = lazy(() => import("./components/dashboards/StudentDashboard"));
const AdminDashboard = lazy(() => import("./components/dashboards/AdminDashboard"));
const HODDashboard = lazy(() => import("./components/dashboards/HODDashboard"));
const Attendance = lazy(() => import("./components/hod/AttendanceView"));
const FacultyAttendance = lazy(() => import("./components/hod/FacultyAttendanceView"));
const FacultyDashboard = lazy(() => import("./components/dashboards/FacultyDashboard"));
const COEDashboard = lazy(() => import("./components/dashboards/COEDashboard"));
const FeesManagerDashboard = lazy(() => import("./components/FeesManager/FeesManagerDashboard"));
const DeanDashboard = lazy(() => import("./components/dashboards/DeanDashboard"));
const HMSDashboard = lazy(() => import("./components/dashboards/HMSDashboard"));
const PrincipalDashboard = lazy(() => import("./components/dashboards/PrincipalDashboard"));
const Onboarding = lazy(() => import("./components/common/Onboarding"));
const Pricing = lazy(() => import("./components/common/Pricing"));
const FloatingAssistant = lazy(() => import("./components/common/FloatingAssistant"));
const AIInterview = lazy(() => import("./components/common/AIInterview"));
const TrialExpired = lazy(() => import("./components/common/TrialExpired"));
const OnboardingSuccess = lazy(() => import("./components/common/OnboardingSuccess"));
const SuperAdminIndex = lazy(() => import("./superadmin/index"));

import { shouldShowFloatingAssistant } from "./utils/config";

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("role");
  const user = localStorage.getItem("user");

  if (!token || !role || !user || !allowedRoles.includes(role)) {
    return <Index />;
  }

  return <>{children}</>;
};

const AssessmentLayout = ({
  role,
  activePage,
  user,
  children,
}: {
  role: "faculty" | "student";
  activePage: string;
  user: any;
  children: React.ReactNode;
}) => {
  const navigate = useNavigate();

  const handlePageChange = (page: string) => {
    if (page.startsWith("assessment/")) {
      navigate(`/${page}`);
      return;
    }

    navigate(role === "faculty" ? `/faculty/${page}` : page === "dashboard" ? "/dashboard" : `/${page}`);
  };

  return (
    <DashboardLayout
      role={role}
      user={user}
      activePage={activePage}
      onPageChange={handlePageChange}
      pageTitle="Assessment"
    >
      {children}
    </DashboardLayout>
  );
};

// Helper function to safely parse user data
const getUserData = () => {
  try {
    const userData = localStorage.getItem("user");
    return userData ? JSON.parse(userData) : {};
  } catch (error) {
    console.error("Error parsing user data:", error);
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    return {};
  }
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userData, setUserData] = useState(getUserData());

  useEffect(() => {
    // Check authentication status on mount and when localStorage changes
    const checkAuth = () => {
      const token = localStorage.getItem("access_token");
      const role = localStorage.getItem("role");
      const user = localStorage.getItem("user");

      const isAuth = !!(token && role && user);
      const currentUserData = getUserData();

      // Only update state if values actually changed
      setIsAuthenticated(prev => prev !== isAuth ? isAuth : prev);
      setUserRole(prev => prev !== role ? role : prev);
      setUserData(prev => {
        // Only update if the user data actually changed
        const prevStr = JSON.stringify(prev);
        const currentStr = JSON.stringify(currentUserData);
        return prevStr !== currentStr ? currentUserData : prev;
      });
    };

    checkAuth();

    // Listen for storage changes (login/logout from other tabs)
    const handleStorageChange = (e: StorageEvent | Event) => {
      if (!(e instanceof StorageEvent) || e.key === "access_token" || e.key === "role" || e.key === "user") {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Check less frequently - every 5 seconds instead of 1 second
    const interval = setInterval(checkAuth, 5000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    // ✅ NO QueryClientProvider here - it's in main.tsx
    // ✅ NO ThemeProvider here - it's in main.tsx
    // ✅ NO TooltipProvider here - it's in main.tsx
    <BrowserRouter>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="flex flex-col items-center gap-4">
            <img src="/logo.jpeg" alt="NeuroCampus Logo" className="w-16 h-16 rounded-full object-cover animate-pulse shadow-lg" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading NeuroCampus...</p>
          </div>
        </div>
      }>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={
            <>
              <Index />
            </>
          } />

          {/* Payment routes */}
          <Route path="/payment/success" element={
            <>
              <PaymentSuccess />
              {shouldShowFloatingAssistant() && <FloatingAssistant />}
            </>
          } />

          <Route path="/payment/cancel" element={
            <>
              <PaymentCancel />
              {shouldShowFloatingAssistant() && <FloatingAssistant />}
            </>
          } />

          {/* Onboarding routes */}
          <Route path="/neurocampus" element={<Pricing />} />
          <Route path="/neurocampus/admin/*" element={<SuperAdminIndex />} />
          <Route path="/neurocampus/:plan" element={<Onboarding />} />
          <Route path="/onboarding/success" element={<OnboardingSuccess />} />
          <Route path="/trial-expired" element={<TrialExpired />} />

          {/* Public results view (students) */}
          <Route path="/results/view/:token" element={
            <>
              <ResultsView />
              {shouldShowFloatingAssistant() && <FloatingAssistant />}
            </>
          } />

          <Route path="/assessment/create" element={<ProtectedRoute allowedRoles={["teacher"]}><Navigate to="/faculty/assessment/create" replace /></ProtectedRoute>} />
          <Route path="/assessment/assign" element={<ProtectedRoute allowedRoles={["teacher"]}><Navigate to="/faculty/assessment/assign" replace /></ProtectedRoute>} />

          <Route path="/assessment/test" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => {}} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/assessment/results" element={
            <ProtectedRoute allowedRoles={["teacher","admin"]}>
              <Navigate to={localStorage.getItem("role") === "admin" ? "/admin/assessment/results" : "/faculty/assessment/results"} replace />
            </ProtectedRoute>
          } />

          <Route path="/assessment/my-results" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => {}} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* Revaluation & Makeup routes: accessible to both teachers and students. Render appropriate dashboard based on current role. */}
          <Route path="/revaluation" element={
            <ProtectedRoute allowedRoles={["teacher", "student"]}>
              <>
                {(() => {
                  const roleNow = localStorage.getItem('role');
                  return roleNow === 'teacher' ? <FacultyDashboard user={userData} setPage={() => { }} /> : <StudentDashboard user={userData} setPage={() => { }} />;
                })()}
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/makeupexam" element={
            <ProtectedRoute allowedRoles={["teacher", "student"]}>
              <>
                {(() => {
                  const roleNow = localStorage.getItem('role');
                  return roleNow === 'teacher' ? <FacultyDashboard user={userData} setPage={() => { }} /> : <StudentDashboard user={userData} setPage={() => { }} />;
                })()}
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/timetable" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/attendance" element={
            <ProtectedRoute allowedRoles={["admin", "student"]}>
              <>
                {localStorage.getItem('role') === 'student' ? (
                  <StudentDashboard user={userData} setPage={() => { }} />
                ) : (
                  <>
                    <Attendance />
                    {shouldShowFloatingAssistant() && <FloatingAssistant />}
                  </>
                )}
              </>
            </ProtectedRoute>
          } />

          <Route path="/faculty-attendance" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <>
                <FacultyAttendance />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/marks" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/leave-request" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/leave" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/leave-status" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/fees" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />
          <Route path="/student-hostel-details" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/announcements" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/chat" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/notifications" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/face-recognition" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/student-study-material" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/student-assignment" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/study-mode" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/ai-interview" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <>
                <AdminDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* HOD routes */}
          <Route path="/hod/*" element={
            <ProtectedRoute allowedRoles={["hod", "mis"]}>
              <>
                <HODDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* Faculty routes */}
          <Route path="/faculty/*" element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <>
                <FacultyDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* Fees Manager routes */}
          <Route path="/fees-manager/*" element={
            <ProtectedRoute allowedRoles={["fees_manager"]}>
              <>
                <FeesManagerDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* HMS routes */}
          <Route path="/hms/*" element={
            <ProtectedRoute allowedRoles={["hms_admin"]}>
              <>
                <HMSDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* COE routes */}
          <Route path="/coe/*" element={
            <ProtectedRoute allowedRoles={["coe"]}>
              <>
                <COEDashboard user={userData} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* Dean routes */}
          <Route path="/dean/*" element={
            <ProtectedRoute allowedRoles={["dean"]}>
              <>
                <DeanDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* Principal (Center Manager) routes */}
          <Route path="/principal/*" element={
            <ProtectedRoute allowedRoles={["principal"]}>
              <>
                <PrincipalDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* 404 route */}
          <Route path="*" element={
            <>
              <NotFound />
              {shouldShowFloatingAssistant() && <FloatingAssistant />}
            </>
          } />
        </Routes>
      </Suspense>

      {/* ✅ Toast components rendered OUTSIDE routes but INSIDE BrowserRouter */}
      <Toaster />
      <Sonner />
    </BrowserRouter>
  );
};

export default App;
