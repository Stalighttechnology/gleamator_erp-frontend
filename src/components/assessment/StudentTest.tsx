import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, XCircle, Award } from "lucide-react";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

interface Question {
  id: number;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

interface Assessment {
  id: number;
  title: string;
  duration_minutes: number;
  passing_percentage: number;
  total_questions: number;
}

interface Assignment {
  id: number;
  assessment: Assessment;
  start_time: string;
  end_time: string;
}

interface Attempt {
  id: number;
  start_time: string;
  end_time: string | null;
  score: number | null;
  percentage: number | null;
  status: 'in_progress' | 'submitted';
}

const StudentTest = () => {
  const { toast } = useToast();
  const MySwal = withReactContent(Swal);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [currentAssignment, setCurrentAssignment] = useState<Assignment | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; percentage: number; passed: boolean } | null>(null);

  useEffect(() => {
    fetchAvailableAssignments();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (attempt && attempt.status === 'in_progress' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [attempt, timeRemaining]);

  const fetchAvailableAssignments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/assessment/assignments/available/');
      if (!response.ok) throw new Error('Failed to fetch assignments');

      const data = await response.json();
      setAssignments(data.results || data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available assessments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const startAttempt = async (assignment: Assignment) => {
    const result = await MySwal.fire({
      title: 'Start Assessment?',
      html: `
        <div class="text-left space-y-2">
          <p><strong>Title:</strong> ${assignment.assessment.title}</p>
          <p><strong>Questions:</strong> ${assignment.assessment.total_questions}</p>
          <p><strong>Duration:</strong> ${assignment.assessment.duration_minutes} minutes</p>
          <p><strong>Passing:</strong> ${assignment.assessment.passing_percentage}%</p>
        </div>
        <p class="mt-4 text-sm text-gray-600">Once started, the timer cannot be paused.</p>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: 'hsl(var(--primary))',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Start Now',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      setLoading(true);

      const response = await fetch('/api/assessment/attempts/start/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: assignment.id }),
      });

      if (!response.ok) throw new Error('Failed to start attempt');

      const data = await response.json();
      
      setCurrentAssignment(assignment);
      setAttempt(data.attempt);
      setQuestions(data.questions || []);
      setTimeRemaining(assignment.assessment.duration_minutes * 60);
      setAnswers({});

      toast({
        title: 'Assessment Started',
        description: 'Good luck!',
      });
    } catch (error) {
      console.error('Error starting attempt:', error);
      MySwal.fire('Error', 'Failed to start assessment. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleAutoSubmit = () => {
    MySwal.fire({
      title: 'Time Up!',
      text: 'Your assessment will be automatically submitted.',
      icon: 'warning',
      showConfirmButton: false,
      timer: 2000,
    });
    setTimeout(() => submitAttempt(), 2000);
  };

  const submitAttempt = async () => {
    if (!attempt) return;

    const unanswered = questions.filter(q => !answers[q.id]).length;

    if (unanswered > 0 && timeRemaining > 0) {
      const result = await MySwal.fire({
        title: 'Submit Assessment?',
        text: `You have ${unanswered} unanswered question(s). Are you sure you want to submit?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#22c55e',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, Submit',
        cancelButtonText: 'Continue',
      });

      if (!result.isConfirmed) return;
    }

    try {
      setSubmitting(true);

      const payload = {
        attempt_id: attempt.id,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          question_id: Number(questionId),
          selected_answer: answer,
        })),
      };

      const response = await fetch('/api/assessment/attempts/submit/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to submit attempt');

      const resultData = await response.json();

      setResult({
        score: resultData.score,
        percentage: resultData.percentage,
        passed: resultData.percentage >= (currentAssignment?.assessment.passing_percentage || 0),
      });

      setAttempt(null);
      setCurrentAssignment(null);
    } catch (error) {
      console.error('Error submitting attempt:', error);
      MySwal.fire('Error', 'Failed to submit assessment. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Result view
  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assessment Completed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-6 py-8">
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${result.passed ? 'bg-green-100' : 'bg-red-100'}`}>
              {result.passed ? (
                <CheckCircle size={48} className="text-green-600" />
              ) : (
                <XCircle size={48} className="text-red-600" />
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-2">
                {result.passed ? 'Congratulations!' : 'Keep Trying!'}
              </h2>
              <p className="text-muted-foreground">
                {result.passed ? 'You have passed the assessment.' : 'You did not meet the passing criteria.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary">{result.score}</div>
                  <div className="text-sm text-muted-foreground">Score</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary">{result.percentage}%</div>
                  <div className="text-sm text-muted-foreground">Percentage</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary">
                    {currentAssignment?.assessment.passing_percentage || 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Passing</div>
                </CardContent>
              </Card>
            </div>

            <Button onClick={() => { setResult(null); fetchAvailableAssignments(); }}>
              Back to Assessments
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Test in progress view
  if (attempt && currentAssignment) {
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = questions.length;

    return (
      <div className="space-y-4">
        {/* Header with timer */}
        <Card className="sticky top-0 z-10 border-2 border-primary">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-lg">{currentAssignment.assessment.title}</h2>
                <div className="text-sm text-muted-foreground">
                  Question {answeredCount} of {totalQuestions} answered
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-2 text-lg font-bold">
                    <Clock size={20} />
                    <span className={timeRemaining < 300 ? 'text-red-600' : ''}>
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">Time Remaining</div>
                </div>
                <Button
                  onClick={submitAttempt}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((question) => (
            <Card key={question.id} className={answers[question.id] ? 'border-green-500' : ''}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Badge variant={answers[question.id] ? 'default' : 'outline'}>
                    Q{question.question_number}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium">{question.question_text}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={answers[question.id] || ''}
                  onValueChange={(value) => handleAnswerChange(question.id, value)}
                >
                  <div className="space-y-3">
                    {['A', 'B', 'C', 'D'].map((option) => (
                      <div key={option} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                        <RadioGroupItem value={option} id={`q${question.id}-${option}`} />
                        <Label htmlFor={`q${question.id}-${option}`} className="flex-1 cursor-pointer">
                          <span className="font-medium">{option}.</span> {question[`option_${option.toLowerCase()}` as keyof Question]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Available assessments view
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Available Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading assessments...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Available Assessments</CardTitle>
          <Badge variant="secondary">{assignments.length} Available</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No assessments available at the moment
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <Card key={assignment.id} className="border-2 hover:border-primary transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="font-bold text-lg mb-1">{assignment.assessment.title}</h3>
                        <div className="text-sm text-muted-foreground">
                          Available until {new Date(assignment.end_time).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Award size={14} />
                          {assignment.assessment.total_questions} Questions
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock size={14} />
                          {assignment.assessment.duration_minutes} minutes
                        </Badge>
                        <Badge variant="outline">
                          Pass: {assignment.assessment.passing_percentage}%
                        </Badge>
                      </div>
                    </div>

                    <Button onClick={() => startAttempt(assignment)}>
                      Start Assessment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentTest;