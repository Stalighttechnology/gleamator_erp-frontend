import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
}

interface QuestionBuilderProps {
  questions: Question[];
  updateQuestion: (id: string, field: keyof Question, value: string) => void;
}

const QuestionBuilder = ({ questions, updateQuestion }: QuestionBuilderProps) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Questions</CardTitle>
            <Badge variant="secondary" className="text-sm">
              {questions.length} {questions.length === 1 ? 'Question' : 'Questions'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {questions.map((question, index) => (
            <Card key={question.id} className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {index + 1}
                  </span>
                  Question {index + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Question Text */}
                <div className="space-y-2">
                  <Label htmlFor={`question-${question.id}`}>
                    Question Text *
                  </Label>
                  <Textarea
                    id={`question-${question.id}`}
                    placeholder="Enter your question here..."
                    value={question.question_text}
                    onChange={(e) => updateQuestion(question.id, 'question_text', e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`option-a-${question.id}`}>Option A *</Label>
                    <Input
                      id={`option-a-${question.id}`}
                      placeholder="Option A"
                      value={question.option_a}
                      onChange={(e) => updateQuestion(question.id, 'option_a', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`option-b-${question.id}`}>Option B *</Label>
                    <Input
                      id={`option-b-${question.id}`}
                      placeholder="Option B"
                      value={question.option_b}
                      onChange={(e) => updateQuestion(question.id, 'option_b', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`option-c-${question.id}`}>Option C *</Label>
                    <Input
                      id={`option-c-${question.id}`}
                      placeholder="Option C"
                      value={question.option_c}
                      onChange={(e) => updateQuestion(question.id, 'option_c', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`option-d-${question.id}`}>Option D *</Label>
                    <Input
                      id={`option-d-${question.id}`}
                      placeholder="Option D"
                      value={question.option_d}
                      onChange={(e) => updateQuestion(question.id, 'option_d', e.target.value)}
                    />
                  </div>
                </div>

                {/* Correct Answer */}
                <div className="space-y-2">
                  <Label htmlFor={`correct-${question.id}`}>Correct Answer *</Label>
                  <Select
                    value={question.correct_answer}
                    onValueChange={(value) => updateQuestion(question.id, 'correct_answer', value)}
                  >
                    <SelectTrigger id={`correct-${question.id}`} className="w-full md:w-48">
                      <SelectValue placeholder="Select correct answer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Option A</SelectItem>
                      <SelectItem value="B">Option B</SelectItem>
                      <SelectItem value="C">Option C</SelectItem>
                      <SelectItem value="D">Option D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuestionBuilder;