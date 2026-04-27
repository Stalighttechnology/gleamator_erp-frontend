import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonStatsGrid, SkeletonTable, SkeletonPageHeader } from "../ui/skeleton";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { RefreshCcw } from "lucide-react";

type ExamEntry = {
  id: string | number;
  title?: string;
  subject?: string;
  faculty_assignment?: {
    faculty?: string;
    subject?: string;
    semester?: number;
    section?: string;
  };
  date: string; // ISO or YYYY-MM-DD
  start_time?: string; // HH:MM
  end_time?: string; // HH:MM
  room?: string;
  is_published?: boolean;
};

const now = () => new Date();

const parseDateTime = (dateStr?: string, timeStr?: string) => {
  if (!dateStr) return null;
  const t = timeStr || '00:00';
  // assume dateStr is YYYY-MM-DD or ISO
  const iso = `${dateStr}T${t}:00`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d;
};

const computeStatus = (e: ExamEntry) => {
  const start = parseDateTime(e.date, e.start_time);
  const end = parseDateTime(e.date, e.end_time) || (start ? new Date(start.getTime() + 1000 * 60 * 60) : null);
  const cur = now();
  if (start && end) {
    if (cur >= start && cur <= end) return 'ongoing';
    if (cur < start) return 'upcoming';
    return 'past';
  }
  return 'scheduled';
};

const formatDate = (dstr?: string) => {
  if (!dstr) return '-';
  try {
    const d = new Date(dstr);
    return d.toLocaleDateString();
  } catch {
    return dstr;
  }
};

const DeanExams: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<string>('all');
  const [upcomingOnly, setUpcomingOnly] = useState<boolean>(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      // build query params
      const qs: string[] = [];
      if (branchId && branchId !== 'all') qs.push(`branch_id=${encodeURIComponent(branchId)}`);
      if (upcomingOnly) qs.push(`upcoming=1`);
      const url = `${API_ENDPOINT}/dean/reports/exams/${qs.length ? `?${qs.join('&')}` : ''}`;
      console.debug('Loading exams from', url);
      const res = await fetchWithTokenRefresh(url);
      const json = await res.json();
      console.debug('Exams response', json);
      if (json.success) {
        const list: ExamEntry[] = Array.isArray(json.data) ? json.data : (json.data || []);
        setExams(list.map((x) => ({ ...x, id: x.id })));
      } else {
        setExams([]);
        setError(json.message || 'Failed to load exams');
      }
    } catch (e: any) {
      setExams([]);
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [branchId, upcomingOnly]);

  // load branches for filter
  useEffect(() => {
    const boot = async () => {
      try {
        const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/dean/reports/branches/`);
        const json = await res.json();
        if (json.success) {
          const normalized = (json.data || []).map((b: any) => ({ id: (b.id || b.branch_id).toString(), name: b.name || b.branch }));
          setBranches(normalized);
        }
      } catch (e) {
        console.error('Failed to load branches', e);
      }
    };
    boot();
  }, []);

  const publishExam = async (id: string | number) => {
    if (!confirm('Publish exam results?')) return;
    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/dean/reports/exams/${id}/publish/`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        alert('Published');
        load();
      } else {
        alert(json.message || 'Failed');
      }
    } catch (e: any) {
      alert(e?.message || 'Network error');
    }
  };

  const grouped = {
    ongoing: [] as ExamEntry[],
    upcoming: [] as ExamEntry[],
    past: [] as ExamEntry[],
    other: [] as ExamEntry[],
  };
  exams.forEach((ex) => {
    const s = computeStatus(ex);
    if (s === 'ongoing') grouped.ongoing.push(ex);
    else if (s === 'upcoming') grouped.upcoming.push(ex);
    else if (s === 'past') grouped.past.push(ex);
    else grouped.other.push(ex);
  });

  const countCards = [
    { key: 'ongoing', title: 'Ongoing', count: grouped.ongoing.length, color: 'green' },
    { key: 'upcoming', title: 'Upcoming', count: grouped.upcoming.length, color: 'blue' },
    { key: 'past', title: 'Past', count: grouped.past.length, color: 'gray' },
  ];

  return (
    <div className={`space-y-6 p-6 min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {loading && exams.length === 0 ? (
        <div className="space-y-6">
          <SkeletonPageHeader />
          <SkeletonStatsGrid items={4} />
          <SkeletonTable rows={10} cols={8} />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Exams</h2>
            <div>
              <Button 
                onClick={load} 
                disabled={loading}
                className="gap-2"
              >
                <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className={`text-sm block mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Branch</label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {countCards.map(c => (
              <div key={c.key} className={`p-4 rounded-lg shadow-sm border ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} flex items-center justify-between`}>
                <div>
                  <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{c.title}</div>
                  <div className={`text-2xl font-bold ${c.color === 'green' ? 'text-green-500' : c.color === 'blue' ? 'text-blue-500' : 'text-gray-500'}`}>{c.count}</div>
                </div>
              </div>
            ))}
            <div>
              <label className={`text-sm block mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Options</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary" checked={upcomingOnly} onChange={e=>setUpcomingOnly(e.target.checked)} /> 
                  Upcoming only
                </label>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-8">
            {['ongoing','upcoming','past','other'].map((sectionKey) => {
              const list = (grouped as any)[sectionKey];
              if (list.length === 0 && sectionKey !== 'upcoming' && sectionKey !== 'ongoing') return null;
              
              return (
                <div key={sectionKey} className={`rounded-lg border shadow-sm overflow-hidden ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
                  <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'bg-muted/50' : 'bg-gray-50'}`}>
                    <h3 className="font-semibold text-lg capitalize">{sectionKey === 'other' ? 'Scheduled' : sectionKey}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-border">
                      <thead>
                        <tr className={`text-left text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          <th className="px-4 py-3 font-semibold">Title</th>
                          <th className="px-4 py-3 font-semibold">Subject</th>
                          <th className="px-4 py-3 font-semibold">Date</th>
                          <th className="px-4 py-3 font-semibold">Time</th>
                          <th className="px-4 py-3 font-semibold">Venue</th>
                          <th className="px-4 py-3 font-semibold">Semester</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">Published</th>
                          <th className="px-4 py-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme === 'dark' ? 'divide-border' : 'divide-gray-200'}`}>
                        {list.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-4 py-6 text-center text-gray-500 italic">No exams found in this section</td>
                          </tr>
                        ) : list.map((ex: ExamEntry) => (
                          <tr key={ex.id} className={`text-sm hover:${theme === 'dark' ? 'bg-muted/50' : 'bg-gray-50'} transition-colors`}>
                            <td className="px-4 py-3 font-medium">{ex.title || ex.faculty_assignment?.subject || ex.subject || 'Exam'}</td>
                            <td className="px-4 py-3">{ex.faculty_assignment?.subject || ex.subject || '-'}</td>
                            <td className="px-4 py-3">{formatDate(ex.date)}</td>
                            <td className="px-4 py-3">{ex.start_time || '-'} - {ex.end_time || '-'}</td>
                            <td className="px-4 py-3">{ex.room || '-'}</td>
                            <td className="px-4 py-3">{ex.faculty_assignment ? `Sem ${ex.faculty_assignment.semester} • ${ex.faculty_assignment.section}` : '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                computeStatus(ex) === 'ongoing' ? 'bg-green-100 text-green-800' :
                                computeStatus(ex) === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {computeStatus(ex)}
                              </span>
                            </td>
                            <td className="px-4 py-3">{ex.is_published ? 'Yes' : 'No'}</td>
                            <td className="px-4 py-3 text-right">
                              {!ex.is_published && (
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  onClick={() => publishExam(ex.id)}
                                >
                                  Publish
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default DeanExams;

