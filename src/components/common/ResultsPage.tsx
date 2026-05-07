import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { API_ENDPOINT } from "@/utils/config";
import { useToast } from "@/hooks/use-toast";
import useClientPagination from '@/hooks/useClientPagination';

const getStudentName = (item: any) => {
  const fullName = [item.user?.first_name, item.user?.last_name].filter(Boolean).join(' ').trim();
  return item.student?.name || item.student_name || fullName || item.name || item.usn || '';
};

const getResultStatus = (item: any) => {
  if (item.completion_status === 'incomplete') return 'Not Attended';
  if (item.completion_status === 'completed') return 'Attended';
  if (item.attempt_status === 'in_progress') return 'Not Attended';
  if (item.submitted_at) return 'Attended';
  return 'Not Attended';
};

const ResultsPage = () => {
  const { toast } = useToast();

  // Raw results from API (unfiltered)
  const [rawResults, setRawResults] = useState<any[]>([]);

  const [batches, setBatches] = useState<any[]>([]);
  const [filter, setFilter] = useState({ batch: 'ALL' });
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<string>('NONE');
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [hasAttemptedFilter, setHasAttemptedFilter] = useState<string>('ALL');

  // ── FIX 1: derive filtered list from rawResults + hasAttemptedFilter ──
  // This reacts instantly to status filter changes without re-fetching.
  const results = useMemo(() => {
    if (hasAttemptedFilter === 'ATTENDED') {
      return rawResults.filter(r => r.completion_status === 'completed');
    }
    if (hasAttemptedFilter === 'NOT_ATTENDED') {
      return rawResults.filter(r => r.completion_status === 'incomplete');
    }
    return rawResults;
  }, [rawResults, hasAttemptedFilter]);

  // ── FIX 2: pagination now uses the derived `results`, 10 per page ──
  const pagination = useClientPagination(results, 10);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      const batchesRes = await fetchWithTokenRefresh(`${API_ENDPOINT}/assessment/batches/`);
      if (batchesRes.ok) {
        const b = await batchesRes.json();
        const list = b.results?.batches || b.batches || b.results || b;
        setBatches(Array.isArray(list) ? list : []);
      }

      const assessmentsRes = await fetchWithTokenRefresh(`${API_ENDPOINT}/assessment/assessments/?status=all`);
      if (assessmentsRes.ok) {
        const a = await assessmentsRes.json();
        const alist = a.results?.assessments || a.assessments || a.results || a;
        setAssessments(Array.isArray(alist) ? alist : []);
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load initial data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Load sections when batch changes
  useEffect(() => {
    if (!filter.batch || filter.batch === 'ALL') {
      setSections([]);
      setSelectedSection('ALL');
      return;
    }

    let mounted = true;
    const load = async () => {
      try {
        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/assessment/sections/?batch_id=${encodeURIComponent(filter.batch)}`);
        const resp = response.ok ? await response.json() : null;
        if (!mounted) return;
        if (resp && resp.success) setSections(resp.data || []);
        else setSections([]);
      } catch (e) {
        console.error('Error loading sections', e);
        if (mounted) setSections([]);
      }
    };
    load();
    return () => { mounted = false; };
  }, [filter.batch]);

  // Auto-fetch results when assessment, batch, or section changes
  // NOTE: hasAttemptedFilter is intentionally NOT a dependency here —
  // filtering is handled in the useMemo above without a re-fetch.
  useEffect(() => {
    if (!selectedAssessment || selectedAssessment === 'NONE') {
      setRawResults([]);
      return;
    }
    if (!filter.batch || filter.batch === 'ALL') {
      setRawResults([]);
      return;
    }
    loadResultsForSelection();
  }, [selectedAssessment, filter.batch, selectedSection]);

  const loadResultsForSelection = async () => {
    if (!selectedAssessment || selectedAssessment === 'NONE') {
      setRawResults([]);
      return;
    }
    if (!filter.batch || filter.batch === 'ALL') {
      setRawResults([]);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('assessment_id', selectedAssessment);
      if (filter.batch && filter.batch !== 'ALL') params.append('batch_id', filter.batch);
      if (selectedSection && selectedSection !== 'ALL') params.append('section_id', selectedSection);
      const qs = params.toString() ? `?${params.toString()}` : '';

      const tryUrls = [`${API_ENDPOINT}/assessment/results/${qs}`];

      let data: any = null;
      for (const url of tryUrls.filter(Boolean)) {
        try {
          const res = await fetchWithTokenRefresh(url);
          if (!res.ok) continue;
          const json = await res.json();
          data = Array.isArray(json) ? json : (json.results?.results ?? json.results ?? json.data ?? json.attempts ?? json);
          if (data) break;
        } catch (e) {
          continue;
        }
      }

      const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);

      // Normalize — no status filtering here; that's done in useMemo
      const normalized = (list || []).map((it: any) => ({
        id: it.id || it.attempt_id || it.pk,
        student_name: getStudentName(it),
        usn: it.student?.usn || it.usn || it.user?.username || it.user?.usn || '',
        score: it.score ?? it.marks_obtained ?? it.mark ?? 0,
        total: it.total_marks ?? it.total ?? it.max_mark ?? it.total_questions ?? 0,
        percentage: it.percentage ?? (
          typeof (it.score ?? it.marks_obtained) === 'number' && (it.total_marks ?? it.total)
            ? Math.round(((it.score ?? it.marks_obtained) / (it.total_marks ?? it.total)) * 1000) / 10
            : undefined
        ),
        passed: it.passed ?? (it.percentage ? (it.percentage >= (it.passing_percentage ?? 0)) : undefined),
        section: it.section_name || it.section?.name || it.section || '',
        completion_status: it.completion_status || (it.submitted_at ? 'completed' : 'incomplete'),
        result_status: getResultStatus(it),
        submitted_at: it.submitted_at || it.created_at || it.attempted_at || it.submitted || null,
        attempt_status: it.attempt_status || (it.submitted_at ? 'completed' : 'not_attempted'),
      }));

      setRawResults(normalized);
    } catch (e) {
      console.error('Error loading results', e);
      setRawResults([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    if (status === 'Attended') return 'bg-green-100 text-green-700';
    if (status === 'Not Attended') return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (loading && rawResults.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assessment Results</h1>
          <p className="text-sm text-muted-foreground">View assessment completion by batch and section.</p>
        </div>
        <Card>
          <CardHeader><CardTitle>Results</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assessment Results</h1>
        <p className="text-sm text-muted-foreground">View assessment completion by batch and section.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Batch *</label>
              <Select value={filter.batch} onValueChange={(v) => {
                setFilter(prev => ({ ...prev, batch: v }));
                setSelectedSection('ALL');
              }}>
                <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Batches</SelectItem>
                  {batches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Section</label>
              <Select
                value={selectedSection}
                onValueChange={(v) => setSelectedSection(v)}
                disabled={!filter.batch || filter.batch === 'ALL'}
              >
                <SelectTrigger className={!filter.batch || filter.batch === 'ALL' ? 'opacity-50 cursor-not-allowed' : ''}>
                  <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sections</SelectItem>
                  {sections.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Assessment *</label>
              <Select value={selectedAssessment} onValueChange={(v) => setSelectedAssessment(v)}>
                <SelectTrigger><SelectValue placeholder="Select Assessment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">-- Select Assessment --</SelectItem>
                  {assessments.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.title || a.name || a.assessment || `Test ${a.id}`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <Select value={hasAttemptedFilter} onValueChange={(v) => setHasAttemptedFilter(v)}>
                <SelectTrigger><SelectValue placeholder="All Students" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Students</SelectItem>
                  <SelectItem value="ATTENDED">Attended Only</SelectItem>
                  <SelectItem value="NOT_ATTENDED">Not Attended Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Results</CardTitle></CardHeader>
        <CardContent>
          {!selectedAssessment || selectedAssessment === 'NONE' ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-2">Select an assessment to view results</p>
              <p className="text-sm">Choose a batch and assessment from the filters above</p>
            </div>
          ) : !filter.batch || filter.batch === 'ALL' ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-2">Select a batch to view results</p>
              <p className="text-sm">Choose a batch from the filters above</p>
            </div>
          ) : loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading results...</div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-2">No students found for the selected filters</p>
              <p className="text-sm">Try adjusting your filters or select a different assessment</p>
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse text-sm">
                  <thead>
                    <tr className="text-left bg-gray-50">
                      <th className="p-3 border-b font-semibold text-gray-700">Student</th>
                      <th className="p-3 border-b font-semibold text-gray-700">USN</th>
                      <th className="p-3 border-b font-semibold text-gray-700">Section</th>
                      <th className="p-3 border-b font-semibold text-gray-700 text-right">Score</th>
                      <th className="p-3 border-b font-semibold text-gray-700 text-right">Total</th>
                      <th className="p-3 border-b font-semibold text-gray-700 text-right">Percentage</th>
                      <th className="p-3 border-b font-semibold text-gray-700">Status</th>
                      <th className="p-3 border-b font-semibold text-gray-700">Result</th>
                      <th className="p-3 border-b font-semibold text-gray-700">Submitted At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagination.current.map((r: any) => (
                      <tr key={r.id} className="odd:bg-white even:bg-gray-50 border-b hover:bg-gray-100 transition-colors">
                        <td className="p-3 text-gray-900 font-medium">{r.student_name}</td>
                        <td className="p-3 text-gray-700">{r.usn || '-'}</td>
                        <td className="p-3 text-gray-700">{r.section || '-'}</td>
                        <td className="p-3 text-gray-900 text-right font-medium">
                          {r.result_status === 'Attended' ? r.score : '-'}
                        </td>
                        <td className="p-3 text-gray-900 text-right">{r.total || '-'}</td>
                        <td className="p-3 text-gray-900 text-right font-medium">
                          {r.result_status === 'Attended' && r.percentage !== undefined && r.percentage !== null
                            ? `${r.percentage}%`
                            : '-'}
                        </td>
                        <td className="p-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeColor(r.result_status)}`}>
                            {r.result_status}
                          </span>
                        </td>
                        <td className="p-3">
                          {r.result_status === 'Attended' ? (
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${r.passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                              {r.passed ? 'Passed' : 'Failed'}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {r.submitted_at
                            ? new Date(r.submitted_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.showPagination && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Showing{' '}
                    <span className="font-semibold">{(pagination.page - 1) * 10 + 1}</span>
                    {' '}to{' '}
                    <span className="font-semibold">{Math.min(pagination.page * 10, results.length)}</span>
                    {' '}of{' '}
                    <span className="font-semibold">{results.length}</span> results
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={pagination.prev}
                      disabled={pagination.page === 1}
                      className="px-3 py-2 rounded-md border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <div className="text-sm text-gray-600 px-3 py-2">
                      Page <span className="font-semibold">{pagination.page}</span> of{' '}
                      <span className="font-semibold">{pagination.totalPages}</span>
                    </div>
                    <button
                      onClick={pagination.next}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-3 py-2 rounded-md border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResultsPage;