import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { useToast } from "@/hooks/use-toast";

interface Attempt {
  id: number;
  assessment_title: string;
  score: number;
  total_questions: number;
  percentage: number;
  passed: boolean;
  submitted_at: string;
  time_taken_minutes?: number;
}

const StudentResults = () => {
  const { toast } = useToast();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      setLoading(true);
      const res = await fetchWithTokenRefresh('/api/assessment/my-results/');
      if (!res.ok) {
        const text = await res.text();
        toast({ title: 'Error', description: text || 'Failed to load results', variant: 'destructive' });
        return;
      }
      const data = await res.json();
      // normalize shapes
      const arr = Array.isArray(data) ? data : data.results ?? data.data ?? [];
      setAttempts(arr.map((a: any) => ({
        id: a.id,
        assessment_title: a.assessment ?? a.assessment_title ?? a.title ?? a.name ?? 'Assessment',
        score: a.score ?? a.marks_obtained ?? 0,
        total_questions: a.total_questions ?? a.total_marks ?? a.total ?? 0,
        percentage: a.percentage ?? Math.round(((a.score ?? 0) / (a.total_marks || a.total || 1)) * 100 * 10) / 10,
        passed: a.passed ?? ((a.percentage ?? 0) >= (a.passing_percentage ?? 0)),
        submitted_at: a.submitted_at ?? a.created_at ?? a.attempted_at ?? new Date().toISOString(),
        time_taken_minutes: a.time_taken_minutes ?? a.time_taken ?? 0,
      })));
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load results', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">My Results</h1>
        <p className="text-sm text-muted-foreground">Loading your attempts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Results</h1>
        <p className="text-sm text-muted-foreground">Review marks for tests you've attended.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No attempts found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time Taken</TableHead>
                    <TableHead>Submitted At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.assessment_title}</TableCell>
                      <TableCell>{a.score}/{a.total_questions}</TableCell>
                      <TableCell>{a.percentage}%</TableCell>
                      <TableCell>{a.passed ? 'Passed' : 'Failed'}</TableCell>
                      <TableCell>{a.time_taken_minutes ?? 0} min</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(a.submitted_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentResults;
