import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  UserCheck,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Play,
  Settings
} from 'lucide-react';

interface BulkAssignmentStats {
  admission_mode: string;
  department: string;
  total_students: number;
  assigned_students: number;
  unassigned_students: number;
  available_templates: Array<{
    id: number;
    name: string;
    total_amount: number;
  }>;
}

interface FeeTemplate {
  id: number;
  name: string;
  total_amount: number;
  fee_type: string;
  semester?: number;
}

interface BulkAssignmentRequest {
  admission_mode: string;
  department: string;
  template_id: number;
  academic_year: string;
  dry_run: boolean;
}

interface BulkAssignmentResponse {
  assignments_created: number;
  invoices_created: number;
  dry_run: boolean;
  message?: string;
}

interface AutoAssignmentRequest {
  admission_modes: string[];
  departments: string[];
  academic_year: string;
  dry_run: boolean;
}

interface AutoAssignmentResponse {
  total_assignments_created: number;
  total_invoices_created: number;
  dry_run: boolean;
  results: Array<{
    admission_mode: string;
    department: string;
    assignments_created: number;
    invoices_created: number;
  }>;
}

const BulkAssignment: React.FC = () => {
  const [stats, setStats] = useState<BulkAssignmentStats[]>([]);
  const [templates, setTemplates] = useState<FeeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isAutoDialogOpen, setIsAutoDialogOpen] = useState(false);

  // Bulk assignment form
  const [bulkForm, setBulkForm] = useState({
    admission_mode: '',
    department: '',
    template_id: 0,
    academic_year: new Date().getFullYear().toString() + '-' + (new Date().getFullYear() + 1).toString().slice(-2),
    dry_run: false,
  });

  // Auto assignment form
  const [autoForm, setAutoForm] = useState({
    admission_modes: [] as string[],
    departments: [] as string[],
    academic_year: new Date().getFullYear().toString() + '-' + (new Date().getFullYear() + 1).toString().slice(-2),
    dry_run: true,
  });

  // Available options
  const [admissionModes, setAdmissionModes] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      const [statsRes, templatesRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/fees-manager/bulk-assignment-stats/', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('http://127.0.0.1:8000/api/fees-manager/fee-templates/?page=1&page_size=200', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (!statsRes.ok || !templatesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [statsData, templatesData] = await Promise.all([
        statsRes.json(),
        templatesRes.json(),
      ]);

      setStats(statsData.data?.bulk_assignment_stats || []);
      setTemplates(templatesData.data || []);

      // Extract unique admission modes and departments
      const modes = [...new Set(stats.map(s => s.admission_mode))];
      const depts = [...new Set(stats.map(s => s.department))];
      setAdmissionModes(modes);
      setDepartments(depts);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssignment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bulkForm.admission_mode || !bulkForm.department || !bulkForm.template_id) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://127.0.0.1:8000/api/fees-manager/bulk-assign-fees/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bulkForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Bulk assignment failed');
      }

      const result: BulkAssignmentResponse = await response.json();

      const message = result.dry_run
        ? `Dry run completed: ${result.assignments_created} assignments would be created, ${result.invoices_created} invoices would be generated.`
        : `Bulk assignment completed: ${result.assignments_created} assignments created, ${result.invoices_created} invoices generated.`;

      alert(message);
      await fetchData();
      setIsBulkDialogOpen(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk assignment failed');
    }
  };

  const handleAutoAssignment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (autoForm.admission_modes.length === 0 || autoForm.departments.length === 0) {
      setError('Please select at least one admission mode and department');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://127.0.0.1:8000/api/fees-manager/auto-assign-fees/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(autoForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Auto assignment failed');
      }

      const result: AutoAssignmentResponse = await response.json();

      const message = result.dry_run
        ? `Dry run completed: ${result.total_assignments_created} assignments would be created, ${result.total_invoices_created} invoices would be generated.`
        : `Auto assignment completed: ${result.total_assignments_created} assignments created, ${result.total_invoices_created} invoices generated.`;

      alert(message);
      await fetchData();
      setIsAutoDialogOpen(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto assignment failed');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getAssignmentProgress = (stat: BulkAssignmentStats) => {
    const progress = (stat.assigned_students / stat.total_students) * 100;
    return Math.round(progress);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading bulk assignment data...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-0">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bulk Fee Assignment</h1>
          <p className="text-muted-foreground mt-2">Mass assign fee templates to students by admission mode and department</p>
        </div>

        <div className="flex gap-3">
          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white">
                <UserCheck className="h-4 w-4 mr-2" />
                Manual Bulk Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Manual Bulk Assignment</DialogTitle>
                <DialogDescription>
                  Assign a specific fee template to students matching the selected criteria.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleBulkAssignment} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="admission_mode">Admission Mode *</Label>
                    <Select
                      value={bulkForm.admission_mode}
                      onValueChange={(value) => setBulkForm({ ...bulkForm, admission_mode: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select admission mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {admissionModes.map((mode) => (
                          <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Select
                      value={bulkForm.department}
                      onValueChange={(value) => setBulkForm({ ...bulkForm, department: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template">Fee Template *</Label>
                  <Select
                    value={bulkForm.template_id.toString()}
                    onValueChange={(value) => setBulkForm({ ...bulkForm, template_id: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id.toString()}>
                              {template.name} - {formatCurrency((template.total_amount_cents != null ? Number(template.total_amount_cents) / 100 : (template.total_amount != null ? Number(template.total_amount) : 0)))}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="academic_year">Academic Year</Label>
                  <Input
                    id="academic_year"
                    value={bulkForm.academic_year}
                    onChange={(e) => setBulkForm({ ...bulkForm, academic_year: e.target.value })}
                    placeholder="2024-25"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dry_run"
                    checked={bulkForm.dry_run}
                    onCheckedChange={(checked) => setBulkForm({ ...bulkForm, dry_run: !!checked })}
                  />
                  <Label htmlFor="dry_run">Dry run (preview only, no changes made)</Label>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {bulkForm.dry_run
                      ? "This will show how many assignments would be created without making any changes."
                      : "This will create fee assignments and generate invoices for all matching students."
                    }
                  </AlertDescription>
                </Alert>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {bulkForm.dry_run ? 'Preview Assignment' : 'Execute Assignment'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAutoDialogOpen} onOpenChange={setIsAutoDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-primary hover:bg-primary/90 text-white border-primary">
                <Settings className="h-4 w-4 mr-2" />
                Auto Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Automatic Bulk Assignment</DialogTitle>
                <DialogDescription>
                  Automatically assign appropriate fee templates based on student criteria.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleAutoAssignment} className="space-y-4">
                <div className="space-y-2">
                  <Label>Admission Modes *</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                    {admissionModes.map((mode) => (
                      <div key={mode} className="flex items-center space-x-2">
                        <Checkbox
                          id={`auto-${mode}`}
                          checked={autoForm.admission_modes.includes(mode)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setAutoForm({
                                ...autoForm,
                                admission_modes: [...autoForm.admission_modes, mode]
                              });
                            } else {
                              setAutoForm({
                                ...autoForm,
                                admission_modes: autoForm.admission_modes.filter(m => m !== mode)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`auto-${mode}`} className="text-sm">{mode}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Departments *</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                    {departments.map((dept) => (
                      <div key={dept} className="flex items-center space-x-2">
                        <Checkbox
                          id={`dept-${dept}`}
                          checked={autoForm.departments.includes(dept)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setAutoForm({
                                ...autoForm,
                                departments: [...autoForm.departments, dept]
                              });
                            } else {
                              setAutoForm({
                                ...autoForm,
                                departments: autoForm.departments.filter(d => d !== dept)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`dept-${dept}`} className="text-sm">{dept}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auto_academic_year">Academic Year</Label>
                  <Input
                    id="auto_academic_year"
                    value={autoForm.academic_year}
                    onChange={(e) => setAutoForm({ ...autoForm, academic_year: e.target.value })}
                    placeholder="2024-25"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto_dry_run"
                    checked={autoForm.dry_run}
                    onCheckedChange={(checked) => setAutoForm({ ...autoForm, dry_run: !!checked })}
                  />
                  <Label htmlFor="auto_dry_run">Dry run (recommended for first attempt)</Label>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Auto assignment will match students with appropriate fee templates based on their admission mode, department, and semester.
                    {autoForm.dry_run ? " This is a preview - no changes will be made." : " This will create assignments and invoices."}
                  </AlertDescription>
                </Alert>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsAutoDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {autoForm.dry_run ? 'Preview Auto Assignment' : 'Execute Auto Assignment'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Assignment Statistics */}
      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Assignment Statistics
            </CardTitle>
            <CardDescription>
              Overview of students and available templates for bulk assignment
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No assignment statistics available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats.map((stat, index) => {
                  const progress = getAssignmentProgress(stat);
                  return (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg text-foreground">{stat.admission_mode}</h3>
                            <p className="text-sm text-muted-foreground">{stat.department}</p>
                          </div>
                          <Badge variant="outline">{stat.total_students} students</Badge>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-foreground">Assigned:</span>
                            <span className="font-medium text-green-600">{stat.assigned_students}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-foreground">Unassigned:</span>
                            <span className="font-medium text-red-600">{stat.unassigned_students}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-center text-gray-600">{progress}% assigned</div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-foreground mb-2 block">
                            Available Templates:
                          </Label>
                          <div className="flex flex-wrap gap-1">
                            {stat.available_templates.map((template) => (
                              <Badge key={template.id} variant="secondary" className="text-xs">
                                {template.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.reduce((sum, stat) => sum + stat.total_students, 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Students Assigned</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.reduce((sum, stat) => sum + stat.assigned_students, 0)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Students Unassigned</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.reduce((sum, stat) => sum + stat.unassigned_students, 0)}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BulkAssignment;