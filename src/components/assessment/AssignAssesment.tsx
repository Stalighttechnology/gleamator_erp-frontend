import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { Calendar, Clock, Users } from "lucide-react";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

interface Assessment {
  id: number;
  title: string;
  total_questions?: number;
  question_count?: number;
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
  assessment?: Assessment;
  assessment_title?: string;
  question_count?: number;
  batch?: Batch;
  batch_name?: string;
  start_time: string;
  end_time: string;
  status?: string;
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
  const selectedAssessment = assessments.find((assessment) => String(assessment.id) === formData.assessment_id);
  const canAssignSelectedAssessment = selectedAssessment?.status === 'approved';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all assessments so faculty can see pending/rejected tests, but assign only after approval.
      const assessmentsRes = await fetchWithTokenRefresh('/api/assessment/assessments/?status=all');
      if (assessmentsRes.ok) {
        const assessmentsData = await assessmentsRes.json();
        const assessmentList = assessmentsData.results?.assessments || assessmentsData.assessments || assessmentsData.results || assessmentsData;
        setAssessments(Array.isArray(assessmentList) ? assessmentList : []);
      }

      // Fetch batches
      const batchesRes = await fetchWithTokenRefresh('/api/assessment/batches/');
      if (batchesRes.ok) {
        const batchesData = await batchesRes.json();
        const batchList = batchesData.results?.batches || batchesData.batches || batchesData.results || batchesData;
        setBatches(Array.isArray(batchList) ? batchList : []);
      }

      // Fetch existing assignments
      const assignmentsRes = await fetchWithTokenRefresh('/api/assessment/assignments/');
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        const assignmentList = assignmentsData.results?.assignments || assignmentsData.assignments || assignmentsData.results || assignmentsData;
        setAssignments(Array.isArray(assignmentList) ? assignmentList : []);
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
    if (!canAssignSelectedAssessment) {
      MySwal.fire('Approval Required', 'This assessment must be approved by admin before assignment', 'warning');
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

      const response = await fetchWithTokenRefresh('/api/assessment/assignments/', {
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
      draft: { variant: 'outline', label: 'Draft' },
      pending: { variant: 'secondary', label: 'Pending Approval' },
      approved: { variant: 'default', label: 'Approved' },
      rejected: { variant: 'destructive', label: 'Rejected' },
    };

    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assign Assessment</h1>
          <p className="text-sm text-muted-foreground">Assign approved assessments to batches with a schedule.</p>
        </div>

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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assign Assessment</h1>
        <p className="text-sm text-muted-foreground">Assign approved assessments to batches with a schedule.</p>
      </div>

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
                      {assessment.title} ({assessment.question_count ?? assessment.total_questions ?? 0} questions) - {assessment.status === 'approved' ? 'Approved' : 'Waiting for approval'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAssessment && !canAssignSelectedAssessment && (
                <p className="text-xs text-muted-foreground">
                  Admin approval is required before this assessment can be assigned.
                </p>
              )}
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
            <Button onClick={handleAssign} disabled={submitting || !canAssignSelectedAssessment} className="w-full md:w-auto">
              {submitting ? 'Assigning...' : !selectedAssessment ? 'Select Assessment' : canAssignSelectedAssessment ? 'Assign Assessment' : 'Waiting for Admin Approval'}
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
                        <div className="font-semibold">{assignment.assessment?.title || assignment.assessment_title || '-'}</div>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users size={14} />
                            {assignment.batch?.name || assignment.batch_name || '-'}
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
                          <Badge variant="outline">{assignment.assessment?.total_questions ?? assignment.assessment?.question_count ?? assignment.question_count ?? 0} Questions</Badge>
                          <Badge variant="outline">{assignment.assessment?.duration_minutes ?? '-'} min</Badge>
                          <Badge variant="outline">Pass: {assignment.assessment?.passing_percentage ?? '-'}%</Badge>
                        </div>
                      </div>

                      <div>
                        {getStatusBadge(assignment.status || 'active')}
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
