import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserCheck,
  Users,
  User,
  Search,
  Plus,
  CheckCircle,
  AlertTriangle,
  Calendar,
  IndianRupee
} from 'lucide-react';

interface Student {
  id: number;
  name: string;
  usn: string;
  department: string;
  semester: number;
  batch: string;
}

interface FeeTemplate {
  id: number;
  name: string;
  total_amount: number;
  fee_type: string;
  semester?: number;
}

interface FeeAssignment {
  id: number;
  student: Student;
  template: FeeTemplate;
  academic_year: string;
  assignment_type: string;
  assigned_at: string;
  is_active: boolean;
}

const FeeAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<FeeAssignment[]>([]);
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [assignmentsPageSize] = useState(50);
  const [assignmentsTotalPages, setAssignmentsTotalPages] = useState(1);
  const [assignmentsTotalCount, setAssignmentsTotalCount] = useState(0);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsTotalPages, setStudentsTotalPages] = useState(1);
  const [studentsTotalCount, setStudentsTotalCount] = useState(0);
  const [templates, setTemplates] = useState<FeeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  // Assignment form states
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [academicYear, setAcademicYear] = useState('2024-25');
  const [assignmentType, setAssignmentType] = useState('individual');

  // Batch assignment states
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchAssignments(assignmentsPage);
  }, []);
  const fetchAssignments = async (page: number = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/fees-manager/fee-assignments/?page=${page}&page_size=${assignmentsPageSize}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch fee assignments');

      const data = await res.json();
      // API returns { data: [...], meta: {count,page,page_size,...} }
      setAssignments(data.data || []);
      const meta = data.meta || {};
      setAssignmentsPage(meta.page || page);
      setAssignmentsTotalPages(meta.total_pages || Math.max(1, Math.ceil((meta.count || 0) / assignmentsPageSize)));
      setAssignmentsTotalCount(meta.count || (data.data || []).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentsPrev = () => {
    if (assignmentsPage > 1) {
      const next = assignmentsPage - 1;
      setAssignmentsPage(next);
      fetchAssignments(next);
    }
  };

  const handleAssignmentsNext = () => {
    if (assignmentsPage < assignmentsTotalPages) {
      const next = assignmentsPage + 1;
      setAssignmentsPage(next);
      fetchAssignments(next);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('access_token');
      // Fetch a reasonably sized page for select lists (paginated)
      const page = 1;
      const page_size = 50;
      const res = await fetch(`http://127.0.0.1:8000/api/fees-manager/students/?page=${page}&page_size=${page_size}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch students');
      const data = await res.json();
      setStudents(data.data || []);
      const meta = data.meta || {};
      setStudentsPage(meta.page || 1);
      setStudentsTotalPages(meta.total_pages || 1);
      setStudentsTotalCount(meta.count || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudentsPage = async (page: number) => {
    try {
      const token = localStorage.getItem('access_token');
      const page_size = 50;
      const res = await fetch(`http://127.0.0.1:8000/api/fees-manager/students/?page=${page}&page_size=${page_size}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch students');
      const data = await res.json();
      setStudents(data.data || []);
      const meta = data.meta || {};
      setStudentsPage(meta.page || 1);
      setStudentsTotalPages(meta.total_pages || 1);
      setStudentsTotalCount(meta.count || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStudentsPrev = () => {
    if (studentsPage > 1) fetchStudentsPage(studentsPage - 1);
  };

  const handleStudentsNext = () => {
    if (studentsPage < studentsTotalPages) fetchStudentsPage(studentsPage + 1);
  };

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/fees-manager/fee-templates/?page=1&page_size=100', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      setTemplates(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setSelectedStudent('');
    setSelectedTemplate('');
    setAcademicYear('2024-25');
    setAssignmentType('individual');
    setSelectedBatch('');
    setSelectedDepartment('');
    setSelectedSemester('');
  };

  const handleIndividualAssignment = async () => {
    if (!selectedStudent || !selectedTemplate) return;

    try {
      const token = localStorage.getItem('access_token');
      const assignmentData = {
        student_id: parseInt(selectedStudent),
        template_id: parseInt(selectedTemplate),
        academic_year: academicYear,
      };

      const response = await fetch('http://127.0.0.1:8000/api/fees-manager/fee-assignments/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create assignment');
      }

      // Try to update UI locally without an extra GET
      const respJson = await response.json().catch(() => null);
      const created = respJson?.data ?? respJson?.assignment ?? respJson;
      if (created && created.id) {
        setAssignments(prev => [created as unknown as FeeAssignment, ...prev]);
        setAssignmentsTotalCount(c => c + 1);
      } else {
        // Server didn't return created object — perform optimistic update using local data
        const studentObj = students.find(s => s.id === parseInt(selectedStudent));
        const templateObj = templates.find(t => t.id === parseInt(selectedTemplate));
        const optimistic: FeeAssignment = {
          id: -Date.now(),
          student: studentObj || { id: parseInt(selectedStudent), name: 'Student', usn: '', department: '', semester: 0 },
          template: templateObj || { id: parseInt(selectedTemplate), name: 'Template', total_amount: 0, fee_type: '' },
          academic_year: academicYear,
          assignment_type: assignmentType,
          assigned_at: new Date().toISOString(),
          is_active: true,
        };
        setAssignments(prev => [optimistic, ...prev]);
      }
      setIsAssignDialogOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment');
    }
  };

  const handleBatchAssignment = async () => {
    if (!selectedTemplate || !selectedBatch) return;

    try {
      const token = localStorage.getItem('access_token');
      const assignmentData = {
        batch: selectedBatch,
        department: selectedDepartment || undefined,
        semester: selectedSemester ? parseInt(selectedSemester) : undefined,
        template_id: parseInt(selectedTemplate),
        academic_year: academicYear,
      };

      const response = await fetch('http://127.0.0.1:8000/api/fees-manager/batch-assignments/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create batch assignment');
      }

      // If server returns created assignments, merge them into current list to avoid re-fetch.
      const respJson = await response.json().catch(() => null);
      const createdList = respJson?.data ?? respJson?.assignments ?? respJson?.created_assignments ?? null;
      if (Array.isArray(createdList) && createdList.length) {
        setAssignments(prev => [...(createdList as FeeAssignment[]), ...prev]);
        setAssignmentsTotalCount(c => c + createdList.length);
      } else {
        // Server didn't return created list — optimistically add assignments for students
        // Use current `students` page as best-effort candidates matching batch/department/semester
        const matched = students.filter(s => {
          const matchesBatch = selectedBatch ? (s.batch ? s.batch === selectedBatch : false) : true;
          const matchesDept = selectedDepartment ? s.department === selectedDepartment : true;
          const matchesSem = selectedSemester ? s.semester === parseInt(selectedSemester) : true;
          return matchesBatch && matchesDept && matchesSem;
        });
        const optimisticList: FeeAssignment[] = matched.map(s => ({
          id: -Date.now() - Math.floor(Math.random() * 1000),
          student: s,
          template: templates.find(t => t.id === parseInt(selectedTemplate)) || { id: parseInt(selectedTemplate), name: 'Template', total_amount: 0, fee_type: '' },
          academic_year: academicYear,
          assignment_type: 'batch',
          assigned_at: new Date().toISOString(),
          is_active: true,
        }));
        if (optimisticList.length) {
          setAssignments(prev => [...optimisticList, ...prev]);
          setAssignmentsTotalCount(c => c + optimisticList.length);
        }
        // If no matched students available locally, just show success and avoid immediate GET
      }
      setIsAssignDialogOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create batch assignment');
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.student.usn.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && assignment.is_active) ||
                         (filterStatus === 'inactive' && !assignment.is_active);
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const templateAmount = (t: any) => {
    if (!t) return 0;
    if (t.total_amount_cents != null) return Number(t.total_amount_cents) / 100;
    if (t.total_amount != null) return Number(t.total_amount);
    return 0;
  };

  const getUniqueValues = <T,>(array: T[], key: keyof T): T[keyof T][] => {
    return [...new Set(array.map(item => item[key]))];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading fee assignments...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-0">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fee Assignments</h1>
          <p className="text-muted-foreground mt-2">Assign fee templates to individual students or entire batches</p>
        </div>

        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogTrigger asChild>
              <Button 
                onClick={async () => {
                  resetForm();
                  // fetch students and templates only when opening the assign dialog
                  try {
                    await Promise.all([fetchStudents(), fetchTemplates()]);
                  } catch (e) {
                    // errors are logged in fetch helpers; continue to open dialog
                  }
                  setIsAssignDialogOpen(true);
                }}
                className="bg-primary hover:bg-primary/90 text-white"
              >
              <Plus className="h-4 w-4 mr-2" />
              Assign Fees
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[94vw] sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Assign Fee Template</DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="individual" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted border border-border">
                <TabsTrigger 
                  value="individual" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-white border border-border"
                >
                  Individual Student
                </TabsTrigger>
                <TabsTrigger 
                  value="batch" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-white border border-border"
                >
                  Batch Assignment
                </TabsTrigger>
              </TabsList>

              <TabsContent value="individual" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student">Select Student *</Label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id.toString()}>
                            {student.name} ({student.usn}) - {student.department} Sem {student.semester}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-sm text-gray-600">Page {studentsPage} of {studentsTotalPages}</div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={handleStudentsPrev} disabled={studentsPage === 1}>Prev</Button>
                        <Button size="sm" variant="outline" onClick={handleStudentsNext} disabled={studentsPage === studentsTotalPages}>Next</Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template">Select Fee Template *</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.name} - {formatCurrency(templateAmount(template))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="academicYear">Academic Year</Label>
                    <Input
                      id="academicYear"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      placeholder="2024-25"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleIndividualAssignment}
                      disabled={!selectedStudent || !selectedTemplate}
                      className="bg-primary hover:bg-primary/90 text-white"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Assign to Student
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="batch" className="space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="batch">Batch *</Label>
                      <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select batch" />
                        </SelectTrigger>
                        <SelectContent>
                          {getUniqueValues(students, 'batch').map((batch) => (
                            <SelectItem key={String(batch)} value={String(batch)}>
                              {String(batch)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department">Department (Optional)</Label>
                      <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                        <SelectTrigger>
                          <SelectValue placeholder="All departments" />
                        </SelectTrigger>
                        <SelectContent>
                          {getUniqueValues(students, 'department').map((dept) => (
                            <SelectItem key={String(dept)} value={String(dept)}>
                              {String(dept)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="semester">Semester (Optional)</Label>
                      <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                        <SelectTrigger>
                          <SelectValue placeholder="All semesters" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1,2,3,4,5,6,7,8].map((sem) => (
                            <SelectItem key={sem} value={sem.toString()}>
                              Semester {sem}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="batchTemplate">Fee Template *</Label>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id.toString()}>
                              {template.name} - {formatCurrency(templateAmount(template))}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="batchAcademicYear">Academic Year</Label>
                    <Input
                      id="batchAcademicYear"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      placeholder="2024-25"
                    />
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This will assign the selected fee template to all students matching the criteria above.
                      Existing assignments will be skipped.
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBatchAssignment}
                      disabled={!selectedBatch || !selectedTemplate}
                      className="bg-primary hover:bg-primary/90 text-white"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Assign to Batch
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by student name or USN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignments</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Fee Assignments ({assignmentsTotalCount ?? filteredAssignments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Fee Assignments</h3>
              <p className="text-gray-600 mb-4">
                {assignments.length === 0
                  ? "Create your first fee assignment to get started"
                  : "No assignments match your search criteria"
                }
              </p>
              {assignments.length === 0 && (
                <Button 
                  onClick={() => setIsAssignDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Assignment
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>USN</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.student.name}
                      </TableCell>
                      <TableCell>{assignment.student.usn}</TableCell>
                      <TableCell>{assignment.student.department}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{assignment.template.name}</p>
                          <p className="text-sm text-gray-600">{assignment.template.fee_type}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(templateAmount(assignment.template))}
                      </TableCell>
                      <TableCell>{assignment.academic_year}</TableCell>
                      <TableCell>
                        <Badge variant={assignment.is_active ? 'default' : 'secondary'}>
                          {assignment.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(assignment.assigned_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">Page {assignmentsPage} of {assignmentsTotalPages}</div>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={handleAssignmentsPrev} disabled={assignmentsPage === 1}>Prev</Button>
              <Button size="sm" variant="outline" onClick={handleAssignmentsNext} disabled={assignmentsPage === assignmentsTotalPages}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeeAssignments;