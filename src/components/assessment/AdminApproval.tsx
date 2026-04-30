import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

interface Question {
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
}

interface Assessment {
  id: number;
  title: string;
  duration_minutes: number;
  passing_percentage: number;
  total_questions: number;
  status: string;
  created_by: string;
  created_at: string;
  questions?: Question[];
}

const AdminApproval = () => {
  const { toast } = useToast();
  const MySwal = withReactContent(Swal);

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [comment, setComment] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchPendingAssessments();
  }, []);

  const fetchPendingAssessments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/assessment/assessments/?status=pending_approval');
      if (!response.ok) throw new Error('Failed to fetch assessments');
      
      const data = await response.json();
      setAssessments(data.results || data);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending assessments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleAction = async (assessmentId: number, action: 'approve' | 'reject') => {
    const actionComment = comment[assessmentId]?.trim();

    if (action === 'reject' && !actionComment) {
      MySwal.fire('Comment Required', 'Please provide a comment when rejecting an assessment', 'warning');
      return;
    }

    const result = await MySwal.fire({
      title: `${action === 'approve' ? 'Approve' : 'Reject'} Assessment?`,
      text: `Are you sure you want to ${action} this assessment?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: action === 'approve' ? '#22c55e' : '#ef4444',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Yes, ${action === 'approve' ? 'Approve' : 'Reject'}`,
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      setProcessingId(assessmentId);

      const payload = {
        status: action === 'approve' ? 'approved' : 'rejected',
        comment: actionComment || '',
      };

      const response = await fetch(`/api/assessment/assessments/${assessmentId}/approve/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Failed to ${action} assessment`);

      toast({
        title: 'Success',
        description: `Assessment ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      });

      // Remove from list
      setAssessments(prev => prev.filter(a => a.id !== assessmentId));
      setComment(prev => {
        const newComment = { ...prev };
        delete newComment[assessmentId];
        return newComment;
      });
    } catch (error) {
      console.error(`Error ${action}ing assessment:`, error);
      MySwal.fire('Error', `Failed to ${action} assessment. Please try again.`, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assessment Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading pending assessments...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Assessment Approvals</CardTitle>
            <Badge variant="secondary">
              {assessments.length} Pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No pending assessments to review
            </div>
          ) : (
            <div className="space-y-4">
              {assessments.map((assessment) => (
                <Card key={assessment.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{assessment.title}</h3>
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <span>Created by: {assessment.created_by || 'Unknown'}</span>
                          <span>•</span>
                          <span>{new Date(assessment.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(assessment.id)}
                      >
                        {expandedId === assessment.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Assessment Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                      <div>
                        <div className="text-xs text-muted-foreground">Questions</div>
                        <div className="font-semibold">{assessment.total_questions}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Duration</div>
                        <div className="font-semibold">{assessment.duration_minutes} min</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Passing %</div>
                        <div className="font-semibold">{assessment.passing_percentage}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Status</div>
                        <Badge variant="outline" className="text-xs">Pending</Badge>
                      </div>
                    </div>

                    {/* Expanded Questions View */}
                    {expandedId === assessment.id && assessment.questions && (
                      <div className="space-y-3 pt-2">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <Eye size={16} />
                          Questions Preview
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                          {assessment.questions.map((q) => (
                            <div key={q.question_number} className="p-3 border rounded-lg bg-background">
                              <div className="font-medium text-sm mb-2">
                                {q.question_number}. {q.question_text}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div className={q.correct_answer === 'A' ? 'text-green-600 font-medium' : ''}>
                                  A. {q.option_a}
                                </div>
                                <div className={q.correct_answer === 'B' ? 'text-green-600 font-medium' : ''}>
                                  B. {q.option_b}
                                </div>
                                <div className={q.correct_answer === 'C' ? 'text-green-600 font-medium' : ''}>
                                  C. {q.option_c}
                                </div>
                                <div className={q.correct_answer === 'D' ? 'text-green-600 font-medium' : ''}>
                                  D. {q.option_d}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Comment Section */}
                    <div className="space-y-2">
                      <Label htmlFor={`comment-${assessment.id}`}>
                        Comment {expandedId === assessment.id && '(Required for rejection)'}
                      </Label>
                      <Textarea
                        id={`comment-${assessment.id}`}
                        placeholder="Add a comment (optional for approval, required for rejection)..."
                        value={comment[assessment.id] || ''}
                        onChange={(e) => setComment(prev => ({ ...prev, [assessment.id]: e.target.value }))}
                        rows={2}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleAction(assessment.id, 'approve')}
                        disabled={processingId === assessment.id}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle size={16} className="mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleAction(assessment.id, 'reject')}
                        disabled={processingId === assessment.id}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle size={16} className="mr-2" />
                        Reject
                      </Button>
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

export default AdminApproval;