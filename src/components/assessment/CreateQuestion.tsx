import QuestionForm from "./QuestionForm";

const CreateQuestion = () => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">
        Create MCQ Question
      </h2>

      <QuestionForm />
    </div>
  );
};

export default CreateQuestion;