import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import ApplyLeave from "../hod/ApplyLeave";
import AdminOverview from "../admin/AdminEnquiryOverview";
import ShortPermissionsManagement from "../hod/ShortPermissionsManagement";
import { logoutUser } from "../../utils/authService";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

interface PrincipalUser {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  profile_picture?: string | null;
}

interface PrincipalDashboardProps {
  user: PrincipalUser;
  setPage: (page: string) => void;
}

const PrincipalDashboard = ({ user, setPage }: PrincipalDashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActivePageFromPath = (pathname: string): string => {
    const pathParts = pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    
    const pathMap: { [key: string]: string } = {
      'dashboard': 'dashboard',
      'apply-leaves': 'apply-leaves',
      'enquiry-overview': 'enquiry-overview',
      'short-permissions': 'short-permissions',
      'profile': 'profile'
    };
    
    return pathMap[lastPart] || 'dashboard';
  };

  const [activePage, setActivePage] = useState<string>(getActivePageFromPath(location.pathname));
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const { toast } = useToast();

  useEffect(() => {
    setActivePage(getActivePageFromPath(location.pathname));
  }, [location.pathname]);

  const handlePageChange = (page: string) => {
    setActivePage(page);
    setError(null);
    
    const pathMap: { [key: string]: string } = {
      'dashboard': '/principal/dashboard',
      'apply-leaves': '/principal/apply-leaves',
      'enquiry-overview': '/principal/enquiry-overview',
      'short-permissions': '/principal/short-permissions',
      'profile': '/principal/profile'
    };
    
    const path = pathMap[page] || '/principal/dashboard';
    navigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Welcome, Center Manager</h1>
            <p className="text-muted-foreground">Manage institutional permissions and overview.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} shadow-sm cursor-pointer`}
                onClick={() => handlePageChange('short-permissions')}
              >
                <h3 className="font-semibold text-lg mb-2">Short Permissions</h3>
                <p className="text-sm text-muted-foreground">Review and approve short permission requests from Faculty, Counselors, and MIS.</p>
              </motion.div>
            </div>
          </div>
        );
      case "apply-leaves":
        return <ApplyLeave />;
      case "enquiry-overview":
        return <AdminOverview />;
      case "short-permissions":
        return <ShortPermissionsManagement setError={setError} />;
      case "profile":
        return (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Profile Management</h2>
            <p>Profile settings for Center Manager.</p>
          </div>
        );
      default:
        return <div className="p-6 text-center">Page under development</div>;
    }
  };

  if (!user || !user.role) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout
      role="principal"
      user={user as any}
      activePage={activePage}
      onPageChange={handlePageChange}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activePage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="h-full w-full"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default PrincipalDashboard;
