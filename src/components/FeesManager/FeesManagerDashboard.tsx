import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '@/components/common/Sidebar';
import { useTheme } from '@/context/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  FileText,
  AlertTriangle,
  Calendar,
  IndianRupee,
  BarChart3,
  Settings,
  UserCheck,
  Receipt,
  DollarSign,
  Plus
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import FeeTemplates from './FeeTemplates';
import FeeAssignments from './FeeAssignments';
import FeeComponents from './FeeComponents';
import IndividualFeeAssignment from './IndividualFeeAssignment';
import BulkAssignment from './BulkAssignment';
import InvoiceManagement from './InvoiceManagement';
import PaymentMonitoring from './PaymentMonitoring';
import Reports from './Reports';
import StudentFeeReports from './StudentFeeReports';
import FeesManagerLeave from './FeesManagerLeave';
import FeesManagerProfile from './FeesManagerProfile';
import Navbar from '@/components/common/Navbar';
import { motion } from "framer-motion";

interface User {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string | null;
}

interface DashboardStats {
  total_students?: number;
  active_fee_structures?: number;
  pending_invoices?: number;
  total_collections?: number;
  outstanding_amount?: number;
}

interface DashboardProfile {
  designation?: string;
  department?: string;
}

interface DashboardData {
  user?: {
    name?: string;
  };
  stats?: DashboardStats;
  profile?: DashboardProfile;
}

interface FeesManagerDashboardProps {
  user: User;
  setPage: (page: string) => void;
}

const FeesManagerDashboard: React.FC<FeesManagerDashboardProps> = ({ user, setPage }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { theme } = useTheme();

  // Match DashboardLayout behavior: expanded on desktop (>=1024), collapsed on smaller
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarCollapsed(false);
      } else {
        setSidebarCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get active page from URL path
  const getActivePageFromPath = (pathname: string) => {
    const path = pathname.replace('/fees-manager', '').replace('/', '');
    return path || 'dashboard';
  };

  const activePage = getActivePageFromPath(location.pathname);

  useEffect(() => {
    // Only fetch dashboard summary when the active page is the dashboard
    if (activePage === 'dashboard') {
      fetchDashboardData();
    }
  }, [activePage]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://127.0.0.1:8000/api/fees-manager/dashboard/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        // Token expired or invalid, redirect to login
        localStorage.clear();
        setPage("login");
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  const handlePageChange = (page: string) => {
    const path = page === 'dashboard' ? '/fees-manager' : `/fees-manager/${page}`;
    navigate(path);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleSidebar = () => {
    // Only allow toggling on mobile/tablet (< 1024px)
    if (window.innerWidth < 1024) {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  // Close sidebar when page changes on mobile/tablet only
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarCollapsed(true);
    }
  }, [activePage]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const toRupees = (centsOrAmount: any) => {
    if (centsOrAmount === null || centsOrAmount === undefined) return 0;
    // Prefer integer cents
    if (Number.isInteger(centsOrAmount)) return centsOrAmount / 100;
    const n = Number(centsOrAmount);
    return isNaN(n) ? 0 : n;
  };

  // Do not block rendering of child pages — only show dashboard loading/error within dashboard view

  return (
    <div className={`flex min-h-screen ${theme === 'dark' ? 'dark bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar (fixed left) - let Sidebar component control fixed positioning */}
      <Sidebar
        role="fees_manager"
        setPage={handlePageChange}
        activePage={activePage}
        logout={handleLogout}
        collapsed={sidebarCollapsed}
        toggleCollapse={toggleSidebar}
      />

      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-0' : 'ml-64'}`}>
        {/* Navbar (fixed) */}
        <div className={`fixed top-0 ${sidebarCollapsed ? 'left-0' : 'left-64'} right-0 z-10 shadow-sm`}>
          <Navbar
            role="fees_manager"
            user={{
              username: user?.username || '',
              email: user?.email || '',
              first_name: user?.first_name || '',
              last_name: user?.last_name || '',
              role: 'fees_manager',
              profile_picture: user?.profile_picture || null
            }}
            setPage={handlePageChange}
            showHamburger={sidebarCollapsed && window.innerWidth < 1024}
            onHamburgerClick={toggleSidebar}
          />
        </div>

        <main className={`flex-1 mt-16 p-6 overflow-y-auto ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
          <div>
            
            {/* Dashboard Content based on active page */}
            {activePage === 'dashboard' && (
              <motion.div 
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                {/* Dashboard loading / error shown only when dashboard is active */}
                {loading && (
                  <div className="flex items-center justify-center min-h-[200px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2">Loading dashboard...</span>
                  </div>
                )}

                {error && (
                  <Alert className="max-w-2xl mx-auto mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {!loading && !error && (
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-foreground">Fees Manager Dashboard</h1>
                  <p className="text-muted-foreground mt-2">Manage fee structures, assignments, and monitor collections</p>
                </div>
                )}
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card className="bg-card text-card-foreground">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                          <p className="text-2xl font-bold text-foreground">
                            {dashboardData?.stats?.total_students || 0}
                          </p>
                        </div>
                        <Users className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card text-card-foreground">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Active Fee Templates</p>
                          <p className="text-2xl font-bold text-foreground">
                            {dashboardData?.stats?.active_fee_structures || 0}
                          </p>
                        </div>
                        <FileText className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card text-card-foreground">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Pending Invoices</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {dashboardData?.stats?.pending_invoices || 0}
                          </p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card text-card-foreground">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Collections</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(toRupees(dashboardData?.stats?.total_collections_cents ?? dashboardData?.stats?.total_collections))}
                          </p>
                        </div>
                        <IndianRupee className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Outstanding Amount Alert */}
                {(toRupees(dashboardData?.stats?.outstanding_amount_cents ?? dashboardData?.stats?.outstanding_amount) || 0) > 0 && (
                  <Alert className="mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Outstanding Amount:</strong> {formatCurrency(toRupees(dashboardData.stats.outstanding_amount_cents ?? dashboardData.stats.outstanding_amount))}
                      {' '}from pending invoices. Monitor closely and follow up with students.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Recent Activity & Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Activity */}
                  <Card className="bg-card text-card-foreground">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">New fee component created</p>
                            <p className="text-xs text-muted-foreground">Library Fee Component</p>
                          </div>
                          <span className="text-xs text-muted-foreground">2h ago</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Fee template updated</p>
                            <p className="text-xs text-muted-foreground">B.Tech Semester Template</p>
                          </div>
                          <span className="text-xs text-muted-foreground">4h ago</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Payment received</p>
                            <p className="text-xs text-muted-foreground">₹25,000 from John Doe</p>
                          </div>
                          <span className="text-xs text-muted-foreground">1d ago</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card className="bg-card text-card-foreground">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => handlePageChange("components")}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Fee Component
                      </Button>
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => handlePageChange("templates")}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Create Fee Template
                      </Button>
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => handlePageChange("individual-fees")}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Assign Fees to Students
                      </Button>
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => handlePageChange("bulk-assignment")}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Bulk Fee Assignment
                      </Button>
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => handlePageChange("invoices")}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Generate Invoices
                      </Button>
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => handlePageChange("reports")}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Reports
                      </Button>
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => handlePageChange("student-reports")}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Student Fee Reports
                      </Button>
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => handlePageChange("payments")}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Process Refunds
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* Other pages rendered based on activePage */}
            {activePage === 'components' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <FeeComponents />
              </motion.div>
            )}

            {activePage === 'templates' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <FeeTemplates />
              </motion.div>
            )}

            {activePage === 'assignments' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <FeeAssignments />
              </motion.div>
            )}

            {activePage === 'individual-fees' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <IndividualFeeAssignment />
              </motion.div>
            )}

            {activePage === 'bulk-assignment' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <BulkAssignment />
              </motion.div>
            )}

            {activePage === 'invoices' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <InvoiceManagement />
              </motion.div>
            )}

            {activePage === 'payments' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <PaymentMonitoring />
              </motion.div>
            )}

            {activePage === 'leave' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <FeesManagerLeave />
              </motion.div>
            )}

            {activePage === 'reports' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Reports />
              </motion.div>
            )}

            {activePage === 'student-reports' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <StudentFeeReports />
              </motion.div>
            )}

            {activePage === 'profile' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <FeesManagerProfile />
              </motion.div>
            )}
            </div>
          </main>
        </div>
      </div>
  );
};

export default FeesManagerDashboard;