import React, { useEffect, useState } from "react";
import { Calendar, Users, CheckCircle, XCircle, Clock } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import Swal from "sweetalert2";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { SkeletonStatsGrid, SkeletonTable } from "../ui/skeleton";

interface TodayRow {
  branch: string;
  hod_name: string;
  hod_id: string;
  role: string;
  contact: string;
  status: string;
  marked_at: string | null;
  notes: string | null;
  location?: {
    inside: boolean;
    distance_meters?: number | null;
    campus_name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
}

interface SummaryRow {
  hod_name: string;
  hod_id: string;
  branch: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  attendance_percentage: number;
}

interface RecordRow {
  faculty_name: string;
  faculty_id: string;
  branch: string;
  role: string;
  date: string;
  status: string;
  marked_at: string | null;
  notes: string | null;
  location?: {
    inside: boolean;
    distance_meters?: number | null;
    campus_name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
}

const AdminHODAttendance: React.FC = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'today' | 'records'>('today');
  const [isLoading, setIsLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");

  // Today's snapshot
  const [todayRows, setTodayRows] = useState<TodayRow[]>([]);
  const [todaySummary, setTodaySummary] = useState({ total_hods: 0, present: 0, absent: 0, not_marked: 0 });

  // Records mode
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });
  const [facultySummary, setFacultySummary] = useState<SummaryRow[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [recordsPagination, setRecordsPagination] = useState({ page: 1, page_size: 50, total_pages: 1, total_items: 0, has_next: false, has_prev: false });

  const getStatusIcon = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'present') return <CheckCircle className="w-5 h-5 text-green-500" />;
    // Do not show XCircle for 'absent' to keep UI cleaner on smaller screens
    if (s === 'absent') return null;
    return <Clock className="w-5 h-5 text-gray-400" />;
  };

  const getStatusBadge = (status: string) => {
    const base = 'px-2 py-1 rounded-full text-xs font-medium';
    switch ((status || '').toLowerCase()) {
      case 'present':
        return `${base} bg-green-100 text-green-800`;
      case 'absent':
        return `${base} bg-red-100 text-red-800`;
      default:
        return `${base} bg-gray-100 text-gray-800`;
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === "hod") return "Counselor";
    if (role === "mis") return "MIS";
    return "Faculty";
  };

  const fetchToday = async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/hod-attendance-today/`, { method: 'GET' });
      const json = await res.json();
      if (json.success) {
        setTodayRows(json.data || []);
        setTodaySummary(json.summary || { total_hods: 0, present: 0, absent: 0, not_marked: 0 });
      } else {
        console.error('Failed to fetch HOD attendance:', json.message);
        Swal.fire('Error', json.message || 'Failed to fetch HOD attendance', 'error');
      }
    } catch (err) {
      console.error('Error fetching HOD attendance:', err);
      Swal.fire('Error', 'Failed to load HOD attendance', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecords = async (page = 1, page_size = 50) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ start_date: dateRange.start_date, end_date: dateRange.end_date, page: String(page), page_size: String(page_size) });
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/hod-attendance-today/?${params.toString()}`, { method: 'GET' });
      const json = await res.json();
      if (json.success) {
        setFacultySummary(json.faculty_summary || []);
        setRecords(json.data || []);
        if (json.pagination) {
          setRecordsPagination({ page: json.pagination.current_page || 1, page_size: json.pagination.page_size || page_size, total_pages: json.pagination.total_pages || 1, total_items: json.pagination.total_items || 0, has_next: json.pagination.has_next || false, has_prev: json.pagination.has_prev || false });
        } else {
          setRecordsPagination(prev => ({ ...prev, page, page_size }));
        }
      } else {
        console.error('Failed to fetch HOD attendance records:', json.message);
        Swal.fire('Error', json.message || 'Failed to fetch records', 'error');
      }
    } catch (err) {
      console.error('Error fetching records:', err);
      Swal.fire('Error', 'Failed to load attendance records', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'today') fetchToday();
    else fetchRecords(recordsPagination.page, recordsPagination.page_size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'records') fetchRecords(recordsPagination.page, recordsPagination.page_size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordsPagination.page, recordsPagination.page_size]);

  const formatDate = (dateString: string) => {
    try { return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return dateString; }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Not marked';
    try { const d = new Date(dateString); if (isNaN(d.getTime())) return 'Not marked'; return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); } catch { return 'Not marked'; }
  };

  const handleRecordsPageChange = (newPage: number) => setRecordsPagination(prev => ({ ...prev, page: newPage }));
  const handleRecordsPageSizeChange = (newSize: number) => setRecordsPagination(prev => ({ ...prev, page_size: newSize, page: 1 }));

  return (
    <div className={`space-y-4 sm:space-y-6 text-sm sm:text-base ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {/* Tabs */}
      <div className={`flex space-x-1 p-1 rounded-lg ${theme === 'dark' ? 'bg-card' : 'bg-white'} border ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
        <button onClick={() => setActiveTab('today')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${activeTab === 'today' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Today's Attendance</button>
        <button onClick={() => setActiveTab('records')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${activeTab === 'records' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Attendance Records</button>
      </div>

      {isLoading && (
        <div className="space-y-6">
          <SkeletonStatsGrid items={4} />
          <SkeletonTable rows={10} cols={6} />
        </div>
      )}

      {activeTab === 'today' && !isLoading && (
        <>
          <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4`}>
            <div className={`p-4 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Total Counselors</p>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{todaySummary.total_hods}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className={`p-4 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Present</p>
                  <p className={`text-2xl font-bold text-green-600`}>{todaySummary.present}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className={`p-4 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Absent</p>
                  <p className={`text-2xl font-bold text-red-600`}>{todaySummary.absent}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className={`p-4 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Not Marked</p>
                  <p className={`text-2xl font-bold text-gray-600`}>{todaySummary.not_marked}</p>
                </div>
                <Clock className="w-8 h-8 text-gray-600" />
              </div>
            </div>
          </div>

          <div className={`rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'} overflow-hidden`}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Today's Counselor Attendance ({new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })})</h3>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className={`px-3 py-2 border rounded-md text-sm ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="all">All</option>
                <option value="hod">Counselor</option>
                <option value="mis">MIS</option>
                <option value="teacher">Faculty</option>
              </select>
            </div>
            {/* Desktop / Tablet (md+) Table; show cards on sm and below */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className={`sticky top-0 ${theme === 'dark' ? 'bg-card' : 'bg-gray-50'}`}>
                  <tr className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                    <th className="px-3 py-3 w-1/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                    <th className="px-3 py-3 w-1/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Counselor</th>
                    <th className="px-3 py-3 w-1/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hidden lg:table-cell">Contact</th>
                    <th className="px-3 py-3 w-1/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-3 py-3 w-1/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Location</th>
                    <th className="px-3 py-3 w-1/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Marked At</th>
                    <th className="px-3 py-3 w-1/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hidden lg:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-border' : 'divide-gray-200'}`}>
                  {todayRows.filter((r) => roleFilter === "all" || r.role === roleFilter).length === 0 ? (<tr><td colSpan={7} className={`px-6 py-4 text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No counselor attendance records for today</td></tr>) : (
                    todayRows.filter((r) => roleFilter === "all" || r.role === roleFilter).map((r, idx) => (
                      <tr key={idx} className={`hover:${theme === 'dark' ? 'bg-accent' : 'bg-gray-50'}`}>
                        <td className="px-3 py-4">
                          <span className="px-2 py-1 text-xs rounded bg-gray-200">
                            {getRoleLabel(r.role || "teacher")}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-gray-900 truncate md:whitespace-normal md:break-words">{r.hod_name}</td>
                        <td className="px-3 py-4 hidden lg:table-cell text-sm text-gray-600 truncate md:whitespace-normal md:break-words">{r.contact || '-'}</td>
                        <td className="px-3 py-4"><div className="flex items-center gap-2">{getStatusIcon(r.status)}<span className={getStatusBadge(r.status)}>{r.status}</span></div></td>
                        <td className="px-3 py-4 text-sm text-gray-600 truncate md:whitespace-normal md:break-words">
                          {r.location ? (
                            <>
                              {r.location.inside ? 'On campus' : 'Outside campus'}
                              {r.location.distance_meters ? ` • ${Math.round(r.location.distance_meters)} m` : ''}
                              {r.location.campus_name ? ` • ${r.location.campus_name}` : ''}
                            </>
                          ) : '-'}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-600 truncate md:whitespace-normal md:break-words">{r.marked_at ? formatTime(r.marked_at) : 'Not marked'}</td>
                        <td className="px-3 py-4 hidden lg:table-cell text-sm text-gray-600 truncate md:whitespace-normal md:break-words">{r.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Card List for sm and below */}
            <div className="md:hidden p-4 space-y-3">
              {todayRows.filter((r) => roleFilter === "all" || r.role === roleFilter).length === 0 ? (
                <div className={`text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No HOD attendance records for today</div>
              ) : (
                todayRows.filter((r) => roleFilter === "all" || r.role === roleFilter).map((r, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-500">
                          {getRoleLabel(r.role || "teacher")}
                        </div>
                        <div className="font-medium text-gray-900 truncate">{r.hod_name}</div>
                      </div>
                      <div className="text-sm text-right">
                        <div className="mt-1">{getStatusIcon(r.status)}<span className={`ml-2 ${getStatusBadge(r.status)}`}>{r.status}</span></div>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">Marked: {r.marked_at ? formatTime(r.marked_at) : 'Not marked'}</div>
                    <div className="mt-1 text-sm text-gray-600">Location: {r.location ? (`${r.location.inside ? 'On campus' : 'Outside campus'}${r.location.distance_meters ? ` • ${Math.round(r.location.distance_meters)} m` : ''}${r.location.campus_name ? ` • ${r.location.campus_name}` : ''}`) : 'Not recorded'}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'records' && !isLoading && (
        <>
          {facultySummary.length > 0 && (
            <div className={`rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'} overflow-hidden`}>
              <div className="px-6 py-4 border-b border-gray-200"><h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Faculty Attendance Summary</h3></div>
              {/* Desktop / Tablet (md+) Table; show cards on sm and below */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead className={`sticky top-0 ${theme === 'dark' ? 'bg-card' : 'bg-gray-50'}`}>
                    <tr className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                      <th className="px-6 py-3 w-2/5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Faculty</th>
                      <th className="px-6 py-3 w-1/5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Total Days</th>
                      <th className="px-6 py-3 w-1/5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Present</th>
                      <th className="px-6 py-3 w-1/5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Absent</th>
                      <th className="px-6 py-3 w-1/5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-border' : 'divide-gray-200'}`}>
                    {facultySummary.map((s, idx) => (
                      <tr key={idx} className={`hover:${theme === 'dark' ? 'bg-accent' : 'bg-gray-50'}`}>
                        <td className="px-6 py-4 font-medium text-gray-900 truncate md:whitespace-normal md:break-words">{s.hod_name}</td>
                        <td className="px-6 py-4 text-gray-900">{s.total_days}</td>
                        <td className="px-6 py-4 text-green-600 font-medium">{s.present_days}</td>
                        <td className="px-6 py-4 text-red-600 font-medium">{s.absent_days}</td>
                        <td className={`px-6 py-4 font-medium ${s.attendance_percentage >= 75 ? 'text-green-600' : s.attendance_percentage >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{s.attendance_percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Card List for sm and below */}
              <div className="md:hidden p-4 space-y-3">
                {facultySummary.map((s, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-white'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900 truncate">{s.hod_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">{s.attendance_percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="mt-2 text-sm">Present: <span className="font-medium text-green-600">{s.present_days}</span> • Absent: <span className="font-medium text-red-600">{s.absent_days}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={`rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'} overflow-hidden`}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Detailed Attendance Records</h3>
              <div className="flex items-center gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className={`px-3 py-2 border rounded-md text-sm ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="all">All</option>
                  <option value="hod">Counselor</option>
                  <option value="mis">MIS</option>
                  <option value="teacher">Faculty</option>
                </select>
                <button 
                  onClick={() => setFilterOpen(!filterOpen)}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md font-medium transition-colors text-sm"
                >
                  Filter
                </button>
              </div>
            </div>

            {/* Filter Dialog */}
            <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
              <DialogContent className={`w-full max-w-md ${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900'}`}>
                <DialogHeader>
                  <DialogTitle>Filter Attendance Records</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Start Date</label>
                    <input type="date" value={dateRange.start_date} onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))} className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>End Date</label>
                    <input type="date" value={dateRange.end_date} onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))} className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}`} />
                  </div>
                </div>
                <DialogFooter>
                  <button 
                    onClick={() => setFilterOpen(false)}
                    className={`px-4 py-2 rounded-md font-medium ${theme === 'dark' ? 'bg-card border border-border text-foreground hover:bg-accent' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => { setRecords([]); setRecordsPagination(prev => ({ ...prev, page: 1 })); fetchRecords(1, recordsPagination.page_size); setFilterOpen(false); }} 
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md font-medium transition-colors"
                  >
                    Apply
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className={`sticky top-0 ${theme === 'dark' ? 'bg-card' : 'bg-gray-50'}`}>
                  <tr className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                    <th className="px-6 py-3 w-1/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                    <th className="px-6 py-3 w-2/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Faculty</th>
                    <th className="px-6 py-3 w-1/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                    <th className="px-6 py-3 w-1/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-6 py-3 w-1/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Location</th>
                    <th className="px-6 py-3 w-1/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Marked At</th>
                    <th className="px-6 py-3 w-1/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hidden lg:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-border' : 'divide-gray-200'}`}>
                  {records.filter((r) => roleFilter === "all" || r.role === roleFilter).length === 0 ? (<tr><td colSpan={7} className={`px-6 py-4 text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No attendance records found for the selected date range</td></tr>) : (
                    records.filter((r) => roleFilter === "all" || r.role === roleFilter).map((r, idx) => (
                      <tr key={idx} className={`hover:${theme === 'dark' ? 'bg-accent' : 'bg-gray-50'}`}>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs rounded bg-gray-200">
                            {getRoleLabel(r.role || "teacher")}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 truncate md:whitespace-normal md:break-words">{r.faculty_name}</td>
                        <td className="px-6 py-4 text-gray-900">{formatDate(r.date)}</td>
                        <td className="px-6 py-4"><div className="flex items-center gap-2">{getStatusIcon(r.status)}<span className={getStatusBadge(r.status)}>{r.status}</span></div></td>
                        <td className="px-6 py-4 text-sm text-gray-600 truncate md:whitespace-normal md:break-words">{r.location ? (`${r.location.inside ? 'On campus' : 'Outside campus'}${r.location.distance_meters ? ` • ${Math.round(r.location.distance_meters)} m` : ''}${r.location.campus_name ? ` • ${r.location.campus_name}` : ''}`) : '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{r.marked_at ? formatTime(r.marked_at) : 'Not marked'}</td>
                        <td className="px-6 py-4 hidden lg:table-cell text-sm text-gray-500 truncate md:whitespace-normal md:break-words">{r.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Card List for sm and below */}
            <div className="md:hidden p-4 space-y-3">
              {records.filter((r) => roleFilter === "all" || r.role === roleFilter).length === 0 ? (
                <div className={`text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No attendance records found for the selected date range</div>
              ) : (
                records.filter((r) => roleFilter === "all" || r.role === roleFilter).map((r, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-white'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs text-gray-500">
                          {getRoleLabel(r.role || "teacher")}
                        </div>
                        <div className="font-medium text-gray-900 truncate">{r.faculty_name}</div>
                        <div className="text-sm text-gray-500">{formatDate(r.date)}</div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2">{getStatusIcon(r.status)}<span className={getStatusBadge(r.status)}>{r.status}</span></div>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">Marked: {r.marked_at ? formatTime(r.marked_at) : 'Not marked'}</div>
                    <div className="mt-1 text-sm text-gray-600">Location: {r.location ? (`${r.location.inside ? 'On campus' : 'Outside campus'}${r.location.distance_meters ? ` • ${Math.round(r.location.distance_meters)} m` : ''}${r.location.campus_name ? ` • ${r.location.campus_name}` : ''}`) : 'Not recorded'}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {recordsPagination.total_items > recordsPagination.page_size && (
            <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 p-4 ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'} rounded-lg mt-4`}>
              <div className="text-sm">Showing {records.length > 0 ? ((recordsPagination.page - 1) * recordsPagination.page_size) + 1 : 0} to {Math.min(recordsPagination.page * recordsPagination.page_size, recordsPagination.total_items)} of {recordsPagination.total_items} records</div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleRecordsPageChange(recordsPagination.page - 1)} disabled={!recordsPagination.has_prev || isLoading} className={`px-3 py-1 text-sm border rounded-md ${recordsPagination.has_prev ? 'border-blue-500 text-blue-600' : 'border-gray-300 text-gray-400'}`}>Previous</button>
                <div className="flex items-center gap-1 overflow-x-auto py-1">
                  {Array.from({ length: Math.min(5, recordsPagination.total_pages) }, (_, i) => { const pageNum = Math.max(1, Math.min(recordsPagination.total_pages - 4, recordsPagination.page - 2)) + i; if (pageNum > recordsPagination.total_pages) return null; return (<button key={pageNum} onClick={() => handleRecordsPageChange(pageNum)} disabled={isLoading} className={`px-2 sm:px-3 py-1 text-sm border rounded-md ${pageNum === recordsPagination.page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'}`}>{pageNum}</button>); })}
                </div>
                <button onClick={() => handleRecordsPageChange(recordsPagination.page + 1)} disabled={!recordsPagination.has_next || isLoading} className={`px-3 py-1 text-sm border rounded-md ${recordsPagination.has_next ? 'border-blue-500 text-blue-600' : 'border-gray-300 text-gray-400'}`}>Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminHODAttendance;