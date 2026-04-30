import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Users } from "lucide-react";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

interface Assessment {
  id: number;
  title: string;
  total_questions: number;
  duration_minutes: number;
  passing_percentage: number;
  status: string;
}

interface Batch {
  id: number;
  name: string;
  semester: number;
  branch: string;
}

interface Assignment {
  id: number;
  assessment: Assessment;
  batch: Batch;
  start_time: string;
  end_time: string;
  status: string;
}

const AssignAssessment = () => {
  const { toast } = useToast();
  const MySwal = withReactContent(Swal);

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    assessment_id: '',
    batch_id: '',
    start_time: '',
    end_time: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch approved assessments
      const assessmentsRes = await fetch('/api/assessment/assessments/?status=approved');
      if (assessmentsRes.ok) {
        const assessmentsData = await assessmentsRes.json();
        setAssessments(assessmentsData.results || assessmentsData);
      }

      // Fetch batches
      const batchesRes = await fetch('/api/assessment/batches/');
      if (batchesRes.ok) {
        const batchesData = await batchesRes.json();
        setBatches(batchesData.results || batchesData);
      }

      // Fetch existing assignments
      const assignmentsRes = await fetch('/api/assessment/assignments/');
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        setAssignments(assignmentsData.results || assignmentsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.assessment_id) {
      MySwal.fire('Validation Error', 'Please select an assessment', 'warning');
      return false;
    }
    if (!formData.batch_id) {
      MySwal.fire('Validation Error', 'Please select a batch', 'warning');
      return false;
    }
    if (!formData.start_time) {
      MySwal.fire('Validation Error', 'Please select start date and time', 'warning');
      return false;
    }
    if (!formData.end_time) {
      MySwal.fire('Validation Error', 'Please select end date and time', 'warning');
      return false;
    }

    const start = new Date(formData.start_time);
    const end = new Date(formData.end_time);

    if (end <= start) {
      MySwal.fire('Validation Error', 'End time must be after start time', 'warning');
      return false;
    }

    return true;
  };

  const handleAssign = async () => {
    if (!validateForm()) return;

    const result = await MySwal.fire({
      title: 'Assign Assessment?',
      text: 'This will make the assessment available to the selected batch.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: 'hsl(var(--primary))',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Assign',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      setSubmitting(true);

      const payload = {
        assessment_id: Number(formData.assessment_id),
        batch_id: Number(formData.batch_id),
        start_time: formData.start_time,
        end_time: formData.end_time,
      };

      const response = await fetch('/api/assessment/assignments/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to assign assessment');

      const newAssignment = await response.json();

      toast({
        title: 'Success',
        description: 'Assessment assigned successfully',
      });

      // Reset form
      setFormData({
        assessment_id: '',
        batch_id: '',
        start_time: '',
        end_time: '',
      });

      // Refresh assignments list
      fetchData();
    } catch (error) {
      console.error('Error assigning assessment:', error);
      MySwal.fire('Error', 'Failed to assign assessment. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      active: { variant: 'default', label: 'Active' },
      upcoming: { variant: 'secondary', label: 'Upcoming' },
      completed: { variant: 'outline', label: 'Completed' },
    };

    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assign Assessment to Batch</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignment Form */}
      <Card>
        <CardHeader>
          <CardTitle>Assign Assessment to Batch</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="assessment">Assessment *</Label>
              <Select value={formData.assessment_id} onValueChange={(v) => handleFormChange('assessment_id', v)}>
                <SelectTrigger id="assessment">
                  <SelectValue placeholder="Select Assessment" />
                </SelectTrigger>
                <SelectContent>
                  {assessments.map((assessment) => (
                    <SelectItem key={assessment.id} value={String(assessment.id)}>
                      {assessment.title} ({assessment.total_questions} questions)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch">Batch *</Label>
              <Select value={formData.batch_id} onValueChange={(v) => handleFormChange('batch_id', v)}>
                <SelectTrigger id="batch">
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((batch) => (
                    <SelectItem key={batch.id} value={String(batch.id)}>
                      {batch.name} - {batch.branch} (Sem {batch.semester})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-time">Start Date & Time *</Label>
              <Input
                id="start-time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => handleFormChange('start_time', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-time">End Date & Time *</Label>
              <Input
                id="end-time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => handleFormChange('end_time', e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6">
            <Button onClick={handleAssign} disabled={submitting} className="w-full md:w-auto">
              {submitting ? 'Assigning...' : 'Assign Assessment'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Assignments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Existing Assignments</CardTitle>
            <Badge variant="secondary">{assignments.length} Total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No assignments created yet
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <Card key={assignment.id} className="border">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="font-semibold">{assignment.assessment.title}</div>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users size={14} />
                            {assignment.batch.name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            {new Date(assignment.start_time).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            {new Date(assignment.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(assignment.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline">{assignment.assessment.total_questions} Questions</Badge>
                          <Badge variant="outline">{assignment.assessment.duration_minutes} min</Badge>
                          <Badge variant="outline">Pass: {assignment.assessment.passing_percentage}%</Badge>
                        </div>
                      </div>

                      <div>
                        {getStatusBadge(assignment.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AssignAssessment;