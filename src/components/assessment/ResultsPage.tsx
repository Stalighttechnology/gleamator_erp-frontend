import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, Search, TrendingUp, TrendingDown, Award, Filter } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Result {
  id: number;
  student_name: string;
  student_roll_number: string;
  assessment_title: string;
  batch_name: string;
  course_name: string;
  score: number;
  total_questions: number;
  percentage: number;
  passing_percentage: number;
  status: 'passed' | 'failed';
  submitted_at: string;
  time_taken_minutes: number;
}

interface Batch {
  id: number;
  name: string;
}

interface Course {
  id: number;
  name: string;
}

interface Stats {
  total_attempts: number;
  passed: number;
  failed: number;
  average_percentage: number;
  highest_score: number;
  lowest_score: number;
}

const ResultsPage = () => {
  const { toast } = useToast();

  const [results, setResults] = useState<Result[]>([]);
  const [filteredResults, setFilteredResults] = useState<Result[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  const [filters, setFilters] = useState({
    batch_id: '',
    course_id: '',
    status: '',
    search: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, results]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch results
      const resultsRes = await fetch('/api/assessment/results/');
      if (resultsRes.ok) {
        const resultsData = await resultsRes.json();
        setResults(resultsData.results || resultsData);
        setFilteredResults(resultsData.results || resultsData);
      }

      // Fetch batches
      const batchesRes = await fetch('/api/assessment/batches/');
      if (batchesRes.ok) {
        const batchesData = await batchesRes.json();
        setBatches(batchesData.results || batchesData);
      }

      // Fetch courses
      const coursesRes = await fetch('/api/assessment/courses/');
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(coursesData.results || coursesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load results',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...results];

    if (filters.batch_id) {
      filtered = filtered.filter(r => String(r.batch_name) === filters.batch_id);
    }

    if (filters.course_id) {
      filtered = filtered.filter(r => String(r.course_name) === filters.course_id);
    }

    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(r => 
        r.student_name.toLowerCase().includes(searchLower) ||
        r.student_roll_number.toLowerCase().includes(searchLower) ||
        r.assessment_title.toLowerCase().includes(searchLower)
      );
    }

    setFilteredResults(filtered);
    calculateStats(filtered);
  };

  const calculateStats = (data: Result[]) => {
    if (data.length === 0) {
      setStats(null);
      return;
    }

    const passed = data.filter(r => r.status === 'passed').length;
    const failed = data.length - passed;
    const avgPercentage = data.reduce((sum, r) => sum + r.percentage, 0) / data.length;
    const highest = Math.max(...data.map(r => r.percentage));
    const lowest = Math.min(...data.map(r => r.percentage));

    setStats({
      total_attempts: data.length,
      passed,
      failed,
      average_percentage: Math.round(avgPercentage * 10) / 10,
      highest_score: highest,
      lowest_score: lowest,
    });
  };

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      batch_id: '',
      course_id: '',
      status: '',
      search: '',
    });
  };

  const exportToCSV = () => {
    if (filteredResults.length === 0) {
      toast({
        title: 'No Data',
        description: 'No results to export',
        variant: 'destructive',
      });
      return;
    }

    const headers = [
      'Student Name',
      'Roll Number',
      'Assessment',
      'Batch',
      'Course',
      'Score',
      'Total Questions',
      'Percentage',
      'Status',
      'Time Taken (min)',
      'Submitted At',
    ];

    const rows = filteredResults.map(r => [
      r.student_name,
      r.student_roll_number,
      r.assessment_title,
      r.batch_name,
      r.course_name,
      r.score,
      r.total_questions,
      r.percentage,
      r.status,
      r.time_taken_minutes,
      new Date(r.submitted_at).toLocaleString(),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assessment-results-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: 'Success',
      description: 'Results exported successfully',
    });
  };

  const getStatusBadge = (status: string, percentage: number, passingPercentage: number) => {
    if (status === 'passed') {
      return <Badge className="bg-green-600 hover:bg-green-700 text-white">Passed</Badge>;
    }
    return <Badge variant="destructive">Failed</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assessment Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading results...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{stats.total_attempts}</div>
              <div className="text-xs text-muted-foreground">Total Attempts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
              <div className="text-xs text-muted-foreground">Passed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.average_percentage}%</div>
              <div className="text-xs text-muted-foreground">Average</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold flex items-center gap-1">
                <TrendingUp size={20} className="text-green-600" />
                {stats.highest_score}%
              </div>
              <div className="text-xs text-muted-foreground">Highest</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold flex items-center gap-1">
                <TrendingDown size={20} className="text-red-600" />
                {stats.lowest_score}%
              </div>
              <div className="text-xs text-muted-foreground">Lowest</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter size={20} />
              Filters
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
              <Button size="sm" onClick={exportToCSV}>
                <Download size={16} className="mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Name, roll no, assessment..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch-filter">Batch</Label>
              <Select value={filters.batch_id} onValueChange={(v) => handleFilterChange('batch_id', v)}>
                <SelectTrigger id="batch-filter">
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Batches</SelectItem>
                  {batches.map(batch => (
                    <SelectItem key={batch.id} value={batch.name}>
                      {batch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-filter">Course</Label>
              <Select value={filters.course_id} onValueChange={(v) => handleFilterChange('course_id', v)}>
                <SelectTrigger id="course-filter">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Courses</SelectItem>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.name}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Results</CardTitle>
            <Badge variant="secondary">{filteredResults.length} Records</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filteredResults.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No results found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time Taken</TableHead>
                    <TableHead>Submitted At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium">{result.student_name}</TableCell>
                      <TableCell>{result.student_roll_number}</TableCell>
                      <TableCell>{result.assessment_title}</TableCell>
                      <TableCell>{result.batch_name}</TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {result.score}/{result.total_questions}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{result.percentage}%</span>
                          {result.percentage >= result.passing_percentage ? (
                            <Award size={16} className="text-green-600" />
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(result.status, result.percentage, result.passing_percentage)}
                      </TableCell>
                      <TableCell>{result.time_taken_minutes} min</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(result.submitted_at).toLocaleString()}
                      </TableCell>
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

export default ResultsPage;