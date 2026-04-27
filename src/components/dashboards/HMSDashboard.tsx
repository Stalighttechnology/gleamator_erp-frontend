import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import { HMSOverview, HostelManagement, RoomManagement, StudentManagement, WardenManagement, Enrollment, StaffManagementOverview, MenuManagement, IssueTracking } from "../hms";
import { useToast } from "../../hooks/use-toast";
import { logoutUser } from "../../utils/authService";
import { useTheme } from "../../context/ThemeContext";
import { manageHostels } from "../../utils/hms_api";

interface HMSDashboardProps {
  user: any;
  setPage: (page: string) => void;
}

const HMSDashboard = ({ user, setPage }: HMSDashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { theme } = useTheme();
  const [hostels, setHostels] = useState<any[]>([]);
  const [selectedHostelId, setSelectedHostelId] = useState<number | null>(null);

  // Get active page from URL path
  const getActivePageFromPath = (pathname: string) => {
    const path = pathname.replace('/hms', '').replace('/', '');
    return path || 'dashboard';
  };

  const activePage = getActivePageFromPath(location.pathname);

  useEffect(() => {
    fetchHostels();
  }, []);

  const fetchHostels = async () => {
    setLoading(true);
    try {
      const response = await manageHostels();
      if (response.success && response.results && response.results.length > 0) {
        setHostels(response.results);
        setSelectedHostelId(response.results[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch hostels for dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: string) => {
    const path = page === 'dashboard' ? '/hms' : `/hms/${page}`;
    navigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNotificationClick = () => {
    navigate('/hms/notifications');
  };

  return (
    <DashboardLayout
      role="hms"
      user={user}
      activePage={activePage}
      onPageChange={handlePageChange}
      onNotificationClick={handleNotificationClick}
      pageTitle="HMS Dashboard"
    >
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header - Only show for non-dashboard pages */}
        {(activePage !== '' && activePage !== 'dashboard') && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold">Hostel Management System</h1>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Admin Dashboard
              </p>
            </div>
            
            {activePage === 'issues' && hostels.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Hostel:</span>
                <select 
                  value={selectedHostelId || ''} 
                  onChange={(e) => setSelectedHostelId(Number(e.target.value))}
                  className={`p-2 rounded border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  {hostels.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Tabs Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {(activePage === '' || activePage === 'dashboard') && <HMSOverview />}
          {activePage === 'hostels' && <HostelManagement />}
          {activePage === 'rooms' && <RoomManagement />}
          {activePage === 'students' && <StudentManagement />}
          {activePage === 'wardens' && <WardenManagement />}
          {activePage === 'enrollment' && <Enrollment />}
          {activePage === 'staff' && <StaffManagementOverview />}
          {activePage === 'menu-management' && <MenuManagement />}
          {activePage === 'issues' && selectedHostelId && <IssueTracking hostelId={selectedHostelId} />}
          {activePage === 'issues' && !selectedHostelId && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">No hostels found to track issues.</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};

export default HMSDashboard;