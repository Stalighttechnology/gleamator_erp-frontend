import { useState } from "react";
import { QuestionPayload } from "./types";
import API from "@/lib/axios";

const QuestionForm = () => {
  const [form, setForm] = useState<QuestionPayload>({
    question_text: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: "A",
    explanation: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (key: keyof QuestionPayload, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      await API.post("/assessment/questions/", form);

      alert("✅ Question created successfully");

      setForm({
        question_text: "",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_answer: "A",
        explanation: "",
      });
    } catch (err) {
      console.error(err);
      alert("❌ Failed to create question");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <textarea
        placeholder="Enter question"
        value={form.question_text}
        onChange={(e) => handleChange("question_text", e.target.value)}
        className="w-full p-3 border rounded"
      />

      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Option A" value={form.option_a} onChange={(e) => handleChange("option_a", e.target.value)} className="input" />
        <input placeholder="Option B" value={form.option_b} onChange={(e) => handleChange("option_b", e.target.value)} className="input" />
        <input placeholder="Option C" value={form.option_c} onChange={(e) => handleChange("option_c", e.target.value)} className="input" />
        <input placeholder="Option D" value={form.option_d} onChange={(e) => handleChange("option_d", e.target.value)} className="input" />
      </div>

      <select
        value={form.correct_answer}
        onChange={(e) => handleChange("correct_answer", e.target.value)}
        className="p-2 border rounded"
      >
        <option value="A">Correct: A</option>
        <option value="B">Correct: B</option>
        <option value="C">Correct: C</option>
        <option value="D">Correct: D</option>
      </select>

      <textarea
        placeholder="Explanation (optional)"
        value={form.explanation}
        onChange={(e) => handleChange("explanation", e.target.value)}
        className="w-full p-3 border rounded"
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Creating..." : "Create Question"}
      </button>
    </div>
  );
};

export default QuestionForm;