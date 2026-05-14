import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Eye, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Fuse from "fuse.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "../ui/dialog";
import { useToast } from "../ui/use-toast";
import { getAttendanceBootstrap, getHODStudentBootstrap } from "../../utils/hod_api";
import { manageBatches } from "../../utils/admin_api";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonTable } from "../ui/skeleton";

interface Student {
  student_id: string;
  name: string;
  usn: string;
  attendance_percentage: number | string;
  total_sessions?: number;
  present_sessions?: number;
  section?: string;

}

interface Section {
  id: string;
  name: string;
}

interface AttendanceBootstrapResponse {
  success: boolean;
  message?: string;
  data?: {
    profile: {
      branch: string;
      branch_id: string;
    };
    sections?: Section[];
    attendance?: {
      students: Student[];
    };
  };
}

const AttendanceView = () => {
  const { toast } = useToast();
  const { theme } = useTheme();

  // Helper function to format attendance percentage
  const formatAttendancePercentage = (percentage: number | null | undefined): string => {
    if (percentage === null || percentage === undefined) return "NA";
    return `${Math.round(Math.max(0, Math.min(100, percentage)))}%`;
  };

  // Helper function to get progress bar width
  const getProgressBarWidth = (percentage: number | string | null | undefined): string => {
    if (percentage === "NA" || percentage === null || percentage === undefined) {
      return "0%";
    }
    if (typeof percentage === "string") {
      return "0%";
    }
    return `${Math.min(percentage || 0, 100)}%`;
  };

  // Helper function to get numeric value for sorting
  const getNumericPercentage = (percentage: number | string | null | undefined): number => {
    if (percentage === "NA" || percentage === null || percentage === undefined) {
      return -1; // Sort NA values to the end
    }
    if (typeof percentage === "string") {
      return -1;
    }
    return percentage;
  };
  const [state, setState] = useState({
    search: "",
    currentPage: 1,
    selectedStudent: null as Student | null,
    // filters now use batch_id + section_id only
    filters: {
      batch_id: "",
      section_id: "",
    },
    students: [] as Student[],
    loading: true,
    error: null as string | null,
    branch: "",
    branchId: "",
    // batches and sections
    batches: [] as Array<{ id: string; name: string; sections?: Array<{ id: string; name: string }> }> ,
    sections: [] as Section[],
    pagination: {
      page: 1,
      page_size: 10,
      total_students: 0,
      total_pages: 0,
    },
    showLowAttendance: false as boolean,
    selectedBatchId: "",
  });

  const studentsPerPage = 10;

  // Helper to update state
  const updateState = (newState: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  // Fetch all data using combined endpoint with pagination
  useEffect(() => {
    const fetchData = async () => {
      // If no batch selected, do not fetch students — avoid incorrect default filters
      if (!state.filters.batch_id) {
        updateState({ loading: false });
        console.debug("AttendanceView: no batch selected, skipping student fetch");
        return;
      }
      updateState({ loading: true, search: "", currentPage: 1 });
      try {
        // Fetch data with pagination support (use batch_id + section_id)
        const params: any = {
          page: state.pagination.page,
          page_size: state.pagination.page_size,
          batch_id: state.filters.batch_id,
        };
        if (state.filters.section_id) params.section_id = state.filters.section_id;
        console.debug("AttendanceView: fetching attendance", { selectedBatchId: state.filters.batch_id, selectedSectionId: state.filters.section_id, params });
        const response = await getAttendanceBootstrap("", params as any);
        if (response.success && response.data) {
          // Do NOT override sections from server; sections must come from selected batch (client-side)
          const students = (response.data.attendance?.students || []).map((st) => ({
            ...st,
            attendance_percentage: typeof st.attendance_percentage === "number" ? st.attendance_percentage as number : (typeof st.attendance_percentage === "string" && !isNaN(Number(st.attendance_percentage)) ? Number(st.attendance_percentage) : null)
          }));
          console.debug("AttendanceView: fetched students", { count: students.length });
          updateState({
            branch: response.data.profile?.branch || "",
            branchId: response.data.profile?.branch_id || "",
            students,
            pagination: {
              page: response.count ? response.count > 0 ? Math.ceil(response.count / state.pagination.page_size) : 1 : 1,
              page_size: state.pagination.page_size,
              total_students: response.count || 0,
              total_pages: response.count ? Math.ceil(response.count / state.pagination.page_size) : 1,
            },
          });
        } else {
          throw new Error(response.message || "Failed to fetch data");
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Network error";
        updateState({ error: errorMessage });
        toast({ variant: "destructive", title: "Error", description: errorMessage });
      } finally {
        updateState({ loading: false });
      }
    };
    fetchData();
  }, [state.filters.batch_id, state.filters.section_id, state.pagination.page, state.pagination.page_size, toast]);
  // Update dependencies: fetch when batch or section or pagination change
  // Note: we'll trigger fetch manually when relevant state changes below

// Fetch batches list on mount (for Batch filter)
// Fetch batches helper (exposed for retry)
const fetchBatchesList = async () => {
  try {
    console.debug("AttendanceView: fetching batches bootstrap");
    // Use HOD student bootstrap which includes batches and sections together
    const boot = await getHODStudentBootstrap(['profile', 'batches', 'sections']);
    console.debug("AttendanceView: bootstrap result", boot);
    if (boot && boot.success && boot.data) {
      const sectionsList = Array.isArray(boot.data.sections) ? boot.data.sections : [];
      // group sections by batch_id
      const sectionsByBatch: Record<string, Array<{ id: any; name: any }>> = {};
      sectionsList.forEach((s: any) => {
        const bid = String(s.batch_id || s.batch || "");
        if (!sectionsByBatch[bid]) sectionsByBatch[bid] = [];
        sectionsByBatch[bid].push({ id: String(s.id), name: s.name });
      });
      const batchesList = Array.isArray(boot.data.batches) ? boot.data.batches.map((b: any) => ({ id: String(b.id), name: b.name, sections: sectionsByBatch[String(b.id)] || [] })) : [];
      updateState({ batches: batchesList });
      console.debug("AttendanceView: batches loaded", { count: batchesList.length });
      return;
    }

    // fallback to admin API if bootstrap not available
    console.debug("AttendanceView: bootstrap missing, falling back to manageBatches");
    const res = await manageBatches({ page: 1, page_size: 1000 });
    console.debug("AttendanceView: manageBatches result", res);
    const hasResults = res && typeof res === 'object' && 'results' in res;
    const resultsPayload = hasResults ? (res as any).results : res;
    // normalize several shapes we've seen in the wild:
    // 1) { count, results: [{...}, ...] }
    // 2) { count, results: { success: true, batches: [...] } }
    // 3) { success: true, batches: [...] }
    // 4) plain array
    let batchesArray: any[] = [];
    if (Array.isArray(resultsPayload)) {
      batchesArray = resultsPayload;
    } else if (resultsPayload && resultsPayload.success && Array.isArray((resultsPayload as any).batches)) {
      batchesArray = (resultsPayload as any).batches;
    } else if ((res as any).batches && Array.isArray((res as any).batches)) {
      batchesArray = (res as any).batches;
    } else if (Array.isArray(res)) {
      batchesArray = res as any[];
    }

    if (batchesArray.length > 0) {
      const list = batchesArray.map((b: any) => ({ id: String(b.id), name: b.name || String(b.id), sections: b.sections || [] }));
      updateState({ batches: list });
      console.debug("AttendanceView: fallback batches loaded", { count: list.length });
    } else {
      console.debug("AttendanceView: no batches found in manageBatches response");
    }
  } catch (e) {
    console.error("Failed to fetch batches", e);
  }
};

useEffect(() => {
  fetchBatchesList();
}, []);

// Use fuzzy search on backend results with a fallback substring search for short queries
const fuse = new Fuse(state.students, {
  keys: ["name", "usn", "section"],

  threshold: 0.35,
  includeScore: true,
  ignoreLocation: true,
});

// Apply filters in order: backend -> search -> low-attendance
let backendFiltered = state.students || [];
let searched: Student[] = backendFiltered;
if (state.search && state.search.trim().length > 0) {
  const fuseResults = fuse.search(state.search).map(r => r.item);
  if (fuseResults.length > 0) {
    searched = fuseResults;
  } else {
    // fallback: simple case-insensitive substring match on name/usn/semester/section
    const q = state.search.toLowerCase().trim();
    searched = backendFiltered.filter((s) => {
      const name = (s.name || "").toString().toLowerCase();
      const usn = (s.usn || "").toString().toLowerCase();
      const sec = (s.section || "").toString().toLowerCase();
      return name.includes(q) || usn.includes(q) || sec.includes(q);
    });

  }
}

let lowFiltered = state.showLowAttendance ? searched.filter(s => typeof s.attendance_percentage === 'number' && s.attendance_percentage < 70) : searched;

const totalPages = state.pagination.total_pages;
const currentStudents = lowFiltered;

const handlePrev = () => {
    if (state.pagination.page > 1) {
      updateState({
        pagination: { ...state.pagination, page: state.pagination.page - 1 },
        currentPage: state.pagination.page - 1
      });
    }
  };

  const handleNext = () => {
    if (state.pagination.page < state.pagination.total_pages) {
      updateState({
        pagination: { ...state.pagination, page: state.pagination.page + 1 },
        currentPage: state.pagination.page + 1
      });
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text(`All Students Attendance Report - ${state.branch.toUpperCase()} - Page ${state.pagination.page}`, 14, 16);
    const tableColumn = ["Name", "USN", "Attendance", "Section"];

    const tableRows = currentStudents.map((student) => [
      student.name,
      student.usn,
      formatAttendancePercentage(student.attendance_percentage),
      student.section || "-",
    ]);


    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.save(`attendance-report-${state.branch}-page-${state.pagination.page}.pdf`);
  };

  const getSectionDisplay = (sectionId: string) => {
    const section = state.sections.find((s) => s.id === sectionId);
    return section ? `Section ${section.name}` : "";
  };

  if (state.loading && state.students.length === 0) {
    return (
      <Card className="p-6">
        <SkeletonTable rows={10} cols={5} />
      </Card>
    );
  }

  if (state.error) {
    return <div className={`text-center py-6 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>{state.error}</div>;
  }

  return (
    <Card className={`shadow-md border rounded-lg ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-gray-50 text-gray-900'}`}>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold mb-4">All Students Attendance</CardTitle>
        <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
          View and analyze attendance for all students in {state.branch.toUpperCase()}.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            value={state.filters.batch_id}
            onValueChange={(value) => {
              const selected = state.batches.find((b) => b.id === value);
              console.debug("AttendanceView: batch selected", { selectedBatchId: value });
              updateState({
                filters: { batch_id: value, section_id: "" },
                sections: selected?.sections?.map((s: any) => ({ id: String(s.id), name: s.name || String(s.id) })) || [],
                pagination: { ...state.pagination, page: 1 },
                selectedBatchId: value,
                students: [],
              });
            }}
            disabled={state.batches.length === 0}
          >
            <SelectTrigger className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
              <SelectValue placeholder={state.batches.length === 0 ? "No batches available" : "Select Batch"} />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
              {state.batches.map((batch) => (
                <SelectItem key={batch.id} value={batch.id} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                  {batch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Retry batches if none loaded */}
          {state.batches.length === 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No batches available</span>
              <Button size="sm" onClick={() => fetchBatchesList()}>Retry</Button>
            </div>
          )}

          <Select
            value={state.filters.section_id}
            onValueChange={(value) => {
              console.debug("AttendanceView: section selected", { selectedSectionId: value });
              updateState({ filters: { ...state.filters, section_id: value }, pagination: { ...state.pagination, page: 1 }, students: [] });
            }}
            disabled={state.sections.length === 0 || !state.filters.batch_id}
          >
            <SelectTrigger className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
              <SelectValue placeholder={state.sections.length === 0 || !state.filters.batch_id ? "Select batch first" : "Select Section"} />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
              {state.sections.map((section) => (
                <SelectItem key={section.id} value={section.id} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                  Section {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center mt-4 gap-2 md:gap-4 w-full">
          {/* Input + Error */}
          <div className="flex flex-col w-full max-w-md">
            <Input
              className={`w-full ${theme === 'dark' ? 'bg-background text-foreground border-border placeholder:text-muted-foreground' : 'bg-white text-gray-900 border-gray-300 placeholder:text-gray-500'}`}
              placeholder="Search by name or USN..."
              value={state.search}
              onChange={(e) => {
                const value = e.target.value;
                updateState({ search: value, pagination: { ...state.pagination, page: 1 } });
              }}
            />
          </div>

          {/* Export Button */}
          <div className="flex items-center gap-2">
            <Button
              variant={state.showLowAttendance ? "destructive" : "default"}
              onClick={() => updateState({ showLowAttendance: !state.showLowAttendance, pagination: { ...state.pagination, page: 1 } })}
              className={state.showLowAttendance ? "bg-destructive text-white" : "bg-white text-gray-900"}
            >
              View Low Attendance
            </Button>

            <Button
              className="ml-0 md:ml-4 flex items-center gap-2 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
              onClick={handleExportPDF}
            >
              <FileDown size={16} />
              Export Report
            </Button>
          </div>
        </div>


        <div className="overflow-x-auto mt-4">
          {/* Height ≈ 5 rows (5 × h-16 = 80 = 20rem). Adjust if your row height differs */}
          <div className={`overflow-y-auto custom-scrollbar border rounded ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>
            <table className="w-full table-fixed border-collapse">
              <thead className={`text-left sticky top-0 z-10 ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-gray-100 text-gray-900 border-gray-300'}`}>
                <tr>
                  <th className={`p-3 border w-[32%] ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>Student</th>
                  <th className={`p-3 border w-[40%] ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>Attendance</th>
                  <th className={`p-3 border w-[12%] ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>Section</th>
                  <th className={`p-3 border w-[16%] ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>Actions</th>

                </tr>
              </thead>

              <tbody>
                {currentStudents.map((student) => (
                  <tr key={student.student_id} className={`h-16 ${theme === 'dark' ? 'hover:bg-accent border-border' : 'hover:bg-gray-100 border-gray-300'}`}>
                    <td className={`p-3 border ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>
                      <div>
                        <p className={`font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.name}</p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{student.usn}</p>
                      </div>
                    </td>

                    <td className={`p-3 border ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>
                      <div className="flex items-center gap-2">
                        <span>{formatAttendancePercentage(student.attendance_percentage)}</span>
                        <div className={`w-full h-2 rounded ${theme === 'dark' ? 'bg-muted' : 'bg-gray-200'}`}>
                          <div
                            className="h-2 bg-green-500 rounded"
                            style={{ width: getProgressBarWidth(student.attendance_percentage) }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className={`p-3 border ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>{student.section || "-"}</td>


                    <td className={`p-3 border ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
                        onClick={() => updateState({ selectedStudent: student })}
                      >
                        <Eye size={16} /> View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6">
          <Button
            onClick={handlePrev}
            disabled={state.pagination.page === 1}
            className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
          >
            Previous
          </Button>
          <p className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
            Page {state.pagination.page} of {state.pagination.total_pages} ({state.pagination.total_students} total students)
          </p>
          <Button
            onClick={handleNext}
            disabled={state.pagination.page === state.pagination.total_pages}
            className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
          >
            Next
          </Button>
        </div>

        <Dialog open={!!state.selectedStudent} onOpenChange={() => updateState({ selectedStudent: null })}>
          <DialogContent className={`sm:max-w-md border ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
            <DialogHeader>
              <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                {state.selectedStudent?.name}'s Details
              </DialogTitle>
              <DialogDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>
                Full attendance record
              </DialogDescription>
            </DialogHeader>

            <div className={`space-y-2 mt-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              <p><strong className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>USN:</strong> {state.selectedStudent?.usn}</p>
              <p><strong className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Attendance:</strong> {formatAttendancePercentage(state.selectedStudent?.attendance_percentage)}</p>
              <p><strong className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Total Sessions:</strong> {state.selectedStudent?.total_sessions || "-"}</p>
              <p><strong className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Present Sessions:</strong> {state.selectedStudent?.present_sessions || "-"}</p>
              <p>
  <strong className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
    Batch:
  </strong>{" "}
  {state.batches.find((b) => b.id === state.filters.batch_id)?.name || "-"}
</p>

<p>
  <strong className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
    Section:
  </strong>{" "}
  {state.selectedStudent?.section?.toUpperCase() || "-"}
</p>
              
            </div>

            <DialogClose asChild>
              <Button className={`mt-6 w-full ${theme === 'dark' ? 'bg-card text-foreground border-border hover:bg-accent' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'}`}>
                Close
              </Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AttendanceView;
