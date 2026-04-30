import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import QuestionBuilder from "./QuestionBuilder";
import { fetchWithTokenRefresh } from "@/utils/authService";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
}

interface AssessmentFormData {
  title: string;
  duration_minutes: number;
  passing_percentage: number;
  total_questions: number;
}

const CreateAssessment = () => {
  const { toast } = useToast();
  const MySwal = withReactContent(Swal);

  const [formData, setFormData] = useState<AssessmentFormData>({
    title: '',
    duration_minutes: 60,
    passing_percentage: 40,
    total_questions: 10,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFormChange = (field: keyof AssessmentFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const initializeQuestions = () => {
    if (!formData.title.trim()) {
      MySwal.fire('Validation Error', 'Please enter assessment title first', 'warning');
      return;
    }

    if (formData.total_questions < 1 || formData.total_questions > 50) {
      MySwal.fire('Validation Error', 'Number of questions must be between 1 and 50', 'warning');
      return;
    }

    const newQuestions: Question[] = Array.from({ length: formData.total_questions }, (_, i) => ({
      id: `q-${Date.now()}-${i}`,
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'A',
    }));

    setQuestions(newQuestions);
    setShowQuestions(true);
    toast({ title: 'Success', description: `${formData.total_questions} questions initialized` });
  };

  const updateQuestion = (id: string, field: keyof Question, value: string) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const validateQuestions = (): boolean => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        MySwal.fire('Validation Error', `Question ${i + 1}: Question text is required`, 'error');
        return false;
      }
      if (!q.option_a.trim() || !q.option_b.trim() || !q.option_c.trim() || !q.option_d.trim()) {
        MySwal.fire('Validation Error', `Question ${i + 1}: All options are required`, 'error');
        return false;
      }
    }
    return true;
  };

  const buildPayload = () => ({
    title: formData.title,
    duration_minutes: formData.duration_minutes,
    passing_percentage: formData.passing_percentage,
    total_questions: formData.total_questions,
    questions: questions.map((q, idx) => ({
      question_number: idx + 1,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
    })),
  });

  const saveAssessment = async (status: 'draft' | 'pending_approval') => {
    if (!validateQuestions()) return;

    try {
      setSaving(true);
      const payload = buildPayload();

      // API call simulation
      const response = await fetchWithTokenRefresh('/api/assessment/assessments/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to save assessment');

      const result = await response.json();
      if (status === 'pending_approval') {
        const approvalResponse = await fetchWithTokenRefresh(`/api/assessment/assessments/${result.assessment_id}/submit-approval/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!approvalResponse.ok) throw new Error('Failed to submit assessment for approval');
      }

      MySwal.fire({
        title: 'Success!',
        text: status === 'draft' ? 'Assessment saved as draft' : 'Assessment submitted for approval',
        icon: 'success',
        confirmButtonColor: 'hsl(var(--primary))',
      });

      // Reset form
      setFormData({ title: '', duration_minutes: 60, passing_percentage: 40, total_questions: 10 });
      setQuestions([]);
      setShowQuestions(false);
    } catch (error) {
      console.error('Error saving assessment:', error);
      MySwal.fire('Error', 'Failed to save assessment. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Assessment</h1>
        <p className="text-sm text-muted-foreground">Build an assessment and add questions for students.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Assessment Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Data Structures Mid-Term"
                value={formData.title}
                onChange={(e) => handleFormChange('title', e.target.value)}
                disabled={showQuestions}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                min="5"
                max="300"
                value={formData.duration_minutes}
                onChange={(e) => handleFormChange('duration_minutes', Number(e.target.value))}
                disabled={showQuestions}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passing">Passing Percentage *</Label>
              <Input
                id="passing"
                type="number"
                min="0"
                max="100"
                value={formData.passing_percentage}
                onChange={(e) => handleFormChange('passing_percentage', Number(e.target.value))}
                disabled={showQuestions}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total-questions">Number of Questions (max 50) *</Label>
              <Input
                id="total-questions"
                type="number"
                min="1"
                max="50"
                value={formData.total_questions}
                onChange={(e) => handleFormChange('total_questions', Number(e.target.value))}
                disabled={showQuestions}
              />
            </div>
          </div>

          {!showQuestions && (
            <div className="mt-6">
              <Button onClick={initializeQuestions} className="w-full md:w-auto">
                Initialize Questions
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showQuestions && (
        <>
          <QuestionBuilder questions={questions} updateQuestion={updateQuestion} />

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => saveAssessment('draft')}
                  variant="outline"
                  disabled={saving}
                  className="flex-1 md:flex-none"
                >
                  {saving ? 'Saving...' : 'Save as Draft'}
                </Button>
                <Button
                  onClick={() => saveAssessment('pending_approval')}
                  disabled={saving}
                  className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white"
                >
                  {saving ? 'Submitting...' : 'Submit for Approval'}
                </Button>
                <Button
                  onClick={() => {
                    setShowQuestions(false);
                    setQuestions([]);
                  }}
                  variant="ghost"
                  disabled={saving}
                  className="flex-1 md:flex-none"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default CreateAssessment;
