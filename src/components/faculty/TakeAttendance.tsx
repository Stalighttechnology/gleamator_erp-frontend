import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINT } from "@/utils/config";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { Check, X, UploadCloud } from "lucide-react";
import { takeAttendance, aiAttendance, ClassStudent } from "@/utils/faculty_api";
import { fetchWithTokenRefresh } from '@/utils/authService';
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable } from "@/components/ui/skeleton";

interface FacultyAssignment {
  batch_id: number;
  batch: string;
  section: string;
  subject_name: string;
}
const TakeAttendance = () => {
  const { toast } = useToast();
  const { theme } = useTheme();

  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [attendance, setAttendance] = useState<{ [studentId: number]: boolean }>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [aiPhoto, setAiPhoto] = useState<File | null>(null);
  const [aiResults, setAiResults] = useState<any>(null);
  const [processingAI, setProcessingAI] = useState(false);

  // Fetch batches on mount
  useEffect(() => {
    let mounted = true;
    const fetchBatches = async () => {
      try {
        const resp = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/batches/`, { method: 'GET' });
        const text = await resp.text();
        let json: any;
        try {
          json = JSON.parse(text);
        } catch (parseErr) {
          console.error('Failed to parse batches JSON. Raw text:', text.substring(0, 200));
          if (mounted) setBatches([]);
          return;
        }
        const batchList = json.data || json.results?.batches || json.batches || json.results || json || [];
        if (!mounted) return;
        setBatches(Array.isArray(batchList) ? batchList : []);
      } catch (e) {
        console.error('Failed to fetch batches for attendance:', e);
        if (mounted) setBatches([]);
      }
    };
    fetchBatches();
    return () => { mounted = false; };
  }, []);

  // Fetch students for selected batch
  useEffect(() => {
    if (!selectedBatch) {
      setStudents([]);
      setAttendance({});
      return;
    }

    let mounted = true;
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/students/?batch_id=${selectedBatch}`);
        const text = await res.text();
        let json: any;
        try {
          json = JSON.parse(text);
        } catch (parseErr) {
          console.error('Failed to parse students JSON. Raw text:', text.substring(0, 200));
          if (mounted) {
            setStudents([]);
            setErrorMsg('Failed to fetch students. Invalid response.');
          }
          return;
        }
        const studentList = json.results?.data || json.data || json.results || json || [];
        if (!mounted) return;
        setStudents(Array.isArray(studentList) ? studentList : []);
        setAttendance({});
        setErrorMsg('');
      } catch (err) {
        console.error('Error fetching students', err);
        if (mounted) {
          setStudents([]);
          setErrorMsg('Failed to fetch students. Please try again.');
        }
      } finally {
        if (mounted) setLoadingStudents(false);
      }
    };
    fetchStudents();
    return () => { mounted = false; };
  }, [selectedBatch]);

  // no sections/assignments logic — batches and students are driven by student API

  const handleAttendance = (studentId: number, present: boolean) => {
    setAttendance(prev => ({ ...prev, [studentId]: present }));
  };

  const handleSubmit = async () => {
    if (!selectedBatch || students.length === 0) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      const attendanceArr = students.map(s => ({
        student_id: s.id.toString(),
        status: !!attendance[s.id],
      }));

      const res = await takeAttendance({
        batch_id: selectedBatch,
        section_id: "",
        date: selectedDate,
        method: "manual",
        attendance: attendanceArr,
      });

      if (res.success) {
        toast({
          title: "Success",
          description: "Attendance submitted successfully!",
        });
        setAttendance({});
      } else {
        setErrorMsg(res.message || "Failed to submit attendance");
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErrorMsg(e.message || "Failed to submit attendance");
      } else {
        setErrorMsg("Failed to submit attendance");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAiPhoto(file);
      setAiResults(null);
      setErrorMsg("");
    }
  };

  const handleAIProcess = async () => {
    if (!selectedBatch || !aiPhoto) return;

    setProcessingAI(true);
    setErrorMsg("");

    try {
      const res = await aiAttendance({
        batch_id: selectedBatch,
        section_id: "",
        date: selectedDate,
        photo: aiPhoto,
      });

      if (res.success) {
        setAiResults(res.data);
        toast({ title: "Success", description: "AI attendance processed successfully!" });
      } else {
        setErrorMsg(res.message || "Failed to process AI attendance");
      }
    } catch (e: unknown) {
      if (e instanceof Error) setErrorMsg(e.message || "Failed to process AI attendance");
      else setErrorMsg("Failed to process AI attendance");
    } finally {
      setProcessingAI(false);
    }
  };

  return (
    <div className={`w-full max-w-full min-h-screen h-auto overflow-visible ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card className={`${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'} w-full max-w-full`}>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Take Attendance</CardTitle>
          <CardDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>
            Record student attendance for your batches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 w-full max-w-full">
            {/* Date, Batch and Section Selection */}
            <div className="flex flex-col gap-3 sm:grid sm:grid-cols-3 w-full">
              <div className="w-full">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={`w-full h-10 px-3 rounded-md border ${theme === 'dark' ? 'bg-background border-input text-foreground' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-primary`}
                />
              </div>
              <Select
                value={selectedBatch}
                onValueChange={(val) => setSelectedBatch(val)}
                disabled={!selectedDate}
              >
                <SelectTrigger className={`${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} w-full ${!selectedDate ? 'opacity-50' : ''}`}>
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((batch) => (
                    <SelectItem key={batch.id} value={String(batch.id)}>
                      {batch.name} {batch.branch ? `- ${batch.branch}` : ''} {batch.semester ? `(Sem ${batch.semester})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tabs for Manual and AI Entry - Only show after selection */}
            {selectedBatch ? (
              <Tabs defaultValue="manual">
                <TabsList className={`inline-flex h-10 items-center justify-start gap-2 rounded-md p-1 overflow-auto ${theme === 'dark' ? 'bg-muted text-muted-foreground' : 'bg-gray-100 text-gray-500'}`}>
                  <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                  <TabsTrigger value="ai">AI Processing</TabsTrigger>
                </TabsList>

                {/* Manual Entry Tab */}
                <TabsContent value="manual">
                  {loadingStudents ? (
                    <div className="mt-4">
                      <SkeletonTable rows={5} cols={3} />
                    </div>
                  ) : students.length > 0 ? (
                    <>
                      <div className={`border rounded-lg p-4 mt-4 space-y-2 max-h-96 overflow-y-auto ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                        {students.map(student => (
                          <div key={student.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                            <input
                              type="checkbox"
                              checked={attendance[student.id] || false}
                              onChange={(e) => handleAttendance(student.id, e.target.checked)}
                              className="w-4 h-4"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{student.name}</div>
                              <div className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{student.usn}</div>
                            </div>
                            <div className="text-xs">
                              {attendance[student.id] ? (
                                <span className={`px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-800'}`}>Present</span>
                              ) : (
                                <span className={`px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-800'}`}>Absent</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {errorMsg && <div className={`text-sm p-3 mt-3 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{errorMsg}</div>}

                      <Button
                        onClick={handleSubmit}
                        disabled={submitting || students.length === 0}
                        className="w-full mt-4"
                      >
                        {submitting ? "Submitting..." : "Submit Attendance"}
                      </Button>
                    </>
                  ) : (
                    <div className={`text-center p-6 mt-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      {batches.length === 0 ? (
                        'No batches available'
                      ) : (selectedBatch ? 'No students found for this batch' : 'Select a batch to load students')}
                    </div>
                  )}
                </TabsContent>

                {/* AI Tab */}
                <TabsContent value="ai">
                  <div className="mt-4 space-y-4">
                    <div className={`border rounded-lg p-6 text-center ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                      <UploadCloud className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">AI Attendance Processing</h3>
                      <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        Upload a class photo for automatic attendance marking
                      </p>

                      <div className="flex flex-col gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          id="photo-upload"
                        />
                        <label
                          htmlFor="photo-upload"
                          className={`px-4 py-2 border rounded-md cursor-pointer text-center ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-300 hover:bg-gray-100'}`}
                        >
                          {aiPhoto ? aiPhoto.name : "Upload Photo"}
                        </label>

                        <Button
                          onClick={handleAIProcess}
                          disabled={processingAI || !aiPhoto}
                        >
                          {processingAI ? "Processing..." : "Process with AI"}
                        </Button>
                      </div>

                      {aiResults && (
                        <div className="mt-4 text-left">
                          <h4 className="font-medium mb-2">Results:</h4>
                          <pre className={`text-sm overflow-auto p-3 rounded ${theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}`}>
                            {JSON.stringify(aiResults, null, 2)}
                          </pre>
                        </div>
                      )}

                      {errorMsg && <div className={`text-sm p-3 mt-3 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{errorMsg}</div>}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className={`p-10 text-center border-2 border-dashed rounded-xl ${theme === 'dark' ? 'border-border text-muted-foreground' : 'border-gray-200 text-gray-500'}`}>
                <p>Please select Date, Batch, and Section to load student list.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TakeAttendance;
