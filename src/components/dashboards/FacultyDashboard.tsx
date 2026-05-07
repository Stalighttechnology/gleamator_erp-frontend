import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import FacultyStats from "../faculty/FacultyStats";
import TakeAttendance from "../faculty/TakeAttendance";
import UploadMarks from "../faculty/UploadMarks";
import UploadQP from "../faculty/UploadQP";
import COAttainment from "../faculty/COAttainment";
import ApplyLeave from "../faculty/ApplyLeave";
import AttendanceRecords from "../faculty/AttendanceRecords";
import ProctorStudents from "../faculty/ProctorStudents";
import BatchStudents from "../faculty/BatchStudents";
import ExamApplication from "../faculty/ExamApplication";
import Revaluation from "../common/Revaluation";
import MakeupExam from "../common/MakeupExam";
import ManageStudentLeave from "../faculty/ManageStudentLeave";
import Timetable from "../faculty/Timetable";
import Chat from "../common/Chat";
import FacultyProfile from "../faculty/facultyProfile";
import GenerateStatistics from "../faculty/GenerateStatistics";
import FacultyAttendance from "../faculty/FacultyAttendance";
import FacultyAssignments from "../faculty/FacultyAssignments";
const CreateAssessment = lazy(() => import("@/components/faculty/CreateAssessment"));
const AssignAssessment = lazy(() => import("@/components/faculty/AssignAssessment"));
const ResultsPage = lazy(() => import("@/components/common/ResultsPage"));
import StudentInfoScanner from "../hod/StudentInfoScanner";
import StudyMaterial from "../faculty/StudyMaterial";
import { logoutUser, fetchWithTokenRefresh } from "../../utils/authService";
import FacultyAnnouncementManagement from "../faculty/FacultyAnnouncementManagement";
import { API_ENDPOINT } from "../../utils/config";
import FacultyShortPermission from "../faculty/FacultyShortPermission";
import { useTheme } from "../../context/ThemeContext";
import { useProctorStudentsQuery } from "../../hooks/useApiQueries";
import { isPageAllowed } from "../../utils/planGating";
import UpgradeRequired from "../common/UpgradeRequired";

interface FacultyDashboardProps {
  user: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    profile_picture?: string | null;
    branch?: string;
  };
  setPage: (page: string) => void;
}

const FacultyDashboard = ({ user, setPage }: FacultyDashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(user);

  const getActivePageFromPath = (pathname: string): string => {
    const pathParts = pathname.split('/').filter(Boolean);
    const assessmentIndex = pathParts.indexOf('assessment');
    if (assessmentIndex >= 0) {
      return `assessment/${pathParts[assessmentIndex + 1] || ''}`;
    }
    const lastPart = pathParts[pathParts.length - 1] || '';

    // Map URL paths to page names
    const pathMap: { [key: string]: string } = {
      'dashboard': 'dashboard',
      'take-attendance': 'take-attendance',
      'upload-marks': 'upload-marks',
      'upload-qp': 'upload-qp',
      'co-attainment': 'co-attainment',
      'apply-leave': 'apply-leave',
      'attendance-records': 'attendance-records',
      'faculty-attendance': 'faculty-attendance',
      'announcements': 'faculty-announcement-management',
      'students': 'students',
      'exam-applications': 'exam-applications',
      'student-leave': 'student-leave',
      'timetable': 'timetable',
      'chat': 'chat',
      'faculty-profile': 'faculty-profile',
      'statistics': 'statistics',
      'scan-student-info': 'scan-student-info',
      'study-materials': 'study-materials',
      'short-permission-request': 'short-permission-request'
    };

    // Add direct mappings for additional top-level routes
    pathMap['revaluation'] = 'revaluation';
    pathMap['makeupexam'] = 'makeupexam';
    pathMap['study-materials'] = 'study-materials';
    pathMap['faculty-announcement-management'] = 'faculty-announcement-management';

    return pathMap[lastPart] || 'dashboard';
  };

  const [activePage, setActivePage] = useState(getActivePageFromPath(location.pathname));
  const [error, setError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { theme } = useTheme();

  // Only fetch proctor students when a page requires them (lazy load)
  const pagesNeedingProctor = [
    'student-leave'
  ];
  const needsProctorData = pagesNeedingProctor.includes(activePage);
  // Determine which fields to include based on active page to minimize payload
  // Request a lightweight payload for student-leave page with leave request data
  const includeForProctor = activePage === 'student-leave'
    ? 'leave_requests'
    : undefined;
  const onlyWithLeaves = activePage === 'student-leave';
  const { data: proctorStudentsData, isLoading: proctorStudentsLoading, pagination: proctorPagination } = useProctorStudentsQuery(needsProctorData, includeForProctor, undefined, onlyWithLeaves);
  const proctorStudents = proctorStudentsData?.data || [];

  // Update active page when location changes
  useEffect(() => {
    setActivePage(getActivePageFromPath(location.pathname));
  }, [location.pathname]);

  // Note: Profile fetching is handled by the profile page component itself

  const handlePageChange = (page: string) => {
    setActivePage(page);
    setError(null);

    // Navigate to the corresponding URL path
    const pathMap: { [key: string]: string } = {
      'dashboard': '/faculty/dashboard',
      'take-attendance': '/faculty/take-attendance',
      'upload-marks': '/faculty/upload-marks',
      'upload-qp': '/faculty/upload-qp',
      'co-attainment': '/faculty/co-attainment',
      'apply-leave': '/faculty/apply-leave',
      'attendance-records': '/faculty/attendance-records',
      'faculty-attendance': '/faculty/faculty-attendance',
      'announcements': '/faculty/announcements',
      'students': '/faculty/students',
      'exam-applications': '/faculty/exam-applications',
      'revaluation': '/faculty/revaluation',
      'makeupexam': '/faculty/makeupexam',
      'student-leave': '/faculty/student-leave',
      'timetable': '/faculty/timetable',
      'chat': '/faculty/chat',
      'faculty-profile': '/faculty/faculty-profile',
      'statistics': '/faculty/statistics',
      'scan-student-info': '/faculty/scan-student-info',
      'study-materials': '/faculty/study-materials',
      'faculty-announcement-management': '/faculty/announcements',
      'assessment/create': '/faculty/assessment/create',
      'assessment/assign': '/faculty/assessment/assign',
      'assessment/results': '/faculty/assessment/results',
      'short-permission-request': '/faculty/short-permission-request',
      'faculty-assignments': '/faculty/faculty-assignments'
    };

    const path = pathMap[page] || '/faculty/dashboard';
    navigate(path);

    // scroll window to top just in case
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNotificationClick = () => {
    setActivePage("faculty-announcement-management");
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      localStorage.clear();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      setError("Failed to log out. Please try again.");
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const renderContent = () => {
    const orgPlan = (user as any)?.org_plan || "basic";
    
    if (!activePage.includes('dashboard') && !isPageAllowed(activePage, orgPlan)) {
      return <UpgradeRequired featureName={activePage} role={user.role} onBack={() => handlePageChange('dashboard')} />;
    }

    switch (activePage) {
      case "dashboard":
        return <FacultyStats setActivePage={handlePageChange} />;
      case "take-attendance":
        return <TakeAttendance />;
      case "upload-marks":
        return <UploadMarks />;
      case "upload-qp":
        return <UploadQP />;
      case "co-attainment":
        return <COAttainment />;
      case "apply-leave":
        return <ApplyLeave />;
      case "attendance-records":
        return <AttendanceRecords />;
      case "faculty-attendance":
        return <FacultyAttendance />;
      case "faculty-assignments":
        return <FacultyAssignments />;
      case "announcements":
      case "faculty-announcement-management":
        return <FacultyAnnouncementManagement />;
      case "students":
        return <BatchStudents />;
      case "exam-applications":
        return <ExamApplication proctorStudents={proctorStudents} proctorStudentsLoading={proctorStudentsLoading} />;
      case "revaluation":
        return <Revaluation />;
      case "makeupexam":
        return <MakeupExam />;
      case "student-leave":
        return <ManageStudentLeave proctorStudents={proctorStudents} proctorStudentsLoading={proctorStudentsLoading} />;
      case "timetable":
        return <Timetable role="faculty" />;
      case "chat":
        return <Chat role="faculty" />;
      case "faculty-profile":
        return <FacultyProfile />;
      case "statistics":
        return <GenerateStatistics />;
      case "scan-student-info":
        return <StudentInfoScanner />;
      case "study-materials":
        return <StudyMaterial />;
      case "assessment/create":
        return <Suspense fallback={<div className="text-muted-foreground">Loading assessment...</div>}><CreateAssessment /></Suspense>;
      case "assessment/assign":
        return <Suspense fallback={<div className="text-muted-foreground">Loading assessment...</div>}><AssignAssessment /></Suspense>;
      case "assessment/results":
        return <Suspense fallback={<div className="text-muted-foreground">Loading assessment results...</div>}><ResultsPage /></Suspense>;
      case "short-permission-request":
        return <FacultyShortPermission />;
      default:
        return <FacultyStats setActivePage={handlePageChange} />;
    }
  };

  return (
    <DashboardLayout
      role="faculty"
      user={currentUser}
      activePage={activePage}
      onPageChange={handlePageChange}
      onNotificationClick={handleNotificationClick}
      pageTitle="Faculty Dashboard"
    >
      {error && (
        <div className={`p-3 rounded-lg mb-4 ${theme === 'dark' ? 'bg-destructive/10 border border-destructive/20 text-destructive-foreground' : 'bg-red-100 border border-red-200 text-red-700'}`}>
          {error}
        </div>
      )}
      {renderContent()}
    </DashboardLayout>
  );
};

export default FacultyDashboard;
