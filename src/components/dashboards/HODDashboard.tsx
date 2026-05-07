//HODDashboard.tsx
 
import { useState, useEffect, Component, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import HODStats from "../hod/HODStats";
import LowAttendance from "../hod/LowAttendance";
import SemesterManagement from "../hod/SemesterManagement";
import StudentManagement from "../hod/StudentManagement";
import SubjectManagement from "../hod/SubjectManagement";
import FacultyAssignments from "../hod/FacultyAssignments";
import Timetable from "../hod/Timetable";
import LeaveManagement from "../hod/LeaveManagement";
import ApplyLeave from "../hod/ApplyLeave";
import AttendanceView from "../hod/AttendanceView";
import MarksView from "../hod/MarksView";
import NotificationsManagement from "../hod/NotificationsManagement";
import ProctorManagement from "../hod/ProctorManagement";
import Chat from "../common/Chat";
import HodProfile from "../hod/HodProfile";
import { logoutUser } from "../../utils/authService";
import StudyMaterial from "../hod/StudyMaterial";
import PromotionManagement from "../hod/PromotionManagement";
import FacultyAttendanceView from "../hod/FacultyAttendanceView";
import HODMyAttendance from "../hod/HODMyAttendance";
import StudentInfoScanner from "../hod/StudentInfoScanner";
import StudentEnrollment from "../hod/StudentEnrollment";
import QPApprovals from "../hod/QPApprovals";
import HODAnnouncementManagement from "../hod/HODAnnouncementManagement";
import HodShortPermission from "../hod/HodShortPermission";
import MisShortPermission from "../hod/MisShortPermission";
import BatchManagement from "../admin/BatchManagement";
import ScanSearch from "../common/ScanSearch";
import EnrollmentManagement from "../hod/EnrollmentManagement";
import { HODBootstrapProvider } from "../../context/HODBootstrapContext";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../hooks/use-toast";
import { isPageAllowed } from "../../utils/planGating";
import { getHODDashboardBootstrap } from "../../utils/hod_api";
import UpgradeRequired from "../common/UpgradeRequired";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "../ui/button";

interface HODUser {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  profile_picture?: string | null;
  branch?: string;
  branch_id?: string;
}

interface Semester {
  id: string;
  number: number;
}

interface Section {
  id: string;
  name: string;
  semester_id: string;
}

interface BootstrapData {
  branch_id?: string;
  semesters?: Semester[];
  sections?: Section[];
}

interface HODDashboardProps {
  user: HODUser;
  setPage: (page: string) => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-6 text-red-500">
          <h2>Error: {this.state.errorMessage}</h2>
          <p>Please try refreshing the page or contact support.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const validateUser = (user: HODUser): boolean => {
  return !!(user && (user.role === "hod" || user.role === "mis")); // Allow hod or mis
};

const HODDashboard = ({ user, setPage }: HODDashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (!user || !user.role) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Initializing Dashboard...</p>
        </div>
      </div>
    );
  }
  
  const getActivePageFromPath = (pathname: string): string => {
    // Normalize and handle root '/hod' specially
    if (!pathname || pathname === '/hod' || pathname === '/hod/') return 'dashboard';

    // Remove leading/trailing slashes and take the first segment after /hod/
    const cleaned = pathname.replace(/^\/+|\/+$/g, '');
    const parts = cleaned.split('/');
    // If path starts with 'hod', the next segment is the page; otherwise use first segment
    let candidate = parts[0] === 'hod' ? (parts[1] || '') : parts[0] || '';

    if (!candidate) return 'dashboard';

    // Known remapping for legacy or alias routes
    const pathMap: { [key: string]: string } = {
      'dashboard': 'dashboard',
      'enrollment-management': 'enrollment-management',
      'students': 'enrollment-management',
      'bulk-upload': 'bulk-upload',
      'subjects': 'subjects',
      'faculty-assignments': 'faculty-assignments',
      'timetable': 'timetable',
      'leaves': 'leaves',
      'apply-leaves': 'apply-leaves',
      'my-attendance': 'my-attendance',
      'notifications': 'notifications',
      'chat': 'chat',
      'study-materials': 'study-materials',
      'hod-profile': 'hod-profile',
      'short-permission-request': 'short-permission-request',
      'batches': 'batches',
      // Accept explicit hod-announcement-management segment as-is
      'hod-announcement-management': 'hod-announcement-management'
    };

    // Prefer mapped value, otherwise return the raw candidate so new routes work without edits
    return pathMap[candidate] || candidate || 'dashboard';
  };

  const [activePage, setActivePage] = useState<string>(getActivePageFromPath(location.pathname));
  const [error, setError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const { theme } = useTheme();
  const { toast } = useToast();

  // Update active page when location changes
  useEffect(() => {
    setActivePage(getActivePageFromPath(location.pathname));
  }, [location.pathname]);

  // Fetch combined profile + semesters + sections once
  useEffect(() => {
    const fetchBootstrap = async () => {
      try {
        const res = await getHODDashboardBootstrap(['profile', 'semesters', 'sections']);
        if (res.success && res.data) {
          setBootstrap({
            branch_id: res.data.profile?.branch_id,
            semesters: res.data.semesters || [],
            sections: res.data.sections || [],
          });
        }
      } catch (err) {
        console.error("Failed to fetch bootstrap data:", err);
      }
    };
    fetchBootstrap();
  }, []);

  const handleBootstrapData = (data: BootstrapData) => {
    setBootstrap(data);
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handlePageChange = (page: string) => {
    setActivePage(page);
    setError(null);
    
    // Navigate to the corresponding URL path
    const pathMap: { [key: string]: string } = {
      'dashboard': '/hod/dashboard',
      'enrollment-management': '/hod/enrollment-management',
      'students': '/hod/enrollment-management',
      'bulk-upload': '/hod/bulk-upload',
      'subjects': '/hod/subjects',
      'faculty-assignments': '/hod/faculty-assignments',
      'timetable': '/hod/timetable',
      'leaves': '/hod/leaves',
      'apply-leaves': '/hod/apply-leaves',
      'my-attendance': '/hod/my-attendance',
      'notifications': '/hod/notifications',
      'chat': '/hod/chat',
      'study-materials': '/hod/study-materials',
      'hod-profile': '/hod/hod-profile',
      'short-permission-request': '/hod/short-permission-request',
      // Allow the announcement menu value used in the sidebar to map to the announcements page
      'hod-announcement-management': '/hod/hod-announcement-management',
      'batches': '/hod/batches'
    };
    
    const path = pathMap[page] || '/hod/dashboard';
    navigate(path);

    // scroll window to top just in case
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNotificationClick = () => {
    setActivePage("notifications");
  };

  const handleLogout = async () => {
    try {
      const response = await logoutUser();
      if (response.success) {
        localStorage.clear();
        navigate("/", { replace: true }); // Redirect to home
      } else {
        setError(response.message || "Failed to log out. Please try again.");
      }
    } catch (error) {
      console.error("Logout error:", error);
      setError("Failed to log out. Please try again.");
    }
  };



// ... (inside HODDashboard component)
  const renderContent = () => {
    const orgPlan = (user as any)?.org_plan || "basic";
    
    // Plan Gating Check
    if (!activePage.includes('dashboard') && !isPageAllowed(activePage, orgPlan)) {
      return <UpgradeRequired featureName={activePage} role={user.role} onBack={() => handlePageChange('dashboard')} />;
    }

    switch (activePage) {
      case "dashboard":
        return <HODStats setError={setError} setPage={handlePageChange} />;
      case "enrollment-management":
        return <EnrollmentManagement />;
      case "bulk-upload":
        return <StudentManagement />;
      case "students":
        return <StudentManagement />;
      case "semesters":
        return <SemesterManagement />;
      case "subjects":
        return <SubjectManagement />;
      case "faculty-assignments":
        return <FacultyAssignments setError={setError} />;
      case "timetable":
        return <Timetable />;
      case "leaves":
        return <LeaveManagement />;
      case "apply-leaves":
        return <ApplyLeave />;
      case "attendance":
        return <AttendanceView />;
      case "faculty-attendance":
        return <FacultyAttendanceView />;
      case "my-attendance":
        return <HODMyAttendance />;
      case "marks":
        return <MarksView />;
      case "notifications":
        return <NotificationsManagement />;
      case "proctors":
        return <ProctorManagement />;
      case "chat":
        return <Chat role="hod" />;
      case "study-materials":
        return <StudyMaterial />;
      case "hod-announcement-management":
        return <HODAnnouncementManagement />;
      case "hod-profile":
        return <HodProfile user={user} setError={setError} />;
      case "short-permission-request":
        return user.role === "mis" ? <MisShortPermission /> : <HodShortPermission />;
      case "batches":
        return <BatchManagement setError={setError} toast={toast} />;
      default:
      return <HODStats setError={setError} setPage={handlePageChange} />;
    }
  };

  return (
    <HODBootstrapProvider value={bootstrap}>
      <DashboardLayout
        role={user.role as any}
        user={user}
        activePage={activePage}
        onPageChange={handlePageChange}
        onNotificationClick={handleNotificationClick}
        pageTitle={"Counselor Dashboard"}
      >
        {error && (
          <div className={`p-3 rounded-lg mb-4 ${theme === 'dark' ? 'bg-destructive/10 border border-destructive/20 text-destructive-foreground' : 'bg-red-100 border border-red-200 text-red-700'}`}>
            {error}
          </div>
        )}
        <ErrorBoundary>
          {renderContent()}
        </ErrorBoundary>
      </DashboardLayout>
    </HODBootstrapProvider>
  );
};

export default HODDashboard;
